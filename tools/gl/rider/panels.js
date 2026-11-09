/* Serigrafía de los paneles y contenido de las pantallas, dibujados en canvas.
   Las piezas registran sus rótulos con las mismas coordenadas (mm) con que se modelan,
   así texto y geometría nunca se desalinean. */
import { CanvasTexture, SRGBColorSpace, RepeatWrapping } from 'three';

export const BONE = '#ece6d8';
export const RED = '#e0102d';
export const FONT = '"Archivo", "Arial Narrow", "Helvetica Neue", Arial, sans-serif';

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function tex(canvas, aniso = 4) {
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

function setFont(g, px, weight = 700, stretch = 'condensed') {
  g.font = `${weight} ${px}px ${FONT}`;
  try { g.fontStretch = stretch; } catch (e) { /* navegadores sin fontStretch en canvas */ }
}

export class Panel {
  constructor(W, D, ppm, seed = 7) {
    this.W = W; this.D = D; this.k = ppm; this.ops = []; this.seed = seed;
  }
  X(x) { return (x + this.W / 2) * this.k; }
  Z(z) { return (z + this.D / 2) * this.k; }
  text(s, x, z, o = {}) { this.ops.push(['text', s, x, z, o]); return this; }
  scale(x, z, r, o = {}) { this.ops.push(['scale', x, z, r, o]); return this; }
  frame(x, z, w, d, o = {}) { this.ops.push(['frame', x, z, w, d, o]); return this; }
  line(x0, z0, x1, z1, o = {}) { this.ops.push(['line', x0, z0, x1, z1, o]); return this; }
  fill(x, z, w, d, color) { this.ops.push(['fill', x, z, w, d, color]); return this; }
  image(img, x, z, w, o = {}) { this.ops.push(['image', img, x, z, w, o]); return this; }
  shadows(feet) { this.feet = feet; return this; }

  draw() {
    const { k } = this;
    const c = document.createElement('canvas');
    c.width = Math.round(this.W * k); c.height = Math.round(this.D * k);
    const g = c.getContext('2d');
    // aluminio anodizado negro, cepillado a lo ancho
    const grd = g.createLinearGradient(0, 0, c.width, c.height);
    grd.addColorStop(0, '#1a1a1d'); grd.addColorStop(0.55, '#121214'); grd.addColorStop(1, '#0d0d0f');
    g.fillStyle = grd; g.fillRect(0, 0, c.width, c.height);
    const r = rng(this.seed);
    for (let i = 0; i < c.height * 1.4; i++) {
      const y = r() * c.height;
      g.fillStyle = `rgba(255,255,255,${(0.006 + r() * 0.022).toFixed(3)})`;
      g.fillRect(r() * c.width * 0.3 - c.width * 0.15, y, c.width * (0.4 + r() * 0.9), Math.max(1, k * 0.12));
    }
    // sombra de contacto de cada pieza (antes que la serigrafía: queda debajo del texto)
    for (const f of this.feet || []) {
      const cx = this.X(f.x), cz = this.Z(f.z);
      const spread = (2.4 + (f.h || 6) * 0.35) * k;
      if (f.r) {
        const R = f.r * k;
        const gr = g.createRadialGradient(cx, cz + spread * 0.25, R * 0.6, cx, cz + spread * 0.25, R + spread);
        gr.addColorStop(0, 'rgba(0,0,0,.62)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cz + spread * 0.25, R + spread, 0, Math.PI * 2); g.fill();
      } else {
        g.save(); g.filter = `blur(${(spread * 0.5).toFixed(1)}px)`; g.fillStyle = 'rgba(0,0,0,.55)';
        g.fillRect(cx - (f.w / 2) * k - spread * 0.3, cz - (f.d / 2) * k - spread * 0.1, f.w * k + spread * 0.6, f.d * k + spread * 0.7);
        g.restore();
      }
    }
    for (const op of this.ops) this[op[0] + 'Op'](g, ...op.slice(1));
    return tex(c, 8);
  }

  textOp(g, s, x, z, o) {
    const { k } = this;
    g.save();
    g.translate(this.X(x), this.Z(z));
    if (o.rot) g.rotate(o.rot);
    setFont(g, (o.size || 2.6) * k, o.weight || 700, o.stretch || 'condensed');
    try { g.letterSpacing = `${((o.track ?? 0.06) * (o.size || 2.6) * k).toFixed(1)}px`; } catch (e) { /* sin letterSpacing */ }
    g.textAlign = o.align || 'center';
    g.textBaseline = 'middle';
    g.fillStyle = o.color || 'rgba(236,230,216,.82)';
    if (o.box) {
      const w = g.measureText(s).width + (o.size || 2.6) * k * 0.9, h = (o.size || 2.6) * k * 1.45;
      g.fillStyle = o.box; g.fillRect(-w / 2, -h / 2, w, h);
      g.fillStyle = o.color || '#0e0d0c';
    }
    g.fillText(s, 0, 0);
    g.restore();
  }
  scaleOp(g, x, z, r, o) {
    const { k } = this;
    const n = o.n || 11, a0 = o.a0 ?? -2.45, a1 = o.a1 ?? 2.45;
    g.fillStyle = o.color || 'rgba(236,230,216,.7)';
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * (i / (n - 1));
      const R = (r + 1.6) * k;
      const big = i === 0 || i === n - 1 || i === (n - 1) / 2;
      g.beginPath();
      g.arc(this.X(x) + Math.sin(a) * R, this.Z(z) - Math.cos(a) * R, (big ? 0.55 : 0.36) * k, 0, Math.PI * 2);
      g.fill();
    }
    if (o.min) this.textOp(g, o.min, x + Math.sin(a0) * (r + 4.4), z - Math.cos(a0) * (r + 4.4) + 1.2, { size: 1.9, weight: 600 });
    if (o.max) this.textOp(g, o.max, x + Math.sin(a1) * (r + 4.4), z - Math.cos(a1) * (r + 4.4) + 1.2, { size: 1.9, weight: 600 });
  }
  frameOp(g, x, z, w, d, o) {
    const { k } = this;
    g.strokeStyle = o.color || 'rgba(236,230,216,.28)';
    g.lineWidth = (o.width || 0.32) * k;
    const x0 = this.X(x - w / 2), z0 = this.Z(z - d / 2);
    g.beginPath();
    if (g.roundRect) g.roundRect(x0, z0, w * k, d * k, (o.radius ?? 1.6) * k); else g.rect(x0, z0, w * k, d * k);
    g.stroke();
  }
  lineOp(g, x0, z0, x1, z1, o) {
    g.strokeStyle = o.color || 'rgba(236,230,216,.28)';
    g.lineWidth = (o.width || 0.32) * this.k;
    g.beginPath(); g.moveTo(this.X(x0), this.Z(z0)); g.lineTo(this.X(x1), this.Z(z1)); g.stroke();
  }
  fillOp(g, x, z, w, d, color) {
    g.fillStyle = color;
    g.fillRect(this.X(x - w / 2), this.Z(z - d / 2), w * this.k, d * this.k);
  }
  imageOp(g, img, x, z, w, o) {
    if (!img) return;
    const h = w * (img.height / img.width);
    g.save();
    g.globalAlpha = o.alpha ?? 1;
    g.drawImage(img, this.X(x - w / 2), this.Z(z - h / 2), w * this.k, h * this.k);
    g.restore();
  }
}

/* sigilo KEXXY recoloreado (el SVG viene en negro) */
export function tint(img, color, size = 512) {
  if (!img) return null;
  const c = document.createElement('canvas');
  const ratio = img.height / img.width;
  c.width = size; c.height = Math.round(size * ratio);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return c;
}

/* ---------- forma de onda de hard techno: bombo en cada pulso, hats, rumble ---------- */
function waveAt(r, i, beatPx) {
  const ph = (i % beatPx) / beatPx;
  const kick = Math.exp(-ph * 7) * (0.75 + r() * 0.1);
  const rumble = 0.28 + 0.12 * Math.sin(i * 0.07) + r() * 0.08;
  const hat = ((i + beatPx / 2) % beatPx) / beatPx < 0.12 ? 0.35 + r() * 0.2 : r() * 0.14;
  return { low: Math.min(1, kick + rumble * 0.35), mid: 0.18 + rumble * 0.5 + r() * 0.12, hi: hat };
}

export function waveTexture(seed, W = 2048, H = 160) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#060607'; g.fillRect(0, 0, W, H);
  const r = rng(seed), mid = H / 2, beat = 64;
  for (let x = 0; x < W; x++) {
    const w = waveAt(r, x, beat);
    g.fillStyle = 'rgba(224,16,45,.95)'; g.fillRect(x, mid - w.low * mid * 0.92, 1, w.low * mid * 1.84);
    g.fillStyle = 'rgba(236,230,216,.78)'; g.fillRect(x, mid - w.mid * mid * 0.7, 1, w.mid * mid * 1.4);
    g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(x, mid - w.hi * mid * 0.45, 1, w.hi * mid * 0.9);
  }
  g.fillStyle = 'rgba(236,230,216,.18)';
  for (let x = 0; x < W; x += beat) g.fillRect(x, 0, 1, x % (beat * 4) === 0 ? H : 10);
  const t = tex(c);
  t.wrapS = RepeatWrapping;
  return t;
}

