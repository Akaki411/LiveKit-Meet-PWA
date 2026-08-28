'use client';

import React, { useEffect, useRef } from 'react';
import { onBackgroundAnimationChange } from '@/lib/client/background-animation';

// Density and performance
const MAX_DPR = 1.7; // cap on devicePixelRatio (lower = cheaper on retina/mobile)
const DENSITY_DIVISOR = 13000; // css px² per particle (smaller = more particles)
const MIN_PARTICLES = 24; // never go below this many particles
const MAX_PARTICLES_DESKTOP = 120; // hard cap on pointer:fine devices
const MAX_PARTICLES_MOBILE = 52; // hard cap on pointer:coarse (touch) devices
const FPS_DESKTOP = 40; // frame-rate cap on desktop
const FPS_MOBILE = 30; // frame-rate cap on mobile

// Motion (speed in px/s, scaled by dpr)
const NODE_SPEED_MIN = 3; // slowest drift for connectable nodes
const NODE_SPEED_MAX = 8; // fastest drift for connectable nodes
const BOKEH_SPEED_MIN = 1; // slowest drift for background bokeh orbs
const BOKEH_SPEED_MAX = 3; // fastest drift for background bokeh orbs

// Particle sizes (diameter in px, scaled by dpr)
const NODE_SIZE = 5; // base diameter of a connectable node dot
const PARTICLE_SIZE_SPREAD = 1; // ± fractional size variation of nodes (0.55 = ±55%)
const BOKEH_SIZE_MIN = 16; // smallest background bokeh orb
const BOKEH_SIZE_MAX = 46; // largest background bokeh orb

// Depth and blur
const BOKEH_FRACTION = 0.2; // share of particles that are big out-of-focus orbs
const NODE_BLUR_MAX = 0.4; // max softness of an in-focus node dot (0 = perfectly crisp)
const BOKEH_BLUR_MIN = 0.75; // min softness of bokeh orbs (1 = fully diffuse)
const BOKEH_BLUR_MAX = 1.0; // max softness of bokeh orbs
const BLURRED_LINK_FRACTION = 0.5; // share of connections rendered blurred (out of focus)
const LINK_BLUR_INTENSITY = 0.6; // average blur strength of a blurred connection (0..1)
const LINK_BLUR_SPREAD = 0.2; // ± variation of that blur strength between connections

// Connections
const LINK_SPACING_FACTOR = 1.8; // link radius as a multiple of the average node spacing
const LINE_OPACITY = 0.8; // peak line opacity (each line fades to 0 with distance)
const LINE_WIDTH = 1.3; // width of a sharp connection, px (scaled by dpr)
const LINE_BLUR_WIDTH = 4; // extra width added to a fully-blurred connection, px (× dpr)

// Opacity
const NODE_ALPHA_MIN = 0.5; // dimmest connectable node
const NODE_ALPHA_MAX = 1.0; // brightest connectable node
const BOKEH_ALPHA_MIN = 0.1; // dimmest bokeh orb
const BOKEH_ALPHA_MAX = 0.3; // brightest bokeh orb

// Colours
const COLOR_NODE: [number, number, number] = [0.9, 0.9, 0.9];
const COLOR_LINE: [number, number, number] = [0.9, 0.9, 0.9];
const BACKGROUND_GRADIENT = 'radial-gradient(circle at 40% 40%, #161616 0%, #131313 60%, #111111 100%)';


const rand = (min: number, max: number) => min + Math.random() * (max - min);

const pairRand = (i: number, j: number, salt: number) => {
  let h = Math.imul(i + 1, 73856093) ^ Math.imul(j + 1, 19349663) ^ Math.imul(salt, 83492791);
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h = (h ^ (h >>> 13)) >>> 0;
  return h / 4294967295;
};

const POINT_VERT = `
  precision mediump float;
  attribute vec2 a_pos;
  attribute float a_size;
  attribute float a_blur;
  attribute float a_alpha;
  varying float v_blur;
  varying float v_alpha;
  void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);
    gl_PointSize = a_size;
    v_blur = a_blur;
    v_alpha = a_alpha;
  }
`;

