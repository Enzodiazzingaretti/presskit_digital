/* KEXXY — rider técnico en 3D (Three.js)
   Fuente del bundle assets/js/rider3d.js (npm run build en tools/gl).

   Cabina de 4 players + mixer de 6 canales, diseño propio a medidas reales (mm).
   Al entrar en pantalla es un plano en tinta visto desde arriba; con el scroll la cámara baja
   a 3/4 y la tinta se revela en equipo real (aluminio anodizado, pantallas, leds a 150 BPM).
   El mouse inclina la vista. render() no guarda estado del scroll: todo sale de o.scroll. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, PMREMGenerator, Group, Mesh, Vector3, Color,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, ShaderMaterial, DirectionalLight,
  ACESFilmicToneMapping, SRGBColorSpace, MathUtils, PlaneGeometry, PCFSoftShadowMap, HemisphereLight
} from 'three';
import { studioEnvironment } from './rider/studio.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { U, INK, inkSurface, inkLine, inkGLSL } from './rider/ink.js';
import { Kit, xf, rbox, plane, cable } from './rider/parts.js';
import { deckScreen, waveTexture, jogTexture, platterTexture, fxScreen, boothTexture, brushedRoughness, tint, loadImage, BONE } from './rider/panels.js';
import { DECK, JOG, TEMPO, SCREEN, buildDeckStatic, buildJog, buildTempoCap } from './rider/deck.js';
import { MIXER, STRIP_X, CH_FADER, XFADER, METERS, buildMixerStatic, buildChannelCap, buildCrossCap } from './rider/mixer.js';

export const BPM = 150;
const BEAT = 60 / BPM;
const GAP = 12;
const SLAB = { W: 4 * DECK.W + MIXER.W + 4 * GAP + 80, D: 640, T: 34, Z: -10 };   // Z: centro (deja lugar atrás para los cables)

// orden de la cabina: 2 players | mixer | 2 players, frentes alineados
const FRONT = 235;
const UNITS = (() => {
  const xs = [];
  let x = -(4 * DECK.W + MIXER.W + 4 * GAP) / 2;
  ['deck', 'deck', 'mixer', 'deck', 'deck'].forEach((t) => {
    const w = t === 'deck' ? DECK.W : MIXER.W, d = t === 'deck' ? DECK.D : MIXER.D;
    xs.push({ t, x: x + w / 2, z: FRONT - d / 2, w, d });
    x += w + GAP;
  });
  return xs;
})();
const DECKS = [
  { n: 1, title: 'HARD TECHNO SET', genre: 'HARD TECHNO', key: '8A', bpm: '150.0', tempo: '+0.00%', time: '−04:12.6', pos: 0.62, playing: true, fader: -0.08 },
  { n: 2, title: 'HARDGROOVE SET', genre: 'HARDGROOVE', key: '5A', bpm: '148.0', tempo: '−1.33%', time: '−06:48.0', pos: 0.08, playing: false, fader: 0.18 },
  { n: 3, title: 'RAW / BOUNCE', genre: 'RAW · BOUNCE', key: '11A', bpm: '152.0', tempo: '+1.33%', time: '−02:31.9', pos: 0.81, playing: true, fader: -0.24 },
  { n: 4, title: 'INDUSTRIAL TOOL', genre: 'INDUSTRIAL', key: '3A', bpm: '150.0', tempo: '+0.00%', time: '−07:05.2', pos: 0.02, playing: false, fader: 0 }
];

/* ---------- materiales ---------- */
function makeMaterials(tx, lowPower) {
  const S = (o) => inkSurface(new MeshStandardMaterial(o));
  // en equipos de baja potencia el material físico (barniz, anisotropía) se simplifica a estándar
  const Ph = lowPower
    ? (o) => { const { clearcoat, clearcoatRoughness, anisotropy, ...rest } = o; return S(rest); }
    : (o) => inkSurface(new MeshPhysicalMaterial(o));
  const B = (c) => inkSurface(new MeshBasicMaterial({ color: new Color(c) }));
  const m = {
    body: Ph({ color: 0x141416, metalness: 0.7, roughness: 0.34, roughnessMap: tx.brush, anisotropy: 0.35, clearcoat: 0.25, clearcoatRoughness: 0.35 }),
    cable: Ph({ color: 0x0a0a0b, metalness: 0, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.5 }),
    cableRed: Ph({ color: 0x5a0712, metalness: 0, roughness: 0.45, clearcoat: 0.3 }),
    alu: S({ color: 0xa9adb3, metalness: 1, roughness: 0.3 }),
    capAlu: S({ color: 0xd8dade, metalness: 1, roughness: 0.18 }),
    rubber: S({ color: 0x1c1c1f, metalness: 0, roughness: 0.72 }),
    slot: S({ color: 0x030303, metalness: 0, roughness: 0.9 }),
    bezel: Ph({ color: 0x070708, metalness: 0.2, roughness: 0.25, clearcoat: 0.8 }),
    knob: Ph({ color: 0x18181b, metalness: 0.15, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 }),
    knobRed: Ph({ color: 0x18181b, metalness: 0.15, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3, emissive: 0x2a0207 }),
    mark: S({ color: 0xece6d8, roughness: 0.5, emissive: 0x6b675e }),
    pad: S({ color: 0x2a2a2e, roughness: 0.55, emissive: 0x3a0610 }),
    capBone: S({ color: 0xd9d2c2, roughness: 0.45, emissive: 0x2a2620 }),
    capBlack: Ph({ color: 0x111113, metalness: 0.3, roughness: 0.3, clearcoat: 0.6 }),
    capRed: S({ color: 0x8a0716, roughness: 0.4, emissive: 0x5e0010 }),
    gloss: Ph({ color: 0x060607, metalness: 0.1, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 0.35 }),
    platter: Ph({ color: 0xffffff, map: tx.platter, metalness: 0.1, roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.12, envMapIntensity: 0.25 }),
    jogDisp: S({ color: 0x000000, emissive: 0xffffff, emissiveMap: tx.jog, roughness: 0.1 }),
    ledRed: B('#ff2340'),
    ledRedDim: B('#4a0610'),
    ledBone: B('#f4ead2'),
    playRing: B('#ff2340'),
    // aluminio anodizado cepillado: reflejo estirado a lo ancho (anisotropía) y vetas en la rugosidad
    deckPlate: Ph({ color: 0xffffff, map: tx.deckPanel, metalness: 0.62, roughness: 0.5, roughnessMap: tx.brushPanel, anisotropy: 0.75, emissive: 0xffffff, emissiveMap: tx.deckPanel, emissiveIntensity: 0.11 }),
    mixerPlate: Ph({ color: 0xffffff, map: tx.mixerPanel, metalness: 0.62, roughness: 0.5, roughnessMap: tx.brushPanel, anisotropy: 0.75, emissive: 0xffffff, emissiveMap: tx.mixerPanel, emissiveIntensity: 0.11 }),
    felt: S({ color: 0xffffff, map: tx.booth, metalness: 0, roughness: 0.95 })
  };
  m.ledRed.userData.base = new Color('#ff2340');
  m.playRing.userData.base = new Color('#ff2340');
  return m;
}

