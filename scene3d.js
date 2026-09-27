/* HASNAIN STUDIO X - scene3d.js
   Homepage only. One particle field that reshapes itself for the section in
   view. It runs while the night sky is off, the homepage default; SKY ON
   brings the stars and moon back and stops it. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, BufferGeometry, BufferAttribute,
  Points, ShaderMaterial, AdditiveBlending, Color, Clock,
} from './vendor/three.r186.min.js';

const PALETTE = ['#f2dfb8', '#f3b3cf', '#c7a5f7', '#9fe8d6', '#bcd9f4'].map((c) => new Color(c));
const SUITES = [
  { k: 'system', a: '#C7A5F7', c: 24 },
  { k: 'ai', a: '#F2DFB8', c: 15 },
  { k: 'creative', a: '#F3B3CF', c: 33 },
];
const SECTIONS = [
  ['.hero-split', 'emblem'],
  ['.hub-burst', 'hive'],
  ['#platform-title', 'trio'],
  ['#browse-title', 'bloom'],
  ['#why-local', 'vault'],
  ['#about', 'mark'],
  ['#founder-note', 'floor'],
];

const vertex = `
  attribute vec3 color;
  attribute float size;
  uniform float uTime;
  uniform float uWave;
  uniform float uPixel;
  varying vec3 vColor;
  varying float vFade;
  void main() {
    vec3 p = position;
    float w = sin(p.x * 0.55 + uTime * 0.7) * 0.45 + cos(p.z * 0.6 + uTime * 0.5) * 0.3;
    p.y += w * uWave;
    p += 0.03 * vec3(sin(uTime * 0.6 + p.y * 3.1), cos(uTime * 0.5 + p.x * 2.7), sin(uTime * 0.4 + p.z * 2.3));
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = size * uPixel * (12.0 / -mv.z);
    vColor = color;
    vFade = 1.0 - smoothstep(9.0, 24.0, -mv.z);
  }
`;

const fragment = `
  varying vec3 vColor;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(smoothstep(0.5, 0.0, d), 1.6);
    gl_FragColor = vec4(vColor * a * vFade, a * vFade);
  }
`;

function rand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleText(text, count, width) {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 420;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '800 330px Unbounded, system-ui, sans-serif';
  g.fillText(text, c.width / 2, c.height / 2);
  const data = g.getImageData(0, 0, c.width, c.height).data;
  const hits = [];
  for (let y = 0; y < c.height; y += 3) {
    for (let x = 0; x < c.width; x += 3) {
      if (data[(y * c.width + x) * 4 + 3] > 140) hits.push(x, y);
    }
  }
  const out = new Float32Array(count * 3);
  if (!hits.length) return out;
  const r = rand(7);
  const scale = width / c.width;
  for (let i = 0; i < count; i++) {
    const j = Math.floor(r() * (hits.length / 2)) * 2;
    out[i * 3] = (hits[j] - c.width / 2) * scale + (r() - 0.5) * 0.04;
    out[i * 3 + 1] = -(hits[j + 1] - c.height / 2) * scale + (r() - 0.5) * 0.04;
    out[i * 3 + 2] = (r() - 0.5) * 0.5;
  }
  return out;
}

/* Spreads points along line segments in proportion to their length. */
function onSegments(segs, n, r, jitter) {
  const lens = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] || 0) - (a[2] || 0)));
  const total = lens.reduce((x, y) => x + y, 0);
  const out = [];
  for (let i = 0; i < n; i++) {
    let d = r() * total;
    let k = 0;
    while (d > lens[k] && k < lens.length - 1) { d -= lens[k]; k++; }
    const [a, b] = segs[k];
    const t = lens[k] ? d / lens[k] : 0;
    out.push([
      a[0] + (b[0] - a[0]) * t + (r() - 0.5) * jitter,
      a[1] + (b[1] - a[1]) * t + (r() - 0.5) * jitter,
      (a[2] || 0) + ((b[2] || 0) - (a[2] || 0)) * t + (r() - 0.5) * jitter,
    ]);
  }
  return out;
}

