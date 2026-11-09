/* Player de club (diseño propio KEXXY) a medida real: 329 × 453 mm, 118 mm de alto con patas,
   jog de 206 mm y pantalla de 9" sobre un módulo trasero inclinado. */
import { ExtrudeGeometry, Shape, Matrix4, Vector3, CircleGeometry, LatheGeometry, Vector2 } from 'three';
import { Kit, xf, rbox, box, cyl, plane, torus, ringGeo, knob, button, roundButton, faderSlot, faderCapGeo } from './parts.js';
import { Panel, RED } from './panels.js';

export const DECK = { W: 329, D: 453, H: 118, FEET: 14, PY: 96 };
const { W, D, FEET, PY } = DECK;

// módulo de pantalla: de 118 mm atrás a 102 mm adelante
const POD = { z0: -224, z1: -72, y0: 118, y1: 102, x0: -150, x1: 150 };
const POD_BEVEL = 1.6;                                          // el bisel del extruido levanta la cara superior
const SLOPE = (POD.y0 - POD.y1) / (POD.z1 - POD.z0);
const TILT = Math.atan(SLOPE);
const SC = { x: -6, z: -148 };                                  // centro de la pantalla
SC.y = POD.y0 - (SC.z - POD.z0) * SLOPE;
export const JOG = { x: 6, z: 112, R: 103 };
export const TEMPO = { x: 145, z: 150, len: 110 };

// matriz que lleva el plano XZ local (y ↑) a la superficie inclinada del módulo; s avanza hacia el DJ
function podMatrix(x, s, off) {
  const n = new Vector3(0, Math.cos(TILT), Math.sin(TILT));
  const t = new Vector3(0, -Math.sin(TILT), Math.cos(TILT));
  const p = new Vector3(x, SC.y, SC.z).addScaledVector(t, s).addScaledVector(n, off + POD_BEVEL);
  return new Matrix4().makeRotationX(TILT).setPosition(p);
}

