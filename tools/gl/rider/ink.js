/* Tinta → equipo real.
   Todas las superficies y los trazos comparten un frente de revelado en espacio de mundo:
   del lado "tinta" la superficie no pinta color (deja ver el papel de la hoja) pero sí escribe
   profundidad, así los trazos de atrás quedan tapados como en un dibujo técnico; del lado "real"
   pinta el material. En el borde hay una línea de tinta roja y una banda de trama (halftone)
   de imprenta. El canvas es transparente y premultiplicado: cada fragmento escribe su alfa. */
import { Color } from 'three';

export const INK = new Color('#0e0d0c');
export const BLOOD = new Color('#e0102d');

// uniforms compartidos por todos los materiales (se actualizan una sola vez por cuadro)
export const U = {
  uInk: { value: 0 },      // 0 = todo tinta, 1 = todo real
  uDot: { value: 5 },      // celda de la trama en px del framebuffer
  uSpan: { value: 1900 }   // ancho de la cabina en mm (barrido izquierda → derecha)
};

const PARS = /* glsl */`
uniform float uInk;
uniform float uDot;
uniform float uSpan;
varying vec3 vKxW;
float kxHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float kxNoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(kxHash(i), kxHash(i + vec3(1, 0, 0)), f.x), mix(kxHash(i + vec3(0, 1, 0)), kxHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(kxHash(i + vec3(0, 0, 1)), kxHash(i + vec3(1, 0, 1)), f.x), mix(kxHash(i + vec3(0, 1, 1)), kxHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
// > 0: todavía es tinta; < 0: ya es real
float kxFront() {
  vec3 p = vKxW * 0.0042;
  float n = kxNoise(p) * 0.55 + kxNoise(p * 2.7 + 3.1) * 0.3 + kxNoise(p * 7.3 + 9.7) * 0.15;
  float q = clamp(vKxW.x / uSpan + 0.5, 0.0, 1.0) * 0.55 + n * 0.45 + vKxW.z * 0.00008;
  return q - (uInk * 1.25 - 0.12);
}
`;

const SURFACE = /* glsl */`
{
  float kxF = kxFront();
  if (kxF > 0.0) {
    if (kxF < 0.010) gl_FragColor = vec4(${BLOOD.r.toFixed(4)}, ${BLOOD.g.toFixed(4)}, ${BLOOD.b.toFixed(4)}, 1.0);
    else if (kxF < 0.085) {
      float kxC = 1.0 - (kxF - 0.010) / 0.075;
      vec2 kxG = mod(gl_FragCoord.xy, uDot) / uDot - 0.5;
      gl_FragColor = length(kxG) < kxC * 0.62 ? vec4(${INK.r.toFixed(4)}, ${INK.g.toFixed(4)}, ${INK.b.toFixed(4)}, 1.0) : vec4(0.0);
    } else gl_FragColor = vec4(0.0);
  } else {
    gl_FragColor = vec4(gl_FragColor.rgb * KX_ALPHA, KX_ALPHA);
  }
}
`;

const LINE = /* glsl */`
{
  if (kxFront() <= 0.0) discard;
  gl_FragColor = vec4(${INK.r.toFixed(4)}, ${INK.g.toFixed(4)}, ${INK.b.toFixed(4)}, 1.0);
}
`;

const VERT_PARS = 'varying vec3 vKxW;\n';

function injectVertex(src, worldExpr) {
  return VERT_PARS + src.replace(/}\s*$/, `  vKxW = ${worldExpr};\n}\n`);
}

function injectFragment(src, body) {
  return PARS + src.replace(/}\s*$/, body + '\n}\n');
}

/* Superficie opaca (Mesh*Material): escribe su alfa sin mezclar. */
export function inkSurface(mat, alphaExpr = '1.0') {
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = 1;
  mat.polygonOffsetUnits = 2;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = injectVertex(sh.vertexShader, '(modelMatrix * vec4(transformed, 1.0)).xyz');
    sh.fragmentShader = injectFragment(sh.fragmentShader, SURFACE.replace(/KX_ALPHA/g, `(${alphaExpr})`));
  };
  mat.customProgramCacheKey = () => 'kx-surface-' + alphaExpr;
  return mat;
}

/* Trazos (LineMaterial de líneas gruesas): sólo existen del lado tinta. */
export function inkLine(mat) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = injectVertex(sh.vertexShader, '(modelMatrix * vec4(position.y < 0.5 ? instanceStart : instanceEnd, 1.0)).xyz');
    sh.fragmentShader = injectFragment(sh.fragmentShader, LINE);
  };
  mat.customProgramCacheKey = () => 'kx-line';
  return mat;
}

/* Para ShaderMaterial propios (vúmetros, sombra): devuelven el código a incluir. */
export const inkGLSL = { PARS, VERT_PARS, SURFACE };
