#!/usr/bin/env python3
"""Tinta impresa: genera las fotos "impresas" y las texturas orgánicas del presskit.

Requisitos: Python 3.10+, numpy, scipy y pillow (onnxruntime solo para `segment`).
    pip install numpy scipy pillow onnxruntime

Comandos (todo sale en WebP; la tinta de un solo color va sin pérdida, con 6 niveles de alfa):
    segment  foto.jpg recorte.png [--point X,Y]   recorta a la persona (MODNet, se baja solo)
    cover    recorte.png carpeta/                  tapa: retrato en dotwork, remera en celdas y capa roja
    erode    foto.jpg salida.webp [--grade live]   foto en blanco y negro con los bordes comidos por celdas
    dots     recorte.png salida.webp               figura en dotwork para fondos
    band     salida.webp [--seed N]                banda de encaje para dividir secciones
    ornament salida.webp [--size 1500x460] [--red roja.webp]   mancha simétrica tipo Rorschach
    seal     salida.webp [--size 220]              sello orgánico rojo para los numerales
    splat    salida.webp [--seed N]                salpicadura de tinta
    textures carpeta/                              papel, fotocopia y sello gastado (se repiten sin cortes)
    sticker  logo.webp salida.webp                 silueta de troquel para el logo
    pack     archivo.webp ...                      re-empaqueta tinta de un color (6 niveles, sin pérdida)

Para una foto nueva de tapa:
    python3 tools/ink/ink.py segment foto.jpg /tmp/recorte.png
    python3 tools/ink/ink.py cover /tmp/recorte.png assets/ink/
"""
import argparse
import os
import sys
import urllib.request

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as nd
from scipy.spatial import cKDTree

INK = (14, 13, 12)
RED = (224, 16, 45)
PAPER = (236, 230, 216)
STICKER = (246, 243, 235)
HERE = os.path.dirname(os.path.abspath(__file__))
MODNET_URL = 'https://huggingface.co/Xenova/modnet/resolve/main/onnx/model.onnx'


