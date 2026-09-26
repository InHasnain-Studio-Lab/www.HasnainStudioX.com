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
  ['.hero-split', 'galaxy'],
  ['.hub-burst', 'hub'],
  ['#platform-title', 'devices'],
  ['#browse-title', 'grid'],
  ['#why-local', 'cube'],
  ['#about', 'mark'],
  ['#founder-note', 'wave'],
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
  let current = 'galaxy';

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

  function suiteColour(k) {
    return new Color((suites.find((g) => g.k === k) || suites[0]).a);
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

  /* Three spiral arms, one per suite, with every app as a bright star on its arm. */
  function galaxy() {
    const scale = view.wide ? 1 : 0.7;
    return shape((p, c, s) => {
      const r = rand(3);
      const list = appList();
      const keys = suites.map((g) => g.k);
      const armOf = (k) => Math.max(0, keys.indexOf(k));
      const counts = {};
      for (let i = 0; i < COUNT; i++) {
        let arm, d, col, b, sz;
        if (i < list.length) {
          arm = armOf(list[i].s);
          counts[arm] = (counts[arm] || 0) + 1;
          d = 0.7 + (counts[arm] / (list.filter((a) => armOf(a.s) === arm).length + 1)) * 3.6;
          col = new Color(list[i].a || suites[arm].a);
          b = 1.35;
          sz = 10 + r() * 4;
        } else if (i < COUNT * 0.12) {
          arm = -1;
          d = Math.pow(r(), 2) * 0.9;
          col = PALETTE[0];
          b = 0.7 + r() * 0.3;
          sz = 2 + r() * 2;
        } else {
          arm = i % keys.length;
          d = 0.5 + Math.pow(r(), 0.8) * 4.8;
          col = suiteColour(keys[arm]);
          b = 0.3 + r() * 0.45;
          sz = 1.8 + r() * 2;
        }
        const base = arm < 0 ? r() * Math.PI * 2 : (arm / keys.length) * Math.PI * 2;
        const a = base + d * 0.95 + (arm < 0 ? 0 : (r() - 0.5) * (0.35 + d * 0.06));
        const spread = arm < 0 ? 0.25 : 0.12 + d * 0.05;
        p[i * 3] = (Math.cos(a) * d + (r() - 0.5) * spread) * scale;
        p[i * 3 + 1] = (r() - 0.5) * (arm < 0 ? 0.5 : 0.18) * scale;
        p[i * 3 + 2] = (Math.sin(a) * d + (r() - 0.5) * spread) * scale;
        tint(c, i, col, view.wide ? b : b * 0.6);
        s[i] = sz;
      }
    }, { spin: 0.06, tilt: 0.62, x: view.wide ? view.w * 0.2 : 0, y: view.wide ? 0 : view.h * 0.18 });
  }

  /* Every app on one ring around a bright core: the Hub gathering them. */
  function hub() {
    const R = view.wide ? 2.4 : 1.7;
    return shape((p, c, s) => {
      const r = rand(17);
      const list = appList();
      for (let i = 0; i < COUNT; i++) {
        if (i < list.length) {
          const a = (i / list.length) * Math.PI * 2;
          p.set([Math.cos(a) * R, Math.sin(a) * R, 0], i * 3);
          tint(c, i, new Color(list[i].a || suites[0].a), 1.4);
          s[i] = 9 + r() * 3;
        } else if (i < COUNT * 0.22) {
          const u = r() * 2 - 1, th = r() * Math.PI * 2, rr = 0.55 * Math.cbrt(r());
          const q = Math.sqrt(1 - u * u);
          p.set([Math.cos(th) * q * rr, Math.sin(th) * q * rr, u * rr], i * 3);
          tint(c, i, PALETTE[i % 2 ? 0 : 3], 0.8 + r() * 0.2);
          s[i] = 2.4 + r() * 2.4;
        } else {
          const a = r() * Math.PI * 2;
          const d = R + (r() - 0.5) * 0.5 + (r() < 0.25 ? (r() - 0.5) * 2.2 : 0);
          p.set([Math.cos(a) * d, Math.sin(a) * d, (r() - 0.5) * 0.4], i * 3);
          tint(c, i, PALETTE[Math.floor(r() * 4)], 0.25 + r() * 0.35);
          s[i] = 1.6 + r() * 1.8;
        }
      }
    }, { spin: 0.1, tilt: 0.25, x: view.wide ? view.w * 0.22 : 0 });
  }

  /* A monitor and a phone drawn in light: Windows and Android. */
  function devices() {
    const k = view.wide ? 1 : 0.62;
    const monitor = [
      ...rect(-0.9 * k, 0.35 * k, 4.6 * k, 2.8 * k),
      [[-0.9 * k, -1.05 * k], [-0.9 * k, -1.65 * k]],
      [[-1.8 * k, -1.7 * k], [0, -1.7 * k]],
    ];
    const phone = [...rect(2.35 * k, -0.1 * k, 1.25 * k, 2.4 * k), [[2.15 * k, 0.95 * k], [2.55 * k, 0.95 * k]]];
    return shape((p, c, s) => {
      const r = rand(23);
      const edgeN = Math.floor(COUNT * 0.6);
      const mN = Math.floor(edgeN * 0.72);
      const edges = [...onSegments(monitor, mN, r, 0.05), ...onSegments(phone, edgeN - mN, r, 0.05)];
      for (let i = 0; i < COUNT; i++) {
        if (i < edgeN) {
          p.set(edges[i], i * 3);
          tint(c, i, i < mN ? PALETTE[2] : PALETTE[3], 0.75 + r() * 0.3);
          s[i] = 2 + r() * 1.8;
        } else {
          const inPhone = r() < 0.25;
          const [cx, cy, w, h] = inPhone ? [2.35 * k, -0.1 * k, 1.1 * k, 2.2 * k] : [-0.9 * k, 0.35 * k, 4.4 * k, 2.6 * k];
          p.set([cx + (r() - 0.5) * w, cy + (r() - 0.5) * h, (r() - 0.5) * 0.3], i * 3);
          tint(c, i, PALETTE[Math.floor(r() * 5)], 0.12 + r() * 0.2);
          s[i] = 1.4 + r() * 1.4;
        }
      }
    }, { spin: 0, tilt: 0, x: view.wide ? view.w * 0.2 : 0, y: view.wide ? 0 : view.h * 0.12 });
  }

  /* The catalogue as a grid of tiles, one per app. */
  function grid() {
    return shape((p, c, s) => {
      const r = rand(29);
      const list = appList();
      const cols = view.wide ? 12 : 8;
      const rows = Math.ceil(list.length / cols);
      const gap = Math.min((view.wide ? view.w * 0.5 : view.w * 0.85) / cols, 0.62);
      const per = Math.floor((COUNT - list.length) / list.length);
      const centre = (i) => [((i % cols) - (cols - 1) / 2) * gap, ((rows - 1) / 2 - Math.floor(i / cols)) * gap];
      for (let i = 0; i < COUNT; i++) {
        if (i < list.length) {
          const [x, y] = centre(i);
          p.set([x, y, 0.2], i * 3);
          tint(c, i, new Color(list[i].a || suites[0].a), 1.3);
          s[i] = 7 + r() * 2;
        } else {
          const owner = Math.min(list.length - 1, Math.floor((i - list.length) / Math.max(1, per)));
          const [x, y] = centre(owner);
          const h = gap * 0.36;
          const edge = r() < 0.7;
          const t = r() * 4;
          const side = Math.floor(t);
          const f = (t - side) * 2 - 1;
          const px = edge ? (side < 2 ? f * h : (side === 2 ? -h : h)) : (r() - 0.5) * 2 * h;
          const py = edge ? (side < 2 ? (side === 0 ? -h : h) : f * h) : (r() - 0.5) * 2 * h;
          p.set([x + px, y + py, (r() - 0.5) * 0.1], i * 3);
          tint(c, i, new Color(list[owner].a || suites[0].a), edge ? 0.35 + r() * 0.2 : 0.12);
          s[i] = 1.4 + r() * 1.2;
        }
      }
    }, { spin: 0, tilt: 0, x: view.wide ? view.w * 0.22 : 0, y: view.wide ? 0 : -view.h * 0.05 });
  }

  /* A cube: your machine, with the work kept inside it. */
  function cube() {
    const h = view.wide ? 1.7 : 1.25;
    const v = [[-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h], [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]];
    const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].map(([a, b]) => [v[a], v[b]]);
    return shape((p, c, s) => {
      const r = rand(31);
      const edgeN = Math.floor(COUNT * 0.55);
      const e = onSegments(edges, edgeN, r, 0.04);
      for (let i = 0; i < COUNT; i++) {
        if (i < edgeN) {
          p.set(e[i], i * 3);
          tint(c, i, PALETTE[3], 0.7 + r() * 0.35);
          s[i] = 2 + r() * 1.6;
        } else {
          const rr = Math.cbrt(r()) * h * 0.6;
          const u = r() * 2 - 1, th = r() * Math.PI * 2, q = Math.sqrt(1 - u * u);
          p.set([Math.cos(th) * q * rr, Math.sin(th) * q * rr, u * rr], i * 3);
          tint(c, i, PALETTE[Math.floor(r() * 4)], 0.3 + r() * 0.4);
          s[i] = 1.8 + r() * 2;
        }
      }
    }, { spin: 0.18, tilt: 0.45, x: view.wide ? view.w * 0.22 : 0 });
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

  function wave() {
    return shape((p, c, s) => {
      const r = rand(13);
      const cols = Math.round(Math.sqrt(COUNT * 1.8));
      const rows = Math.ceil(COUNT / cols);
      const W = view.w * 1.3;
      for (let i = 0; i < COUNT; i++) {
        const gx = i % cols;
        const gz = Math.floor(i / cols);
        p.set([(gx / (cols - 1) - 0.5) * W, -2.4, (gz / rows - 0.7) * 12], i * 3);
        tint(c, i, PALETTE[Math.floor((gx / cols) * 4) % 4], 0.28 + r() * 0.3);
        s[i] = 1.8 + r() * 1.4;
      }
    }, { wave: 1 });
  }

  const builders = { galaxy, hub, devices, grid, cube, mark, wave };

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
      for (const k of ['galaxy', 'hub', 'grid']) shapes[k] = builders[k]();
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