function meshesFrom(built, mats, plateKey) {
  const g = new Group();
  for (const { key, geo } of built.meshes) {
    const mat = key === 'plate' ? mats[plateKey] : mats[key];
    if (!mat) { console.warn('rider3d: falta material', key); continue; }
    g.add(new Mesh(geo, mat));
  }
  return g;
}

function linesFrom(arr, mat) {
  const geo = new LineSegmentsGeometry().setPositions(arr);
  const l = new LineSegments2(geo, mat);
  l.renderOrder = 2;
  return l;
}

/* vúmetro: 15 segmentos, hueso → naranja → rojo */
function meterMaterial() {
  return new ShaderMaterial({
    uniforms: Object.assign({ uLevel: { value: 0 } }, U),
    vertexShader: inkGLSL.VERT_PARS + `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vKxW = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: inkGLSL.PARS + `
      uniform float uLevel;
      varying vec2 vUv;
      void main() {
        float N = 15.0;
        float s = floor(vUv.y * N), f = fract(vUv.y * N);
        float on = step(s + 0.5, uLevel * N);
        vec3 lit = s >= 13.0 ? vec3(1.0, 0.09, 0.2) : (s >= 10.0 ? vec3(1.0, 0.5, 0.16) : vec3(0.95, 0.91, 0.84));
        vec3 col = mix(vec3(0.06), lit, on);
        float gap = step(0.2, f) * step(f, 0.84) * step(0.14, vUv.x) * step(vUv.x, 0.86);
        gl_FragColor = vec4(mix(vec3(0.015), col, gap), 1.0);
        ${inkGLSL.SURFACE.replace(/KX_ALPHA/g, '1.0')}
      }`,
    polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 2
  });
}

/* sombra difusa de la mesa sobre el papel (sólo del lado real) */
function shadowMaterial() {
  return new ShaderMaterial({
    uniforms: Object.assign({ uHalf: { value: [SLAB.W / 2, SLAB.D / 2] }, uZ: { value: SLAB.Z } }, U),
    transparent: true, depthWrite: false, premultipliedAlpha: true,
    vertexShader: inkGLSL.VERT_PARS + `
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vKxW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: inkGLSL.PARS + `
      uniform vec2 uHalf;
      uniform float uZ;
      void main() {
        vec2 q = abs(vKxW.xz - vec2(0.0, uZ)) - uHalf;
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
        float a = (1.0 - smoothstep(-30.0, 90.0, d)) * 0.38 * smoothstep(0.55, 1.0, uInk);
        gl_FragColor = vec4(0.0, 0.0, 0.0, a);
      }`
  });
}