# =====================================================================
#  Ruido, celdas y punteado
# =====================================================================
def fbm(H, W, scale, octaves=4, seed=0):
    """Ruido suave por octavas (valores ~ -2..2)."""
    rng = np.random.default_rng(seed)
    out = np.zeros((H, W), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        s = max(2, int(scale / (2 ** o)))
        gh, gw = H // s + 3, W // s + 3
        g = rng.normal(size=(gh, gw)).astype(np.float32)
        up = np.asarray(Image.fromarray(g).resize((gw * s, gh * s), Image.BICUBIC))[:H, :W]
        out += amp * up
        tot += amp
        amp *= 0.5
    return out / tot


def periodic(n, power, rng):
    """Ruido que se repite sin cortes (para texturas en mosaico)."""
    f = np.fft.fftfreq(n)
    fx, fy = np.meshgrid(f, f)
    r = np.sqrt(fx * fx + fy * fy)
    r[0, 0] = 1
    spec = (rng.normal(size=(n, n)) + 1j * rng.normal(size=(n, n))) / r ** power
    spec[0, 0] = 0
    z = np.real(np.fft.ifft2(spec))
    return (z - z.mean()) / z.std()


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def worley(H, W, pts, warp=None):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    if warp is not None:
        xx = xx + warp[0]
        yy = yy + warp[1]
    d, i = cKDTree(pts).query(np.stack([xx.ravel(), yy.ravel()], 1), k=2, workers=-1)
    return d[:, 0].reshape(H, W).astype(np.float32), d[:, 1].reshape(H, W).astype(np.float32), i[:, 0].reshape(H, W)


def seeds(H, W, dens, n_try, rng):
    p = rng.random((n_try, 2)) * [W, H]
    v = dens[np.clip(p[:, 1].astype(int), 0, H - 1), np.clip(p[:, 0].astype(int), 0, W - 1)]
    return p[rng.random(n_try) < v]


def stipple(H, W, density, seed, r_min=0.7, r_max=1.7, spacing=2.6):
    """Punteado a mano (dotwork): más puntos y más gordos donde density es alta."""
    rng = np.random.default_rng(seed)
    gy, gx = np.mgrid[0:H:spacing, 0:W:spacing]
    px = (gx + rng.random(gx.shape) * spacing).ravel()
    py = (gy + rng.random(gy.shape) * spacing).ravel()
    d = density[np.clip(py.astype(int), 0, H - 1), np.clip(px.astype(int), 0, W - 1)]
    keep = rng.random(px.size) < d
    px, py, d = px[keep], py[keep], d[keep]
    S = 2
    im = Image.new('L', (W * S, H * S), 0)
    dr = ImageDraw.Draw(im)
    rr = (r_min + (r_max - r_min) * rng.random(px.size) * (0.5 + 0.5 * d)) * S
    for x, y, r in zip(px * S, py * S, rr):
        dr.ellipse([x - r, y - r, x + r, y + r], fill=255)
    return np.asarray(im.resize((W, H), Image.LANCZOS)).astype(np.float32) / 255


def cells(R, cell, seed, rng, base=0.03, mid=0.45, clusters=0.8, holes=(0.08, 0.27), soft=0.05, bias=0.2, cut=0.95):
    """Red de celdas de tinta (masa madre / pintura vertida) dentro de la región R.
    Devuelve la tinta y lo necesario para pintar algunas celdas de rojo."""
    H, W = R.shape
    cl = smooth(0.2, 0.7, fbm(H, W, cell * 6, 3, seed + 3))
    dens = np.clip(base + mid * smooth(0.15, 1.0, R) + clusters * cl * smooth(0.1, 0.7, R), 0, 1)
    pts = seeds(H, W, dens, int(H * W / (cell * cell) * 4), rng)
    warp = (fbm(H, W, cell * 2.5, 3, seed + 4) * cell * 0.6, fbm(H, W, cell * 2.5, 3, seed + 5) * cell * 0.6)
    F1, F2, idx = worley(H, W, pts, warp)
    q = (F2 - F1) / (F2 + F1 + 1e-6)
    hs = rng.uniform(holes[0], holes[1], len(pts)).astype(np.float32)[idx]
    hole = smooth(hs - soft, hs + soft, q)
    ink = smooth(0.48, 0.52, R + bias - cut * hole)
    return ink, (q, hs, idx, len(pts))


def red_cells(info, R, rng, share=0.12, lo=0.45, hi=0.8):
    q, hs, idx, n = info
    fill = (rng.random(n) < share)[idx] * smooth(hs + 0.02, hs + 0.12, q) * smooth(lo, hi, R)
    return nd.gaussian_filter(fill.astype(np.float32), 0.6)


def walk(start, ang, steps, step, rng, turn=0.35):
    pts = [start]
    x, y = start
    for _ in range(steps):
        ang += rng.normal() * turn
        x += np.cos(ang) * step
        y += np.sin(ang) * step
        pts.append((x, y))
    return pts


def river(H, W, paths, width, seed):
    rng = np.random.default_rng(seed)
    im = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(im)
    for path, wf in paths:
        for k in range(len(path) - 1):
            w = max(4, int(width * wf * (0.6 + 0.8 * rng.random())))
            dr.line([path[k], path[k + 1]], fill=255, width=w)
            x, y = path[k]
            dr.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=255)
    m = np.asarray(im.filter(ImageFilter.GaussianBlur(width * 0.6))).astype(np.float32) / 255
    m = m / (m.max() + 1e-6)
    return np.clip(m * 1.25 + 0.45 * fbm(H, W, width * 1.4, 5, seed) - 0.05, 0, 1.5)


# =====================================================================
#  Guardado
# =====================================================================
def quantize(alpha, levels=6):
    step = 255 / (levels - 1)
    return (np.round(np.clip(alpha, 0, 1) * 255 / step) * step).astype(np.uint8)