const POINT_FRAG = `
  precision mediump float;
  uniform vec3 u_color;
  varying float v_blur;
  varying float v_alpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float soft = mix(0.22, 1.0, v_blur);
    float a = 1.0 - smoothstep(1.0 - soft, 1.0, d);
    if (a * v_alpha <= 0.0) discard;
    gl_FragColor = vec4(u_color, a * v_alpha);
  }
`;

const LINE_VERT = `
  precision mediump float;
  attribute vec2 a_pos;
  attribute float a_edge;
  attribute float a_alpha;
  attribute float a_blur;
  varying float v_edge;
  varying float v_alpha;
  varying float v_blur;
  void main() {
    gl_Position = vec4(a_pos, 0.0, 1.0);
    v_edge = a_edge;
    v_alpha = a_alpha;
    v_blur = a_blur;
  }
`;

const LINE_FRAG = `
  precision mediump float;
  uniform vec3 u_lineColor;
  varying float v_edge;
  varying float v_alpha;
  varying float v_blur;
  void main() {
    float soft = mix(0.15, 1.0, v_blur);
    float m = 1.0 - smoothstep(1.0 - soft, 1.0, abs(v_edge));
    if (m <= 0.0) discard;
    gl_FragColor = vec4(u_lineColor, m * v_alpha);
  }
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Particle shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext, vertSrc: string, fragSrc: string) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn('Particle program link error:', gl.getProgramInfoLog(program));
    return null;
  }
  return program;
}

const ParticleSystem = ({ children }: { children: React.ReactNode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(true);

  useEffect(() => onBackgroundAnimationChange((active) => { activeRef.current = active; }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      depth: false,
    });
    if (!gl) return;

    const pointProg = createProgram(gl, POINT_VERT, POINT_FRAG);
    const lineProg = createProgram(gl, LINE_VERT, LINE_FRAG);
    if (!pointProg || !lineProg) return;

    const pPos = gl.getAttribLocation(pointProg, 'a_pos');
    const pSize = gl.getAttribLocation(pointProg, 'a_size');
    const pBlur = gl.getAttribLocation(pointProg, 'a_blur');
    const pAlpha = gl.getAttribLocation(pointProg, 'a_alpha');
    gl.useProgram(pointProg);
    gl.uniform3fv(gl.getUniformLocation(pointProg, 'u_color'), COLOR_NODE);

    const lPos = gl.getAttribLocation(lineProg, 'a_pos');
    const lEdge = gl.getAttribLocation(lineProg, 'a_edge');
    const lAlpha = gl.getAttribLocation(lineProg, 'a_alpha');
    const lBlur = gl.getAttribLocation(lineProg, 'a_blur');
    gl.useProgram(lineProg);
    gl.uniform3fv(gl.getUniformLocation(lineProg, 'u_lineColor'), COLOR_LINE);

    const maxPointSize = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] as number;

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const coarse =
      typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    const frameInterval = 1000 / (coarse ? FPS_MOBILE : FPS_DESKTOP);
    const maxParticles = coarse ? MAX_PARTICLES_MOBILE : MAX_PARTICLES_DESKTOP;

    const PT = 5;
    const LV = 5;
    let dpr = 1;
    let vw = 1;
    let vh = 1;
    let N = 0;
    let B = 0;

    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let vx = new Float32Array(0);
    let vy = new Float32Array(0);
    let size = new Float32Array(0);
    let blur = new Float32Array(0);
    let alpha = new Float32Array(0);

    let pointData = new Float32Array(0);
    let lineData = new Float32Array(0);
    let built = false;

    const pointBuf = gl.createBuffer();
    const lineBuf = gl.createBuffer();

    const build = () => {
      const cssW = canvas.clientWidth || 1;
      const cssH = canvas.clientHeight || 1;
      N = Math.max(MIN_PARTICLES, Math.min(maxParticles, Math.round((cssW * cssH) / DENSITY_DIVISOR)));
      B = Math.round(N * BOKEH_FRACTION);

      px = new Float32Array(N);
      py = new Float32Array(N);
      vx = new Float32Array(N);
      vy = new Float32Array(N);
      size = new Float32Array(N);
      blur = new Float32Array(N);
      alpha = new Float32Array(N);

      for (let i = 0; i < N; i++) {
        px[i] = Math.random() * vw;
        py[i] = Math.random() * vh;
        const ang = Math.random() * Math.PI * 2;
        if (i < B) {
          const sp = rand(BOKEH_SPEED_MIN, BOKEH_SPEED_MAX) * dpr;
          vx[i] = Math.cos(ang) * sp;
          vy[i] = Math.sin(ang) * sp;
          size[i] = rand(BOKEH_SIZE_MIN, BOKEH_SIZE_MAX) * dpr;
          blur[i] = rand(BOKEH_BLUR_MIN, BOKEH_BLUR_MAX);
          alpha[i] = rand(BOKEH_ALPHA_MIN, BOKEH_ALPHA_MAX);
        } else {
          const sp = rand(NODE_SPEED_MIN, NODE_SPEED_MAX) * dpr;
          vx[i] = Math.cos(ang) * sp;
          vy[i] = Math.sin(ang) * sp;
          size[i] = NODE_SIZE * (1 + (Math.random() * 2 - 1) * PARTICLE_SIZE_SPREAD) * dpr;
          blur[i] = Math.random() * NODE_BLUR_MAX;
          alpha[i] = rand(NODE_ALPHA_MIN, NODE_ALPHA_MAX);
        }
      }

      const focusCount = N - B;
      const maxSegments = (focusCount * (focusCount - 1)) / 2;
      pointData = new Float32Array(N * PT);
      lineData = new Float32Array(maxSegments * 6 * LV);

      gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
      gl.bufferData(gl.ARRAY_BUFFER, pointData.byteLength, gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
      gl.bufferData(gl.ARRAY_BUFFER, lineData.byteLength, gl.DYNAMIC_DRAW);
      built = true;
    };

    const resize = () => {
      const nextDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const nextVw = Math.max(1, Math.floor(canvas.clientWidth * nextDpr));
      const nextVh = Math.max(1, Math.floor(canvas.clientHeight * nextDpr));
      const scaleX = built && vw > 0 ? nextVw / vw : 1;
      const scaleY = built && vh > 0 ? nextVh / vh : 1;
      dpr = nextDpr;
      vw = nextVw;
      vh = nextVh;
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }
      gl.viewport(0, 0, vw, vh);
      if (!built) {
        build();
      } else if (scaleX !== 1 || scaleY !== 1) {
        for (let i = 0; i < N; i++) {
          px[i] *= scaleX;
          py[i] *= scaleY;
        }
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const step = (dt: number) => {
      for (let i = 0; i < N; i++) {
        let x = px[i] + vx[i] * dt;
        let y = py[i] + vy[i] * dt;
        if (x < 0) { x = 0; vx[i] = -vx[i]; } else if (x > vw) { x = vw; vx[i] = -vx[i]; }
        if (y < 0) { y = 0; vy[i] = -vy[i]; } else if (y > vh) { y = vh; vy[i] = -vy[i]; }
        px[i] = x;
        py[i] = y;
        const o = i * PT;
        pointData[o] = (x / vw) * 2 - 1;
        pointData[o + 1] = 1 - (y / vh) * 2;
        pointData[o + 2] = Math.min(size[i], maxPointSize);
        pointData[o + 3] = blur[i];
        pointData[o + 4] = i < B ? alpha[i] : 0;
      }

      const focusCount = N - B;
      const link = Math.sqrt((vw * vh) / Math.max(1, focusCount)) * LINK_SPACING_FACTOR;
      const link2 = link * link;
      let n = 0;
      for (let i = B; i < N; i++) {
        const xi = px[i];
        const yi = py[i];
        const cxi = pointData[i * PT];
        const cyi = pointData[i * PT + 1];
        for (let j = i + 1; j < N; j++) {
          const dx = xi - px[j];
          const dy = yi - py[j];
          const d2 = dx * dx + dy * dy;
          if (d2 >= link2) continue;
          const dist = Math.sqrt(d2) || 0.0001;
          const a = (1 - dist / link) * LINE_OPACITY;

          pointData[i * PT + 4] = alpha[i];
          pointData[j * PT + 4] = alpha[j];

          let lblur = 0;
          if (pairRand(i, j, 1) < BLURRED_LINK_FRACTION) {
            lblur = LINK_BLUR_INTENSITY + (pairRand(i, j, 2) * 2 - 1) * LINK_BLUR_SPREAD;
            lblur = Math.min(1, Math.max(0, lblur));
          }

          const halfW = (LINE_WIDTH + lblur * LINE_BLUR_WIDTH) * dpr * 0.5;
          const ox = (-dy / dist) * halfW;
          const oy = (dx / dist) * halfW;
          const ocx = (ox / vw) * 2;
          const ocy = -(oy / vh) * 2;
          const cxj = pointData[j * PT];
          const cyj = pointData[j * PT + 1];

          lineData[n++] = cxi + ocx; lineData[n++] = cyi + ocy; lineData[n++] = 1; lineData[n++] = a; lineData[n++] = lblur;
          lineData[n++] = cxi - ocx; lineData[n++] = cyi - ocy; lineData[n++] = -1; lineData[n++] = a; lineData[n++] = lblur;
          lineData[n++] = cxj + ocx; lineData[n++] = cyj + ocy; lineData[n++] = 1; lineData[n++] = a; lineData[n++] = lblur;
          lineData[n++] = cxj + ocx; lineData[n++] = cyj + ocy; lineData[n++] = 1; lineData[n++] = a; lineData[n++] = lblur;
          lineData[n++] = cxi - ocx; lineData[n++] = cyi - ocy; lineData[n++] = -1; lineData[n++] = a; lineData[n++] = lblur;
          lineData[n++] = cxj - ocx; lineData[n++] = cyj - ocy; lineData[n++] = -1; lineData[n++] = a; lineData[n++] = lblur;
        }
      }
      return n / LV;
    };

    const drawPoints = (first: number, count: number) => {
      gl.enableVertexAttribArray(pPos);
      gl.vertexAttribPointer(pPos, 2, gl.FLOAT, false, PT * 4, 0);
      gl.enableVertexAttribArray(pSize);
      gl.vertexAttribPointer(pSize, 1, gl.FLOAT, false, PT * 4, 2 * 4);
      gl.enableVertexAttribArray(pBlur);
      gl.vertexAttribPointer(pBlur, 1, gl.FLOAT, false, PT * 4, 3 * 4);
      gl.enableVertexAttribArray(pAlpha);
      gl.vertexAttribPointer(pAlpha, 1, gl.FLOAT, false, PT * 4, 4 * 4);
      gl.drawArrays(gl.POINTS, first, count);
    };

    const render = (lineVertexCount: number) => {
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(pointProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, pointData);

      if (B > 0) drawPoints(0, B);

      if (lineVertexCount > 0) {
        gl.useProgram(lineProg);
        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuf);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, lineData.subarray(0, lineVertexCount * LV));
        gl.enableVertexAttribArray(lPos);
        gl.vertexAttribPointer(lPos, 2, gl.FLOAT, false, LV * 4, 0);
        gl.enableVertexAttribArray(lEdge);
        gl.vertexAttribPointer(lEdge, 1, gl.FLOAT, false, LV * 4, 2 * 4);
        gl.enableVertexAttribArray(lAlpha);
        gl.vertexAttribPointer(lAlpha, 1, gl.FLOAT, false, LV * 4, 3 * 4);
        gl.enableVertexAttribArray(lBlur);
        gl.vertexAttribPointer(lBlur, 1, gl.FLOAT, false, LV * 4, 4 * 4);
        gl.drawArrays(gl.TRIANGLES, 0, lineVertexCount);
      }

      gl.useProgram(pointProg);
      gl.bindBuffer(gl.ARRAY_BUFFER, pointBuf);
      drawPoints(B, N - B);
    };

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let rafId = 0;

    if (reduceMotion) {
      render(step(0));
    } else {
      let last = performance.now();
      const loop = (now: number) => {
        rafId = requestAnimationFrame(loop);
        if (!activeRef.current || document.hidden) {
          last = now;
          return;
        }
        const delta = now - last;
        if (delta < frameInterval) return;
        last = now;
        render(step(Math.min(0.05, delta / 1000)));
      };
      rafId = requestAnimationFrame(loop);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      gl.deleteBuffer(pointBuf);
      gl.deleteBuffer(lineBuf);
      gl.deleteProgram(pointProg);
      gl.deleteProgram(lineProg);
      const lose = gl.getExtension('WEBGL_lose_context');
      lose?.loseContext();
    };
  }, []);

  return (
    <>
      <div
        className="background"
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          background: BACKGROUND_GRADIENT,
        }}
      >
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
      </div>
      <div className="wrapper">{children}</div>
    </>
  );
};

export default ParticleSystem;