/* pantalla de 9" (1280 × 720 en el equipo real; acá 1024 × 576) */
export function deckScreen(deck) {
  const W = 1024, H = 576;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#050506'; g.fillRect(0, 0, W, H);
  // barra superior
  g.fillStyle = RED; g.fillRect(14, 14, 64, 58);
  setFont(g, 44, 900); g.fillStyle = '#0e0d0c'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(deck.n), 46, 45);
  g.textAlign = 'left';
  setFont(g, 30, 800); g.fillStyle = BONE; g.fillText(deck.title, 94, 32);
  setFont(g, 21, 600); g.fillStyle = 'rgba(236,230,216,.62)'; g.fillText('KEXXY  ·  ' + deck.genre, 94, 60);
  setFont(g, 20, 700); g.textAlign = 'right'; g.fillStyle = 'rgba(236,230,216,.7)';
  g.fillText('USB  ·  ' + deck.key, W - 18, 32);
  g.fillStyle = deck.playing ? RED : 'rgba(236,230,216,.4)';
  g.fillText(deck.playing ? '● ON AIR' : 'CUED', W - 18, 60);
  // marco de la onda ampliada (la onda real es otra textura que se desplaza encima)
  g.strokeStyle = 'rgba(236,230,216,.2)'; g.lineWidth = 2; g.strokeRect(12, 148, W - 24, 184);
  // datos grandes
  setFont(g, 18, 600); g.textAlign = 'left'; g.fillStyle = 'rgba(236,230,216,.55)';
  g.fillText('REMAIN', 22, 362); g.fillText('TEMPO', 430, 362); g.fillText('BPM', 700, 362);
  setFont(g, 70, 800); g.fillStyle = '#ffffff'; g.fillText(deck.time, 18, 414);
  setFont(g, 44, 700); g.fillStyle = BONE; g.fillText(deck.tempo, 428, 414);
  g.fillStyle = RED; g.fillRect(694, 378, 316, 76);
  setFont(g, 70, 900); g.fillStyle = '#0e0d0c'; g.textAlign = 'right'; g.fillText(deck.bpm, 996, 418);
  // vista general del tema
  const r = rng(deck.n * 31);
  const y0 = 470, h = 86, played = deck.pos;
  for (let x = 14; x < W - 14; x += 2) {
    const a = (0.25 + 0.55 * Math.abs(Math.sin(x * 0.011 + deck.n)) + r() * 0.2) * (x > 700 && x < 760 ? 0.35 : 1);
    g.fillStyle = x / W < played ? 'rgba(236,230,216,.28)' : 'rgba(236,230,216,.82)';
    g.fillRect(x, y0 + h / 2 - a * h / 2, 1.4, a * h);
  }
  g.fillStyle = RED; g.fillRect(W * played, y0 - 6, 3, h + 12);
  for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? BONE : RED; g.fillRect(40 + i * 150 + (deck.n * 23) % 60, y0 - 12, 10, 8); }
  return tex(c);
}