export function buildDeckStatic(q) {
  const kit = new Kit(q);
  const P = new Panel(W - 4, D - 4, q < 1 ? 3.1 : 4.6, 13);

  // chasis, patas y módulo de pantalla
  kit.add('body', xf(rbox(W, PY - FEET - 1, D, 5, 3), 0, FEET + (PY - FEET - 1) / 2, 0));
  kit.box(0, FEET, 0, W, PY - FEET, D);
  for (const [fx, fz] of [[-118, -176], [118, -176], [-118, 176], [118, 176]]) {
    kit.add('alu', xf(cyl(kit, 21, FEET - 2, 40), fx, (FEET - 2) / 2 + 2, fz));
    kit.add('rubber', xf(cyl(kit, 19, 2, 32), fx, 1, fz));
  }
  const prof = new Shape();
  prof.moveTo(POD.z0, PY - 1); prof.lineTo(POD.z0, POD.y0); prof.lineTo(POD.z1, POD.y1); prof.lineTo(POD.z1, PY - 1);
  const pod = new ExtrudeGeometry(prof, { depth: POD.x1 - POD.x0, bevelEnabled: true, bevelThickness: POD_BEVEL, bevelSize: POD_BEVEL, bevelSegments: 2, curveSegments: 1 });
  pod.rotateY(-Math.PI / 2).translate(POD.x1, 0, 0);
  kit.add('body', pod);
  {
    const a = (z) => POD.y0 - (z - POD.z0) * SLOPE;
    const c = [new Vector3(POD.x0, a(POD.z0), POD.z0), new Vector3(POD.x1, a(POD.z0), POD.z0), new Vector3(POD.x1, a(POD.z1), POD.z1), new Vector3(POD.x0, a(POD.z1), POD.z1)];
    kit.poly(c);
    for (const p of c) kit.seg2(p, new Vector3(p.x, PY, p.z));
    kit.seg2(new Vector3(POD.x0, PY, POD.z1), new Vector3(POD.x1, PY, POD.z1));
  }

  // panel superior (serigrafía) con su textura
  kit.add('plate', xf(plane(W - 4, D - 4), 0, PY + 0.02, 0));

  // --- controles sobre el módulo inclinado ---
  const sub = new Kit(q);
  sub.add('bezel', box(224, 1.2, 138).translate(SC.x, 0.6, 0));
  sub.rect(SC.x, 1.2, 0, 224, 138);
  sub.rect(SC.x, 1.25, 0, 214, 128);
  // puerto USB + led, botones de fuente y menú
  sub.add('slot', box(20, 1, 10).translate(-136, 0.5, -46));
  sub.add('ledRed', box(12, 0.5, 1.6).translate(-136, 0.4, -36));
  sub.rect(-136, 1, -46, 20, 10);
  ['SOURCE', 'BROWSE', 'MENU'].forEach((s, i) => button(sub, -136, 0, -12 + i * 20, 18, 8, 4, { led: i === 0 ? 'ledBone' : null }));
  // encoder de navegación + botones
  knob(sub, 127, 0, -4, 11.5, 15, 0.6, { mat: 'knob', cap: 'alu', ridges: 22 });
  [[117, -44], [138, -44], [117, 34], [138, 34]].forEach(([x, s]) => button(sub, x, 0, s, 17, 9, 4));
  const pm = podMatrix(0, 0, 0);
  for (const [key, list] of sub.parts) list.forEach((g) => kit.add(key, g.applyMatrix4(pm)));
  for (let i = 0; i < sub.ln.length; i += 3) {
    const v = new Vector3(sub.ln[i], sub.ln[i + 1], sub.ln[i + 2]).applyMatrix4(pm);
    kit.ln.push(v.x, v.y, v.z);
  }

  // --- panel principal ---
  const y = PY;
  // pads de performance
  for (let i = 0; i < 8; i++) {
    const x = -108.5 + i * 31;
    button(kit, x, y, -50, 26, 13, 4.2, { mat: 'pad', r: 1.8 });
    P.text(String.fromCharCode(65 + i), x - 10, -59.5, { size: 2.2, align: 'left' });
  }
  P.frame(0, -50, 252, 26).text('PERFORMANCE PADS', 0, -66, { size: 2.3 });
  // loop
  roundButton(kit, -140, y, -22, 8, 5, { mat: 'capBone', ring: 'ledBone' });
  roundButton(kit, -116, y, -22, 8, 5, { mat: 'capBone', ring: 'ledBone' });
  roundButton(kit, -93, y, -22, 6, 4, { mat: 'rubber' });
  P.text('IN', -140, -34, { size: 2.4 }).text('OUT', -116, -34, { size: 2.4 }).text('EXIT', -93, -34, { size: 2.2 });
  button(kit, -140, y, 2, 16, 8, 4); button(kit, -116, y, 2, 16, 8, 4);
  P.text('½ LOOP', -140, 11, { size: 2 }).text('2× LOOP', -116, 11, { size: 2 }).line(-150, 16, -104, 16);
  button(kit, -146, y, 28, 12, 8, 4); button(kit, -130, y, 28, 12, 8, 4);
  P.text('◄', -146, 28, { size: 2.6, color: 'rgba(14,13,12,0)' }).text('BEAT JUMP', -138, 37, { size: 2.1 });
  // palanca de dirección
  kit.add('rubber', xf(rbox(30, 3, 18, 1.2), -138, y + 1.5, 62));
  kit.box(-138, y, 62, 30, 3, 18);
  kit.add('alu', xf(rbox(5, 10, 5, 1.2), -146, y + 6, 62, 0, 0, 0.35));
  P.text('FWD', -124, 57, { size: 2 }).text('REV', -124, 67, { size: 2, color: RED }).text('DIRECTION', -138, 49, { size: 2.1 });
  // búsqueda
  [[92, 'TRACK SEARCH'], [122, 'SEARCH']].forEach(([z, s]) => {
    roundButton(kit, -147, y, z, 7.5, 4.5); roundButton(kit, -129, y, z, 7.5, 4.5);
    P.text(s, -138, z - 11.5, { size: 2.1 });
  });
  // CUE y PLAY
  roundButton(kit, -138, y, 152, 18.5, 6.5, { mat: 'capBlack', bezel: 'alu', ring: 'ledBone' });
  roundButton(kit, -138, y, 198, 18.5, 6.5, { mat: 'capBlack', bezel: 'alu', ring: 'playRing' });
  P.text('CUE', -138, 152, { size: 3.2, color: 'rgba(236,230,216,0)' }).text('PLAY / PAUSE', -138, 175.5, { size: 2.2 });

  // lado derecho
  roundButton(kit, 93, y, -22, 5, 3.5); roundButton(kit, 112, y, -22, 5, 3.5);
  P.text('MEMORY', 93, -31, { size: 1.9 }).text('DELETE', 112, -31, { size: 1.9 });
  button(kit, 141, y, -22, 22, 10, 4, { led: 'ledRed' });
  P.text('VINYL / CDJ', 141, -33, { size: 2 });
  button(kit, 129, y, 4, 19, 10, 4, { led: 'ledBone' }); button(kit, 151, y, 4, 19, 10, 4, { led: 'ledRed' });
  P.text('SYNC', 129, -6, { size: 2.1 }).text('MASTER', 151, -6, { size: 2.1 });
  button(kit, 140, y, 28, 30, 9, 4, { led: 'ledBone' });
  P.text('KEY SYNC', 140, 38, { size: 2.1 });
  knob(kit, 103, y, 34, 7, 11, -0.9, { mat: 'knob', ridges: 14 });
  P.scale(103, 34, 9.3, { n: 7, min: 'LIGHT', max: 'HEAVY' }).text('JOG ADJUST', 103, 20, { size: 2 });
  roundButton(kit, 133, y, 56, 4.5, 3.5); roundButton(kit, 152, y, 56, 4.5, 3.5, { ring: 'ledRed' });
  P.text('RANGE', 133, 48, { size: 1.8 }).text('M.TEMPO', 152, 48, { size: 1.8 });
  faderSlot(kit, TEMPO.x, y, TEMPO.z, TEMPO.len, 'z', 4);
  P.frame(TEMPO.x, TEMPO.z, 22, TEMPO.len + 10, { radius: 2 });
  for (let i = 0; i <= 16; i++) {
    const zz = TEMPO.z - TEMPO.len / 2 + 3 + i * ((TEMPO.len - 6) / 16);
    P.line(TEMPO.x - 10, zz, TEMPO.x - (i % 4 === 0 ? 5 : 7), zz, { width: i % 4 === 0 ? 0.4 : 0.25 });
  }
  P.text('−', TEMPO.x + 8.5, TEMPO.z - TEMPO.len / 2 + 2, { size: 2.6 }).text('+', TEMPO.x + 8.5, TEMPO.z + TEMPO.len / 2 - 2, { size: 2.6 });
  P.text('TEMPO', TEMPO.x, TEMPO.z + TEMPO.len / 2 + 9, { size: 2.3 });
  roundButton(kit, 118, y, 206, 4, 3.5);
  P.text('RESET', 118, 214, { size: 1.8 });

  // jog: rebaje fijo (lo que gira va aparte)
  kit.add('slot', xf(ringGeo(kit, JOG.R + 0.6, JOG.R + 4.5, 0, 0.5), JOG.x, y, JOG.z));
  kit.circle(JOG.x, y, JOG.z, JOG.R + 4.5, 72);
  P.text('REV', JOG.x - 86, JOG.z + 92, { size: 2.2, rot: 0.75 }).text('FWD', JOG.x + 86, JOG.z + 92, { size: 2.2, rot: -0.75 });

  // marca y modelo (propios)
  P.text('KEXXY', 30, 214, { size: 6, weight: 900, track: 0.18, color: 'rgba(236,230,216,.9)' });
  P.text('RIDER MULTI PLAYER', 62, 214, { size: 2.2, align: 'left' });
  P.text('KX-P1', 150, 214, { size: 3.4, weight: 800, align: 'right', color: RED });

  kit.foot.push({ x: JOG.x, z: JOG.z, r: JOG.R + 3, h: 18 }, { x: TEMPO.x, z: TEMPO.z, w: 6, d: TEMPO.len, h: 1 });
  P.shadows(kit.foot);
  return { kit, panel: P };
}

