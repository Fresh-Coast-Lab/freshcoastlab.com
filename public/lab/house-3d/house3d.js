// "Watch my house think", in 3D. A baked-light dollhouse of the same house as
// /assets/house.js, replaying the same eleven automation patterns:
// sensor -> hub -> action -> verified -> alert.
// Static geometry is lit by lightmaps baked in Blender (sun/moon, sky, and one
// channel per light group). Moving things (garage door, fridge door, car, people)
// are lit in real time. Layout and security-device details are illustrative on purpose.
import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.min.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.min.js';

const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches || params.has('still');
const stage = $('#stage');
const canvas = $('#gl');
const EMBED = params.get('embed') === '1';
const FORCE_FPS = DEBUG ? +params.get('forcefps') || 0 : 0;

// messages to the page that embeds us (same origin only)
const toParent = (msg) => { if (window.parent !== window) { try { window.parent.postMessage(msg, location.origin); } catch { /* detached */ } } };
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
// verdicts expire: 'fail' after 3 days, 'low' after 7, so one bad moment (heat, a busy page) never sticks
const VERDICT_TTL = { fail: 3 * 864e5, low: 7 * 864e5, ok: 30 * 864e5 };
const readVerdict = () => { try { const o = JSON.parse(store.get('h3d-verdict')); return o && Date.now() - o.ts < (VERDICT_TTL[o.v] || 0) ? o.v : null; } catch { return null; } };

const NOGL_TEXT = {
  'no-webgl': 'This 3D version needs WebGL 2, which this browser has turned off.',
  'load-error': 'The 3D house didn\u2019t finish loading. The 2D house is right here instead.',
  'context-lost': 'The graphics chip dropped the 3D house. The 2D house is right here instead.',
  slow: 'This device is having trouble keeping the 3D house smooth.',
};
function noGL(err, reason = 'no-webgl') {
  if (err) console.error(err);
  $('#nogl p').textContent = NOGL_TEXT[reason] || NOGL_TEXT['no-webgl'];
  $('#nogl').hidden = false;
  $('#loading').style.display = 'none';
  toParent({ type: 'h3d-fallback', reason });
}

// embed: keep the parent's iframe exactly as tall as this document
if (EMBED) {
  let lastH = 0;
  const postSize = () => {
    const h = Math.ceil(document.documentElement.getBoundingClientRect().height);
    if (h !== lastH) { lastH = h; toParent({ type: 'h3d-size', h }); }
  };
  new ResizeObserver(postSize).observe(document.documentElement);
  addEventListener('load', postSize);
  postSize();
  document.querySelectorAll('#nogl a').forEach((a) => { a.target = '_top'; });
  // the stage can't size itself against our own viewport (the parent sizes us from our height),
  // so on wide screens cap it against the parent's window instead
  const capToParent = () => {
    try {
      const vh = window.top.innerHeight, vw = window.top.innerWidth;
      const land = vw > vh && vh < 600; // a phone on its side
      document.documentElement.classList.toggle('land', land);
      const room = Math.max(200, vh - (land ? 120 : 150)); // leave space for the chips
      const ratio = innerWidth >= 821 || land ? 16 / 9 : 4 / 5;
      document.documentElement.style.setProperty('--embed-maxw', `${Math.round(room * ratio)}px`);
    } catch { /* cross-origin parent: no cap */ }
  };
  capToParent();
  addEventListener('resize', capToParent);
  // the parent tells us its viewport height on resize (a listener on window.top would keep this iframe alive after removal)
  addEventListener('message', (e) => { if (e.origin === location.origin && e.data && e.data.type === 'h3d-vh') capToParent(); });
}