/* tapa central del jog: sigilo sobre negro con anillo rojo */
export function jogTexture(sigil) {
  const S = 512;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#070708'; g.fillRect(0, 0, S, S);
  g.strokeStyle = RED; g.lineWidth = 22; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 26, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = 'rgba(236,230,216,.85)'; g.lineWidth = 4; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 52, -Math.PI * 0.5, Math.PI * 0.9); g.stroke();
  if (sigil) {
    const h = S * 0.56, w = h * (sigil.width / sigil.height);
    g.drawImage(sigil, (S - w) / 2, (S - h) / 2, w, h);
  }
  return tex(c);
}

/* surcos del plato */
export function platterTexture() {
  const S = 1024;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, S * 0.05, S / 2, S / 2, S / 2);
  grd.addColorStop(0, '#111113'); grd.addColorStop(1, '#070708');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  const r = rng(5);
  for (let rad = S * 0.18; rad < S * 0.5; rad += 2.2) {
    g.strokeStyle = `rgba(255,255,255,${(0.02 + r() * 0.04).toFixed(3)})`;
    g.lineWidth = 1; g.beginPath(); g.arc(S / 2, S / 2, rad, 0, Math.PI * 2); g.stroke();
  }
  return tex(c, 8);
}

/* pantalla del mixer: efecto, compás y BPM */
export function fxScreen() {
  const W = 512, H = 352;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#050506'; g.fillRect(0, 0, W, H);
  setFont(g, 26, 700); g.fillStyle = 'rgba(236,230,216,.6)'; g.textBaseline = 'middle';
  g.fillText('BEAT FX', 22, 34);
  g.textAlign = 'right'; g.fillText('CH 1–4', W - 22, 34);
  g.textAlign = 'left'; setFont(g, 68, 900); g.fillStyle = BONE; g.fillText('ECHO', 20, 104);
  g.textAlign = 'right'; g.fillStyle = RED; g.fillText('150', W - 20, 104);
  setFont(g, 20, 700); g.fillStyle = 'rgba(236,230,216,.6)'; g.fillText('BPM', W - 22, 146);
  g.textAlign = 'center';
  ['1/4', '1/2', '3/4', '1', '2'].forEach((s, i) => {
    const x = 60 + i * 98;
    if (i === 1) { g.fillStyle = RED; g.fillRect(x - 40, 172, 80, 46); }
    g.strokeStyle = 'rgba(236,230,216,.4)'; g.lineWidth = 2; g.strokeRect(x - 40, 172, 80, 46);
    setFont(g, 26, 800); g.fillStyle = i === 1 ? '#0e0d0c' : BONE; g.fillText(s, x, 196);
  });
  g.strokeStyle = BONE; g.lineWidth = 3; g.beginPath(); g.moveTo(24, H - 26);
  for (let x = 24; x < W - 24; x++) g.lineTo(x, H - 26 - Math.pow((x - 24) / (W - 48), 1.6) * 92);
  g.stroke();
  return tex(c);
}

