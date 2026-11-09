/* Estudio de fotografía de producto para los reflejos: sala oscura, softbox cenital grande,
   dos tiras verticales (dibujan los cantos del aluminio negro), un relleno cálido al frente
   sin colores: el rojo lo ponen los leds. Se hornea una vez con PMREM. */
import { Scene, Mesh, BoxGeometry, PlaneGeometry, MeshBasicMaterial, BackSide, DoubleSide, Color, PMREMGenerator } from 'three';

export function studioEnvironment(renderer) {
  const scene = new Scene();
  const disposables = [];
  const add = (geo, color, k, pos, rot = [0, 0, 0], side = DoubleSide) => {
    const mat = new MeshBasicMaterial({ color: new Color(color).multiplyScalar(k), side });
    const m = new Mesh(geo, mat);
    m.position.set(...pos); m.rotation.set(...rot);
    scene.add(m); disposables.push(geo, mat);
  };
  add(new BoxGeometry(24, 12, 24), '#3c3c41', 1, [0, 5, 0], [0, 0, 0], BackSide);       // sala
  add(new PlaneGeometry(24, 24), '#55524f', 1, [0, -0.9, 0], [-Math.PI / 2, 0, 0]);      // piso
  add(new PlaneGeometry(9, 5), '#ffffff', 6, [0, 10.8, 1], [Math.PI / 2, 0, 0]);       // softbox cenital
  add(new PlaneGeometry(1.1, 8), '#ffffff', 7, [-8.5, 5, 3], [0, Math.PI / 2, 0]);       // tira izquierda
  add(new PlaneGeometry(1.1, 8), '#eef0ff', 5, [8.5, 5, -2], [0, -Math.PI / 2, 0]);      // tira derecha
  add(new PlaneGeometry(7, 2.2), '#fff1e2', 2.2, [0, 3.5, 11.5], [0, Math.PI, 0]);       // relleno frontal
    const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.035).texture;
  pmrem.dispose();
  disposables.forEach((d) => d.dispose());
  return env;
}
