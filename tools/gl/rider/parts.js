/* Piezas y "kit" de armado. Unidades: milímetros. Ejes: x → derecha, y ↑, z → hacia el DJ.
   Cada pieza aporta su sólido (agrupado por material para dibujarlo en pocas llamadas)
   y sus trazos de tinta (contornos limpios, como en un plano técnico). */
import {
  Float32BufferAttribute, LatheGeometry, CylinderGeometry, BoxGeometry, PlaneGeometry, TorusGeometry,
  Matrix4, Euler, Vector2, Vector3, CatmullRomCurve3, TubeGeometry
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const M = new Matrix4();
const E = new Euler();

export function xf(geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  M.makeRotationFromEuler(E.set(rx, ry, rz));
  M.setPosition(x, y, z);
  geo.applyMatrix4(M);
  return geo;
}

function clean(geo) {
  for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') geo.deleteAttribute(k);
  const n = geo.attributes.position.count;
  if (!geo.attributes.uv) geo.setAttribute('uv', new Float32BufferAttribute(new Float32Array(n * 2), 2));
  if (!geo.attributes.normal) geo.computeVertexNormals();
  if (!geo.index) geo.setIndex(Array.from({ length: n }, (_, i) => i));
  geo.morphAttributes = {};
  return geo;
}

export class Kit {
  constructor(seg = 1) {
    this.seg = seg;            // calidad: 1 = completa, 0.5 = equipos de baja potencia
    this.parts = new Map();
    this.ln = [];
    this.foot = [];            // huellas sobre el panel: sombra de contacto horneada en la serigrafía
  }
  n(base, min = 8) { return Math.max(min, Math.round(base * this.seg)); }
  add(key, geo) {
    if (!this.parts.has(key)) this.parts.set(key, []);
    this.parts.get(key).push(clean(geo));
    return this;
  }
  seg2(a, b) { this.ln.push(a.x, a.y, a.z, b.x, b.y, b.z); }
  poly(pts, closed = true) {
    for (let i = 0; i < pts.length - (closed ? 0 : 1); i++) this.seg2(pts[i], pts[(i + 1) % pts.length]);
  }
  rect(x, y, z, w, d) {
    const a = w / 2, b = d / 2;
    this.poly([new Vector3(x - a, y, z - b), new Vector3(x + a, y, z - b), new Vector3(x + a, y, z + b), new Vector3(x - a, y, z + b)]);
  }
  circle(x, y, z, r, n = 40) {
    const pts = [];
    for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; pts.push(new Vector3(x + Math.cos(t) * r, y, z + Math.sin(t) * r)); }
    this.poly(pts);
  }
  box(x, y0, z, w, h, d) {
    this.rect(x, y0, z, w, d); this.rect(x, y0 + h, z, w, d);
    const a = w / 2, b = d / 2;
    [[-a, -b], [a, -b], [a, b], [-a, b]].forEach(([u, v]) => this.seg2(new Vector3(x + u, y0, z + v), new Vector3(x + u, y0 + h, z + v)));
  }
  build() {
    const meshes = [];
    for (const [key, list] of this.parts) meshes.push({ key, geo: mergeGeometries(list, false) });
    return { meshes, lines: new Float32Array(this.ln) };
  }
}

/* ---------- sólidos ---------- */

export const rbox = (w, h, d, r, s = 2) => new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2 - 0.01, h / 2 - 0.01, d / 2 - 0.01));

// perilla: faldón, cuerpo estriado, tapa biselada; el cero apunta hacia atrás (−z)
export function knobGeo(kit, r, h, ridges = 18, skirt = true) {
  const pts = [];
  if (skirt) pts.push(new Vector2(r * 1.32, 0), new Vector2(r * 1.32, 1.0), new Vector2(r * 1.12, 2.0), new Vector2(r * 1.02, 2.4));
  else pts.push(new Vector2(r * 1.04, 0), new Vector2(r * 1.02, 0.8));
  pts.push(new Vector2(r, h * 0.25), new Vector2(r * 0.97, h - 1.8), new Vector2(r * 0.9, h - 0.5), new Vector2(r * 0.8, h), new Vector2(0, h));
  const seg = kit.n(ridges * 4, 24);
  const g = new LatheGeometry(pts, seg);
  const p = g.attributes.position;
  const y0 = skirt ? 2.6 : 1.0, y1 = h - 1.9;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y < y0 || y > y1) continue;
    const x = p.getX(i), z = p.getZ(i);
    const th = Math.atan2(z, x);
    const k = 1 - 0.06 * Math.pow(Math.max(0, Math.cos(th * ridges)), 3);
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  return g;
}

// botón redondo con chaflán
export function capGeo(kit, r, h) {
  const pts = [new Vector2(r, 0), new Vector2(r, h - 1.2), new Vector2(r - 0.7, h - 0.2), new Vector2(r - 1.4, h), new Vector2(0, h)];
  return new LatheGeometry(pts, kit.n(36, 16));
}