/* fieltro de la mesa de la cabina, con la sombra de contacto de cada equipo horneada */
export function boothTexture(W, D, units, cz = 0) {
  const k = 1.2;
  const c = document.createElement('canvas'); c.width = Math.round(W * k); c.height = Math.round(D * k);
  const g = c.getContext('2d');
  g.fillStyle = '#19181a'; g.fillRect(0, 0, c.width, c.height);
  const r = rng(11);
  for (let i = 0; i < 9000; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? '255,255,255' : '0,0,0'},${(r() * 0.05).toFixed(3)})`;
    g.fillRect(r() * c.width, r() * c.height, 1 + r() * 2, 1 + r() * 2);
  }
  g.filter = 'blur(10px)';
  g.fillStyle = 'rgba(0,0,0,.5)';
  for (const u of units) g.fillRect((u.x - u.w / 2 + W / 2) * k - 4, (u.z - cz - u.d / 2 + D / 2) * k - 2, u.w * k + 8, u.d * k + 10);
  g.filter = 'none';
  return tex(c);
}

export function loadImage(url) {
  return new Promise((res) => {
    if (!url) return res(null);
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = url;
  });
}

/* rugosidad del aluminio cepillado: vetas finas a lo ancho (canal G = rugosidad) */
export function brushedRoughness(seed = 3) {
  const S = 512;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = 'rgb(0,118,0)'; g.fillRect(0, 0, S, S);
  const r = rng(seed);
  for (let i = 0; i < 2600; i++) {
    const v = 70 + Math.floor(r() * 110);
    g.fillStyle = `rgba(0,${v},0,${(0.25 + r() * 0.5).toFixed(2)})`;
    const y = r() * S, w = 40 + r() * 400;
    const x = r() * S;
    g.fillRect(x, y, w, 1); if (x + w > S) g.fillRect(x - S, y, w, 1);
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