def save_ink(alpha, rgb, path):
    """Tinta de un color: alfa en 6 niveles y WebP sin pérdida (un tercio del peso, mismo look)."""
    im = Image.new('RGB', (alpha.shape[1], alpha.shape[0]), rgb)
    im.putalpha(Image.fromarray(quantize(alpha)))
    im.save(path, 'WEBP', lossless=True, method=6, quality=100)
    print('  ->', path, os.path.getsize(path) // 1024, 'KB')


def save_preview(layers, path, bg=PAPER, scale=0.5):
    """Vista previa sobre papel: layers = [(alpha, rgb, (dx, dy)), ...] de abajo hacia arriba."""
    H, W = layers[0][0].shape
    img = np.ones((H, W, 3), np.float32) * np.array(bg)
    for a, rgb, off in layers:
        a = np.roll(np.roll(a, off[1], 0), off[0], 1)[..., None]
        img = img * (1 - a) + np.array(rgb) * a
    im = Image.fromarray(img.astype(np.uint8))
    if scale != 1:
        im = im.resize((int(W * scale), int(H * scale)), Image.LANCZOS)
    im.save(path)


# =====================================================================
#  Comandos
# =====================================================================
def cmd_segment(a):
    try:
        import onnxruntime as ort
    except ImportError:
        sys.exit('Falta onnxruntime: pip install onnxruntime')
    cache = os.path.join(HERE, '.cache')
    os.makedirs(cache, exist_ok=True)
    model = os.path.join(cache, 'modnet.onnx')
    if not os.path.exists(model):
        print('Bajando MODNet (25 MB, una sola vez)…')
        urllib.request.urlretrieve(MODNET_URL, model)
    sess = ort.InferenceSession(model, providers=['CPUExecutionProvider'])
    inp = sess.get_inputs()[0].name
    im = Image.open(a.src).convert('RGB')
    W, H = im.size
    sc = 768 / min(W, H)
    w, h = int(round(W * sc / 32)) * 32, int(round(H * sc / 32)) * 32
    x = np.asarray(im.resize((w, h), Image.BILINEAR)).astype(np.float32) / 255
    x = ((x - 0.5) / 0.5).transpose(2, 0, 1)[None].astype(np.float32)
    m = sess.run(None, {inp: x})[0][0, 0]
    m = np.asarray(Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(np.float32) / 255
    # nos quedamos con la persona: la mancha que toca el punto pedido (o la más grande)
    lab, n = nd.label(m > 0.5)
    if not n:
        sys.exit('No se encontró una persona en la foto.')
    if a.point:
        px, py = (int(v) for v in a.point.split(','))
        keep_id = lab[py, px]
        if not keep_id:
            sys.exit('El punto no cae sobre la persona.')
    else:
        sizes = nd.sum(np.ones_like(m), lab, range(1, n + 1))
        keep_id = int(np.argmax(sizes)) + 1
    keep = nd.binary_dilation(nd.binary_fill_holes(lab == keep_id), iterations=3)
    alpha = Image.fromarray((np.where(keep, m, 0) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))
    out = im.copy()
    out.putalpha(alpha)
    out.save(a.out)
    print('  ->', a.out)


def cmd_cover(a):
    rng = np.random.default_rng(a.seed)
    cut = Image.open(a.src).convert('RGBA')
    al0 = np.asarray(cut)[..., 3]
    ys, xs = np.where(al0 > 12)
    x0, x1, y0 = xs.min(), xs.max(), ys.min()
    c = cut.crop((max(0, x0 - 60), max(0, y0 - 50), min(cut.width, x1 + 60), cut.height))
    S = a.width / c.width
    c = c.resize((int(c.width * S), int(c.height * S)), Image.LANCZOS)
    ext = int(c.height * 0.22)  # lienzo más alto: abajo la remera se deshace en celdas
    W, H = c.width, c.height + ext
    arr = np.zeros((H, W, 4), np.float32)
    arr[:c.height] = np.asarray(c).astype(np.float32) / 255
    lum = 0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]
    al = arr[..., 3]
    g = np.clip((lum - 0.03) / (0.60 - 0.03), 0, 1) ** 0.72
    g = al * g + (1 - al)
    dark = 1 - g
    yy = np.mgrid[0:H, 0:W][0].astype(np.float32)
    print('tapa', W, 'x', H)
    # 1) dotwork del retrato
    dots = stipple(H, W, np.clip(dark * 1.08, 0, 1) ** 1.55, 5, r_min=1.0, r_max=2.3, spacing=3.4)
    port = np.clip(dots + smooth(0.86, 0.96, dark) * 0.9, 0, 1)
    # 2) de los hombros para abajo, celdas de tinta con borde orgánico
    neck = int(H * 0.50)
    low = smooth(neck - 60, neck + 300, yy + fbm(H, W, 90, 4, 77) * 170)
    sil = nd.gaussian_filter((al > 0.4).astype(np.float32), 18)
    spill = np.zeros((H, W), np.float32)
    spill[c.height - 30:, :] = 1
    spill = nd.gaussian_filter(spill, 60)
    noise = fbm(H, W, 120, 5, 4)
    R = np.clip(sil + spill * 0.9 * (0.6 + 0.6 * noise) + 0.22 * fbm(H, W, 60, 4, 5), 0, 1.0) * low
    lace, info = cells(R, 23, 11, rng, base=0.02, mid=0.28, clusters=0.85, holes=(0.07, 0.26), bias=0.26, cut=0.92)
    st = stipple(H, W, np.clip(smooth(0.06, 0.4, R) * (1 - smooth(0.38, 0.6, R)) * 0.5, 0, 1), 9)
    lace = np.clip(lace + st, 0, 1)
    mix = smooth(0.42, 0.58, low * smooth(0.2, 0.5, dark) + 0.22 * fbm(H, W, 50, 3, 91))
    mix = np.maximum(mix, low * (1 - al))
    ink = np.clip(port * (1 - mix) + lace * mix, 0, 1)
    # 3) capa roja: algunas celdas rellenas (se imprime corrida, como una riso)
    red = red_cells(info, R, rng, share=0.13)
    os.makedirs(a.out, exist_ok=True)
    save_ink(ink, INK, os.path.join(a.out, 'cover-ink.webp'))
    save_ink(red, RED, os.path.join(a.out, 'cover-red.webp'))
    save_preview([(red, RED, (6, 4)), (ink, INK, (0, 0))], os.path.join(a.out, 'cover-preview.png'))


GRADES = {
    'live': dict(lo=0.02, hi=0.5, gamma=0.7, blur=0.6, noise=0.045, contrast=1.35),
    'bio': dict(lo=0.03, hi=0.75, gamma=0.85, blur=0.5, noise=0.04, contrast=1.3),
}


def cmd_erode(a):
    rng = np.random.default_rng(a.seed)
    im = Image.open(a.src).convert('L')
    W, H = im.size
    L = np.asarray(im).astype(np.float32) / 255
    gr = GRADES[a.grade]
    L = np.clip((L - gr['lo']) / (gr['hi'] - gr['lo']), 0, 1) ** gr['gamma']
    L = np.clip(nd.gaussian_filter(L, gr['blur']) + rng.normal(size=L.shape) * gr['noise'], 0, 1)
    L = np.clip((L - 0.5) * gr['contrast'] + 0.5, 0, 1)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # qué tan "adentro" está cada píxel: distancia al borde + ruido
    dist = np.minimum.reduce([xx, yy, W - 1 - xx, H - 1 - yy]) / (min(W, H) * a.depth)
    R = np.clip(dist + 0.35 * fbm(H, W, 140, 4, a.seed), 0, 1.5)
    cell = a.cell
    cl = smooth(0.2, 0.75, fbm(H, W, cell * 7, 3, a.seed + 2))
    d = np.clip(0.03 + 0.4 * (1 - smooth(0.2, 1.0, R)) + 0.8 * cl * (1 - smooth(0.5, 1.0, R)), 0, 1)
    pts = seeds(H, W, d, int(H * W / (cell * cell) * 3.5), rng)
    F1, F2, idx = worley(H, W, pts, (fbm(H, W, cell * 2.5, 3, a.seed + 4) * cell * 0.6, fbm(H, W, cell * 2.5, 3, a.seed + 5) * cell * 0.6))
    q = (F2 - F1) / (F2 + F1 + 1e-6)
    hs = rng.uniform(0.08, 0.28, len(pts)).astype(np.float32)[idx]
    hole = smooth(hs - 0.05, hs + 0.05, q)
    alpha = smooth(0.47, 0.53, R + 0.25 - 0.95 * hole * (1 - smooth(0.75, 1.1, R)))
    rgba = np.dstack([L * 255, L * 255, L * 255, alpha * 255]).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(a.out, 'WEBP', quality=a.quality, method=6)
    print('  ->', a.out, os.path.getsize(a.out) // 1024, 'KB')


def cmd_dots(a):
    cut = Image.open(a.src).convert('RGBA')
    al0 = np.asarray(cut)[..., 3]
    ys, xs = np.where(al0 > 20)
    cut = cut.crop((xs.min(), ys.min(), xs.max(), cut.height))
    A = np.asarray(cut).astype(np.float32) / 255
    H, W = A.shape[:2]
    lum = 0.299 * A[..., 0] + 0.587 * A[..., 1] + 0.114 * A[..., 2]
    al = A[..., 3]
    g = np.clip((lum - 0.03) / (0.65 - 0.03), 0, 1) ** 0.75
    dk = np.clip(1 - (al * g + (1 - al)), 0, 1)
    dots = stipple(H, W, np.clip(dk * 1.05, 0, 1) ** 1.5, 41, r_min=1.0, r_max=2.2, spacing=3.2)
    save_ink(np.clip(dots + smooth(0.86, 0.96, dk) * 0.95, 0, 1) * np.clip(al * 1.5, 0, 1), INK, a.out)


def cmd_band(a):
    rng = np.random.default_rng(a.seed)
    W, H = 2200, 460
    paths = []
    x = -80.0
    while x < W:
        seg = walk((x, H * 0.5 + rng.uniform(-40, 40)), rng.uniform(-0.15, 0.15), 6, 70, rng, 0.12)
        seg = [(px, min(max(py, H * 0.32), H * 0.68)) for px, py in seg]
        paths.append((seg, rng.uniform(0.7, 1.1)))
        x = seg[-1][0] - 20
    for _ in range(3):
        paths.append((walk((rng.uniform(200, W - 200), H * 0.5), rng.choice([-1, 1]) * rng.uniform(0.6, 1.4), 5, 55, rng, 0.4), 0.45))
    M = river(H, W, paths, 120, a.seed)
    ink, _ = cells(M, 19, a.seed, rng, mid=0.5, clusters=0.8, holes=(0.10, 0.30), soft=0.07, bias=0.22, cut=0.95)
    st = stipple(H, W, np.clip(smooth(0.08, 0.42, M) * (1 - ink) * 0.5, 0, 1) ** 1.3, a.seed + 9)
    ink = np.clip(ink + st, 0, 1)
    yy = np.mgrid[0:H, 0:W][0]
    save_ink(ink * ((yy > 3) & (yy < H - 4)), INK, a.out)


def blot_half(h, w, seed, cell, reach, vert, rng):
    """Media mancha; el borde derecho es el eje de simetría."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dx = (w - xx) / (w * reach)
    dy = np.abs(yy - h / 2) / (h * vert)
    M = 1.15 - dx ** 1.3 - dy ** 2 * 0.9 + 0.55 * fbm(h, w, 70, 5, seed) + 0.18 * fbm(h, w, 26, 4, seed + 1)
    # nada toca los bordes de la imagen
    edge = smooth(0, 0.08 * w, xx) * smooth(0, 0.08 * h, yy) * smooth(0, 0.08 * h, h - 1 - yy)
    M = np.clip(M, 0, 1.4) * edge
    ink, info = cells(M, cell, seed, rng, mid=0.45, clusters=0.8, holes=(0.08, 0.27), bias=0.2, cut=0.95)
    st = stipple(h, w, np.clip(smooth(0.05, 0.38, M) * (1 - smooth(0.36, 0.6, M)) * 0.55 * edge, 0, 1), seed + 9, r_min=0.8, r_max=1.8)
    return np.clip(ink + st, 0, 1), M, info


def cmd_ornament(a):
    W, H = (int(v) for v in a.size.split('x'))
    rng = np.random.default_rng(a.seed)
    ink, M, info = blot_half(H, W // 2, a.seed, a.cell, 0.9, 0.42 if W > H else 0.46, rng)
    full = np.concatenate([ink, ink[:, ::-1]], axis=1)
    save_ink(full, INK, a.out)
    layers = [(full, INK, (0, 0))]
    if a.red:
        r = red_cells(info, M, rng, share=0.1, lo=0.5, hi=0.85)
        rfull = np.concatenate([r, r[:, ::-1]], axis=1)
        save_ink(rfull, RED, a.red)
        layers.insert(0, (rfull, RED, (0, 0)))
    save_preview(layers, os.path.splitext(a.out)[0] + '-preview.png', scale=1)


def cmd_seal(a):
    """Sello de lacre orgánico, simétrico en 4: centro macizo para el numeral,
    un anillo con agujeros y el borde que se deshace en encaje de celdas."""
    S = a.size
    rng = np.random.default_rng(a.seed)
    h = S // 2
    yy, xx = np.mgrid[0:h, 0:h].astype(np.float32)
    r = np.hypot(xx - h, yy - h) / h  # el centro del sello es la esquina del cuadrante
    edge = 0.74 + 0.07 * fbm(h, h, max(6, h // 4), 3, a.seed)
    R = np.clip((edge - r) / 0.3, 0, 1.3) + 0.04
    ink, _ = cells(R, max(6, S // 14), a.seed, rng, base=0.05, mid=0.6, clusters=0.4, holes=(0.06, 0.24), bias=0.12, cut=0.9)
    drops = stipple(h, h, np.clip(smooth(edge + 0.2, edge + 0.02, r) * smooth(edge - 0.02, edge + 0.04, r) * 0.13, 0, 1),
                    a.seed + 3, r_min=0.9, r_max=1.8, spacing=2.6)
    q = np.clip(ink + drops, 0, 1)
    top = np.concatenate([q, q[:, ::-1]], axis=1)
    full = np.concatenate([top, top[::-1, :]], axis=0)
    save_ink(full, RED, a.out)
    save_preview([(full, RED, (0, 0))], os.path.splitext(a.out)[0] + '-preview.png', scale=2)


def cmd_splat(a):
    rng = np.random.default_rng(a.seed)
    S = 700
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    c = S / 2
    ang = np.arctan2(yy - c, xx - c)
    r = np.hypot(xx - c, yy - c)
    edge = S * 0.15 + S * 0.05 * np.sin(ang * 7 + rng.random() * 6) + S * 0.04 * fbm(S, S, 40, 4, a.seed)
    ink = smooth(1.5, -1.5, r - edge)
    im = Image.new('L', (S, S), 0)
    dr = ImageDraw.Draw(im)
    for _ in range(70):
        t = rng.random() * 2 * np.pi
        d = S * (0.17 + rng.random() ** 1.6 * 0.33)
        rr = max(1.5, S * 0.035 * (1 - (d / S - 0.17) / 0.33) * rng.random())
        x, y = c + np.cos(t) * d, c + np.sin(t) * d
        dr.ellipse([x - rr, y - rr, x + rr, y + rr], fill=255)
        if rng.random() < 0.25:
            dr.line([x, y, c + np.cos(t) * (d - rr * 3), c + np.sin(t) * (d - rr * 3)], fill=255, width=max(1, int(rr * 0.8)))
    sat = np.asarray(im.filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255
    ink = np.clip(ink + smooth(0.35, 0.6, sat), 0, 1)
    pts = rng.random((140, 2)) * S
    F1, F2, idx = worley(S, S, pts)
    q = (F2 - F1) / (F2 + F1 + 1e-6)
    hs = rng.uniform(0.2, 0.45, len(pts))[idx]
    holes = smooth(hs, hs + 0.05, q) * (rng.random(len(pts))[idx] < 0.35) * smooth(S * 0.13, S * 0.05, r)
    save_ink(np.clip(ink - holes, 0, 1), INK, a.out)


def cmd_textures(a):
    rng = np.random.default_rng(a.seed)
    os.makedirs(a.out, exist_ok=True)
    N = 640
    # papel: manchas suaves, grano y fibras
    blot = periodic(N, 1.6, rng)
    grain = rng.normal(size=(N, N))
    fib = nd.gaussian_filter1d(periodic(N, 0.6, rng), 3, axis=0)
    L = 1 + 0.022 * blot + 0.018 * grain + 0.012 * np.tanh(fib * 1.5)
    paper = np.clip(np.array([236, 230, 216], np.float32)[None, None, :] * L[..., None], 0, 255).astype(np.uint8)
    Image.fromarray(paper).save(os.path.join(a.out, 'paper.webp'), 'WEBP', quality=80, method=6)
    # fotocopia negra: tóner desparejo, motas y vetas
    t = periodic(N, 1.2, rng)
    dark = 13 + 5 * t + 4 * rng.normal(size=(N, N))
    speck = nd.gaussian_filter((rng.random((N, N)) > 0.9975) * rng.uniform(40, 120, (N, N)), 0.6) * 3
    streak = nd.gaussian_filter1d(periodic(N, 0.9, rng), 40, axis=0)
    dk = np.clip(dark + speck + np.clip(streak, 0, None) * 4, 0, 255).astype(np.uint8)
    Image.fromarray(np.dstack([dk, dk, dk + 1])).save(os.path.join(a.out, 'xerox.webp'), 'WEBP', quality=78, method=6)
    # sello gastado (máscara)
    n1, n2, n3 = periodic(400, 1.1, rng), rng.random((400, 400)), periodic(400, 0.4, rng)
    m = np.clip((n1 + 2.0) / 0.7, 0, 1) * np.clip((n2 - 0.025) / 0.08, 0, 1) * np.clip((n3 + 2.4) / 0.6, 0, 1)
    save_ink(m, (0, 0, 0), os.path.join(a.out, 'grunge.webp'))


def cmd_sticker(a):
    im = Image.open(a.src).convert('RGBA')
    r = max(6, round(im.width / 87))
    m = np.asarray(im)[..., 3] > 40
    yy, xx = np.ogrid[-r:r + 1, -r:r + 1]
    k = (xx * xx + yy * yy) <= r * r
    d = nd.binary_fill_holes(nd.binary_closing(nd.binary_dilation(m, structure=k), structure=k, iterations=2))
    alpha = np.asarray(Image.fromarray((d * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
    save_ink(alpha, STICKER, a.out)


def cmd_pack(a):
    for f in a.files:
        im = Image.open(f).convert('RGBA')
        A = np.asarray(im)
        solid = A[..., 3] > 200
        rgb = tuple(int(v) for v in (np.median(A[solid][:, :3], axis=0) if solid.any() else (0, 0, 0)))
        before = os.path.getsize(f) // 1024
        save_ink(A[..., 3].astype(np.float32) / 255, rgb, f)
        print('    antes', before, 'KB')


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('segment'); s.add_argument('src'); s.add_argument('out'); s.add_argument('--point')
    s = sub.add_parser('cover'); s.add_argument('src'); s.add_argument('out'); s.add_argument('--width', type=int, default=1456); s.add_argument('--seed', type=int, default=21)
    s = sub.add_parser('erode'); s.add_argument('src'); s.add_argument('out'); s.add_argument('--grade', choices=sorted(GRADES), default='bio')
    s.add_argument('--seed', type=int, default=62); s.add_argument('--cell', type=int, default=20); s.add_argument('--depth', type=float, default=0.22); s.add_argument('--quality', type=int, default=74)
    s = sub.add_parser('dots'); s.add_argument('src'); s.add_argument('out')
    s = sub.add_parser('band'); s.add_argument('out'); s.add_argument('--seed', type=int, default=31)
    s = sub.add_parser('ornament'); s.add_argument('out'); s.add_argument('--size', default='1500x460'); s.add_argument('--seed', type=int, default=41)
    s.add_argument('--cell', type=int, default=16); s.add_argument('--red')
    s = sub.add_parser('seal'); s.add_argument('out'); s.add_argument('--size', type=int, default=220); s.add_argument('--seed', type=int, default=5)
    s = sub.add_parser('splat'); s.add_argument('out'); s.add_argument('--seed', type=int, default=3)
    s = sub.add_parser('textures'); s.add_argument('out'); s.add_argument('--seed', type=int, default=7)
    s = sub.add_parser('sticker'); s.add_argument('src'); s.add_argument('out')
    s = sub.add_parser('pack'); s.add_argument('files', nargs='+')
    a = p.parse_args()
    globals()['cmd_' + a.cmd](a)


if __name__ == '__main__':
    main()