function webglOK() {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

// ---------------------------------------------------------------- layout (same as house.js)
const FLOOR = 0.1;
const W = (x, y, z = 0) => new THREE.Vector3(x - 10, z, y - 7);
const ROOMS = {
  office: [0, 0, 7, 7, 'Office'], laundry: [7, 0, 11, 7, 'Laundry'], kitchen: [11, 0, 20, 7, 'Kitchen'],
  pantry: [17, 0, 20, 3, 'Pantry'], garage: [0, 7, 7, 14, 'Garage'], living: [7, 7, 20, 14, 'Living room'],
};
const GROUPS = ['office', 'laundry', 'kitchen', 'pantry', 'garage', 'living', 'yard', 'drive', 'porch'];
const I = {
  hub: 'M0,-5 L4.3,-2.5 L4.3,2.5 L0,5 L-4.3,2.5 L-4.3,-2.5Z M-1.8,0 H1.8',
  zb: 'M-3,-3 H3 L-3,3 H3',
  motion: 'M-4.5,-1 A5,5 0 0 1 4.5,-1 M-2.5,1 A2.7,2.7 0 0 1 2.5,1 M0,3.2 V3.4',
  light: 'M0,-4 A3.2,3.2 0 1 1 -0.01,-4 M-1.6,3.4 H1.6 M-1,4.8 H1',
  leak: 'M0,-4.5 C3.2,-0.5 3.2,3.5 0,3.5 C-3.2,3.5 -3.2,-0.5 0,-4.5Z',
  smoke: 'M0,-4.5 A4.5,4.5 0 1 1 -0.01,-4.5 M-2,0 H2 M0,-2 V2',
  lock: 'M-3,-0.5 H3 V4 H-3Z M-1.8,-0.5 V-2.2 A1.8,1.8 0 0 1 1.8,-2.2 V-0.5',
  cam: 'M-4,-2.5 H2 V2.5 H-4Z M2,-1 L4.5,-2.5 V2.5 L2,1',
  tv: 'M-5,-3 H5 V2.5 H-5Z M-2,4.2 H2',
  speaker: 'M-2.6,-4.5 H2.6 V4.5 H-2.6Z M0,1.3 A1.5,1.5 0 1 1 -0.01,1.3 M0,-2.4 V-2.3',
  washer: 'M-4,-4 H4 V4 H-4Z M0,0.5 A2.2,2.2 0 1 1 -0.01,0.5',
  range: 'M-4,-3 H4 V3.5 H-4Z M-2,-0.2 A1,1 0 1 1 -2.01,-0.2 M2,-0.2 A1,1 0 1 1 1.99,-0.2',
  fridge: 'M-2.8,-4.8 H2.8 V4.8 H-2.8Z M-2.8,-0.8 H2.8 M1.5,-3.2 V-2',
  thermo: 'M0,-4.2 A4.2,4.2 0 1 1 -0.01,-4.2 M0,0 L2,-2',
  bt: 'M-2.2,-2 L2.2,2 L0,4 V-4 L2.2,-2 L-2.2,2',
  plug: 'M-3.2,-3.2 H3.2 V3.2 H-3.2Z M-1.2,-0.8 V0.8 M1.2,-0.8 V0.8',
  tilt: 'M-4,3 L3.5,-2.5 M-4,3 H4',
};
const D = {
  hub: [0.4, 4.2, 'hub', 'Home Assistant hub', 2.1], zb: [0.4, 5.6, 'zb', 'Zigbee coordinator', 2.1],
  m_garage: [0.2, 7.6, 'motion', 'garage motion', 2.3], m_bench: [0.2, 12.6, 'motion', 'workbench motion', 1.6],
  l_garage: [3.6, 10.4, 'light', 'garage lights', 2.6], tilt: [3.5, 13.8, 'tilt', 'door tilt sensor', 2.2],
  m_laundry: [10.8, 0.1, 'motion', 'laundry motion', 2.3], l_laundry: [9, 3.4, 'light', 'laundry lights', 2.6],
  leak: [7.7, 1.8, 'leak', 'water sensor', 0.1], washer: [7.75, 0.8, 'washer', 'washer + dryer', 1.05],
  range: [13.45, 0.65, 'range', 'range', 0.95], fridge: [16.25, 0.7, 'fridge', 'fridge', 2.05],
  smoke_p: [19.4, 1.8, 'smoke', 'smoke / CO', 2.6], l_pantry: [18.4, 1.8, 'light', 'pantry light', 2.6],
  m_living: [7.2, 7.2, 'motion', 'living room motion', 2.2], lamp: [18.55, 12.75, 'light', 'lamp', 2.2],
  tv: [14.6, 7.45, 'tv', 'Frame TV', 2.3], sonos: [16.6, 7.45, 'speaker', 'speaker', 0.55],
  thermo: [7.1, 10.4, 'thermo', 'thermostat', 1.5], proxy: [8.2, 13.2, 'bt', 'ESPHome BT proxy', 0.9],
  lock: [8.9, 14.0, 'lock', 'front door', 1.0], bell: [10.0, 14.1, 'cam', 'doorbell camera', 1.4],
  flood: [0.1, 14.1, 'cam', 'driveway camera', 2.4], walls: [6.8, 14.2, 'light', 'garage wall lights', 1.9],
  porch: [10.4, 15.8, 'speaker', 'porch speaker', 0.4], yard: [9.6, -1.4, 'light', 'back yard lights', 1.8],
  r1: [12.4, 3.6, 'plug', 'smart plug (router)', 0.95], r2: [15.9, 11.6, 'plug', 'smart plug (router)', 0.45],
  smoke_u: [3.4, 4.2, 'smoke', 'smoke / CO, upstairs', 3.4],
};
const LIGHT_ROOM = { l_garage: 'garage', l_laundry: 'laundry', l_pantry: 'pantry', lamp: 'living', yard: 'yard', walls: 'drive', flood: 'drive' };
const zoneOf = (x, y) => {
  if (y < 0) return 'yard';
  if (y > 14.05) return x < 7 ? 'drive' : 'porch';
  if (x >= 17 && y <= 3) return 'pantry';
  for (const k of ['office', 'laundry', 'kitchen', 'garage', 'living']) {
    const [x0, y0, x1, y1] = ROOMS[k];
    if (x >= x0 - 0.05 && x <= x1 + 0.05 && y >= y0 - 0.05 && y <= y1 + 0.05) return k;
  }
  return x > 20 ? 'living' : 'yard';
};

// camera shots: centre (house coords), radius to frame, azimuth and elevation (radians)
const BASE_AZ = 0.62;
const SHOTS = {
  dollhouse: { c: [10, 7.6, 0.4], r: 13.2, az: BASE_AZ, el: 0.84, name: 'Dollhouse' },
  office: { c: [3.6, 3.6, 0.7], r: 4.9, az: 0.5, el: 0.9, name: 'Office' },
  laundry: { c: [9.1, 3.2, 0.7], r: 4.0, az: 0.42, el: 0.86, name: 'Laundry' },
  kitchen: { c: [15.0, 3.4, 0.8], r: 5.2, az: 0.02, el: 0.88, name: 'Kitchen' },
  pantry: { c: [17.2, 2.8, 0.9], r: 4.3, az: -0.1, el: 0.9, name: 'Kitchen' },
  garage: { c: [3.6, 11.0, 0.7], r: 5.3, az: 0.7, el: 0.9, name: 'Garage' },
  living: { c: [13.8, 10.7, 0.6], r: 6.6, az: 0.55, el: 0.82, name: 'Living room' },
  drive: { c: [3.6, 15.4, 0.6], r: 7.4, az: 0.78, el: 0.72, name: 'Driveway' },
  porch: { c: [9.5, 13.6, 0.6], r: 5.2, az: 0.45, el: 0.78, name: 'Front door' },
  yard: { c: [9.5, -1.8, 0.9], r: 7.0, az: 2.55, el: 0.62, name: 'Back yard' },
};
const ROOM_CHIPS = [['dollhouse', 'Whole house'], ['garage', 'Garage'], ['kitchen', 'Kitchen'], ['laundry', 'Laundry'], ['living', 'Living'], ['office', 'Office'], ['drive', 'Driveway'], ['yard', 'Back yard']];

// light colours (linear) and strength per group
const LAMP = {
  office: [1.0, 0.66, 0.38, 1.25], laundry: [1.0, 0.78, 0.55, 1.2], kitchen: [1.0, 0.72, 0.46, 1.25], pantry: [1.0, 0.7, 0.42, 1.3],
  garage: [0.95, 0.9, 0.82, 1.3], living: [1.0, 0.6, 0.3, 1.45], yard: [1.0, 0.58, 0.26, 1.5], drive: [0.92, 0.94, 1.0, 1.2], porch: [1.0, 0.62, 0.3, 1.4],
};
const LAMP_POS = { office: [2.4, 2.4, 1.9], laundry: [9, 3.2, 1.9], kitchen: [14.2, 3.4, 1.95], pantry: [18.5, 1.7, 1.9], garage: [3.6, 10.6, 2.1], living: [14.5, 11, 1.9], yard: [9.5, -2.8, 2.2], drive: [3, 15.5, 2.3], porch: [10.3, 15.2, 1.2] };

async function main() {
  if (!webglOK() || params.has('nogl')) { noGL(null, 'no-webgl'); return; }

  // ---------------------------------------------------------------- renderer
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: DEBUG });
  } catch (e) { noGL(e, 'no-webgl'); return; }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);

  // ---------------------------------------------------------------- quality tiers
  // high: DPR up to 2 on desktop, 1.5 on phones. mid: DPR 1.25. low: DPR 1, glow sprites off, small lightmaps.
  // The runtime monitor walks down this ladder one rung at a time.
  const PHONE = matchMedia('(pointer: coarse)').matches || innerWidth < 820;
  const devDpr = window.devicePixelRatio || 1;
  const verdict0 = readVerdict();
  const TIER = ['high', 'mid', 'low'].includes(params.get('tier')) ? params.get('tier') : verdict0 === 'low' ? 'low' : 'high';
  const dprs = [...new Set([Math.min(devDpr, PHONE ? 1.5 : 2), Math.min(devDpr, 1.5), Math.min(devDpr, 1.25), 1].map((v) => Math.max(1, v)))].sort((a, b) => b - a);
  const LEVELS = [...dprs.map((d) => ({ dpr: d, glows: true })), { dpr: 1, glows: false }];
  const startLevel = TIER === 'low' ? LEVELS.length - 1 : TIER === 'mid' ? LEVELS.findIndex((l) => l.dpr <= 1.25) : 0;
  let level = startLevel;
  let dpr = LEVELS[level].dpr, glowsOn = LEVELS[level].glows;
  renderer.setPixelRatio(dpr);
  const TEXDIR = TIER === 'low' ? 'low/' : '';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 400);

  // ---------------------------------------------------------------- assets
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  // lightmaps decode off the main thread (ImageBitmap) where supported, so the home page never stalls on them
  const bitmapOK = typeof createImageBitmap === 'function';
  const bmpLoader = bitmapOK ? new THREE.ImageBitmapLoader().setOptions({ imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }) : null;
  const texLoader = new THREE.TextureLoader();
  const finish = (t) => {
    t.flipY = false; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 4;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true;
    t.needsUpdate = true; return t;
  };
  const loadTex = (name) => new Promise((res, rej) => {
    if (bmpLoader) bmpLoader.load(name, (bmp) => res(finish(new THREE.Texture(bmp))), undefined, rej);
    else texLoader.load(name, (t) => res(finish(t)), undefined, rej);
  });
  const giveUp = new Promise((_, rej) => setTimeout(() => rej(new Error('load timed out after 20 s')), 20000));
  const [gltf, meta, ...tex] = await Promise.race([giveUp, Promise.all([
    loader.loadAsync('house.glb'),
    fetch('meta.json').then((r) => r.json()),
    ...['house_env', 'house_lamps0', 'house_lamps1', 'house_lamps2', 'lot_env', 'lot_lamps0', 'lot_lamps1', 'lot_lamps2'].map((n) => loadTex(TEXDIR + n + '.webp')),
  ])]);
  const TEX = { house: tex.slice(0, 4), lot: tex.slice(4, 8) };
  // decoded GPU memory of the lightmaps: w x h x 4 bytes, plus a third for mipmaps
  const texMiB = tex.reduce((sum, t) => sum + t.image.width * t.image.height * 4 * 1.333, 0) / 1048576;
  if (DEBUG) console.info(`[h3d] tier ${TIER}, lightmaps ${tex.map((t) => t.image.width).join('/')} px, ${texMiB.toFixed(1)} MiB decoded`);
  const root = gltf.scene;
  scene.add(root);
  root.updateMatrixWorld(true);

  // ---------------------------------------------------------------- baked static material
  const PAT = { floor_office: 1, floor_living: 1, floor_pantry: 1, porch: 1, floor_kitchen: 2, floor_laundry: 3, patio: 4, path: 4, grass: 5, driveway: 6, floor_garage: 7, rug: 8, wood: 9, desk: 9, woodlight: 9, patiowood: 9 };
  const staticVS = `
    attribute vec3 albedo; attribute float pat;
    varying vec2 vUv; varying vec3 vW; varying vec3 vN; varying vec3 vAlb; varying float vPat;
    void main(){
      vUv = uv; vAlb = albedo; vPat = pat;
      vec4 w = modelMatrix * vec4(position, 1.0);
      vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * w;
    }`;
  const staticFS = `
    uniform sampler2D tEnv, tL0, tL1, tL2;
    uniform vec3 uSun, uSky, uLamp[9];
    uniform vec4 uPt[4]; uniform vec3 uPtC[4];
    uniform vec3 uSpP, uSpD, uSpC;
    varying vec2 vUv; varying vec3 vW; varying vec3 vN; varying vec3 vAlb; varying float vPat;
    float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(h21(i), h21(i+vec2(1.,0.)), f.x), mix(h21(i+vec2(0.,1.)), h21(i+vec2(1.,1.)), f.x), f.y); }
    float line(float v, float w){ float d = abs(fract(v) - 0.5); float fw = fwidth(v); return 1.0 - smoothstep(0.5 - w - fw, 0.5 - w + fw, 0.5 - d + 0.0); }
    float groove(float v, float w){ float d = min(fract(v), 1.0 - fract(v)); float fw = fwidth(v) * 1.2; return smoothstep(w, w + fw, d); }
    vec3 pattern(vec3 a, float p, vec3 w, vec3 n){
      if (p < 0.5) return a;
      bool top = n.y > 0.8;
      if (p > 8.5) { // wood grain on furniture
        return a * (0.93 + 0.1 * vn(vec2(w.x * 3.0 + w.y * 2.0, w.z * 22.0 + w.y * 9.0)));
      }
      if (!top) return a;
      if (p < 1.5) { // planks
        float pw = 0.19; float row = floor(w.z / pw); float off = h21(vec2(row, 3.1)) * 1.4;
        float col = floor((w.x + off) / 1.4);
        float v = h21(vec2(row, col));
        a *= 0.84 + 0.26 * v;
        a *= 0.94 + 0.1 * vn(vec2(w.x * 4.0, w.z * 38.0));
        a *= mix(0.7, 1.0, groove(w.z / pw, 0.025) * groove((w.x + off) / 1.4, 0.004));
        return a;
      }
      if (p < 3.5) { // tiles
        float s = p < 2.5 ? 0.6 : 0.4;
        vec2 c = floor(w.xz / s);
        a *= 0.95 + 0.08 * h21(c);
        a *= mix(0.78, 1.0, groove(w.x / s, 0.02) * groove(w.z / s, 0.02));
        return a;
      }
      if (p < 4.5) { // pavers
        float s = 0.7; float row = floor(w.z / s); float off = mod(row, 2.0) * 0.5 * s;
        vec2 c = vec2(floor((w.x + off) / s), row);
        a *= 0.9 + 0.16 * h21(c);
        a *= mix(0.72, 1.0, groove((w.x + off) / s, 0.03) * groove(w.z / s, 0.03));
        return a;
      }
      if (p < 5.5) { // grass
        float g = vn(w.xz * 0.35) * 0.55 + vn(w.xz * 1.7) * 0.3 + vn(w.xz * 9.0) * 0.15;
        a *= 0.78 + 0.42 * g;
        a *= 0.92 + 0.16 * h21(floor(w.xz * 30.0));
        return a;
      }
      if (p < 6.5) { // driveway slabs
        a *= 0.9 + 0.12 * vn(w.xz * 2.5) + 0.05 * h21(floor(w.xz * 40.0));
        a *= mix(0.75, 1.0, groove(w.z / 2.6, 0.006) * groove((w.x + 7.0) / 3.3, 0.005));
        return a;
      }
      if (p < 7.5) { // garage concrete
        return a * (0.9 + 0.14 * vn(w.xz * 1.3) + 0.04 * h21(floor(w.xz * 50.0)));
      }
      // rug: border band
      return a * (0.92 + 0.08 * vn(w.xz * 30.0));
    }
    void main(){
      vec3 e = texture2D(tEnv, vUv).rgb; e *= e;
      vec3 l0 = texture2D(tL0, vUv).rgb; l0 *= l0;
      vec3 l1 = texture2D(tL1, vUv).rgb; l1 *= l1;
      vec3 l2 = texture2D(tL2, vUv).rgb; l2 *= l2;
      vec3 L = uSun * e.r + uSky * e.g
        + uLamp[0] * l0.r + uLamp[1] * l0.g + uLamp[2] * l0.b
        + uLamp[3] * l1.r + uLamp[4] * l1.g + uLamp[5] * l1.b
        + uLamp[6] * l2.r + uLamp[7] * l2.g + uLamp[8] * l2.b;
      vec3 N = normalize(vN);
      for (int i = 0; i < 4; i++) {
        vec3 d = uPt[i].xyz - vW; float dd = dot(d, d); float r = uPt[i].w;
        float att = max(0.0, 1.0 - dd / (r * r)); att *= att;
        L += uPtC[i] * att * (0.35 + 0.65 * max(dot(N, d * inversesqrt(dd + 1e-4)), 0.0));
      }
      vec3 d = uSpP - vW; float dist = length(d); vec3 dn = d / max(dist, 1e-3);
      float cone = smoothstep(0.8, 0.95, dot(-dn, uSpD));
      float att = cone / (1.0 + dist * dist * 0.06) * max(0.0, 1.0 - dist / 18.0);
      L += uSpC * att * max(dot(N, dn), 0.0);
      vec3 col = pattern(vAlb, vPat, vW, N) * L;
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  const shared = {
    uPt: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, -50, 0, 0.01)) },
    uPtC: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) },
    uSpP: { value: new THREE.Vector3(0, -50, 0) }, uSpD: { value: new THREE.Vector3(0, 0, -1) }, uSpC: { value: new THREE.Vector3() },
  };
  const makeStatic = (key) => new THREE.ShaderMaterial({
    vertexShader: staticVS, fragmentShader: staticFS,
    uniforms: {
      tEnv: { value: TEX[key][0] }, tL0: { value: TEX[key][1] }, tL1: { value: TEX[key][2] }, tL2: { value: TEX[key][3] },
      uSun: { value: new THREE.Vector3() }, uSky: { value: new THREE.Vector3() },
      uLamp: { value: GROUPS.map(() => new THREE.Vector3()) },
      ...shared,
    },
  });

  // merge a glTF node's primitives into one float geometry with albedo + pattern attributes
  function mergeNode(node) {
    const parts = [];
    node.traverse((m) => { if (m.isMesh) parts.push(m); });
    let nv = 0, ni = 0;
    for (const m of parts) { nv += m.geometry.attributes.position.count; ni += m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count; }
    const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), UV = new Float32Array(nv * 2), A = new Float32Array(nv * 3), PT = new Float32Array(nv);
    const IDX = new Uint32Array(ni);
    let vo = 0, io = 0;
    const v = new THREE.Vector3(), nm = new THREE.Matrix3();
    for (const m of parts) {
      const g = m.geometry, pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv;
      m.updateWorldMatrix(true, false);
      nm.getNormalMatrix(m.matrixWorld);
      const c = m.material.color;
      const mname = (m.material.name || '').replace(/^(house|lot)_/, '');
      const pat = PAT[mname] || 0;
      for (let i = 0; i < pa.count; i++) {
        v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld); v.toArray(P, (vo + i) * 3);
        v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); v.toArray(N, (vo + i) * 3);
        UV[(vo + i) * 2] = ua.getX(i); UV[(vo + i) * 2 + 1] = ua.getY(i);
        A[(vo + i) * 3] = c.r; A[(vo + i) * 3 + 1] = c.g; A[(vo + i) * 3 + 2] = c.b;
        PT[vo + i] = pat;
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) IDX[io++] = g.index.getX(i) + vo;
      else for (let i = 0; i < pa.count; i++) IDX[io++] = i + vo;
      vo += pa.count;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
    geo.setAttribute('albedo', new THREE.BufferAttribute(A, 3));
    geo.setAttribute('pat', new THREE.BufferAttribute(PT, 1));
    geo.setIndex(new THREE.BufferAttribute(IDX, 1));
    geo.computeBoundingSphere();
    return geo;
  }
  const byName = (n) => root.getObjectByName(n);
  const staticMats = {};
  const staticMeshes = [];
  for (const key of ['house', 'lot']) {
    const node = byName(key);
    const geo = mergeNode(node);
    node.parent.remove(node);
    staticMats[key] = makeStatic(key);
    const mesh = new THREE.Mesh(geo, staticMats[key]);
    mesh.name = key + '_baked';
    scene.add(mesh);
    staticMeshes.push(mesh);
  }

  // ---------------------------------------------------------------- real-time lights for moving objects
  const hemi = new THREE.HemisphereLight(0x8fb0ff, 0x1a2230, 0.4);
  scene.add(hemi);
  const sunL = new THREE.DirectionalLight(0xffffff, 1);
  sunL.position.copy(W(-6, 20, 16)).sub(W(10, 7, 0)).normalize().multiplyScalar(30);
  scene.add(sunL);
  const groupLights = {};
  for (const g of GROUPS) {
    const l = new THREE.PointLight(new THREE.Color(...LAMP[g].slice(0, 3)), 0, 11, 1.6);
    l.position.copy(W(LAMP_POS[g][0], LAMP_POS[g][1], LAMP_POS[g][2] + FLOOR));
    scene.add(l); groupLights[g] = l;
  }
  const fxLights = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffffff, 0, 6, 1.6); scene.add(l); return l; });
  const headSpot = new THREE.SpotLight(0xfff0d0, 0, 22, 0.5, 0.5, 1.2);
  scene.add(headSpot); scene.add(headSpot.target);
  // a dim environment for glossy reflections on the car and appliances
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envGeo = new THREE.SphereGeometry(10, 16, 8);
  envScene.add(new THREE.Mesh(envGeo, new THREE.ShaderMaterial({ side: THREE.BackSide, vertexShader: 'varying vec3 p; void main(){ p = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }', fragmentShader: 'varying vec3 p; void main(){ float y = normalize(p).y; vec3 c = mix(vec3(0.05,0.06,0.08), vec3(0.55,0.62,0.75), smoothstep(-0.2, 0.8, y)); c += vec3(1.0,0.8,0.6) * smoothstep(0.96, 1.0, dot(normalize(p), normalize(vec3(-0.4, 0.6, 0.5)))) * 2.0; gl_FragColor = vec4(c, 1.); }' })));
  const envTex = pmrem.fromScene(envScene, 0.02, 0.1, 100, { size: 64 }).texture;
  scene.environment = envTex;

  // ---------------------------------------------------------------- dynamic objects from the GLB
  const dynMats = [];
  root.traverse((o) => {
    if (o.isMesh && o.material && o.material.isMeshStandardMaterial) {
      o.material.envMapIntensity = 0.4;
      dynMats.push(o.material);
    }
  });
  const pivotAt = (obj, p) => { const g = new THREE.Group(); g.position.copy(p); scene.add(g); g.attach(obj); return g; };
  const matOf = (obj, name) => { let f = null; obj.traverse((o) => { if (o.isMesh && o.material.name === name) f = o.material; }); return f; };

  // windows: glass that glows with its room
  const windows = [];
  root.traverse((o) => {
    const m = /^win_([a-z]+)_\d+$/.exec(o.name);
    if (m) {
      const mat = new THREE.MeshBasicMaterial({ color: 0x0d1b2c, toneMapped: false });
      o.traverse((c) => { if (c.isMesh) c.material = mat; });
      windows.push({ room: m[1], mat, obj: o });
    }
  });
  const basicGlow = (name, room, off, on) => {
    const o = byName(name); if (!o) return null;
    const mat = new THREE.MeshBasicMaterial({ color: off, toneMapped: false });
    o.traverse((c) => { if (c.isMesh) c.material = mat; });
    return { room, mat, off: new THREE.Color(off), on: new THREE.Color(on), obj: o };
  };
  const fixtures = [
    basicGlow('fx_flood', 'drive', 0x3a3f46, 0xfff4e0), basicGlow('fx_wall_l', 'drive', 0x3a3f46, 0xffe2b0), basicGlow('fx_wall_r', 'drive', 0x3a3f46, 0xffe2b0),
    basicGlow('fx_porch', 'porch', 0x3a3f46, 0xffd9a0), basicGlow('fx_yard', 'yard', 0x55504a, 0xffd89a), basicGlow('lampshade', 'living', 0x4a4540, 0xfff0d2),
  ].filter(Boolean);

  // garage door panels
  const GD_TOP = 2.35, PH = GD_TOP / 4;
  const panels = [0, 1, 2, 3].map((i) => pivotAt(byName('gdoor_' + i), W(3.5, 13.99, FLOOR + (PH - 0.02) / 2 + i * PH)));
  let doorFrac = 1;
  const drawDoor = () => {
    // roller door: the curtain winds up into the header, so the garage stays visible from above
    const shift = (1 - doorFrac) * (GD_TOP + 0.05);
    const h = PH - 0.02;
    panels.forEach((p, i) => {
      const b = i * PH + shift, vt = Math.min(b + h, GD_TOP);
      if (vt - b < 0.01) { p.visible = false; return; }
      p.visible = true;
      p.scale.y = (vt - b) / h;
      p.position.copy(W(3.5, 13.99, FLOOR + (b + vt) / 2));
    });
  };
  drawDoor();

  // fridge door, hinge at the right edge
  const fridgePivot = pivotAt(byName('fridge_door'), W(16.8, 1.16, FLOOR));
  const fridgeIn = basicGlow('fridge_inner', 'kitchen', 0x9aa6ae, 0xe8f7ff);
  let fridgeFrac = 0;
  const drawFridge = () => {
    fridgePivot.rotation.y = fridgeFrac * Math.PI * 0.55;
    if (fridgeIn) fridgeIn.mat.color.copy(fridgeIn.off).lerp(fridgeIn.on, fridgeFrac).multiplyScalar(0.25 + 1.4 * fridgeFrac);
  };

  // TV art mode
  const tvObj = byName('tv_screen');
  const art = document.createElement('canvas'); art.width = 512; art.height = 272;
  {
    const c = art.getContext('2d');
    const g = c.createLinearGradient(0, 0, 512, 272);
    g.addColorStop(0, '#12324A'); g.addColorStop(0.55, '#2C5A77'); g.addColorStop(1, '#6A5DB8');
    c.fillStyle = g; c.fillRect(0, 0, 512, 272);
    const sun = c.createRadialGradient(360, 96, 4, 360, 96, 120); sun.addColorStop(0, 'rgba(255,216,144,1)'); sun.addColorStop(0.2, 'rgba(255,181,102,.8)'); sun.addColorStop(1, 'rgba(255,181,102,0)');
    c.fillStyle = sun; c.fillRect(0, 0, 512, 272);
    const band = (y, col, amp, f) => { c.beginPath(); c.moveTo(0, 272); for (let x = 0; x <= 512; x += 8) c.lineTo(x, y + Math.sin(x * f) * amp + Math.sin(x * f * 2.3 + 1) * amp * 0.4); c.lineTo(512, 272); c.closePath(); c.fillStyle = col; c.fill(); };
    band(170, 'rgba(61,242,176,.55)', 16, 0.012); band(196, 'rgba(124,211,224,.75)', 10, 0.02); band(222, 'rgba(18,40,60,.95)', 7, 0.03);
    c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 18; c.strokeRect(0, 0, 512, 272);
  }
  const artTex = new THREE.CanvasTexture(art); artTex.colorSpace = THREE.SRGBColorSpace;
  const tvMat = new THREE.MeshBasicMaterial({ color: 0x06090e, toneMapped: false });
  tvObj.traverse((c) => { if (c.isMesh) { c.material = tvMat; fixTvUV(c.geometry); } });
  function fixTvUV(g) {
    // planar UVs across the screen face (x along width, y up)
    g.computeBoundingBox();
    const bb = g.boundingBox, p = g.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) - bb.min.x) / (bb.max.x - bb.min.x || 1); uv[i * 2 + 1] = (p.getY(i) - bb.min.y) / (bb.max.y - bb.min.y || 1); }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
  let tvLvl = 0, tvGoal = 0;

  // car
  const carNode = byName('car');
  const carPivot = pivotAt(carNode, W(2.55, 10.4, 0));
  const carBase = carPivot.position.clone();
  const headMat = matOf(carNode, 'dyn_headlight'), tailMat = matOf(carNode, 'dyn_taillight');
  const carMats = []; carNode.traverse((o) => { if (o.isMesh) carMats.push(o.material); });
  let carOff = 0, carOpacity = 1, headOn = 0, tailOn = 0, headGoal = 0, tailGoal = 0;
  // headlight beams
  const beamGeo = new THREE.CylinderGeometry(0.1, 1.7, 9, 28, 1, true);
  beamGeo.translate(0, -4.5, 0); beamGeo.rotateX(Math.PI / 2 + 0.07);
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false,
    uniforms: { uI: { value: 0 } },
    vertexShader: 'varying float vD; varying vec3 vN; varying vec3 vV; void main(){ vD = -position.z / 9.0; vec4 mv = modelViewMatrix * vec4(position,1.); vV = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uI; varying float vD; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(normalize(vN), vV)), 1.5); float a = (1.0 - smoothstep(0.0, 1.0, vD)) * smoothstep(0.0, 0.06, vD) * edge * 0.22 * uI; vec3 c = vec3(1.0, 0.93, 0.75) * a; gl_FragColor = vec4(c, max(c.r, max(c.g, c.b))); }',
  });
  for (const bx of [-0.62, 0.62]) {
    const b = new THREE.Mesh(beamGeo, beamMat);
    b.position.set(bx, 0.6 + FLOOR, -2.3);
    b.frustumCulled = false;
    carPivot.add(b);
  }
  const placeCar = () => {
    carPivot.position.copy(carBase); carPivot.position.z += carOff;
    carPivot.position.y = carOff > 3.6 ? -0.07 : 0; // off the garage slab onto the driveway
  };
  const setCarOpacity = (a) => {
    carOpacity = a;
    for (const m of carMats) { m.transparent = a < 1; m.opacity = a; m.depthWrite = a > 0.5; }
    beamMat.uniforms.uI.value = headOn * a;
    carPivot.visible = a > 0.01;
  };

  // contact shadow under the car (soft dark blob)
  const blobTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 4, 32, 32, 32);
    g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(0.6, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const carShadow = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 5.3), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, toneMapped: false }));
  carShadow.rotation.x = -Math.PI / 2; carShadow.position.set(0, FLOOR + 0.012, 0);
  carShadow.renderOrder = 1;
  carPivot.add(carShadow);

  // ---------------------------------------------------------------- glows (one instanced draw)
  const GMAX = 128;
  const gGeo = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  gGeo.index = quad.index; gGeo.setAttribute('position', quad.attributes.position);
  const gOff = new THREE.InstancedBufferAttribute(new Float32Array(GMAX * 3), 3);
  const gCol = new THREE.InstancedBufferAttribute(new Float32Array(GMAX * 3), 3);
  const gSize = new THREE.InstancedBufferAttribute(new Float32Array(GMAX), 1);
  gOff.setUsage(THREE.DynamicDrawUsage); gCol.setUsage(THREE.DynamicDrawUsage); gSize.setUsage(THREE.DynamicDrawUsage);
  gGeo.setAttribute('offset', gOff); gGeo.setAttribute('gcol', gCol); gGeo.setAttribute('gsize', gSize);
  const glowMesh = new THREE.Mesh(gGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    vertexShader: 'attribute vec3 offset; attribute vec3 gcol; attribute float gsize; varying vec2 vU; varying vec3 vC; void main(){ vU = position.xy * 2.0; vC = gcol; vec4 mv = viewMatrix * vec4(offset, 1.0); mv.xyz += normalize(-mv.xyz) * min(gsize * 0.5, 1.2); mv.xy += position.xy * gsize; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec2 vU; varying vec3 vC; void main(){ float d = dot(vU, vU); float a = exp(-d * 5.5) * (1.0 - smoothstep(0.7, 1.0, d)); vec3 c = vC * a; gl_FragColor = vec4(c, max(c.r, max(c.g, c.b))); }',
  }));
  glowMesh.frustumCulled = false; glowMesh.renderOrder = 10;
  scene.add(glowMesh);
  let gN = 0;
  let decor = true;
  const glow = (p, r, g, b, s) => { if (!decor || gN >= GMAX || (r + g + b) < 0.004) return; gOff.setXYZ(gN, p.x, p.y, p.z); gCol.setXYZ(gN, r, g, b); gSize.setX(gN, s); gN++; };

  // ---------------------------------------------------------------- people (glowing figures)
  const personMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uA: { value: 1 } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vV = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float f = 1.0 - abs(dot(normalize(vN), vV)); vec3 c = vec3(0.49, 0.83, 0.88); vec3 o = c * (0.28 + 1.3 * pow(f, 2.0)) * uA; gl_FragColor = vec4(o, max(o.r, max(o.g, o.b))); }',
  });
  const bodyGeo = new THREE.CapsuleGeometry(0.2, 0.78, 6, 14); bodyGeo.translate(0, 0.62, 0);
  const headGeo = new THREE.SphereGeometry(0.15, 16, 12); headGeo.translate(0, 1.36, 0);
  const people = [];
  const person = (x, y) => {
    const g = new THREE.Group();
    const mat = personMat.clone();
    g.add(new THREE.Mesh(bodyGeo, mat), new THREE.Mesh(headGeo, mat));
    const p = { g, x, y, bob: 0, a: 1, mat };
    p.place = () => { g.position.copy(W(p.x, p.y, FLOOR + p.bob)); mat.uniforms.uA.value = p.a; };
    p.place(); scene.add(g); people.push(p);
    return p;
  };

  // puddle
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, toneMapped: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec2 vP; void main(){ float d = length(vP); float wob = 0.06 * sin(atan(vP.y, vP.x) * 5.0); float a = 1.0 - smoothstep(0.82 + wob, 1.0 + wob, d); float rim = smoothstep(0.6, 0.95, d) * a; gl_FragColor = vec4(mix(vec3(0.16,0.45,0.8), vec3(0.62,0.85,1.0), rim) , a * (0.55 + 0.35 * rim)); }',
  }));
  puddle.rotation.x = -Math.PI / 2; puddle.position.copy(W(8.2, 2.4, FLOOR + 0.015)); puddle.scale.set(0.001, 0.001, 1); puddle.visible = false;
  scene.add(puddle);
  let puddleR = 0;

  // pulses travelling between devices and the hub
  const pulses = [];

  // ---------------------------------------------------------------- device markers (DOM, crisp and tappable)
  const marks = $('#marks');
  const dev = {}, devPos = {};
  const SVGNS = 'http://www.w3.org/2000/svg';
  for (const [id, [x, y, t, name, z = 0]] of Object.entries(D)) {
    devPos[id] = W(x, y, z + FLOOR);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'dev' + (id === 'hub' ? ' hub' : ''); b.setAttribute('aria-label', name);
    const s = document.createElementNS(SVGNS, 'svg'); s.setAttribute('viewBox', '-8 -8 16 16');
    const c = document.createElementNS(SVGNS, 'circle'); c.setAttribute('r', '7.3'); c.setAttribute('class', 'r0');
    const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', I[t]); p.setAttribute('class', 'ic'); p.setAttribute('transform', 'scale(.82)');
    s.append(c, p);
    const l = document.createElement('span'); l.className = 'lbl'; l.textContent = name;
    b.append(s, l);
    marks.append(b);
    dev[id] = { el: b, lbl: l, name, zone: zoneOf(x, y) };
    b.addEventListener('click', (e) => { e.stopPropagation(); poke(id); });
  }
  const cls = (id, c, on = true) => dev[id].el.classList.toggle(c, on);
  const sayTimers = {};
  const say = (id, ms = 2600) => { for (const k in dev) if (k !== id) dev[k].el.classList.remove('say'); cls(id, 'say'); clearTimeout(sayTimers[id]); sayTimers[id] = setTimeout(() => cls(id, 'say', false), REDUCE ? 6000 : ms); };
  const ring = (id, color = '#3DF2B0', n = 2) => {
    focusZone(dev[id].zone);
    say(id);
    if (REDUCE) return;
    for (let i = 0; i < n; i++) setTimeout(() => {
      const r = document.createElement('i'); r.className = 'rp'; r.style.setProperty('--rc', color);
      dev[id].el.append(r); setTimeout(() => r.remove(), 1400);
    }, i * 420);
  };

  // ---------------------------------------------------------------- sim clock: everything animated runs off this
  let T = 0;
  let timers = [];
  let tweens = [];
  let hold = false; // reduced motion: pause after each log line until "Next step"
  const wait = (ms) => new Promise((r) => timers.push({ t: T + (REDUCE ? 0 : ms / 1000), r }));
  const tweenP = (ms, fn) => new Promise((res) => {
    if (REDUCE || ms <= 0) { fn(1); res(); return; }
    fn(0); tweens.push({ t0: T, d: ms / 1000, fn, res });
  });
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  function advance(dt) {
    if (hold) return;
    T += dt;
    const tw = tweens; tweens = [];
    for (const x of tw) { const k = Math.min(1, (T - x.t0) / x.d); x.fn(k); if (k >= 1) x.res(); else tweens.push(x); }
    const due = timers.filter((x) => x.t <= T + 1e-6); timers = timers.filter((x) => x.t > T + 1e-6);
    due.forEach((x) => x.r());
  }

  // ---------------------------------------------------------------- lights, ambient, day
  const lvl = {}, goal = {}, tint = {};
  for (const g of GROUPS) { lvl[g] = 0; goal[g] = 0; tint[g] = null; }
  let amb = 0, ambGoal = null;
  const setRoom = (g, on) => { goal[g] = on ? 1 : 0; if (REDUCE) lvl[g] = goal[g]; };
  const light = (id, on) => { cls(id, 'on', on); if (LIGHT_ROOM[id]) setRoom(LIGHT_ROOM[id], on); };
  const setAmbient = (a) => { amb = a; };
  const ambTo = (a, ms = 1400) => { const from = amb; return tweenP(ms, (t) => setAmbient(from + (a - from) * t)); };

  // ---------------------------------------------------------------- camera director
  const cam = { c: new THREE.Vector3(), az: 0, el: 0, r: 10 };
  const from = { c: new THREE.Vector3(), az: 0, el: 0, r: 10 };
  const to = { c: new THREE.Vector3(), az: 0, el: 0, r: 10 };
  let driftT = 0, driftAmp = 0.2;
  let camT = 1, camDur = 1.6, shotKey = 'dollhouse', userRoom = null;
  const user = { az: 0, el: 0, zoom: 1, lastInput: -1e9 };
  const setShotVals = (o, k) => { const s = SHOTS[k]; o.c.copy(W(s.c[0], s.c[1], s.c[2])); o.az = s.az; o.el = s.el; o.r = s.r; };
  setShotVals(cam, 'dollhouse'); setShotVals(to, 'dollhouse');
  const whereEl = $('#where'), backBtn = $('#back');
  function goShot(k, instant = false) {
    if (!SHOTS[k]) return;
    const inRoom0 = k !== 'dollhouse';
    whereEl.textContent = SHOTS[k].name; whereEl.classList.toggle('show', inRoom0);
    backBtn.hidden = !(inRoom0 && userRoom);
    roomBtns.forEach(([rk, b]) => b.setAttribute('aria-pressed', rk === userRoom ? 'true' : 'false'));
    if (k === shotKey && camT >= 1) { if (userRoom) { user.az = 0; user.el = 0; user.zoom = 1; wake(); } return; }
    from.c.copy(cam.c); from.az = cam.az; from.el = cam.el; from.r = cam.r;
    setShotVals(to, k);
    // take the short way round
    while (to.az - from.az > Math.PI) to.az -= Math.PI * 2;
    while (to.az - from.az < -Math.PI) to.az += Math.PI * 2;
    const dist = from.c.distanceTo(to.c) + Math.abs(to.r - from.r) * 1.5 + Math.abs(to.az - from.az) * 6;
    camDur = Math.min(2.4, 1.1 + dist * 0.06);
    camT = instant || REDUCE ? 1 : 0;
    if (camT >= 1) { cam.c.copy(to.c); cam.az = to.az; cam.el = to.el; cam.r = to.r; }
    shotKey = k; wake();
    user.az *= 0.3; user.el = 0; user.zoom = 1;
    const inRoom = k !== 'dollhouse';
    whereEl.textContent = SHOTS[k].name; whereEl.classList.toggle('show', inRoom);
    backBtn.hidden = !(inRoom && userRoom);
    roomBtns.forEach(([rk, b]) => b.setAttribute('aria-pressed', rk === userRoom ? 'true' : 'false'));
  }
  // scenarios ask for zones; switch at most every 1.4 s so the camera never jitters
  let lastFocus = -1e9, pendingZone = null, scenarioActive = false;
  function focusZone(z) {
    if (userRoom || !scenarioActive) return;
    const k = z === 'pantry' ? 'pantry' : z;
    const COVERS = { drive: ['garage'], living: ['porch'], kitchen: ['pantry'], pantry: ['kitchen'] };
    if (!SHOTS[k] || k === shotKey || (COVERS[shotKey] || []).includes(k)) { pendingZone = null; return; }
    if (T - lastFocus < 1.4) { pendingZone = k; return; }
    lastFocus = T; pendingZone = null; goShot(k);
  }
  function updateCamera(dt, now) {
    if (camT < 1) {
      camT = Math.min(1, camT + dt / camDur);
      const e = camT < 0.5 ? 4 * camT ** 3 : 1 - Math.pow(-2 * camT + 2, 3) / 2;
      cam.c.lerpVectors(from.c, to.c, e);
      cam.az = from.az + (to.az - from.az) * e; cam.el = from.el + (to.el - from.el) * e;
      // pull back a little mid-flight so the move reads as a dolly, not a zoom
      cam.r = from.r + (to.r - from.r) * e + Math.sin(Math.PI * e) * Math.min(3, from.c.distanceTo(to.c) * 0.18);
    }
    if (pendingZone && !userRoom && scenarioActive && T - lastFocus >= 1.4) { const z = pendingZone; pendingZone = null; lastFocus = T; goShot(z); }
    // idle drift in the dollhouse view
    // idle drift: advances only while scenarios autoplay, so a paused house can stop rendering
    if (autoplayOn() && now - user.lastInput > 4000) driftT += dt;
    driftAmp += ((shotKey === 'dollhouse' ? 0.2 : 0.04) - driftAmp) * Math.min(1, dt * 1.5);
    const drift = REDUCE ? 0 : Math.sin(driftT * 0.11) * driftAmp;
    const aspect = camera.aspect;
    const vf = THREE.MathUtils.degToRad(camera.fov);
    const hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
    const fit = Math.min(vf, hf) / 2;
    const d = (cam.r / Math.sin(fit)) * user.zoom;
    const az = cam.az + drift + user.az, el = THREE.MathUtils.clamp(cam.el + user.el, 0.3, 1.35);
    camera.position.set(cam.c.x + Math.sin(az) * Math.cos(el) * d, cam.c.y + Math.sin(el) * d, cam.c.z + Math.cos(az) * Math.cos(el) * d);
    camera.lookAt(cam.c);
    camera.near = Math.max(0.5, d * 0.3); camera.far = d * 3 + 60;
    camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- log, alerts, clock
  const tickerEl = $('#ticker'), alertsEl = $('#alerts'), clockEl = $('#clock');
  let clock = 0;
  const fullLog = [];
  const fmt = (s) => [Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60].map((v) => String(Math.floor(v)).padStart(2, '0')).join(':');
  const fmt12 = (s) => { const h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60; return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  const tick = () => { const h = Math.floor(clock / 3600) % 24; clockEl.textContent = `${h >= 7 && h < 19 ? '☀' : '☽'}  ${fmt12(clock)}`; };
  const log = (text, kind = '') => {
    fullLog.push(`${fmt(clock)} ${text}`);
    const d = document.createElement('div'); d.className = 'ln ' + kind;
    const b = document.createElement('b'); b.textContent = fmt(clock);
    d.append(b, document.createTextNode(text));
    d.style.transform = 'translateY(38px)'; d.style.opacity = '0';
    tickerEl.append(d);
    while (tickerEl.children.length > 3) tickerEl.firstChild.remove();
    void d.offsetWidth;
    const lines = [...tickerEl.children];
    lines.forEach((ln, i) => { const k = lines.length - 1 - i; ln.style.transform = `translateY(${19 - k * 19}px)`; ln.style.opacity = k > 1 ? '0' : k === 1 ? '.62' : '1'; });
    tick();
    if (REDUCE && scenarioActive) hold = true;
  };
  const TIERS = { active: ['ROUTINE', 'active'], ts: ['TIME-SENSITIVE', 'ts'], crit: ['CRITICAL · OVERRIDES SILENT', 'crit'] };
  const APP = '<svg viewBox="0 0 24 24" fill="none" stroke="#7CD3E0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/></svg>';
  let noteTimer = 0;
  const notify = (tier, title, body) => {
    const [label, c] = TIERS[tier];
    for (const old of [...alertsEl.children]) { old.classList.remove('in'); old.classList.add('out'); setTimeout(() => old.remove(), 450); }
    const n = document.createElement('div'); n.className = 'note ' + c;
    n.innerHTML = `<div class="app">${APP}</div><div class="tier ${c}"><span></span><span>now</span></div><div class="nt"></div><div class="nb"></div>`;
    n.querySelector('.tier span').textContent = label; n.querySelector('.nt').textContent = title; n.querySelector('.nb').textContent = body;
    if (tier === 'crit') n.querySelector('.app svg').setAttribute('stroke', '#FF8A80');
    alertsEl.append(n);
    void n.offsetWidth; n.classList.add('in');
    clearTimeout(noteTimer);
    if (tier !== 'crit') noteTimer = setTimeout(() => { n.classList.remove('in'); n.classList.add('out'); setTimeout(() => n.remove(), 450); }, REDUCE ? 9000 : 5200);
  };

  // ---------------------------------------------------------------- effects used by the scenarios
  const flashHub = () => { cls('hub', 'on'); setTimeout(() => cls('hub', 'on', false), 500); };
  const pulse = (a, b, color = '#3DF2B0') => new Promise((res) => {
    if (b !== 'hub') focusZone(dev[b].zone);
    const c = new THREE.Color(color);
    const p = { a: devPos[a], b: devPos[b], c, t: 0 };
    if (REDUCE) { if (b === 'hub') flashHub(); res(); return; }
    pulses.push(p);
    tweenP(620, (t) => { p.t = ease(t); }).then(() => { pulses.splice(pulses.indexOf(p), 1); if (b === 'hub') flashHub(); res(); });
  });
  const setDoor = (target) => { const f = doorFrac; return tweenP(1900, (t) => { doorFrac = f + (target - f) * ease(t); drawDoor(); }); };
  const setFridge = (target, ms = 900) => { const f = fridgeFrac; return tweenP(ms, (t) => { fridgeFrac = f + (target - f) * ease(t); drawFridge(); }); };
  const setLock = (locked) => { cls('lock', 'on', locked); dev.lock.lbl.textContent = locked ? 'front door: locked' : 'front door: unlocked'; };
  const driveCar = (target, ms) => { const f = carOff; focusZone(target > 4 || f > 4 ? 'drive' : 'garage'); return tweenP(ms, (t) => { carOff = f + (target - f) * ease(t); placeCar(); }); };
  const carLights = (head, tail) => { headGoal = head ? 1 : 0; tailGoal = tail ? 1 : 0; if (REDUCE) { headOn = headGoal; tailOn = tailGoal; } };
  const setTV = (on) => { tvGoal = on ? 1 : 0; if (REDUCE) tvLvl = tvGoal; };
  const walk = async (p, path, speed = 2.6) => {
    for (const [tx, ty] of path) {
      const fx = p.x, fy = p.y, dist = Math.hypot(tx - fx, ty - fy);
      focusZone(zoneOf(tx, ty));
      await tweenP(Math.max(200, (dist / speed) * 1000), (t) => { p.x = fx + (tx - fx) * t; p.y = fy + (ty - fy) * t; p.bob = Math.abs(Math.sin(t * dist * 3.2)) * 0.06; p.place(); });
    }
  };
  const leave = (p) => tweenP(500, (t) => { p.a = 1 - t; p.place(); }).then(() => { scene.remove(p.g); people.splice(people.indexOf(p), 1); });
  let smokeOn = false;

  // ---------------------------------------------------------------- scenarios (same scripts as the 2D version)
  const reset = (s = {}) => {
    timers = []; tweens = []; hold = false; pulses.length = 0;
    Object.values(dev).forEach((d) => d.el.classList.remove('on', 'alarm', 'stale', 'say'));
    for (const g of GROUPS) { goal[g] = 0; lvl[g] = 0; tint[g] = null; }
    smokeOn = false;
    tvGoal = 0; tvLvl = 0;
    fridgeFrac = s.fridge ?? 0; drawFridge();
    doorFrac = s.door ?? 1; drawDoor();
    carOff = s.car ?? 0; placeCar(); setCarOpacity(1); headOn = headGoal = 0; tailOn = tailGoal = 0;
    people.splice(0).forEach((p) => scene.remove(p.g));
    puddleR = 0; puddle.visible = false;
    setLock(s.locked ?? true);
    dev.m_bench.lbl.textContent = 'workbench motion';
    tickerEl.replaceChildren(); alertsEl.replaceChildren(); fullLog.length = 0;
    clock = s.clock ?? 0; tick();
    setAmbient(s.amb ?? 0);
  };
  const SC = {
    dusk: { name: 'Sunset', setup: { clock: 19 * 3600 + 22 * 60, amb: 0.85 }, run: async (w) => {
      log('the sun is going down'); await ambTo(0.45, 1800); clock += 5 * 60;
      await ambTo(0.12, 1600); clock += 4 * 60; log('sun → below the horizon');
      light('lamp', true); ring('lamp', '#FFC873'); log('living room lamp → on, until 2:00 AM', 'ok'); await w(1600);
      light('yard', true); ring('yard', '#FFC873'); log('back yard lights → on, until 2:00 AM', 'ok');
      await ambTo(0, 1200); await w(1400);
      log('no one asked. it just knows when the sun sets.'); } },
    garage: { name: 'Motion in the garage', setup: { clock: 21 * 3600 + 14 * 60, amb: 0 }, run: async (w) => {
      const p = person(7.6, 10.2); log('someone walks into the garage');
      const walking = walk(p, [[5.2, 10.5], [3.6, 12.6], [1.5, 12.8]], 2.4);
      await w(700); cls('m_garage', 'on'); ring('m_garage'); log('garage motion → detected'); await pulse('m_garage', 'hub');
      log('workbench light level: 23 lx → dark enough'); await w(300);
      await pulse('hub', 'l_garage'); light('l_garage', true); log('garage lights → on', 'ok');
      await walking; await w(1400);
      await walk(p, [[3.8, 12.2], [7.6, 10.2]], 2.6); await leave(p);
      cls('m_garage', 'on', false); clock += 300; log('quiet for 5 minutes'); await w(500);
      light('l_garage', false); log('garage lights → off'); } },
    leave: { name: 'Everyone leaves', setup: { clock: 8 * 3600 + 5 * 60, amb: 1, door: 0, locked: false }, run: async (w) => {
      log('the last people leave, by car'); carLights(false, true); await w(400);
      await driveCar(9.5, 2600); await tweenP(400, (t) => setCarOpacity(1 - t));
      await pulse('proxy', 'hub', '#9B8CFF'); log('everyone away → securing the house', 'warn'); await w(400);
      await pulse('hub', 'lock'); setLock(true); ring('lock'); log('front door → lock'); await w(600);
      clock += 30; log('verifying: front door reports locked ✓', 'ok'); await w(500);
      await pulse('hub', 'tilt'); log('garage → closing'); await setDoor(1); clock += 14;
      cls('tilt', 'on'); log('verifying: tilt sensor reports closed ✓', 'ok'); await w(400);
      notify('ts', 'House secured', 'Front door locked. Garage closed.'); log('→ alert sent: House secured', 'ok'); } },
    laundry: { name: "Laundry's done", setup: { clock: 14 * 3600 + 2 * 60, amb: 1 }, run: async (w) => {
      cls('washer', 'on'); ring('washer'); log('washer → end of cycle'); await pulse('washer', 'hub'); await w(300);
      notify('active', 'Washer finished', 'Time to move the load.'); log('→ alert sent: routine, respects Do Not Disturb', 'ok'); await w(1800);
      clock += 45 * 60; log('45 minutes later: washer door never opened', 'warn'); ring('washer', '#FFC061'); await w(700);
      notify('active', 'Clothes still in the washer', "They've been sitting for 45 minutes."); log('→ reminder sent (1 of 3)', 'ok'); } },
    art: { name: 'Walk into the living room', setup: { clock: 18 * 3600 + 47 * 60, amb: 0.3 }, run: async (w) => {
      const p = person(8.6, 13.4); log('someone comes in the front door');
      const walking = walk(p, [[9.4, 11.4], [11.4, 10.6], [12.2, 9.4]], 2.2);
      await w(900); cls('m_living', 'on'); ring('m_living'); log('living room motion → detected'); await pulse('m_living', 'hub');
      await pulse('hub', 'tv', '#9B8CFF'); cls('tv', 'on'); setTV(true); ring('tv', '#9B8CFF'); log('Frame TV → art mode', 'ok');
      await walking; await w(900); log('the TV becomes a painting when someone walks in.'); } },
    drive: { name: 'A car pulls in after dark', setup: { clock: 22 * 3600 + 38 * 60, amb: 0, car: 8.6 }, run: async (w) => {
      carLights(true, false); focusZone('drive'); log('headlights on the driveway'); await w(700);
      light('flood', true); ring('flood', '#FFC873'); log('driveway floodlight → on'); await w(300);
      await pulse('flood', 'hub'); log('driveway motion → detected');
      await pulse('hub', 'walls'); light('walls', true); log('garage wall lights → on', 'ok'); await w(500);
      log('garage → opening'); ring('tilt'); await setDoor(0); cls('tilt', 'on');
      notify('active', 'Garage opened', 'Welcome home.'); log('→ alert sent: routine', 'ok');
      await driveCar(0, 2600); carLights(false, false); await pulse('hub', 'l_garage'); light('l_garage', true); log('garage lights → on', 'ok'); await w(700);
      log('backstop: the floodlight also counts as motion,'); log('because the camera once went quiet for six days.', 'warn'); } },
    leak: { name: 'Water leak', setup: { clock: 3 * 3600 + 12 * 60, amb: 0 }, run: async (w) => {
      log('water under the washer'); focusZone('laundry'); puddle.visible = true;
      await tweenP(1600, (t) => { puddleR = 0.9 * t; });
      cls('leak', 'alarm'); ring('leak', '#5FB7FF', 3); log('laundry water sensor → WET', 'bad'); await pulse('leak', 'hub', '#5FB7FF');
      light('l_laundry', true);
      notify('crit', 'Water detected', 'Laundry room. Check it now.'); log('→ critical alert: full volume, even on silent', 'bad');
      await tweenP(1500, (t) => { puddleR = 0.9 + 0.35 * t; }); } },
    smoke: { name: 'Smoke or CO', setup: { clock: 17 * 3600 + 51 * 60, amb: 0.45 }, run: async (w) => {
      cls('smoke_p', 'alarm'); ring('smoke_p', '#FF6B61', 3); log('pantry detector → SMOKE', 'bad'); await pulse('smoke_p', 'hub', '#FF6B61');
      notify('crit', 'Smoke: pantry', 'Each detector alerts on its own, so two alarms never hide each other.'); log('→ critical alert, one per detector', 'bad');
      smokeOn = true; tint.pantry = [1, 0.12, 0.08]; tint.kitchen = [1, 0.12, 0.08];
      for (let i = 0; i < 6; i++) { setRoom('pantry', i % 2 === 0); setRoom('kitchen', i % 2 === 0); await w(420); }
      setRoom('pantry', true); setRoom('kitchen', true); } },
    fridge: { name: 'Fridge left open', setup: { clock: 16 * 3600 + 20 * 60, amb: 0.9 }, run: async (w) => {
      const p = person(18.4, 6.2); log('someone heads for the fridge');
      await walk(p, [[17.4, 2.8]], 2.2);
      log('refrigerator door → open'); await setFridge(1); cls('fridge', 'on'); ring('fridge', '#CFEFFF'); await pulse('fridge', 'hub');
      await w(600); await walk(p, [[18.6, 6.4]], 2.4); await leave(p); log('...and walks away'); await w(700);
      clock += 180; log('still open after 3 minutes', 'warn'); ring('fridge', '#FFC061'); await w(400);
      notify('active', 'Refrigerator door open', 'The fridge has been open for 3 minutes.'); log('→ alert sent (repeats up to 4 times)', 'ok'); await w(1600);
      log('refrigerator door → closed'); await setFridge(0); cls('fridge', 'on', false); log('alert cleared', 'ok'); } },
    gopen: { name: 'Garage left open', setup: { clock: 17 * 3600 + 5 * 60, amb: 0.7 }, run: async (w) => {
      log('garage → opening'); ring('tilt'); await setDoor(0); cls('tilt', 'on'); await pulse('tilt', 'hub'); log('garage → open'); await w(1300);
      clock += 30 * 60; log('open for 30 minutes', 'warn'); ring('tilt', '#FFC061', 3); await w(500);
      notify('ts', 'Garage still open', 'It has been open for 30 minutes.'); log('→ alert sent: time-sensitive, repeats up to 4 times', 'ok'); await w(1700);
      log('closed from the phone'); await pulse('hub', 'tilt'); await setDoor(1); cls('tilt', 'on', false); log('verifying: tilt sensor reports closed ✓', 'ok'); } },
    watchdog: { name: 'A sensor goes quiet', setup: { clock: 6 * 3600, amb: 0.15 }, run: async (w) => {
      cls('m_bench', 'stale'); dev.m_bench.lbl.textContent = 'workbench motion: last heard 26 h ago'; say('m_bench', 9000); focusZone('garage');
      log('watchdog: checking when every sensor last reported'); await w(900);
      await pulse('hub', 'm_bench', '#FFC061'); ring('m_bench', '#FFC061'); log('workbench motion: silent for 26 hours', 'warn'); await w(600);
      notify('ts', 'Sensor gone quiet', 'Workbench motion stopped reporting. It still says "clear".'); log('→ alert sent: a healthy-looking sensor that stopped talking', 'ok'); } },
  };

  // ---------------------------------------------------------------- UI: chips, buttons
  const order = Object.keys(SC);
  const scenBar = $('#scen'), btn = {};
  let pausedUntil = 0, idx = 0, busy = false, run = 0, lastEnd = -1e9;
  for (const k of order) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = SC[k].name; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => { pausedUntil = performance.now() + 45000; userRoom = null; play(k, true); });
    scenBar.append(b); btn[k] = b;
  }
  const roomBar = $('#rooms');
  const roomBtns = [];
  for (const [k, label] of ROOM_CHIPS) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => (k === 'dollhouse' ? exitRoom() : enterRoom(k)));
    roomBar.append(b); roomBtns.push([k, b]);
  }
  function enterRoom(k) {
    userRoom = k; pausedUntil = Infinity; pendingZone = null;
    goShot(k);
    roomBtns.forEach(([rk, b]) => b.setAttribute('aria-pressed', rk === k ? 'true' : 'false'));
  }
  function exitRoom() {
    userRoom = null; pausedUntil = performance.now() + 6000; pendingZone = null;
    goShot('dollhouse');
  }
  backBtn.addEventListener('click', exitRoom);
  const nextBtn = $('#next');
  nextBtn.hidden = !REDUCE;
  nextBtn.addEventListener('click', () => {
    if (!busy) { play(order[idx], true); return; }
    hold = false; wake();
  });

  const liveEls = ['#ticker', '#where', '#alerts'].map((q) => $(q)).filter(Boolean);
  async function play(k, byUser = false) {
    const id = ++run; busy = true; scenarioActive = true; wake();
    liveEls.forEach((el) => el.setAttribute('aria-live', byUser ? 'polite' : 'off'));
    $('#hint').classList.remove('show');
    if (REDUCE) nextBtn.textContent = 'Next step';
    order.forEach((o) => btn[o].setAttribute('aria-pressed', o === k ? 'true' : 'false'));
    reset(SC[k].setup);
    if (!userRoom) { lastFocus = -1e9; goShot('dollhouse'); lastFocus = T; }
    const w = async (ms) => { clock += Math.max(1, Math.round(ms / 400)); tick(); await wait(ms); if (id !== run) throw 0; };
    try {
      await wait(REDUCE ? 0 : 1100); // establishing shot
      if (id !== run) return;
      await SC[k].run(w);
      await wait(3000);
    } catch (e) { if (e !== 0) console.error(e); return; }
    if (id === run) {
      busy = false; scenarioActive = false; lastEnd = performance.now(); idx = (order.indexOf(k) + 1) % order.length;
      if (!userRoom) goShot('dollhouse');
      if (REDUCE) nextBtn.textContent = 'Next moment';
    }
  }

  function poke(id) {
    wake();
    pausedUntil = Math.max(pausedUntil, performance.now() + 20000);
    cls(id, 'peek'); setTimeout(() => cls(id, 'peek', false), 2600);
    say(id);
    if (!REDUCE) {
      const r = document.createElement('i'); r.className = 'rp'; r.style.setProperty('--rc', '#7CD3E0');
      dev[id].el.append(r); setTimeout(() => r.remove(), 1400);
      if (id !== 'hub') { const p = { a: devPos[id], b: devPos.hub, c: new THREE.Color('#7CD3E0'), t: 0 }; pulses.push(p); tweenP(620, (t) => { p.t = ease(t); }).then(() => { const i = pulses.indexOf(p); if (i >= 0) pulses.splice(i, 1); flashHub(); }); }
    }
    const was = hold; hold = false; log(dev[id].name + ' → reporting in'); hold = was;
  }

  // ---------------------------------------------------------------- input: orbit (horizontal drag), pinch, tap a room
  const ptrs = new Map();
  let drag = null, pinch0 = 0, zoom0 = 1;
  const raycaster = new THREE.Raycaster();
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    wake();
    if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, az: user.az, el: user.el, moved: false, orbit: false, t: performance.now(), id: e.pointerId, mouse: e.pointerType === 'mouse' };
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = user.zoom; drag && (drag.moved = true); }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    user.lastInput = performance.now();
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0 > 0) user.zoom = THREE.MathUtils.clamp(zoom0 * pinch0 / d, 0.5, 1.45);
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.orbit && Math.hypot(dx, dy) > 8) drag.moved = true;
    if (!drag.orbit && (Math.abs(dx) > 8 || (drag.mouse && Math.abs(dy) > 8))) {
      if (drag.mouse || Math.abs(dx) > Math.abs(dy) * 1.2) { drag.orbit = true; drag.moved = true; stage.setPointerCapture(e.pointerId); }
      else { drag.moved = true; }
    }
    if (drag.orbit) {
      const w = stage.clientWidth;
      user.az = THREE.MathUtils.clamp(drag.az - (dx / w) * 2.4, -1.0, 1.0);
      if (drag.mouse) user.el = THREE.MathUtils.clamp(drag.el + (dy / stage.clientHeight) * 1.2, -0.45, 0.4);
      e.preventDefault();
    }
  }, { passive: false });
  const endPtr = (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2 && pinch0) {
      pinch0 = 0;
      // one finger still down after a pinch: carry on from here instead of jumping
      const [rest] = [...ptrs.entries()];
      if (rest) drag = { x: rest[1].x, y: rest[1].y, az: user.az, el: user.el, moved: true, orbit: false, t: 0, id: rest[0], mouse: false };
    }
    if (drag && drag.id === e.pointerId) {
      if (!drag.moved && e.type === 'pointerup' && performance.now() - drag.t < 600) tapAt(e.clientX, e.clientY);
      drag = null;
    }
  };
  stage.addEventListener('pointerup', endPtr);
  // two fingers on the house belong to the house: stop the browser claiming the gesture mid-pinch
  stage.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  stage.addEventListener('pointercancel', endPtr);
  stage.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return; // plain wheel scrolls the page; trackpad pinch arrives as ctrl+wheel
    e.preventDefault();
    user.zoom = THREE.MathUtils.clamp(user.zoom * Math.exp(e.deltaY * 0.01), 0.5, 1.45);
    user.lastInput = performance.now(); wake();
  }, { passive: false });
  function tapAt(cx, cy) {
    const r = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), camera);
    const hit = raycaster.intersectObjects(staticMeshes, false)[0];
    if (!hit) return;
    const hx = hit.point.x + 10, hy = hit.point.z + 7;
    let z = zoneOf(hx, hy);
    if (z === 'porch') z = 'living';
    if (z === 'pantry') z = 'kitchen';
    if (hx < -4 || hx > 24 || hy < -8 || hy > 23) return;
    if (userRoom === z) { exitRoom(); return; }
    enterRoom(z);
  }

  // ---------------------------------------------------------------- per-frame update
  const cSun = new THREE.Color(), cSky = new THREE.Color();
  const MOON = [0.36, 0.46, 0.78], SUN = [1.0, 0.93, 0.8];
  const NSKY = [0.05, 0.075, 0.14], DSKY = [0.5, 0.62, 0.8];
  const sc = meta.scales;
  const skyEl = $('#sky'), starsEl = $('#stars');
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const warm = new THREE.Color(1.0, 0.72, 0.42);
  let lastAmbCss = -1;
  function applyLighting(dt) {
    const k = REDUCE ? 1 : 1 - Math.exp(-dt * 5);
    for (const g of GROUPS) lvl[g] += (goal[g] - lvl[g]) * k;
    headOn += (headGoal - headOn) * (REDUCE ? 1 : 1 - Math.exp(-dt * 8));
    tailOn += (tailGoal - tailOn) * (REDUCE ? 1 : 1 - Math.exp(-dt * 8));
    tvLvl += (tvGoal - tvLvl) * (REDUCE ? 1 : 1 - Math.exp(-dt * 3));
    const a = amb;
    const sunI = 0.42 + 0.7 * a ** 1.2, skyI = 0.9 + 0.7 * a;
    cSun.setRGB(MOON[0] + (SUN[0] - MOON[0]) * a, MOON[1] + (SUN[1] - MOON[1]) * a, MOON[2] + (SUN[2] - MOON[2]) * a);
    cSky.setRGB(NSKY[0] + (DSKY[0] - NSKY[0]) * a, NSKY[1] + (DSKY[1] - NSKY[1]) * a, NSKY[2] + (DSKY[2] - NSKY[2]) * a);
    for (const key of ['house', 'lot']) {
      const u = staticMats[key].uniforms;
      u.uSun.value.set(cSun.r, cSun.g, cSun.b).multiplyScalar(sunI * sc[key + '_sun'] / 3.0);
      u.uSky.value.set(cSky.r, cSky.g, cSky.b).multiplyScalar(skyI * sc[key + '_sky']);
      GROUPS.forEach((g, i) => {
        const L = tint[g] || LAMP[g];
        const s = lvl[g] * LAMP[g][3] * sc[key + '_' + g] * (1 - 0.5 * a);
        u.uLamp.value[i].set(L[0], L[1], L[2]).multiplyScalar(s);
      });
    }
    // analytic lights: fridge, TV, first person
    const P = shared.uPt.value, PC = shared.uPtC.value;
    P[0].set(...W(16.25, 1.7, FLOOR + 1.0).toArray(), 2.6); PC[0].set(0.7, 0.85, 1.0).multiplyScalar(fridgeFrac * 1.4);
    P[1].set(...W(14.6, 8.4, FLOOR + 1.3).toArray(), 5.0); PC[1].set(0.45, 0.55, 1.0).multiplyScalar(tvLvl * 0.9);
    if (people[0]) { P[2].set(...W(people[0].x, people[0].y, FLOOR + 0.8).toArray(), 2.4); PC[2].set(0.35, 0.8, 0.9).multiplyScalar(0.9 * people[0].a); } else PC[2].set(0, 0, 0);
    // puddle glow when the laundry light is on, and red smoke pulse light
    P[3].set(...W(18.5, 1.6, FLOOR + 2.0).toArray(), 5.0); PC[3].set(1, 0.1, 0.05).multiplyScalar(smokeOn ? 0.6 + 0.6 * Math.max(0, Math.sin(T * 9)) : 0);
    // headlights
    const hp = W(2.55, 8.0 + carOff, FLOOR + 0.62); shared.uSpP.value.copy(hp);
    shared.uSpD.value.set(0, -0.12, -1).normalize(); shared.uSpC.value.set(1.0, 0.92, 0.75).multiplyScalar(headOn * 3.2 * carOpacity * THREE.MathUtils.clamp((carOff - 1) / 4, 0.15, 1));
    headSpot.position.copy(hp); headSpot.target.position.copy(hp).add(tmp.set(0, -1.0, -8)); headSpot.intensity = headOn * 30 * carOpacity;
    beamMat.uniforms.uI.value = headOn * carOpacity;
    if (headMat) headMat.emissive.setRGB(1, 0.95, 0.8).multiplyScalar(headOn * 3), headMat.emissiveIntensity = 1;
    if (tailMat) tailMat.emissive.setRGB(1, 0.1, 0.06).multiplyScalar(0.15 + tailOn * 3);
    // real-time lights for the moving objects
    hemi.color.setRGB(cSky.r, cSky.g, cSky.b); hemi.groundColor.setRGB(0.05 + 0.2 * a, 0.06 + 0.18 * a, 0.07 + 0.15 * a); hemi.intensity = 0.9 + 0.8 * a;
    sunL.color.copy(cSun); sunL.intensity = sunI * 1.6;
    for (const g of GROUPS) groupLights[g].intensity = lvl[g] * 14 * (tint[g] ? 0.6 : 1);
    GROUPS.forEach((g) => { const L = tint[g] || LAMP[g]; groupLights[g].color.setRGB(L[0], L[1], L[2]); });
    fxLights[0].position.copy(W(16.25, 1.8, FLOOR + 1)); fxLights[0].intensity = fridgeFrac * 6; fxLights[0].color.setRGB(0.75, 0.88, 1);
    fxLights[1].position.copy(W(14.6, 8.2, FLOOR + 1.3)); fxLights[1].intensity = tvLvl * 5; fxLights[1].color.setRGB(0.5, 0.6, 1);
    if (people[0]) { fxLights[2].position.copy(W(people[0].x, people[0].y, FLOOR + 0.9)); fxLights[2].intensity = 3 * people[0].a; fxLights[2].color.setRGB(0.4, 0.85, 0.95); } else fxLights[2].intensity = 0;
    for (const m of dynMats) m.envMapIntensity = 0.12 + 0.6 * a;
    // emissive bits
    for (const wdw of windows) {
      const l = lvl[wdw.room] || 0;
      const L = tint[wdw.room] || LAMP[wdw.room];
      wdw.mat.color.setRGB(0.03 + 0.25 * a + L[0] * 1.3 * l, 0.06 + 0.3 * a + L[1] * 1.1 * l, 0.1 + 0.32 * a + L[2] * 0.8 * l);
    }
    for (const f of fixtures) {
      const l = lvl[f.room] || 0;
      f.mat.color.copy(f.off).multiplyScalar(0.5 + 0.9 * a).lerp(f.on, l);
      if (l > 0.02) f.mat.color.multiplyScalar(1 + l * 0.6);
    }
    tvMat.color.setRGB(0.02 + tvLvl * 0.98, 0.03 + tvLvl * 0.97, 0.05 + tvLvl * 0.95);
    tvMat.map = tvLvl > 0.02 ? artTex : null; tvMat.needsUpdate = tvMat.userData.hadMap !== !!tvMat.map; tvMat.userData.hadMap = !!tvMat.map;
    // renderer exposure: a touch brighter at night so the lamplight carries
    renderer.toneMappingExposure = 1.05 - 0.1 * a;
    // page sky
    if (Math.abs(a - lastAmbCss) > 0.004) {
      lastAmbCss = a;
      const mix = (c1, c2) => c1.map((v, i) => Math.round(v + (c2[i] - v) * a));
      const top = mix([5, 9, 18], [120, 160, 196]), mid = mix([10, 20, 38], [178, 200, 214]), bot = mix([14, 28, 48], [214, 206, 186]);
      skyEl.style.background = `linear-gradient(180deg, rgb(${top}) 0%, rgb(${mid}) 55%, rgb(${bot}) 100%)`;
      starsEl.style.opacity = String(Math.max(0, 1 - a * 2.2));
    }
  }

  function buildGlows() {
    gN = 0; decor = glowsOn; // tier low: decorative glows off, but keep the story (people, pulses)
    const a = amb, nightK = 1 - 0.75 * a;
    for (const wdw of windows) {
      const l = lvl[wdw.room] || 0; if (l < 0.02) continue;
      const L = tint[wdw.room] || LAMP[wdw.room];
      wdw.obj.getWorldPosition(tmp);
      glow(tmp, L[0] * 0.5 * l * nightK, L[1] * 0.38 * l * nightK, L[2] * 0.25 * l * nightK, 3.2);
    }
    const lv = lvl.living;
    if (lv > 0.02) glow(W(18.55, 12.75, FLOOR + 1.95), 0.9 * lv * nightK, 0.62 * lv * nightK, 0.32 * lv * nightK, 2.2);
    const dr = lvl.drive;
    if (dr > 0.02) { glow(W(0.2, 14.3, FLOOR + 2.32), 0.8 * dr, 0.82 * dr, 0.85 * dr, 2.0 * nightK + 0.4); glow(W(6.1, 14.3, FLOOR + 1.88), 0.6 * dr, 0.5 * dr, 0.35 * dr, 1.0); glow(W(6.87, 14.3, FLOOR + 1.88), 0.6 * dr, 0.5 * dr, 0.35 * dr, 1.0); }
    const po = lvl.porch; if (po > 0.02) glow(W(10.59, 15.79, 1.15), 0.8 * po, 0.55 * po, 0.28 * po, 1.3);
    const yd = lvl.yard;
    if (yd > 0.02) for (const [x, y, z] of YARD_GLOW) glow(W(x, y, z), 0.32 * yd * nightK, 0.2 * yd * nightK, 0.08 * yd * nightK, 0.7);
    if (fridgeFrac > 0.02) glow(W(16.25, 1.3, FLOOR + 1.1), 0.5 * fridgeFrac, 0.62 * fridgeFrac, 0.75 * fridgeFrac, 2.4);
    if (tvLvl > 0.02) glow(W(14.6, 7.6, FLOOR + 1.3), 0.25 * tvLvl, 0.3 * tvLvl, 0.5 * tvLvl, 4.0);
    if (smokeOn) { const s = 0.5 + 0.5 * Math.max(0, Math.sin(T * 9)); glow(W(18.5, 1.6, FLOOR + 2.2), 0.9 * s, 0.12 * s, 0.08 * s, 3.0); }
    if (headOn > 0.02 && carOpacity > 0.05) {
      const h = headOn * carOpacity;
      for (const bx of [1.83, 3.28]) glow(W(bx, 8.02 + carOff, FLOOR + 0.62 + (carOff > 3.6 ? -0.07 : 0)), 1.0 * h, 0.95 * h, 0.8 * h, 1.1);
    }
    if (tailOn > 0.02 && carOpacity > 0.05) {
      const t = tailOn * carOpacity;
      for (const bx of [1.78, 3.33]) glow(W(bx, 12.74 + carOff, FLOOR + 0.71 + (carOff > 3.6 ? -0.07 : 0)), 0.9 * t, 0.08 * t, 0.05 * t, 0.8);
    }
    decor = true;
    for (const p of people) { tmp.copy(W(p.x, p.y, FLOOR + 0.8 + p.bob)); glow(tmp, 0.12 * p.a, 0.3 * p.a, 0.34 * p.a, 2.2); }
    for (const p of pulses) {
      tmp.lerpVectors(p.a, p.b, p.t); tmp.y += Math.sin(Math.PI * p.t) * Math.min(3, p.a.distanceTo(p.b) * 0.25);
      glow(tmp, p.c.r * 1.2, p.c.g * 1.2, p.c.b * 1.2, 0.55);
      glow(tmp, p.c.r * 0.35, p.c.g * 0.35, p.c.b * 0.35, 1.6);
    }
    if (puddle.visible) {
      const s = puddleR; puddle.scale.set(Math.max(0.001, s * 1.3), Math.max(0.001, s * 0.8), 1);
      const lk = 0.2 + 0.6 * lvl.laundry; glow(W(8.2, 2.4, FLOOR + 0.2), 0.05 * lk * s, 0.2 * lk * s, 0.45 * lk * s, 2.4);
    }
    gOff.needsUpdate = gCol.needsUpdate = gSize.needsUpdate = true;
    gGeo.instanceCount = gN;
  }
  const YARD_GLOW = [[6.2, -4.3, 2.2], [9.5, -4.3, 2.1], [12.8, -4.3, 2.2], [12.8, -2.85, 2.1], [12.8, -1.4, 2.2], [9.5, -1.4, 2.1], [6.2, -1.4, 2.2], [6.2, -2.85, 2.1], [9.5, -2.85, 2.1]];

  // project device markers
  const markSize = { w: 0, h: 0 };
  function placeMarks() {
    const w = markSize.w, h = markSize.h;
    const near = camera.position.distanceTo(cam.c);
    const sBase = THREE.MathUtils.clamp(34 / near, 0.72, 1.25) * (w < 500 ? 0.92 : 1.05);
    for (const id in dev) {
      tmp.copy(devPos[id]).project(camera);
      const el = dev[id].el;
      let off = tmp.z > 1 || tmp.x < -1.1 || tmp.x > 1.1 || tmp.y < -1.1 || tmp.y > 1.1;
      const cl = el.classList;
      const active = cl.contains('on') || cl.contains('alarm') || cl.contains('stale') || cl.contains('peek') || cl.contains('say');
      const room = shotKey === 'dollhouse' ? null : shotKey;
      const inRoom = room && (dev[id].zone === room || (room === 'kitchen' && dev[id].zone === 'pantry') || (room === 'pantry' && dev[id].zone === 'kitchen') || (room === 'living' && dev[id].zone === 'porch') || (room === 'drive' && dev[id].zone === 'garage'));
      if (!active && !inRoom && id !== 'hub') off = true;
      if (off !== el._off) { el._off = off; el.classList.toggle('off-screen', off); }
      if (off) continue;
      const x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${sBase.toFixed(3)})`;
    }
  }

  // ---------------------------------------------------------------- stars (static canvas behind the scene)
  function drawStars() {
    const c = starsEl, r = stage.getBoundingClientRect(), s = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(r.width * s); c.height = Math.round(r.height * s);
    const x = c.getContext('2d');
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 140; i++) {
      const px = rnd() * c.width, py = rnd() * c.height * 0.55, a = rnd() * 0.7 * (1 - py / (c.height * 0.6));
      x.fillStyle = `rgba(220,235,255,${a.toFixed(2)})`; x.beginPath(); x.arc(px, py, (rnd() * 0.9 + 0.3) * s, 0, Math.PI * 2); x.fill();
    }
    const mx = c.width * 0.84, my = c.height * 0.12, mr = 10 * s;
    const g = x.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 5); g.addColorStop(0, 'rgba(200,220,255,.28)'); g.addColorStop(1, 'rgba(200,220,255,0)');
    x.fillStyle = g; x.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
    x.fillStyle = '#E4ECF6'; x.beginPath(); x.arc(mx, my, mr, 0, Math.PI * 2); x.fill();
  }

  // ---------------------------------------------------------------- sizing
  function resize() {
    const r = stage.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (w === markSize.w && h === markSize.h && renderer.getPixelRatio() === dpr && !ctxLost) { wake(); return; }
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    markSize.w = w; markSize.h = h;
    drawStars();
    wake();
  }

  // ---------------------------------------------------------------- render on demand
  // The rAF loop runs only while something moves: a scenario, a camera flight or drag, a pulse,
  // lights still fading, or the idle drift while scenarios autoplay. Otherwise it stops, and any
  // input, resize or scenario wakes it. Off-screen or hidden, it never runs.
  const DEBUG_HOLD = DEBUG && params.has('hold');
  function autoplayOn() { return !REDUCE && !DEBUG_HOLD && performance.now() > pausedUntil; }
  let inView = true, loopActive = false, last = 0, lastDrawn = 0, idleFrames = 0, wakeTimer = 0;
  let fellBack = false, ctxLost = false;
  const visible = () => inView && !document.hidden && !fellBack && !ctxLost;
  function isAnimating() {
    if ((busy && !hold) || camT < 1 || ptrs.size || pulses.length || tweens.length || people.length || (smokeOn && busy)) return true;
    if (autoplayOn()) return true;
    for (const g of GROUPS) if (Math.abs(goal[g] - lvl[g]) > 0.002) return true;
    return Math.abs(headGoal - headOn) > 0.002 || Math.abs(tailGoal - tailOn) > 0.002 || Math.abs(tvGoal - tvLvl) > 0.002;
  }
  function wake() {
    clearTimeout(wakeTimer);
    if (!visible() || loopActive) return;
    loopActive = true; last = 0; idleFrames = 0; mon.acc = 0; mon.n = 0;
    requestAnimationFrame(loop);
  }
  function sleepLoop() {
    loopActive = false;
    // come back when autoplay is due again
    if (!REDUCE && !DEBUG_HOLD && pausedUntil !== Infinity && visible()) {
      const due = Math.max(pausedUntil, lastEnd + 2600) - performance.now();
      wakeTimer = setTimeout(wake, Math.max(50, due + 50));
    }
  }

  const ft = [];
  const dbgEl = DEBUG && params.has('stats') ? Object.assign(document.createElement('div'), { className: 'dbg' }) : null;
  if (dbgEl) stage.append(dbgEl);
  let frames = 0;
  function frame(dt, now) {
    advance(dt);
    applyLighting(dt);
    updateCamera(dt, now);
    buildGlows();
    renderer.render(scene, camera);
    placeMarks();
    frames++;
  }
  function loop(now) {
    if (!loopActive) return;
    if (!visible()) { loopActive = false; return; }
    // debug: simulate a slow GPU by only drawing FORCE_FPS times a second
    if (FORCE_FPS && lastDrawn && now - lastDrawn < 1000 / FORCE_FPS - 1) { requestAnimationFrame(loop); return; }
    lastDrawn = now;
    const dtMs = last ? now - last : 0;
    last = now;
    frame(Math.min(0.1, dtMs / 1000), now);
    if (dtMs > 0) { ft.push(dtMs); if (ft.length > 120) ft.shift(); monitor(dtMs, now); }
    if (dbgEl && frames % 15 === 0) {
      const srt = [...ft].sort((x, y) => x - y), avg = srt.reduce((q, v) => q + v, 0) / (srt.length || 1);
      dbgEl.textContent = `${(1000 / avg).toFixed(0)} fps  avg ${avg.toFixed(1)} ms  p95 ${(srt[Math.floor(srt.length * 0.95)] || 0).toFixed(1)} ms\ntier ${TIER}  level ${level}  dpr ${dpr}  glows ${glowsOn ? 'on' : 'off'}\ncalls ${renderer.info.render.calls}  tris ${renderer.info.render.triangles}  maps ${texMiB.toFixed(1)} MiB`;
    }
    if (autoplayOn() && !busy && now - lastEnd > 2600) play(order[idx]);
    if (isAnimating()) idleFrames = 0;
    else if (++idleFrames >= 3) { sleepLoop(); return; }
    requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- performance monitor
  // Modelled on drei's PerformanceMonitor: 250 ms windows, the last 10 kept, act when 8 of 10 agree.
  // A steady 30 fps (iOS Low Power Mode caps rAF there) is fine and never counts against us.
  const mon = { lowest: startLevel, t0: 0, acc: 0, n: 0, win: [], flips: 0, lastDir: 0, locked: false, okSent: false, events: [] };
  const setVerdict = (v) => { if (FORCE_FPS) { toParent({ type: 'h3d-verdict', v }); return; } store.set('h3d-verdict', JSON.stringify({ v, ts: Date.now() })); toParent({ type: 'h3d-verdict', v }); };
  function applyLevel(i, why) {
    level = i; dpr = LEVELS[i].dpr; glowsOn = LEVELS[i].glows;
    mon.events.push(`${why} -> level ${i} (dpr ${dpr}, glows ${glowsOn ? 'on' : 'off'})`);
    if (DEBUG) console.info('[h3d]', mon.events[mon.events.length - 1]);
    resize();
    if (why === 'decline' && dpr <= 1) setVerdict('low');
  }
  function step(dir) {
    if (mon.lastDir && dir !== mon.lastDir) mon.flips++;
    mon.lastDir = dir;
    mon.lowest = Math.max(mon.lowest, level + dir);
    if (mon.flips >= 2) { mon.locked = true; applyLevel(mon.lowest, 'flip-flop limit, locked at the lowest level reached'); return; }
    applyLevel(level + dir, dir > 0 ? 'decline' : 'incline');
  }
  function monitor(dtMs, now) {
    if (fellBack) return;
    if (!mon.t0) mon.t0 = now;
    if (now - mon.t0 < 1000) return; // let shaders compile and textures upload first
    if (dtMs > 250) { mon.acc = 0; mon.n = 0; return; } // a stall or a gap, not a frame rate
    mon.acc += dtMs; mon.n++;
    if (mon.acc < 250) return;
    mon.win.push((mon.n * 1000) / mon.acc); mon.acc = 0; mon.n = 0;
    if (mon.win.length > 10) mon.win.shift();
    if (mon.win.length < 10) return;
    const count = (f) => mon.win.filter(f).length;
    const bottom = level === LEVELS.length - 1;
    // struggling: under the 30 fps cap, or an uncapped display stuck well short of 60
    const slow = count((f) => f < 26 || (f > 34 && f < 43));
    const fast = count((f) => f > 57);
    if (bottom && count((f) => f < 24) >= 8) { fallback('slow'); return; }
    if (slow >= 8 && !bottom) { step(+1); mon.win = []; return; }
    if (fast >= 8 && level > 0 && !mon.locked) { step(-1); mon.win = []; return; }
    if (!mon.okSent && slow <= 2) { mon.okSent = true; setVerdict('ok'); }
  }
  function fallback(reason) {
    if (fellBack) return;
    fellBack = true; loopActive = false;
    if (reason === 'slow') setVerdict('fail'); // only a measured struggle marks the device; load errors and lost contexts don't
    mon.events.push('fallback: ' + reason);
    toParent({ type: 'h3d-fallback', reason });
    if (DEBUG) console.info('[h3d] fallback', reason);
    const box = $('#nogl');
    box.querySelector('p').textContent = NOGL_TEXT[reason] || NOGL_TEXT.slow;
    box.hidden = false;
  }
  // a lost WebGL context that is not restored within 3 s means fall back
  let lostTimer = 0;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); ctxLost = true; loopActive = false;
    const arm = () => { clearTimeout(lostTimer); lostTimer = setTimeout(() => { if (ctxLost) fallback('context-lost'); }, 3000); };
    if (document.hidden) document.addEventListener('visibilitychange', function once() { if (!document.hidden) { document.removeEventListener('visibilitychange', once); arm(); } });
    else arm();
  });
  canvas.addEventListener('webglcontextrestored', () => { clearTimeout(lostTimer); ctxLost = false; resize(); wake(); });

  new ResizeObserver(resize).observe(stage);
  resize();
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; wake(); }, { threshold: 0.05 }).observe(stage);
  document.addEventListener('visibilitychange', wake);

  // first frame, then fade in over the poster
  reset(SC.dusk.setup);
  if (REDUCE) {
    // a still frame with the lights on; scenarios advance one step per tap
    for (const g of ['office', 'kitchen', 'living', 'garage', 'porch', 'drive', 'yard', 'laundry']) { goal[g] = 1; lvl[g] = 1; }
    log('reduced motion: tap a moment, then "Next step"');
    nextBtn.textContent = 'Start';
  }
  // compile every shader off the critical path (parallel compile where the driver supports it)
  try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); } catch { /* fall through to a normal first frame */ }
  frame(0, performance.now());
  stage.classList.add('ready');
  toParent({ type: 'h3d-ready' });
  const hint = $('#hint');
  if (!REDUCE) { hint.classList.add('show'); setTimeout(() => hint.classList.remove('show'), 2400); }
  wake();
  if (!REDUCE && !DEBUG_HOLD) setTimeout(() => { if (!busy) play('dusk'); }, 900);

  // ---------------------------------------------------------------- debug hooks for screenshots
  const yieldMacro = () => new Promise((r) => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(); ch.port2.postMessage(0); });
  if (DEBUG) {
    window.__house = {
      play: (k) => { pausedUntil = Infinity; play(k); return k; },
      async seek(t, step = 1 / 60) {
        const n = Math.round(t / step);
        for (let i = 0; i < n; i++) { frame(step, performance.now()); await yieldMacro(); }
        frame(0, performance.now());
        return T.toFixed(2);
      },
      room: (k) => { k ? enterRoom(k) : exitRoom(); return k; },
      shot: (k) => { goShot(k, true); frame(0, performance.now()); return k; },
      orbit: (az, el = 0, zoom = 1) => { user.az = az; user.el = el; user.zoom = zoom; frame(0, performance.now()); },
      render: () => frame(0, performance.now()),
      cam: () => ({ shot: shotKey, userAz: user.az, userZoom: user.zoom, userRoom }),
      stats: () => { const q = [...ft].sort((x, y) => x - y); return { avg: q.reduce((a, v) => a + v, 0) / (q.length || 1), p95: q[Math.floor(q.length * 0.95)], n: q.length, frames, loopActive, tier: TIER, level, dpr, glowsOn, texMiB: +texMiB.toFixed(2), maps: tex.map((t) => t.image.width), calls: renderer.info.render.calls, tris: renderer.info.render.triangles, monitor: mon.events, windows: mon.win.map((f) => +f.toFixed(1)), verdict: store.get('h3d-verdict') }; },
      loseContext: () => { renderer.getContext().getExtension('WEBGL_lose_context').loseContext(); return 'lost'; },
      log: () => fullLog.join('\n'),
      snapshot: (type = 'image/webp', q = 0.8) => canvas.toDataURL(type, q),
      set: (k, v) => { if (k === 'amb') amb = v; else { goal[k] = v; lvl[k] = v; } frame(0, performance.now()); },
    };
  }
}

main().catch((e) => noGL(e, 'load-error'));
