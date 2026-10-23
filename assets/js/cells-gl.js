/* Celdas de tinta vivas (WebGL 1, sin dependencias).
   Una red de celdas tipo masa madre / tinta vertida que se mueve despacio,
   respira con el bombo (150 BPM) y se abre alrededor del cursor.
   mountCells({ canvas, ink: [r,g,b] 0-1, mode: 'bottom' | 'ring' | 'scatter', scale, seed })
   → { setSize(w, h), render(t, { mouse: [x, y] | null, kick }), dispose() } */

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `
#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uKick;
uniform vec3 uInk;
uniform float uScale;
uniform float uSeed;
uniform float uMode;

float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7)) + uSeed) * 43758.5453); }
vec2 h2(vec2 p){ return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))) + uSeed) * 43758.5453); }
float vn(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h1(i), h1(i + vec2(1.0, 0.0)), u.x), mix(h1(i + vec2(0.0, 1.0)), h1(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 4; i++){ s += a * vn(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return s / 0.9375;
}
vec3 worley(vec2 p, float t){
  vec2 n = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0, id = 0.0;
  for (int j = -1; j <= 1; j++){
    for (int i = -1; i <= 1; i++){
      vec2 g = vec2(float(i), float(j));
      vec2 o = h2(n + g);
      o = 0.5 + 0.38 * sin(t * 0.55 + 6.2831 * o);
      vec2 r = g + o - f;
      float d = length(r);
      if (d < d1){ d2 = d1; d1 = d; id = h1(n + g + 3.7); }
      else if (d < d2){ d2 = d; }
    }
  }
  return vec3(d1, d2, id);
}
float region(vec2 uv, vec2 p, float t){
  float n = fbm(p * 1.7 + vec2(t * 0.03, -t * 0.02));
  if (uMode < 0.5){
    float b = smoothstep(0.5, 0.0, uv.y + (n - 0.5) * 0.4);
    return b * 1.3 + (n - 0.5) * 0.55 * smoothstep(0.0, 0.35, b);
  } else if (uMode < 1.5){
    vec2 c = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
    float r = length(c) + (n - 0.5) * 0.2;
    float ring = smoothstep(0.17, 0.30, r) * smoothstep(0.72, 0.42, r);
    return ring * 1.2 + (n - 0.5) * 0.5 * ring;
  }
  return smoothstep(0.48, 0.8, n) * 1.35;
}
void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uRes;
  vec2 p = frag / uRes.y;
  float t = uTime;
  float R = clamp(region(uv, p, t), 0.0, 1.0);
  vec2 wq = p + 0.035 * vec2(vn(p * 6.0 + t * 0.05), vn(p * 6.0 - t * 0.05 + 9.0));
  vec3 wa = worley(wq * uScale, t);
  vec3 wb = worley(wq * uScale * 2.6 + 11.3, t * 1.3);
  float cl = smoothstep(0.46, 0.68, fbm(p * 2.2 + 5.0));
  float qa = (wa.y - wa.x) / (wa.y + wa.x);
  float qb = (wb.y - wb.x) / (wb.y + wb.x);
  float md = length((frag - uMouse) / uRes.y);
  float clear = 0.32 * exp(-md * md * 26.0);
  float breathe = 0.03 * uKick;
  float hA = mix(0.08, 0.27, wa.z), hB = mix(0.10, 0.28, wb.z);
  float holeA = smoothstep(hA - 0.045, hA + 0.045, qa + clear + breathe);
  float holeB = smoothstep(hB - 0.045, hB + 0.045, qb + clear + breathe);
  float f = R + 0.24 - 0.92 * mix(holeA, holeB, cl) - clear * 1.3;
#ifdef GL_OES_standard_derivatives
  float w = clamp(fwidth(f), 0.004, 0.05);
#else
  float w = 0.02;
#endif
  float ink = smoothstep(0.5 - w, 0.5 + w, f);
  gl_FragColor = vec4(uInk * ink, ink);
}`;

export function mountCells({ canvas, ink = [0.055, 0.05, 0.047], mode = 'bottom', scale = 15, seed = 1 }) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) throw new Error('webgl');
  gl.getExtension('OES_standard_derivatives');
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader');
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link');
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {};
  ['uRes', 'uTime', 'uMouse', 'uKick', 'uInk', 'uScale', 'uSeed', 'uMode'].forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });
  gl.uniform3fv(U.uInk, ink);
  gl.uniform1f(U.uScale, scale);
  gl.uniform1f(U.uSeed, seed);
  gl.uniform1f(U.uMode, mode === 'ring' ? 1 : mode === 'scatter' ? 2 : 0);
  gl.clearColor(0, 0, 0, 0);
  let W = 2, H = 2;
  return {
    setSize(w, h) {
      W = Math.max(2, w | 0); H = Math.max(2, h | 0);
      canvas.width = W; canvas.height = H;
      gl.viewport(0, 0, W, H);
    },
    render(t, o) {
      const m = (o && o.mouse) || null;
      gl.uniform2f(U.uRes, W, H);
      gl.uniform1f(U.uTime, t);
      gl.uniform2f(U.uMouse, m ? m[0] : -1e4, m ? H - m[1] : -1e4);
      gl.uniform1f(U.uKick, (o && o.kick) || 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
    }
  };
}