function rect(x, y, w, h) {
  const a = [x - w / 2, y - h / 2], b = [x + w / 2, y - h / 2], c = [x + w / 2, y + h / 2], d = [x - w / 2, y + h / 2];
  return [[a, b], [b, c], [c, d], [d, a]];
}

function start(canvas, reduced) {
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const COUNT = small ? 3500 : 6500;

  /* soft glows gain nothing from extra pixel density, and a background must
     never wake a laptop's discrete GPU */
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1 : 1.25));
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  const geo = new BufferGeometry();
  const pos = new Float32Array(COUNT * 3);
  const col = new Float32Array(COUNT * 3);
  const size = new Float32Array(COUNT);
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('color', new BufferAttribute(col, 3));
  geo.setAttribute('size', new BufferAttribute(size, 1));

  const material = new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: fragment,
    uniforms: { uTime: { value: 0 }, uWave: { value: 0 }, uPixel: { value: renderer.getPixelRatio() } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const points = new Points(geo, material);
  points.frustumCulled = false;
  scene.add(points);

  const speed = new Float32Array(COUNT);
  const r0 = rand(11);
  for (let i = 0; i < COUNT; i++) speed[i] = 0.6 + r0() * 0.8;

  let apps = null;
  let suites = SUITES;
  let view = { w: 16, h: 9, wide: true };
  const shapes = {};
  let current = 'emblem';

  function layout() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const vh = 2 * camera.position.z * Math.tan((camera.fov * Math.PI) / 360);
    view = { w: vh * camera.aspect, h: vh, wide: camera.aspect > 1.15 };
  }

  function appList() {
    return apps && apps.length ? apps : suites.flatMap((g) => Array.from({ length: g.c }, () => ({ s: g.k, a: g.a })));
  }

  function shape(fill, { spin = 0, tilt = 0, wave = 0, x = 0, y = 0 } = {}) {
    const p = new Float32Array(COUNT * 3);
    const c = new Float32Array(COUNT * 3);
    const s = new Float32Array(COUNT);
    fill(p, c, s);
    for (let i = 0; i < COUNT; i++) { p[i * 3] += x; p[i * 3 + 1] += y; }
    return { p, c, s, spin, tilt, wave };
  }

  function tint(c, i, col, b) { c[i * 3] = col.r * b; c[i * 3 + 1] = col.g * b; c[i * 3 + 2] = col.b * b; }

  /* Every shape is built from the studio mark: a point-up hexagon. */
  const SQ3 = Math.sqrt(3);
  const WHITE = new Color('#f4f2ee');

  function hexCorners(cx, cy, R) {
    return Array.from({ length: 6 }, (_, k) => {
      const a = Math.PI / 2 + (k * Math.PI) / 3;
      return [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
    });
  }

  function hexSegs(cx, cy, R) {
    const v = hexCorners(cx, cy, R);
    return v.map((p, k) => [p, v[(k + 1) % 6]]);
  }

  /* a point inside a point-up hexagon of radius R */
  function inHex(r, R) {
    for (;;) {
      const x = (r() - 0.5) * SQ3 * R, y = (r() - 0.5) * 2 * R;
      if (Math.abs(x) * 0.5 + Math.abs(y) * (SQ3 / 2) <= R * (SQ3 / 2) && Math.abs(x) <= (SQ3 / 2) * R) return [x, y];
    }
  }

  /* whole rings of point-up cells around a centre, enough to hold n, so the hive keeps a hexagon outline */
  function honeycomb(n, s) {
    let rings = 0;
    while (3 * rings * (rings + 1) + 1 < n) rings++;
    const cells = [];
    for (let q = -rings; q <= rings; q++) {
      for (let r = Math.max(-rings, -q - rings); r <= Math.min(rings, -q + rings); r++) {
        cells.push([s * SQ3 * (q + r / 2), -s * 1.5 * r, Math.atan2(r, q)]);
      }
    }
    return cells.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]) || a[2] - b[2]);
  }

  /* The studio mark in light: a double hexagon frame around the rounded H. */
  function emblem() {
    const k = view.wide ? 1 : 0.68;
    const R = 2.3 * k, Ri = 1.94 * k;
    /* the H as three rounded strokes, filled like the chrome letter in the icon */
    const hx = 0.62 * k, hy = 0.72 * k, thick = 0.21 * k;
    const bars = [[-hx, -hy, -hx, hy], [hx, -hy, hx, hy], [-hx, 0, hx, 0]];
    const onBar = (r) => {
      const [x1, y1, x2, y2] = bars[Math.floor(r() * 3)];
      const t = r(), a = r() * Math.PI * 2, d = Math.sqrt(r()) * thick;
      return [x1 + (x2 - x1) * t + Math.cos(a) * d, y1 + (y2 - y1) * t + Math.sin(a) * d, (r() - 0.5) * 0.12];
    };
    return shape((p, c, s) => {
      const r = rand(3);
      const nOuter = Math.floor(COUNT * 0.24), nInner = Math.floor(COUNT * 0.16), nH = Math.floor(COUNT * 0.38);
      const outer = onSegments(hexSegs(0, 0, R), nOuter, r, 0.07 * k);
      const inner = onSegments(hexSegs(0, 0, Ri), nInner, r, 0.035 * k);
      for (let i = 0; i < COUNT; i++) {
        if (i < nOuter) {
          p.set(outer[i], i * 3); tint(c, i, PALETTE[2], 1 + r() * 0.35); s[i] = 2.6 + r() * 2;
        } else if (i < nOuter + nInner) {
          p.set(inner[i - nOuter], i * 3); tint(c, i, PALETTE[2], 0.6 + r() * 0.25); s[i] = 1.9 + r() * 1.4;
        } else if (i < nOuter + nInner + nH) {
          p.set(onBar(r), i * 3); tint(c, i, WHITE, 0.7 + r() * 0.35); s[i] = 2 + r() * 1.7;
        } else {
          const [x, y] = inHex(r, Ri * 0.97);
          p.set([x, y, (r() - 0.5) * 0.35], i * 3); tint(c, i, PALETTE[2], 0.1 + r() * 0.14); s[i] = 1.4 + r() * 1.4;
        }
      }
    }, { spin: 0, tilt: 0, x: view.wide ? view.w * 0.21 : 0, y: view.wide ? 0 : view.h * 0.2 });
  }

  /* A hexagonal honeycomb with one lit cell for every app, in its suite colour: the Hub gathering them. */
  function hive() {
    return shape((p, c, s) => {
      const r = rand(17);
      const list = appList();
      const cs = view.wide ? 0.25 : 0.19;
      const cells = honeycomb(list.length, cs);
      const lit = (k) => k < list.length;
      const tone = (k) => lit(k) ? new Color(list[k].a || suites[0].a) : PALETTE[2];
      const wallN = Math.floor(COUNT * 0.82);
      for (let i = 0; i < COUNT; i++) {
        if (i < list.length) {
          const [x, y] = cells[i];
          p.set([x, y, 0.08], i * 3); tint(c, i, tone(i), 1.45); s[i] = 8 + r() * 3;
        } else if (i < wallN) {
          const k = Math.floor(r() * cells.length), [x, y] = cells[k];
          const v = hexCorners(x, y, cs * 0.9), e = Math.floor(r() * 6), t = r();
          const a = v[e], b = v[(e + 1) % 6];
          p.set([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (r() - 0.5) * 0.05], i * 3);
          tint(c, i, tone(k), lit(k) ? 0.6 + r() * 0.3 : 0.34 + r() * 0.12); s[i] = 1.8 + r() * 1.2;
        } else {
          const a = r() * Math.PI * 2, d = cs * (11 + r() * 5);
          p.set([Math.cos(a) * d, Math.sin(a) * d, (r() - 0.5) * 1.2], i * 3);
          tint(c, i, PALETTE[Math.floor(r() * 4)], 0.1 + r() * 0.15); s[i] = 1.4 + r() * 1.2;
        }
      }
    }, { spin: 0, tilt: 0.18, x: view.wide ? view.w * 0.22 : 0, y: view.wide ? 0 : view.h * 0.08 });
  }

  /* Three product lines, three cells: a monitor for Windows, a phone for Android, a spark for AI Studio. */
  function trio() {
    const k = view.wide ? 1 : 0.66;
    const R = 1.12 * k;
    const cells = [[0, 1.05 * k], [-1.02 * k, -0.72 * k], [1.02 * k, -0.72 * k]];
    const tones = [PALETTE[2], PALETTE[3], PALETTE[0]];
    const monitor = (cx, cy) => [
      ...rect(cx, cy + 0.12 * k, 0.95 * k, 0.6 * k),
      [[cx, cy - 0.18 * k], [cx, cy - 0.34 * k]], [[cx - 0.24 * k, cy - 0.36 * k], [cx + 0.24 * k, cy - 0.36 * k]],
    ];
    const phone = (cx, cy) => [...rect(cx, cy, 0.46 * k, 0.8 * k), [[cx - 0.07 * k, cy + 0.3 * k], [cx + 0.07 * k, cy + 0.3 * k]]];
    const spark = (cx, cy) => {
      const L = 0.42 * k, w = 0.1 * k, out = [];
      for (let q = 0; q < 4; q++) {
        const a = (q * Math.PI) / 2, tip = [cx + Math.cos(a) * L, cy + Math.sin(a) * L];
        const sideA = [cx + Math.cos(a + Math.PI / 4) * w, cy + Math.sin(a + Math.PI / 4) * w];
        const sideB = [cx + Math.cos(a - Math.PI / 4) * w, cy + Math.sin(a - Math.PI / 4) * w];
        out.push([sideB, tip], [tip, sideA]);
      }
      return out;
    };
    const glyphs = [monitor(...cells[0]), phone(...cells[1]), spark(...cells[2])];
    return shape((p, c, s) => {
      const r = rand(23);
      const per = Math.floor(COUNT / 3);
      for (let i = 0; i < COUNT; i++) {
        const g = Math.min(2, Math.floor(i / per)), j = i - g * per;
        const [cx, cy] = cells[g];
        if (j < per * 0.45) {
          const [a, b] = hexSegs(cx, cy, R)[Math.floor(r() * 6)], t = r();
          p.set([a[0] + (b[0] - a[0]) * t + (r() - 0.5) * 0.05, a[1] + (b[1] - a[1]) * t + (r() - 0.5) * 0.05, (r() - 0.5) * 0.08], i * 3);
          tint(c, i, tones[g], 0.75 + r() * 0.3); s[i] = 2 + r() * 1.6;
        } else if (j < per * 0.8) {
          const segs = glyphs[g], [a, b] = segs[Math.floor(r() * segs.length)], t = r();
          p.set([a[0] + (b[0] - a[0]) * t + (r() - 0.5) * 0.04, a[1] + (b[1] - a[1]) * t + (r() - 0.5) * 0.04, 0.05], i * 3);
          tint(c, i, WHITE, 0.7 + r() * 0.3); s[i] = 2 + r() * 1.5;
        } else {
          const [x, y] = inHex(r, R * 0.9);
          p.set([cx + x, cy + y, (r() - 0.5) * 0.25], i * 3); tint(c, i, tones[g], 0.1 + r() * 0.12); s[i] = 1.4 + r() * 1.2;
        }
      }
    }, { spin: 0, tilt: 0, x: view.wide ? view.w * 0.21 : 0, y: view.wide ? 0 : view.h * 0.12 });
  }

  /* The catalogue grouped around one studio: a gold centre cell with six around it. */
  function bloom() {
    const k = view.wide ? 1 : 0.66;
    const R = 0.92 * k;
    const centres = [[0, 0], ...Array.from({ length: 6 }, (_, q) => {
      const a = (q * Math.PI) / 3;
      return [Math.cos(a) * SQ3 * R, Math.sin(a) * SQ3 * R];
    })];
    const tones = [PALETTE[0], PALETTE[2], PALETTE[3], PALETTE[1], PALETTE[4], PALETTE[2], PALETTE[3]];
    return shape((p, c, s) => {
      const r = rand(29);
      for (let i = 0; i < COUNT; i++) {
        const g = i % 7, [cx, cy] = centres[g];
        if (r() < 0.55) {
          const [a, b] = hexSegs(cx, cy, R * 0.96)[Math.floor(r() * 6)], t = r();
          p.set([a[0] + (b[0] - a[0]) * t + (r() - 0.5) * 0.04, a[1] + (b[1] - a[1]) * t + (r() - 0.5) * 0.04, (r() - 0.5) * 0.08], i * 3);
          tint(c, i, tones[g], (g === 0 ? 1.25 : 0.8) + r() * 0.3); s[i] = (g === 0 ? 2.8 : 2.2) + r() * 1.5;
        } else {
          const [x, y] = inHex(r, R * 0.85);
          p.set([cx + x, cy + y, (r() - 0.5) * 0.3], i * 3); tint(c, i, tones[g], (g === 0 ? 0.42 : 0.14) + r() * 0.14); s[i] = 1.4 + r() * 1.4;
        }
      }
    }, { spin: 0, tilt: 0.22, x: view.wide ? view.w * 0.22 : 0, y: view.wide ? 0 : -view.h * 0.02 });
  }

  /* Your machine as a hexagonal prism, with the work moving inside it and none of it leaving. */
  function vault() {
    const R = view.wide ? 1.75 : 1.25, Hh = view.wide ? 1.45 : 1.05;
    const top = hexCorners(0, 0, R).map(([x, z]) => [x, Hh, z]);
    const bot = hexCorners(0, 0, R).map(([x, z]) => [x, -Hh, z]);
    const edges = [
      ...top.map((p, k) => [p, top[(k + 1) % 6]]),
      ...bot.map((p, k) => [p, bot[(k + 1) % 6]]),
      ...top.map((p, k) => [p, bot[k]]),
    ];
    return shape((p, c, s) => {
      const r = rand(31);
      const edgeN = Math.floor(COUNT * 0.5);
      const e = onSegments(edges, edgeN, r, 0.04);
      for (let i = 0; i < COUNT; i++) {
        if (i < edgeN) {
          p.set(e[i], i * 3); tint(c, i, PALETTE[3], 0.7 + r() * 0.35); s[i] = 2 + r() * 1.6;
        } else {
          const [x, z] = inHex(r, R * 0.72);
          p.set([x, (r() - 0.5) * 2 * Hh * 0.75, z], i * 3);
          tint(c, i, PALETTE[Math.floor(r() * 4)], 0.3 + r() * 0.4); s[i] = 1.8 + r() * 2;
        }
      }
    }, { spin: 0.16, tilt: 0.38, x: view.wide ? view.w * 0.22 : 0 });
  }

  /* A honeycomb floor under the last section, moving slowly. */
  function floor() {
    return shape((p, c, s) => {
      const r = rand(13);
      const cs = 0.78, W = view.w * 1.3, D = 12;
      const cols = Math.ceil(W / (cs * SQ3)) + 1, rows = Math.ceil(D / (cs * 1.5)) + 1;
      for (let i = 0; i < COUNT; i++) {
        const q = Math.floor(r() * cols), row = Math.floor(r() * rows);
        const cx = (q + (row % 2) * 0.5) * cs * SQ3 - W / 2, cz = row * cs * 1.5 - D * 0.7;
        const [a, b] = hexSegs(cx, cz, cs)[Math.floor(r() * 6)], t = r();
        p.set([a[0] + (b[0] - a[0]) * t, -2.4, a[1] + (b[1] - a[1]) * t], i * 3);
        tint(c, i, PALETTE[Math.floor(((cx + W / 2) / W) * 4) % 4], 0.42 + r() * 0.3); s[i] = 1.9 + r() * 1.4;
      }
    }, { wave: 1, tilt: 0.32 });
  }

  function mark() {
    const width = Math.min(view.wide ? view.w * 0.42 : view.w * 0.86, 8.5);
    return shape((p, c, s) => {
      p.set(sampleText('HSX', COUNT, width));
      const r = rand(5);
      for (let i = 0; i < COUNT; i++) {
        const t = (p[i * 3] / width) + 0.5;
        tint(c, i, PALETTE[Math.min(3, Math.floor(t * 4))], 0.6 + r() * 0.4);
        s[i] = 2 + r() * 1.8;
      }
    }, { x: view.wide ? view.w * 0.24 : 0, y: view.wide ? 0 : view.h * 0.22 });
  }

  const builders = { emblem, hive, trio, bloom, vault, mark, floor };

  function build() {
    layout();
    for (const k of Object.keys(builders)) shapes[k] = builders[k]();
  }

  build();
  pos.set(shapes[current].p);
  col.set(shapes[current].c);
  size.set(shapes[current].s);
  points.rotation.x = shapes[current].tilt;

  const clock = new Clock();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let waveNow = 0;
  let spinNow = shapes[current].spin;
  let raf = 0;

  const off = () => canvas.classList.contains('off') || document.hidden;

  let settledOn = null;
  let lastFrame = 0;

  function frame(now) {
    raf = 0;
    if (off()) return;
    /* high-refresh screens would otherwise do this work twice as often */
    if (!reduced && now - lastFrame < 15) { raf = requestAnimationFrame(frame); return; }
    lastFrame = now;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const target = shapes[current];
    let moving = false;

    const base = reduced ? 1 : 1 - Math.pow(1 - 0.045, dt * 60);
    if (settledOn !== target) {
    for (let i = 0; i < COUNT; i++) {
      const k = Math.min(1, base * speed[i]);
      const j = i * 3;
      for (let a = 0; a < 3; a++) {
        const d = target.p[j + a] - pos[j + a];
        if (d > 0.001 || d < -0.001) moving = true;
        pos[j + a] += d * k;
        col[j + a] += (target.c[j + a] - col[j + a]) * k;
      }
      size[i] += (target.s[i] - size[i]) * k;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.attributes.size.needsUpdate = true;
    if (!moving) settledOn = target;
    }

    const ease = reduced ? 1 : Math.min(1, dt * 1.6);
    waveNow += (target.wave - waveNow) * ease;
    spinNow += (target.spin - spinNow) * Math.min(1, dt * 2);
    points.rotation.x += (target.tilt - points.rotation.x) * ease;
    material.uniforms.uWave.value = waveNow;
    material.uniforms.uTime.value = reduced ? 0 : t;

    if (!reduced) {
      if (target.spin === 0) {
        const full = Math.PI * 2;
        const goal = Math.round(points.rotation.y / full) * full;
        points.rotation.y += (goal - points.rotation.y) * Math.min(1, dt * 1.8);
      } else {
        points.rotation.y += spinNow * dt;
      }
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
      camera.position.x = pointer.x * 0.6;
      camera.position.y = pointer.y * 0.4;
      camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
    if (!reduced || moving) raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (!raf && !off()) { clock.getDelta(); raf = requestAnimationFrame(frame); }
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { build(); settledOn = null; kick(); }, 150);
  });
  if (!reduced) {
    window.addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = -(e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }
  document.addEventListener('visibilitychange', kick);
  new MutationObserver(kick).observe(canvas, { attributes: true, attributeFilter: ['class'] });

  const ratios = new Map();
  const watcher = new IntersectionObserver((entries) => {
    for (const e of entries) ratios.set(e.target, e.intersectionRatio);
    let best = null;
    let top = 0;
    for (const [el, r] of ratios) if (r > top) { top = r; best = el; }
    const name = best && best.dataset.scene;
    if (name && name !== current && builders[name]) { current = name; kick(); }
  }, { threshold: [0, 0.15, 0.3, 0.5, 0.7, 0.9] });
  for (const [sel, name] of SECTIONS) {
    const found = document.querySelector(sel);
    const el = found && (found.closest('section') || found);
    if (el) { el.dataset.scene = name; watcher.observe(el); }
  }

  fetch('hub-catalog.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (!data || !data.ps) return;
      apps = data.ps.map((p) => ({ s: p.s, a: p.a }));
      if (data.cs && data.cs.length) suites = data.cs.map((s) => ({ k: s.k, a: s.a, c: s.c }));
      shapes.hive = builders.hive();
      kick();
    })
    .catch(() => {});

  if (document.fonts) document.fonts.ready.then(() => { shapes.mark = mark(); kick(); });

  kick();
}

const canvas = document.createElement('canvas');
canvas.id = 'scene3d';
canvas.setAttribute('aria-hidden', 'true');
if (window.__skyOn === true) canvas.classList.add('off');
document.body.prepend(canvas);
try {
  start(canvas, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
} catch (e) {
  canvas.remove();
  console.warn('3D scene unavailable:', e);
}
