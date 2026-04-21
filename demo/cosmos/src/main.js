import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { P } from './params.js';
import { loadShaders, getShader, injectCommon } from './shaders.js';
import { PlanetBaker } from './baker.js';
import { StarSystem } from './system.js';
import { makeUI } from './ui.js';
import { initHandTracking } from './hands.js';
import { audio } from './audio.js';

await loadShaders();

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.01, 500);
camera.position.set(0, 15, 35);
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.3;
controls.maxDistance = 200;

// Bloom
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
renderPass.clearColor = new THREE.Color(0x000000);
renderPass.clearAlpha = 1;
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  P.bloomStrength, P.bloomRadius, P.bloomThreshold
);
composer.addPass(bloomPass);

function updateBloomParams(){
  bloomPass.strength = P.bloomStrength;
  bloomPass.radius = P.bloomRadius;
  bloomPass.threshold = P.bloomThreshold;
}

// Nebula skydome (renders behind everything)
// Disabled for perf — flip NEBULA_ENABLED to true to re-enable.
const NEBULA_ENABLED = false;
const nebulaUniforms = {
  uTime:      { value: 0 },
  uFocusMix:  { value: 0 },
  uFocusPos:  { value: new THREE.Vector3() },
  uColorA:    { value: new THREE.Color(0.06, 0.10, 0.28) }, // cool deep blue
  uColorB:    { value: new THREE.Color(0.14, 0.08, 0.24) }, // neutral violet
  uColorC:    { value: new THREE.Color(0.32, 0.14, 0.18) }, // warm magenta-rust
  uColorAxis: { value: new THREE.Vector3(0.3, 0.7, 0.2).normalize() },
  uIntensity: { value: 0.8 },
};
if(NEBULA_ENABLED){
  const geo = new THREE.SphereGeometry(200, 48, 32);
  const mat = new THREE.ShaderMaterial({
    vertexShader: getShader('nebula-vs'),
    fragmentShader: injectCommon(getShader('nebula-fs')),
    uniforms: nebulaUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  scene.add(mesh);
}

// Starfield (twinkling)
const starsUniforms = {
  uTime:       { value: 0 },
  uPixelRatio: { value: renderer.getPixelRatio() },
};
{
  const g = new THREE.BufferGeometry();
  const n = 2000;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const sz = new Float32Array(n);
  const br = new Float32Array(n);
  for(let i = 0; i < n; i++){
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const v = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th)).multiplyScalar(80);
    pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
    seed[i] = Math.random();
    // Power-law brightness: many dim, few bright
    const r = Math.random();
    sz[i] = 0.4 + Math.pow(r, 6) * 2.2;
    br[i] = 0.45 + Math.pow(r, 4) * 0.9;
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed',    new THREE.BufferAttribute(seed, 1));
  g.setAttribute('aSize',    new THREE.BufferAttribute(sz, 1));
  g.setAttribute('aBright',  new THREE.BufferAttribute(br, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: getShader('stars-vs'),
    fragmentShader: getShader('stars-fs'),
    uniforms: starsUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(g, mat);
  pts.renderOrder = -5;
  pts.frustumCulled = false;
  scene.add(pts);
}

const baker = new PlanetBaker(renderer, 512);
const system = new StarSystem();
scene.add(system.group);

// --- Focus & camera transition state ---
let focusIndex = -1;
let transitioning = false;
let transitionT = 0;
const TRANSITION_DURATION = 1.0;
const transFrom = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
const transTo   = { pos: new THREE.Vector3(), target: new THREE.Vector3() };

// Keys that are global (not saved/loaded per body)
const GLOBAL_KEYS = new Set(['bloomStrength', 'bloomRadius', 'bloomThreshold']);

function savePToBody(body){
  for(const k of Object.keys(P)){
    if(GLOBAL_KEYS.has(k)) continue;
    body.params[k] = Array.isArray(P[k]) ? [...P[k]] : P[k];
  }
}

function loadBodyToP(body){
  for(const k of Object.keys(body.params)){
    if(GLOBAL_KEYS.has(k)) continue;
    P[k] = Array.isArray(body.params[k]) ? [...body.params[k]] : body.params[k];
  }
}

function startTransition(){
  transFrom.pos.copy(camera.position);
  transFrom.target.copy(controls.target);
  if(focusIndex < 0){
    transTo.target.set(0, 0, 0);
    transTo.pos.set(0, 15, 35);
  } else {
    const body = system.bodies[focusIndex];
    const wp = body.group.position;
    const dist = Math.max(body.bodyRadius * 4.56, 0.5);
    transTo.target.copy(wp);
    transTo.pos.set(wp.x, wp.y + dist * 0.3, wp.z + dist);
  }
  transitioning = true;
  transitionT = 0;
}

function smoothstep(t){ return t * t * (3 - 2 * t); }

let rebuildUIFn = null;

function focusOn(index){
  const prevIndex = focusIndex;
  if(focusIndex >= 0 && focusIndex < system.bodies.length){
    savePToBody(system.bodies[focusIndex]);
  }
  focusIndex = index;
  if(index >= 0 && index < system.bodies.length){
    loadBodyToP(system.bodies[index]);
  }
  startTransition();
  if(rebuildUIFn) rebuildUIFn();

  // Audio: per-archetype transition sound
  if(index >= 0 && system.bodies[index]){
    const b = system.bodies[index];
    audio.playTransition(b.params.archetype, 'focusIn', b.params);
  } else if(prevIndex >= 0 && system.bodies[prevIndex]){
    const b = system.bodies[prevIndex];
    audio.playTransition(b.params.archetype, 'focusOut', b.params);
  }
}

// ── Nova effect (supernova + system rebirth): rays + flash + bloom spike ──
const flashEl = document.getElementById('nova-flash');
const rayUniforms = {
  uTime:      { value: 0 },
  uIntensity: { value: 0 },
  uReach:     { value: 0 },
  uColor:     { value: new THREE.Color(1.0, 0.95, 0.75) },
};
let rayMesh = null;
{
  const geo = new THREE.PlaneGeometry(60, 60, 1, 1);
  const mat = new THREE.ShaderMaterial({
    vertexShader: getShader('rays-vs'),
    fragmentShader: injectCommon(getShader('rays-fs')),
    uniforms: rayUniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  rayMesh = new THREE.Mesh(geo, mat);
  rayMesh.renderOrder = 5;
  rayMesh.frustumCulled = false;
  rayMesh.visible = false;
  scene.add(rayMesh);
}

const NOVA = {
  phase: 'idle',        // 'idle' | 'charging' | 'bursting'
  targetCharge: 0,      // external 0..1
  charge: 0,            // smoothed charge
  burstT: 0,            // seconds into burst
  swapDone: false,
  pendingCount: 6,
  peakBloom: 7.0,
  // Burst sub-timings
  shootEnd: 0.20,       // ray peak-reach time
  flashPeak: 0.25,      // flash peak (swap under this)
  burstEnd: 0.60,       // everything faded
};

function setNovaProgress(p){
  if(NOVA.phase === 'bursting') return;
  // Map calibration 0.5..1.0 → visual charge 0..1 (below 0.5 = nothing)
  const mapped = Math.max(0, Math.min(1, (p - 0.5) * 2));
  NOVA.targetCharge = mapped;
  if(mapped > 0) NOVA.phase = 'charging';
  // Audio charge uses a later onset (quiet until ~0.6) — pass raw progress
  audio.setNovaCharge(p);
}

function triggerNova(count){
  if(NOVA.phase === 'bursting') return;
  NOVA.phase = 'bursting';
  NOVA.burstT = 0;
  NOVA.swapDone = false;
  NOVA.pendingCount = count;
}

function updateNova(dt, elapsed){
  rayUniforms.uTime.value = elapsed;

  let rayI = 0, rayR = 0, flash = 0;

  if(NOVA.phase === 'charging'){
    // Lerp charge toward target
    NOVA.charge += (NOVA.targetCharge - NOVA.charge) * Math.min(dt * 10, 1);
    if(NOVA.targetCharge === 0 && NOVA.charge < 0.01){
      NOVA.phase = 'idle';
      NOVA.charge = 0;
    }
    const c = NOVA.charge;
    rayR = c * 0.5;         // rays reach half max during charge
    rayI = c * 0.45;
  } else if(NOVA.phase === 'bursting'){
    NOVA.burstT += dt;
    const t = NOVA.burstT;
    const SE = NOVA.shootEnd, FP = NOVA.flashPeak, BE = NOVA.burstEnd;

    if(t < SE){
      const k = t / SE;
      const eased = 1 - Math.pow(1 - k, 3);
      rayR = 0.5 + 0.5 * eased;
      rayI = 0.45 + 1.05 * eased;
    } else {
      rayR = 1.0;
      const k = (t - SE) / (BE - SE);
      rayI = Math.max(0, 1.5 * (1 - k));
    }

    if(t < FP){
      flash = Math.pow(t / FP, 2);
    } else {
      const k = (t - FP) / (BE - FP);
      flash = Math.max(0, 1 - k);
      flash *= flash;
    }

    if(!NOVA.swapDone && t >= FP * 0.95){
      NOVA.swapDone = true;
      audio.playNovaBurst();
      system.generate(NOVA.pendingCount, baker);
      audio.setSystemKey();
      focusIndex = -1;
      startTransition();
      if(rebuildUIFn) rebuildUIFn();
    }

    if(t >= BE){
      NOVA.phase = 'idle';
      NOVA.burstT = 0;
      NOVA.charge = 0;
      NOVA.targetCharge = 0;
    }
  }

  // Apply outputs
  flashEl.style.opacity = flash.toFixed(3);
  rayUniforms.uIntensity.value = rayI;
  rayUniforms.uReach.value = rayR;
  rayMesh.visible = rayI > 0.005;
  if(rayMesh.visible){
    const star = system.bodies[0];
    if(star) rayMesh.position.copy(star.group.position);
    rayMesh.quaternion.copy(camera.quaternion);
  }

  // Bloom spike proportional to peak output
  const peak = Math.max(rayI / 1.5, flash);
  bloomPass.strength = P.bloomStrength + (NOVA.peakBloom - P.bloomStrength) * Math.min(peak, 1);
}

function generateSystemCmd(count){
  // Initial generation (before first system exists) → no effect
  if(system.bodies.length === 0){
    system.generate(count, baker);
    audio.setSystemKey();
    focusIndex = -1;
    startTransition();
    if(rebuildUIFn) rebuildUIFn();
    return;
  }
  // Don't retrigger while already running
  if(NOVA.active) return;
  triggerNova(count);
}

function updateFocusedFull(){
  if(focusIndex < 0) return;
  const body = system.bodies[focusIndex];
  savePToBody(body);
  body.bake(baker);
  body.buildMesh();
}

function updateFocusedRuntime(){
  if(focusIndex < 0) return;
  savePToBody(system.bodies[focusIndex]);
}

function rebuildFocusedPlanet(){
  if(focusIndex < 0) return;
  const body = system.bodies[focusIndex];
  savePToBody(body);
  body.bake(baker);
  body.buildMesh();
}

function rebuildFocusedAtmo(){
  if(focusIndex < 0) return;
  const body = system.bodies[focusIndex];
  savePToBody(body);
  body.buildAtmo();
}

function exportPNG(resolution){
  const prevPixelRatio = renderer.getPixelRatio();
  renderer.setPixelRatio(1);
  renderer.setSize(resolution, resolution);
  composer.setSize(resolution, resolution);
  camera.aspect = 1;
  camera.updateProjectionMatrix();
  composer.render();
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cosmos_${resolution}px.png`;
    a.click();
    URL.revokeObjectURL(url);
    renderer.setPixelRatio(prevPixelRatio);
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }, 'image/png');
}

const ctx = {
  generateSystem: generateSystemCmd,
  setNovaProgress,
  focusOn,
  updateFull: updateFocusedFull,
  updateRuntime: updateFocusedRuntime,
  buildPlanet: rebuildFocusedPlanet,
  buildAtmosphere: rebuildFocusedAtmo,
  updateBloomParams,
  exportPNG,
  getSystem: () => system,
  getFocusIndex: () => focusIndex,
  isTransitioning: () => transitioning,
  rebuildUI: () => { if(rebuildUIFn) rebuildUIFn(); },
};

rebuildUIFn = makeUI(ctx);

// Hand tracking
const handTracker = initHandTracking(camera, scene, ctx);

// Audio unlock on any first user gesture
{
  const unlockOnce = () => { audio.unlock(); };
  const opts = { once: true, capture: true };
  addEventListener('pointerdown', unlockOnce, opts);
  addEventListener('keydown',     unlockOnce, opts);
  addEventListener('touchstart',  unlockOnce, opts);
}

// Initial system
generateSystemCmd(6);

const clock = new THREE.Clock();
let lastT = 0;

function loop(){
  const t = clock.getElapsedTime();
  const dt = Math.min(t - lastT, 0.1);
  lastT = t;

  // Bake queue — one body per frame
  system.processBakeQueue(baker);
  const progEl = document.getElementById('bake-progress');
  if(progEl){
    const bp = system.bakeProgress;
    progEl.textContent = bp.done < bp.total ? `Baking ${bp.done}/${bp.total}...` : '';
  }

  // Camera transition
  if(transitioning){
    transitionT += dt / TRANSITION_DURATION;
    if(transitionT >= 1){ transitionT = 1; transitioning = false; }
    const s = smoothstep(transitionT);
    camera.position.lerpVectors(transFrom.pos, transTo.pos, s);
    controls.target.lerpVectors(transFrom.target, transTo.target, s);
  }

  // Order: tick (may rebuild planet mesh via tickCommit) must run BEFORE
  // system.update so the freshly-built mesh gets its uSunDir/uSunColor/uTime
  // synced by syncPlanetUniforms before composer.render — otherwise the new
  // mesh renders one frame with default uniforms (visible as a white flash
  // on bake-key edits, especially on stars via bloom'd limb).
  handTracker.tick(dt);
  system.update(dt, t, focusIndex < 0);
  updateBloomParams();

  // Nova: radial rays + flash + bloom spike
  updateNova(dt, t);

  // Background time + focus mix
  nebulaUniforms.uTime.value = t;
  starsUniforms.uTime.value = t;
  const targetFocusMix = focusIndex < 0 ? 0 : 1;
  nebulaUniforms.uFocusMix.value += (targetFocusMix - nebulaUniforms.uFocusMix.value) * Math.min(dt * 2.0, 1);
  if(focusIndex >= 0 && focusIndex < system.bodies.length){
    const wp = system.bodies[focusIndex].group.position;
    nebulaUniforms.uFocusPos.value.lerp(wp, Math.min(dt * 2.0, 1));
  } else {
    nebulaUniforms.uFocusPos.value.lerp(new THREE.Vector3(), Math.min(dt * 2.0, 1));
  }

  controls.update();
  composer.render();
  requestAnimationFrame(loop);
}
loop();

addEventListener('keydown', (e) => {
  // Ignore if user is typing in an input/select
  if(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
  if(e.key === 'ArrowLeft'){
    e.preventDefault();
    if(focusIndex < 0) focusOn(system.bodies.length - 1);
    else if(focusIndex === 0) focusOn(-1);
    else focusOn(focusIndex - 1);
  } else if(e.key === 'ArrowRight'){
    e.preventDefault();
    if(focusIndex >= system.bodies.length - 1) focusOn(-1);
    else focusOn(focusIndex + 1);
  } else if(e.key === ' '){
    e.preventDefault();
    generateSystemCmd(system.bodies.length - 1 || 6);
  }
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  starsUniforms.uPixelRatio.value = renderer.getPixelRatio();
});

// ── UI Toggle & Fullscreen ──
const btnToggle = document.getElementById('btn-toggle-ui');
const btnFS = document.getElementById('btn-fullscreen');
const uiPanel = document.getElementById('ui');
const handPanel = document.getElementById('hand-ui');
const infoEl = document.getElementById('info');
let uiVisible = true;

function setUIVisible(show){
  uiVisible = show;
  uiPanel.style.display = show ? '' : 'none';
  handPanel.style.display = show ? 'block' : 'none';
  infoEl.style.display = show ? '' : 'none';
  btnToggle.style.display = show ? 'none' : 'block';
  btnFS.style.display = show ? 'none' : 'block';
}

// Hide UI button (shown in each panel's header via keyboard shortcut or click)
addEventListener('keydown', (e) => {
  if(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
  if(e.key === 'h' || e.key === 'H'){
    setUIVisible(!uiVisible);
  }
});

btnToggle.addEventListener('click', () => setUIVisible(true));

btnFS.addEventListener('click', () => {
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen();
  }
});

document.addEventListener('fullscreenchange', () => {
  if(document.fullscreenElement){
    document.body.classList.add('fullscreen-mode');
    setUIVisible(false);
    btnToggle.style.display = 'none';
    btnFS.style.display = 'none';
  } else {
    document.body.classList.remove('fullscreen-mode');
  }
});

// ESC exits fullscreen (handled by browser), then show toggle buttons
// Also: clicking anywhere in fullscreen exits it
document.addEventListener('click', (e) => {
  if(document.fullscreenElement && e.target === canvas){
    document.exitFullscreen();
  }
});
