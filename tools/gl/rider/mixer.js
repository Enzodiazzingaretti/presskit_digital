/* Mixer de club de 6 canales (diseño propio KEXXY) a medida real: 437,6 × 467 mm, 107,9 mm de alto. */
import { Vector3 } from 'three';
import { Kit, xf, rbox, box, cyl, plane, knob, button, roundButton, faderSlot, faderCapGeo } from './parts.js';
import { Panel, RED } from './panels.js';

export const MIXER = { W: 437.6, D: 467, H: 107.9, FEET: 5, PY: 86 };
const { W, D, FEET, PY } = MIXER;
export const STRIP_X = [0, 1, 2, 3, 4, 5].map((i) => -127 + i * 38);
export const CH_FADER = { z: 98, len: 86 };
export const XFADER = { x: -32, z: 198, len: 72 };
export const METERS = [];                       // { x, z, len, w, ch }

const EQ = ['HI', 'HI MID', 'LOW MID', 'LOW'];

export function buildMixerStatic(q) {
  const kit = new Kit(q);
  const P = new Panel(W - 4, D - 4, q < 1 ? 2.8 : 4.2, 29);
  METERS.length = 0;
  const y = PY;

  // carcasa: laterales gruesos, tornillos, patas
  kit.add('body', xf(rbox(W, PY - FEET, D, 3.5, 3), 0, FEET + (PY - FEET) / 2, 0));
  kit.box(0, FEET, 0, W, PY - FEET, D);
  for (const [fx, fz] of [[-190, -205], [190, -205], [-190, 205], [190, 205]]) kit.add('rubber', xf(cyl(kit, 14, FEET, 24), fx, FEET / 2, fz));
  kit.add('plate', xf(plane(W - 4, D - 4), 0, y + 0.02, 0));
  const screw = (x, yy, z, rx = 0, rz = 0) => kit.add('alu', xf(cyl(kit, 2.1, 0.8, 14), x, yy, z, rx, 0, rz));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) screw(sx * (W / 2 - 7), y + 0.35, sz * (D / 2 - 7));
  for (const sz of [-150, -50, 50, 150]) { screw(-W / 2 + 7, y + 0.35, sz); screw(W / 2 - 7, y + 0.35, sz); }
  for (const zz of [-180, -60, 60, 180]) for (const sx of [-1, 1]) screw(sx * (W / 2 + 0.3), 60, zz, 0, Math.PI / 2);
  for (const xx of [-170, -60, 60, 170]) { screw(xx, 64, D / 2 + 0.3, Math.PI / 2); screw(xx, 30, D / 2 + 0.3, Math.PI / 2); }
  // tomas de auriculares en el frente
  for (const jx of [-198, -176]) {
    kit.add('alu', xf(cyl(kit, 6.5, 2, 28), jx, 46, D / 2 + 1, Math.PI / 2));
    kit.add('slot', xf(cyl(kit, jx === -198 ? 3.4 : 2, 2.2, 20), jx, 46, D / 2 + 1.2, Math.PI / 2));
  }

  // marcos de secciones
  P.frame(-182, 0, 64, D - 24, { radius: 2.5 });
  P.frame(-32, -118, 232, 210, { radius: 2.5 });
  P.frame(151, -20, 126, D - 72, { radius: 2.5 });

  // --- columna izquierda ---
  P.text('USB A', -196, -221, { size: 1.9 }).text('USB B', -168, -221, { size: 1.9 });
  for (const ux of [-196, -168]) { kit.add('slot', xf(box(13, 1, 11), ux, y + 0.4, -208)); kit.rect(ux, y + 1, -208, 13, 11); kit.add('ledRed', xf(box(8, 0.5, 1.4), ux, y + 0.3, -199)); }
  P.text('MIC', -182, -188, { size: 2.6, weight: 800 });
  [-196, -168].forEach((x, i) => { knob(kit, x, y, -173, 6.2, 11, -0.6 + i * 0.4, { ridges: 14 }); P.scale(x, -173, 8.2, { n: 9 }).text(i ? 'MIC 2' : 'MIC 1', x, -162.5, { size: 1.8 }); });
  [-196, -168].forEach((x, i) => { knob(kit, x, y, -144, 6, 10, i ? 0.4 : -0.3, { ridges: 14 }); P.scale(x, -144, 8, { n: 7 }).text(i ? 'HI' : 'LOW', x, -133.5, { size: 1.8 }); });
  kit.add('rubber', xf(rbox(20, 2.5, 8, 1), -182, y + 1.25, -118)); kit.box(-182, y, -118, 20, 2.5, 8);
  kit.add('alu', xf(box(5, 5, 4), -188, y + 3, -118));
  P.text('OFF   ON   TALK', -182, -110, { size: 1.6 });
  P.text('FILTER', -182, -98, { size: 2.6, weight: 800 });
  roundButton(kit, -196, y, -84, 6, 3.5, { ring: 'ledRed' }); roundButton(kit, -168, y, -84, 6, 3.5, { ring: 'ledRed' });
  P.text('LPF', -196, -75, { size: 1.9 }).text('HPF', -168, -75, { size: 1.9 });
  knob(kit, -182, y, -56, 8, 13, 0.9, { ridges: 16 });
  P.scale(-182, -56, 10.5, { n: 11, min: 'MIN', max: 'MAX' }).text('RESONANCE', -182, -42, { size: 1.9 });
  P.text('SEND', -182, -30, { size: 2.6, weight: 800 });
  [[-196, -16], [-168, -16], [-196, 4], [-168, 4]].forEach(([x, z], i) => { roundButton(kit, x, y, z, 5.2, 3.2, { ring: i === 0 ? 'ledBone' : null }); });
  P.text('DELAY   ECHO', -182, 14, { size: 1.6 });
  [-196, -168].forEach((x, i) => { knob(kit, x, y, 34, 6.5, 11, i ? 0.6 : -0.5, { ridges: 14 }); P.scale(x, 34, 8.5, { n: 9 }).text(i ? 'TIME' : 'TONE', x, 45, { size: 1.8 }); });
  P.text('HEADPHONES A', -182, 62, { size: 2.4, weight: 800 });
  [-196, -168].forEach((x, i) => { knob(kit, x, y, 80, 7.5, 12, i ? 1.2 : 0, { ridges: 16 }); P.scale(x, 80, 9.5, { n: 9, min: i ? '' : 'CUE', max: i ? '' : 'MST' }).text(i ? 'LEVEL' : 'MIX', x, 93, { size: 1.9 }); });
  roundButton(kit, -196, y, 110, 4.8, 3.2, { mat: 'capBone', ring: 'ledBone' }); roundButton(kit, -168, y, 110, 4.8, 3.2);
  P.text('LINK', -196, 119, { size: 1.7 }).text('SPLIT', -168, 119, { size: 1.7 });
  P.text('PHONES A', -187, 226, { size: 1.9 });

  // --- 6 canales ---
  STRIP_X.forEach((cx, i) => {
    const live = i < 4;
    P.line(cx + 19, -224, cx + 19, 214, { color: 'rgba(236,230,216,.14)' });
    knob(kit, cx, y, -211, 5.6, 9, -1.4 + (i % 3) * 1.4, { skirt: false, ridges: 10 });
    P.text(live ? 'USB' : 'LINE', cx + 11, -211, { size: 1.6, align: 'left' });
    knob(kit, cx, y, -185, 7.2, 12, live ? 0.25 : -0.9, { ridges: 16 });
    P.scale(cx, -185, 9.2, { n: 11 }).text('TRIM', cx, -173.5, { size: 1.8 });
    EQ.forEach((s, e) => {
      const z = -152 + e * 29;
      knob(kit, cx + 4, y, z, 7.6, 13, live ? [0.2, -0.3, 0.1, i === 1 ? -1.9 : 0.35][e] : 0, { ridges: 16 });
      P.scale(cx + 4, z, 9.6, { n: 11 }).text(s, cx + 4, z + 12.2, { size: 1.6 });
    });
    METERS.push({ x: cx - 13.5, z: -109, len: 104, w: 3.4, ch: i });
    P.frame(cx - 13.5, -109, 5.6, 108, { radius: 0.8, color: 'rgba(236,230,216,.2)' });
    knob(kit, cx, y, -36, 9.4, 14, live ? [0.6, -0.5, 0, 0.9][i] : 0, { mat: 'knobRed', ridges: 18 });
    P.scale(cx, -36, 12.2, { n: 13, min: 'LPF', max: 'HPF' }).text('FILTER', cx, -18.5, { size: 1.8 });
    roundButton(kit, cx, y, -4, 5.2, 3.2, { ring: i === 2 ? 'ledRed' : null });
    P.text('FX', cx, 4.6, { size: 1.6 });
    button(kit, cx, y, 18, 16, 9, 4, { mat: 'capBone', led: live && i === 1 ? 'ledRed' : null });
    P.text('CUE', cx, 18, { size: 2.2, color: 'rgba(14,13,12,.85)' });
    P.text(String(i + 1), cx, 37, { size: 6.4, weight: 900 });
    faderSlot(kit, cx, y, CH_FADER.z, CH_FADER.len, 'z', 3);
    for (let t = 0; t <= 10; t++) {
      const zz = CH_FADER.z - CH_FADER.len / 2 + 4 + t * ((CH_FADER.len - 8) / 10);
      P.line(cx - 8.5, zz, cx - (t % 5 === 0 ? 4 : 5.5), zz, { width: t % 5 === 0 ? 0.36 : 0.22 });
      if (t % 5 === 0) P.text(String(10 - t), cx + 8.5, zz, { size: 1.7 });
    }
    // conmutador de asignación al crossfader
    kit.add('slot', xf(box(12, 0.6, 5), cx, y + 0.3, 158)); kit.rect(cx, y + 0.6, 158, 12, 5);
    kit.add('alu', xf(rbox(3.6, 4, 3.6, 0.6), cx + (i % 2 ? 3.6 : -3.6), y + 2, 158));
    P.text('A  THRU  B', cx, 151, { size: 1.5 });
  });
  P.text('CROSSFADER ASSIGN', -32, 167, { size: 1.8 }).line(-140, 164, 76, 164);
  faderSlot(kit, XFADER.x, y, XFADER.z, XFADER.len, 'x', 3.2);
  P.text('A', XFADER.x - 46, XFADER.z, { size: 3 }).text('B', XFADER.x + 46, XFADER.z, { size: 3 });
  P.text('CROSSFADER', XFADER.x, XFADER.z + 15, { size: 2 });

  // --- sección master / efectos ---
  P.text('MASTER', 110, -224, { size: 2.6, weight: 800 });
  knob(kit, 106, y, -205, 9.4, 14, 0.5, { ridges: 18 });
  P.scale(106, -205, 12, { n: 11, min: '−∞', max: '+5' });
  knob(kit, 106, y, -170, 7.4, 12, 0.1, { ridges: 16 });
  P.scale(106, -170, 9.5, { n: 9 }).text('BOOTH', 106, -158, { size: 1.8 });
  [0, 1].forEach((c) => METERS.push({ x: 128 + c * 7.5, z: -150, len: 120, w: 3.6, ch: 6 + c }));
  P.frame(131.75, -150, 13, 124, { radius: 1, color: 'rgba(236,230,216,.2)' }).text('L   R', 131.75, -84, { size: 1.6 });
  P.text('ISOLATOR', 182, -224, { size: 2.6, weight: 800 });
  ['HI', 'MID', 'LOW'].forEach((s, i) => {
    const z = -198 + i * 42;
    knob(kit, 182, y, z, 12.6, 17, i === 2 ? -0.35 : 0, { ridges: 22 });
    P.scale(182, z, 16, { n: 11, min: '−∞', max: '+6' }).text(s, 200, z - 13, { size: 1.9 });
  });
  roundButton(kit, 106, y, -134, 5, 3.2, { ring: 'ledRed' });
  P.text('ISO ON', 106, -125, { size: 1.7 });
  [[106, -105, 'HI'], [106, -80, 'LOW']].forEach(([x, z, s]) => { knob(kit, x, y, z, 5.8, 10, 0.2, { ridges: 12 }); P.scale(x, z, 7.6, { n: 7 }).text(s, x + 10, z, { size: 1.6, align: 'left' }); });
  P.text('BOOTH EQ', 106, -66, { size: 1.7 });
  // pantalla de efectos (el panel de vidrio se arma aparte)
  kit.add('bezel', xf(box(74, 1, 52), 165, y + 0.5, -38)); kit.rect(165, y + 1, -38, 74, 52); kit.rect(165, y + 1.05, -38, 66, 45);
  P.text('BEAT FX', 140, -71, { size: 2.2, weight: 800 }).text('SETTINGS', 190, -71, { size: 1.7 });
  [[128, '◄'], [153, 'TAP'], [178, '►']].forEach(([x, s]) => { button(kit, x, y, 2, 15, 9, 4, { mat: x === 153 ? 'capRed' : 'rubber' }); P.text(s === 'TAP' ? 'TAP' : s, x, 11.5, { size: 1.6 }); });
  P.text('BEAT', 153, -8, { size: 1.8 });
  [[128, 'LOW'], [153, 'MID'], [178, 'HI']].forEach(([x, s], i) => { roundButton(kit, x, y, 26, 5.4, 3.3, { mat: 'rubber', ring: i === 0 ? 'ledRed' : 'ledRedDim' }); P.text(s, x, 35, { size: 1.6 }); });
  P.text('FX FREQUENCY', 153, 42, { size: 1.8 });
  knob(kit, 153, y, 64, 10.4, 14, -1.1, { ridges: 20 });
  ['ECHO', 'DELAY', 'REVERB', 'FILTER', 'ROLL', 'TRANS', 'PITCH', 'CRUSH'].forEach((s, i) => {
    const a = -2.2 + i * (4.4 / 7);
    P.text(s, 153 + Math.sin(a) * 21, 64 - Math.cos(a) * 17, { size: 1.5, color: i === 0 ? RED : undefined });
  });
  [[118, 102, 'TIME'], [188, 102, 'DEPTH']].forEach(([x, z, s], i) => { knob(kit, x, y, z, 8.2, 13, i ? 0.7 : -0.2, { ridges: 16 }); P.scale(x, z, 10.4, { n: 11, min: 'MIN', max: 'MAX' }).text(s, x, z + 14.5, { size: 1.8 }); });
  roundButton(kit, 188, y, 146, 12.5, 6, { mat: 'capRed', bezel: 'alu', ring: 'ledRed' });
  P.text('ON / OFF', 188, 165.5, { size: 2 });
  P.text('HEADPHONES B', 118, 128, { size: 2, weight: 800 });
  [[108, 146, 'MIX'], [130, 146, 'LEVEL']].forEach(([x, z, s], i) => { knob(kit, x, y, z, 6.6, 11, i ? 0.9 : 0, { ridges: 14 }); P.scale(x, z, 8.6, { n: 9 }).text(s, x, z + 11, { size: 1.7 }); });
  roundButton(kit, 108, y, 176, 4.6, 3.2, { mat: 'capBone' });
  P.text('CUE B', 108, 184.5, { size: 1.7 });

  // marca y modelo (propios)
  P.text('KEXXY', 150, 205, { size: 6.4, weight: 900, track: 0.18, color: 'rgba(236,230,216,.92)' });
  P.text('6 CHANNEL CLUB MIXER', 150, 216, { size: 2 });
  P.text('KX-M6', 204, 226, { size: 3.2, weight: 800, align: 'right', color: RED });

  P.shadows(kit.foot);
  return { kit, panel: P };
}

export function buildChannelCap(q) {
  const kit = new Kit(q);
  const [cap, stem] = faderCapGeo(13, 9, 9);
  kit.add('capBlack', cap); kit.add('rubber', stem);
  kit.add('mark', box(11.6, 0.4, 1).translate(0, 12.25, 0));
  kit.box(0, 3, 0, 13, 9, 9);
  return kit;
}

export function buildCrossCap(q) {
  const kit = new Kit(q);
  const [cap, stem] = faderCapGeo(9, 9, 17);
  kit.add('capAlu', cap); kit.add('rubber', stem);
  kit.add('mark', box(1, 0.4, 15).translate(0, 12.25, 0));
  kit.box(0, 3, 0, 9, 9, 17);
  return kit;
}