/* opts: { canvas, lowPower, sigilUrl, revealed, onReveal } */
export async function mountRider(opts) {
  const { canvas, lowPower = false, sigilUrl } = opts;
  let revealed = !!opts.revealed;      // una vez que la tinta se volvió real, no vuelve atrás
  const q = lowPower ? 0.5 : 1;
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: lowPower ? 'low-power' : 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  scene.environment = studioEnvironment(renderer);
  // luz clave cálida con sombras suaves, cielo/suelo de relleno y contraluz
  const key = new DirectionalLight(0xfff2e4, 2.6);
  key.position.set(-700, 1500, 950);
  key.target.position.set(0, 0, SLAB.Z);
  scene.add(key, key.target);
  if (!lowPower) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -1150, right: 1150, top: 820, bottom: -820, near: 400, far: 3600 });
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 1.2;
    key.shadow.radius = 4;
  }
  scene.add(new HemisphereLight(0xdfe4ff, 0x2a2420, 0.55));
  const rim = new DirectionalLight(0xe8eeff, 0.8); rim.position.set(900, 520, -1200); scene.add(rim);   // contraluz frío: despega los cantos del fondo

  // texturas (las fuentes de la página tienen que estar cargadas antes de dibujar)
  if (document.fonts && document.fonts.load) {
    await Promise.race([
      Promise.all([document.fonts.load('700 20px "Archivo"'), document.fonts.load('900 20px "Archivo"')]),
      new Promise((r) => setTimeout(r, 1500))
    ]).catch(() => {});
  }
  const sigil = await loadImage(sigilUrl);
  const sigilBone = tint(sigil, BONE, 512);
  const deckBuilt = buildDeckStatic(q);
  const mixBuilt = buildMixerStatic(q);
  deckBuilt.panel.image(sigilBone, -6, 214, 9, { alpha: 0.9 });
  mixBuilt.panel.image(sigilBone, 120, 206, 9, { alpha: 0.9 });
  const tx = {
    deckPanel: deckBuilt.panel.draw(),
    mixerPanel: mixBuilt.panel.draw(),
    platter: platterTexture(),
    jog: jogTexture(sigilBone),
    booth: boothTexture(SLAB.W, SLAB.D, UNITS, SLAB.Z),
    brush: brushedRoughness(3),
    brushPanel: brushedRoughness(8)
  };
  tx.brush.repeat.set(2, 2);
  tx.brushPanel.repeat.set(2.2, 3);
  const mats = makeMaterials(tx, lowPower);
  const lineMat = inkLine(new LineMaterial({ color: INK, linewidth: 1.5, worldUnits: false }));
  const lineMatThin = inkLine(new LineMaterial({ color: INK, linewidth: 1, worldUnits: false }));
  const lineMats = [lineMat, lineMatThin];

  const root = new Group(); scene.add(root);

  // mesa de la cabina + sombra
  const slab = new Mesh(xf(rbox(SLAB.W, SLAB.T, SLAB.D, 6, 2), 0, -SLAB.T / 2, SLAB.Z), mats.felt);
  // la textura del fieltro va sólo arriba: uv de la cara superior del RoundedBox ya cubre 0..1
  root.add(slab);
  const shadow = new Mesh(new PlaneGeometry(SLAB.W + 240, SLAB.D + 240).rotateX(-Math.PI / 2), shadowMaterial());
  shadow.position.set(0, -SLAB.T - 0.5, SLAB.Z);
  shadow.renderOrder = 1;
  root.add(shadow);
  {
    const k = new Kit();
    k.box(0, -SLAB.T, SLAB.Z, SLAB.W, SLAB.T, SLAB.D);
    root.add(linesFrom(k.ln, lineMat));
  }
  // cables: link de cada player al mixer apoyado sobre la mesa, y alimentación que cae por detrás
  {
    const k = new Kit(q);
    const back = SLAB.Z - SLAB.D / 2;
    const mixRear = FRONT - MIXER.D;
    UNITS.forEach((u, i) => {
      const rear = u.z - u.d / 2;
      const px = u.x + (u.t === 'deck' ? -96 : 150);
      cable(k, [[px, 44, rear + 2], [px, 30, rear - 10], [px - 4, 4, rear - 34], [px - 2, 4, back + 30], [px + 6, -12, back - 4], [px + 8, -220, back - 12]], 3.6);
      if (u.t !== 'deck') {
        [-170, -150].forEach((x) => cable(k, [[x, 40, rear + 2], [x, 22, rear - 14], [x - 6, 3.2, back + 34], [x - 4, -14, back - 4], [x - 2, -220, back - 12]], 2.8));
        return;
      }
      const side = Math.sign(u.x);
      const lx = u.x + 70, mx = side * 120;
      const lane = rear - 26 - (Math.abs(i - 2) - 1) * 12;
      cable(k, [[lx, 52, rear + 2], [lx, 34, rear - 9], [lx + 4, 3.2, rear - 22], [(lx + mx) / 2, 3.2, lane], [mx + side * 12, 3.2, mixRear - 18], [mx, 22, mixRear - 6], [mx, 44, mixRear + 2]], 2.6, 'cableRed');
    });
    const built = k.build();
    root.add(meshesFrom(built, mats));
    root.add(linesFrom(built.lines, lineMatThin));
  }

  // piezas compartidas
  const deckStatic = deckBuilt.kit.build();
  const jogBuilt = buildJog(q).build();
  const tempoBuilt = buildTempoCap(q).build();
  const mixStatic = mixBuilt.kit.build();
  const chCap = buildChannelCap(q).build();
  const xCap = buildCrossCap(q).build();
  const deckLineGeo = new LineSegmentsGeometry().setPositions(deckStatic.lines);
  const jogLineGeo = new LineSegmentsGeometry().setPositions(jogBuilt.lines);
  const tempoLineGeo = new LineSegmentsGeometry().setPositions(tempoBuilt.lines);
  const chLineGeo = new LineSegmentsGeometry().setPositions(chCap.lines);

  const decks = [];
  const waveGeo = plane(209, 40);
  const screenGeo = plane(214, 128);
  let di = 0;
  let mixer = null;
  for (const u of UNITS) {
    const g = new Group(); g.position.set(u.x, 0, u.z); root.add(g);
    if (u.t === 'deck') {
      const info = DECKS[di++];
      g.add(meshesFrom(deckStatic, mats, 'deckPlate'));
      const l = new LineSegments2(deckLineGeo, lineMat); l.renderOrder = 2; g.add(l);
      // pantalla + onda que corre
      const scr = new Mesh(screenGeo, inkSurface(new MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: deckScreen(info), roughness: 0.08, metalness: 0, envMapIntensity: 0.12 })));
      scr.applyMatrix4(SCREEN.podMatrix(SCREEN.center.x, 0, 1.3)); g.add(scr);
      const wt = waveTexture(info.n * 97); wt.repeat.set(0.42, 1);
      const wave = new Mesh(waveGeo, inkSurface(new MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: wt, roughness: 0.08, metalness: 0, envMapIntensity: 0.12 })));
      wave.applyMatrix4(SCREEN.podMatrix(SCREEN.center.x, -10.67, 1.36)); g.add(wave);
      // jog
      const jog = new Group(); jog.position.set(JOG.x, DECK.PY, JOG.z); g.add(jog);
      jog.add(meshesFrom(jogBuilt, mats));
      const jl = new LineSegments2(jogLineGeo, lineMat); jl.renderOrder = 2; jog.add(jl);
      jog.rotation.y = info.n * 1.7;
      // fader de tempo
      const cap = new Group(); cap.position.set(TEMPO.x, DECK.PY, TEMPO.z + info.fader * TEMPO.len * 0.45); g.add(cap);
      cap.add(meshesFrom(tempoBuilt, mats));
      const cl = new LineSegments2(tempoLineGeo, lineMatThin); cl.renderOrder = 2; cap.add(cl);
      decks.push({ info, jog, wt, spin: info.playing ? 1 : 0 });
    } else {
      g.add(meshesFrom(mixStatic, mats, 'mixerPlate'));
      g.add(linesFrom(mixStatic.lines, lineMat));
      const faders = STRIP_X.map((cx, i) => {
        const c = new Group(); c.position.set(cx, MIXER.PY, CH_FADER.z - CH_FADER.len * (i < 4 ? [0.36, 0.3, 0.36, 0.12][i] : -0.42)); g.add(c);
        c.add(meshesFrom(chCap, mats));
        const fl = new LineSegments2(chLineGeo, lineMatThin); fl.renderOrder = 2; c.add(fl);
        return c;
      });
      const xc = new Group(); xc.position.set(XFADER.x, MIXER.PY, XFADER.z); g.add(xc);
      xc.add(meshesFrom(xCap, mats));
      xc.add(linesFrom(xCap.lines, lineMatThin));
      const meters = METERS.map((mt) => {
        const mm = new Mesh(plane(mt.w, mt.len), meterMaterial());
        mm.position.set(mt.x, MIXER.PY + 0.25, mt.z); g.add(mm);
        return { mesh: mm, ch: mt.ch, lvl: 0 };
      });
      const fx = new Mesh(plane(66, 45), inkSurface(new MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: fxScreen(), roughness: 0.08, envMapIntensity: 0.12 })));
      fx.position.set(165, MIXER.PY + 1.12, -38); g.add(fx);
      mixer = { g, faders, xc, meters };
    }
  }

  // sombras: todo lo sólido proyecta y recibe; los trazos de tinta y la sombra difusa no
  root.traverse((ob) => {
    if (!ob.isMesh || ob.isLineSegments2 || ob === shadow || ob.material.isShaderMaterial) return;
    ob.castShadow = true; ob.receiveShadow = true;
  });

  /* ---------- cámara ---------- */
  const camera = new PerspectiveCamera(24, 2, 10, 20000);
  const target = new Vector3();
  const ptr = { x: 0, y: 0 };
  const orbit = { yaw: 0, tilt: 0 };
  let W = 2, H = 1, last = -1;
  // recuadro de la figura dentro del canvas (px): el canvas es más grande para que la cabina se salga de la hoja
  const frame = { x: 0, y: 0, w: 2, h: 1 };
  const sm = (a, b, x) => MathUtils.smoothstep(x, a, b);

  function place(s) {
    const aspect = frame.w / frame.h;
    const narrow = aspect < 1.5;
    // a: de plano en tinta a vista 3/4; ya revelado se queda en 3/4 aunque se vuelva a subir.
    // orbit: giro que el visitante le da arrastrando (rad), sumado sobre la vista
    const a = revealed ? 1 : sm(0.08, 0.5, s);
    const sw = revealed ? MathUtils.clamp(s, 0.5, 1) : s;
    const e = MathUtils.degToRad(MathUtils.lerp(88.5, 34, a) - ptr.y * 5 * a) + orbit.tilt * a;
    const az = MathUtils.lerp(0, -0.17, a) + (sw - 0.5) * 0.4 * a + ptr.x * 0.14 + orbit.yaw * a;
    const vf = MathUtils.degToRad(camera.fov);
    const hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
    // en tinta entra justo en la hoja; real, se acerca y desborda los bordes del papel
    const wFit = MathUtils.lerp(SLAB.W * 1.06, narrow ? 1300 : SLAB.W * 0.9, a);
    const dW = (wFit / 2) / Math.tan(hf / 2);
    const dD = (SLAB.D * 0.62) / Math.tan(vf / 2);
    const dist = Math.max(dW, MathUtils.lerp(dD, 0, a)) * (1 + Math.sin(Math.PI * a) * 0.14)   // en el giro se aleja un poco para no cortar la mesa
      * (1 + Math.abs(orbit.yaw) * 0.42 * a);                                                     // y al girarla a mano, para que el equipo cercano no se salga del canvas
    const pan = narrow ? MathUtils.lerp(-0.26, 0.26, sm(0.3, 0.92, sw)) * SLAB.W * a : 0;
    target.set(pan, MathUtils.lerp(0, 45, a), MathUtils.lerp(SLAB.Z, narrow ? 20 : 55, a));
    camera.position.set(
      target.x + dist * Math.sin(az) * Math.cos(e),
      target.y + dist * Math.sin(e),
      target.z + dist * Math.cos(az) * Math.cos(e)
    );
    camera.lookAt(target);
  }

  const kickAt = (t) => Math.exp(-((((t % BEAT) + BEAT) % BEAT) / BEAT) * 6);

  return {
    /* w, h: canvas en px del framebuffer; f = [x, y, w, h]: dónde cae la figura dentro del canvas
       (sin f, la figura es todo el canvas) */
    setSize(w, h, dpr = 1, f) {
      W = Math.max(2, w); H = Math.max(2, h);
      renderer.setSize(W, H, false);
      [frame.x, frame.y, frame.w, frame.h] = f || [0, 0, W, H];
      frame.w = Math.max(2, frame.w); frame.h = Math.max(2, frame.h);
      camera.aspect = frame.w / frame.h;
      camera.setViewOffset(frame.w, frame.h, -frame.x, -frame.y, W, H);
      lineMat.linewidth = 1.6 * dpr; lineMatThin.linewidth = 1.05 * dpr;
      lineMats.forEach((m) => m.resolution.set(W, H));
      U.uDot.value = Math.max(3, 4.5 * dpr);
    },
    /* t: segundos (reloj compartido); o.scroll 0..1 recorrido de la figura por la pantalla;
       o.pointer [-1..1, -1..1] sobre la figura; o.kick 0..1 (si no viene, se calcula a 150 BPM);
       o.ink fuerza el revelado (0 tinta, 1 real) — para impresión o movimiento reducido;
       o.orbit [yaw, tilt] en radianes: el giro que el visitante le da arrastrando */
    render(t, o = {}) {
      const s = MathUtils.clamp(o.scroll ?? 0.6, 0, 1);
      const dt = last < 0 ? 0 : Math.min(0.1, Math.max(0, t - last)); last = t;
      const p = o.pointer || [0, 0];
      if (o.orbit) { orbit.yaw = o.orbit[0]; orbit.tilt = o.orbit[1]; }
      ptr.x += (p[0] - ptr.x) * Math.min(1, dt * 4 || 1);
      ptr.y += (p[1] - ptr.y) * Math.min(1, dt * 4 || 1);
      const ink = o.ink ?? (revealed ? 1 : sm(0.2, 0.58, s));
      U.uInk.value = ink;
      if (!revealed && o.ink == null && ink >= 0.999) { revealed = true; if (opts.onReveal) opts.onReveal(); }
      const k = o.kick ?? kickAt(t);
      place(s);
      if (o.cam) { camera.position.fromArray(o.cam[0]); camera.lookAt(target.fromArray(o.cam[1])); } // capturas de detalle

      for (const d of decks) {
        if (d.spin) d.jog.rotation.y -= dt * 2.2;
        if (d.spin) d.wt.offset.x = (d.wt.offset.x + dt * 0.12) % 1;
      }
      mats.ledRed.color.copy(mats.ledRed.userData.base).multiplyScalar(0.55 + 0.45 * k);
      mats.playRing.color.copy(mats.playRing.userData.base).multiplyScalar(0.3 + 0.7 * k);
      if (mixer) {
        for (const m of mixer.meters) {
          const live = m.ch < 4 ? (m.ch === 1 || m.ch === 3 ? 0.35 : 1) : m.ch >= 6 ? 1 : 0;
          const want = live * (0.5 + 0.42 * k + 0.08 * Math.sin(t * 13 + m.ch * 2.1));
          m.lvl = want > m.lvl ? want : m.lvl + (want - m.lvl) * Math.min(1, dt * 7);
          m.mesh.material.uniforms.uLevel.value = m.lvl;
        }
        mixer.xc.position.x = XFADER.x + Math.sin(t * 0.21) * XFADER.len * 0.18;
      }
      renderer.render(scene, camera);
      return k;
    },
    dispose() {
      scene.traverse((ob) => { if (ob.geometry) ob.geometry.dispose(); });
      Object.values(mats).forEach((m) => m.dispose());
      Object.values(tx).forEach((t) => t.dispose());
      renderer.dispose();
    }
  };
}
