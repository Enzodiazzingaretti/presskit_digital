/* KEXXY — sigilo de cromo en tiempo real (Three.js)
   Fuente del bundle assets/js/sigil-gl.js (ver tools/gl/README.md para reconstruirlo).

   El sigilo se extruye desde el SVG vectorizado y se ilumina con un "horizonte de cromo"
   (cielo claro, horizonte negro, suelo gris, softboxes y un destello rojo). Late a 150 BPM:
   la luz roja golpea en cada bombo con caída exponencial. render(t) es determinístico. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, PMREMGenerator, CanvasTexture, TextureLoader,
  EquirectangularReflectionMapping, SRGBColorSpace, NoColorSpace, ACESFilmicToneMapping,
  ClampToEdgeWrapping, MeshPhysicalMaterial, ExtrudeGeometry, Mesh, Group, PointLight,
  DirectionalLight, Vector2, Vector3, Box3, MathUtils
} from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

export const BPM = 150;
export const BEAT = 60 / BPM; // 0,4 s

function makeStudio(renderer, small) {
  const W = small ? 1024 : 2048, H = W / 2, k = W / 2048;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, H);
  [[0, '#ffffff'], [0.28, '#e6ebf0'], [0.46, '#8f98a2'], [0.512, '#262a30'], [0.525, '#040405'],
    [0.565, '#0b0c0e'], [0.65, '#2c3037'], [0.85, '#7c838c'], [1, '#c9ced4']].forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  const strip = (x, w, a) => {
    x *= k; w *= k;
    const s = g.createLinearGradient(x - w, 0, x + w, 0);
    s.addColorStop(0, 'rgba(255,255,255,0)'); s.addColorStop(0.5, `rgba(255,255,255,${a})`); s.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = s; g.fillRect(x - w, 0, 2 * w, H * 0.45);
  };
  [[220, 26, 1], [610, 14, 0.9], [1010, 40, 1], [1180, 10, 0.8], [1540, 22, 1], [1880, 16, 0.9]].forEach((a) => strip(...a));
  g.fillStyle = 'rgba(10,10,12,.85)';
  [[380, 60], [800, 30], [1320, 80], [1720, 40], [90, 24], [1090, 36]].forEach(([x, w]) => g.fillRect(x * k, 0, w * k, H * 0.42));
  g.fillStyle = 'rgba(10,10,12,.55)'; g.fillRect(0, H * 0.36, W, H * 0.025);
  const r = g.createLinearGradient(0, H * 0.54, 0, H * 0.62);
  r.addColorStop(0, 'rgba(255,16,48,0)'); r.addColorStop(0.5, 'rgba(255,16,48,.95)'); r.addColorStop(1, 'rgba(255,16,48,0)');
  g.fillStyle = r; g.fillRect(900 * k, H * 0.54, 520 * k, H * 0.08); g.fillRect(0, H * 0.54, 180 * k, H * 0.08);
  const tex = new CanvasTexture(c);
  tex.mapping = EquirectangularReflectionMapping;
  tex.colorSpace = SRGBColorSpace;
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose(); tex.dispose();
  return env;
}

/* opts: { canvas, svgUrl, normalUrl, lowPower } */
export async function mountSigil(opts) {
  const { canvas, svgUrl, normalUrl, lowPower = false } = opts;
  const renderer = new WebGLRenderer({ canvas, antialias: !lowPower, alpha: true, powerPreference: lowPower ? 'low-power' : 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  scene.environment = makeStudio(renderer, lowPower);
  const camera = new PerspectiveCamera(28, 4 / 5, 1, 20000);

  const svgText = await (await fetch(svgUrl)).text();
  const data = new SVGLoader().parse(svgText);
  const shapes = [];
  data.paths.forEach((p) => shapes.push(...SVGLoader.createShapes(p)));
  const geo = new ExtrudeGeometry(shapes, {
    depth: 70,
    curveSegments: lowPower ? 4 : 5,
    bevelEnabled: true, bevelThickness: 18, bevelSize: 3.2, bevelOffset: 0, bevelSegments: lowPower ? 2 : 3
  });
  geo.center();
  geo.scale(1, -1, 1);
  geo.computeVertexNormals();

  const vb = svgText.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const SW = vb ? +vb[1] : 1, SH = vb ? +vb[2] : 1;
  const chrome = new MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.035, clearcoat: 1, clearcoatRoughness: 0.03 });
  const face = chrome.clone();
  if (normalUrl) {
    try {
      const nm = await new TextureLoader().loadAsync(normalUrl);
      nm.flipY = false; nm.colorSpace = NoColorSpace;
      nm.wrapS = nm.wrapT = ClampToEdgeWrapping;
      nm.repeat.set(1 / SW, 1 / SH);
      face.normalMap = nm; face.normalScale = new Vector2(1, 1);
    } catch (e) { /* sin mapa de normales: el cromo igual funciona */ }
  }
  const mesh = new Mesh(geo, [face, chrome]);
  const pivot = new Group(); pivot.add(mesh); scene.add(pivot);

  const red = new PointLight(0xff1a36, 0, 4000, 1.2);
  red.position.set(900, -300, 900); scene.add(red);
  const key = new DirectionalLight(0xffffff, 0.6); key.position.set(-1, 1, 2); scene.add(key);

  const size = new Box3().setFromObject(mesh).getSize(new Vector3());
  function frame(fill) {
    const dist = (size.y / fill) / (2 * Math.tan(MathUtils.degToRad(camera.fov / 2)));
    camera.position.set(0, 0, dist + size.z);
    camera.lookAt(0, 0, 0);
  }
  frame(0.97);

  const kick = (t) => Math.exp(-((((t % BEAT) + BEAT) % BEAT) / BEAT) * 7.5);

  return {
    setSize(w, h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    },
    /* t en segundos del reloj compartido con el CSS; o.pointer = [-1..1, -1..1] */
    render(t, o = {}) {
      const k = o.still ? 0 : kick(t);
      const px = o.pointer ? o.pointer[0] : 0, py = o.pointer ? o.pointer[1] : 0;
      pivot.rotation.set(0.06 + Math.sin(t * 0.31) * 0.06 + py * 0.12, Math.sin(t * 0.5) * 0.42 + px * 0.25, 0);
      pivot.scale.setScalar(1 + 0.035 * k);
      red.intensity = 9e5 * k;
      chrome.roughness = face.roughness = 0.035 + 0.03 * (1 - k);
      renderer.render(scene, camera);
      return k;
    },
    dispose() {
      geo.dispose(); chrome.dispose(); face.dispose();
      if (face.normalMap) face.normalMap.dispose();
      if (scene.environment) scene.environment.dispose();
      renderer.dispose();
    }
  };
}