// anillo (bisel, aro de LED)
export function ringGeo(kit, r0, r1, y0, h) {
  const pts = [new Vector2(r0, y0), new Vector2(r1, y0), new Vector2(r1, y0 + h), new Vector2(r0, y0 + h), new Vector2(r0, y0)];
  return new LatheGeometry(pts, kit.n(48, 20));
}

export const cyl = (kit, r, h, n = 32) => new CylinderGeometry(r, r, h, kit.n(n, 10), 1);
export const plane = (w, d) => new PlaneGeometry(w, d).rotateX(-Math.PI / 2);
export const torus = (kit, R, r, n = 64) => new TorusGeometry(R, r, 6, kit.n(n, 24)).rotateX(Math.PI / 2);
export const box = (w, h, d) => new BoxGeometry(w, h, d);

/* ---------- piezas compuestas (sólido + tinta) ---------- */

// perilla completa sobre el panel en y0; ang en radianes (0 = apunta atrás)
export function knob(kit, x, y0, z, r, h, ang, o = {}) {
  const g = knobGeo(kit, r, h, o.ridges || 18, o.skirt !== false);
  kit.add(o.mat || 'knob', xf(g, x, y0, z, 0, -ang, 0));
  // inserto indicador
  const L = r * 0.78;
  const mark = box(Math.max(0.9, r * 0.11), 0.5, L).translate(0, h + 0.05, -L / 2 - r * 0.1).rotateY(-ang).translate(x, y0, z);
  kit.add('mark', mark);
  if (o.cap) kit.add(o.cap, xf(new CylinderGeometry(r * 0.62, r * 0.62, 0.6, kit.n(28, 12)), x, y0 + h + 0.1, z));
  kit.circle(x, y0 + h, z, r * 0.8, 28);
  kit.circle(x, y0, z, (o.skirt !== false ? 1.32 : 1.04) * r, 32);
  kit.foot.push({ x, z, r: r * 1.32, h });
  const d = new Vector3(Math.sin(ang), 0, -Math.cos(ang));
  kit.seg2(new Vector3(x + d.x * r * 0.15, y0 + h, z + d.z * r * 0.15), new Vector3(x + d.x * r * 0.78, y0 + h, z + d.z * r * 0.78));
}

// botón rectangular de goma/plástico; led opcional en el borde trasero
export function button(kit, x, y0, z, w, d, h, o = {}) {
  kit.add(o.mat || 'rubber', xf(rbox(w, h, d, o.r ?? 1.4), x, y0 + h / 2, z));
  if (o.led) kit.add(o.led, xf(box(w * 0.62, 0.4, Math.min(1.6, d * 0.18)), x, y0 + h + 0.05, z - d * 0.28));
  kit.box(x, y0, z, w, h, d);
  kit.foot.push({ x, z, w, d, h });
}

// botón redondo con bisel metálico y aro de led opcional
export function roundButton(kit, x, y0, z, r, h, o = {}) {
  if (o.bezel) kit.add(o.bezel, xf(ringGeo(kit, r + 0.4, r + 2.4, 0, 2.2), x, y0, z));
  if (o.ring) kit.add(o.ring, xf(ringGeo(kit, r + 0.05, r + 0.9, 0, h * 0.8), x, y0 + 0.4, z));
  kit.add(o.mat || 'rubber', xf(capGeo(kit, r, h), x, y0, z));
  kit.circle(x, y0 + h, z, r - 1.2, 32);
  kit.circle(x, y0, z, r + (o.bezel ? 2.4 : 0), 36);
  kit.foot.push({ x, z, r: r + (o.bezel ? 2.4 : 0), h });
}

// ranura de fader (rebaje) + regla
export function faderSlot(kit, x, y0, z, len, axis = 'z', w = 3.2) {
  const [sw, sd] = axis === 'z' ? [w, len] : [len, w];
  kit.add('slot', xf(box(sw, 0.6, sd), x, y0 + 0.05, z));
  kit.rect(x, y0 + 0.4, z, sw, sd);
}

// capuchón de fader (devuelve la geometría centrada para animarlo aparte)
export function faderCapGeo(w, h, d) {
  const g = rbox(w, h, d, 1.2, 2);
  xf(g, 0, h / 2 + 3, 0);
  const stem = box(2, 3.2, 2); xf(stem, 0, 1.6, 0);
  return [g, stem];
}

// cable: tubo por una curva (alimentación / audio) que sale por detrás del equipo
export function cable(kit, pts, r, key = 'cable') {
  const curve = new CatmullRomCurve3(pts.map((p) => new Vector3(...p)));
  kit.add(key, new TubeGeometry(curve, kit.n(48, 16), r, kit.n(10, 6), false));
  const n = 24;
  for (let i = 0; i < n; i++) kit.seg2(curve.getPoint(i / n), curve.getPoint((i + 1) / n));
}