/* jog que gira: plato brillante, aro moleteado de aluminio, aro led y tapa con el sigilo */
export function buildJog(q) {
  const kit = new Kit(q);
  const R = JOG.R;
  const pts = [new Vector2(R - 9, 0), new Vector2(R, 0), new Vector2(R, 13.6), new Vector2(R - 0.9, 15), new Vector2(R - 9, 15)];
  const seg = kit.n(360, 120);
  const ring = new LatheGeometry(pts, seg);
  const p = ring.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), yy = p.getY(i);
    if (r < R - 1.2 || yy < 1 || yy > 13.4) continue;
    const th = Math.atan2(z, x);
    const k = 1 - 0.011 * Math.pow(Math.max(0, Math.cos(th * 120)), 2);
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  ring.computeVertexNormals();
  kit.add('alu', ring);
  kit.add('gloss', new LatheGeometry([new Vector2(R - 9.2, 0), new Vector2(R - 9.2, 16.2), new Vector2(R - 10.4, 17.6), new Vector2(0, 17.6)], kit.n(96, 40)));
  kit.add('platter', xf(new CircleGeometry(R - 10.6, kit.n(96, 40)).rotateX(-Math.PI / 2), 0, 17.66, 0));
  kit.add('jogDisp', xf(new CircleGeometry(30, kit.n(64, 32)).rotateX(-Math.PI / 2), 0, 17.72, 0));
  kit.add('ledRed', xf(torus(kit, R - 9.6, 0.75, 96), 0, 16.7, 0));
  kit.circle(0, 0, 0, R, 72); kit.circle(0, 15, 0, R, 72); kit.circle(0, 15, 0, R - 9, 72);
  kit.circle(0, 17.6, 0, R - 10.5, 64); kit.circle(0, 17.75, 0, 30, 40);
  kit.seg2(new Vector3(0, 17.7, -33), new Vector3(0, 17.7, -(R - 13)));
  return kit;
}

export function buildTempoCap(q) {
  const kit = new Kit(q);
  const [cap, stem] = faderCapGeo(28, 8, 14);
  kit.add('capBlack', cap); kit.add('rubber', stem);
  kit.add('mark', box(26, 0.4, 1.1).translate(0, 11.25, 0));
  kit.box(0, 3, 0, 28, 8, 14);
  return kit;
}

export const SCREEN = { tilt: TILT, center: SC, podMatrix };
