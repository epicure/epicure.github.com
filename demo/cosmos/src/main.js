import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { P } from './params.js';
import { loadShaders } from './shaders.js';
import { PlanetBaker } from './baker.js';
import { StarSystem } from './system.js';
import { makeUI } from './ui.js';
import { initHandTracking } from './hands.js';

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

// Starfield
{
  const g = new THREE.BufferGeometry();
  const n = 2000, pos = new Float32Array(n * 3);
  for(let i = 0; i < n; i++){
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const v = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th)).multiplyScalar(80);
    pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 0.08, color: 0xffffff, sizeAttenuation: true })));
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
    const dist = body.bodyRadius * 4 + 1;
    transTo.target.copy(wp);
    transTo.pos.set(wp.x, wp.y + dist * 0.3, wp.z + dist);
  }
  transitioning = true;
  transitionT = 0;
}

function smoothstep(t){ return t * t * (3 - 2 * t); }

let rebuildUIFn = null;

function focusOn(index){
  if(focusIndex >= 0 && focusIndex < system.bodies.length){
    savePToBody(system.bodies[focusIndex]);
  }
  focusIndex = index;
  if(index >= 0 && index < system.bodies.length){
    loadBodyToP(system.bodies[index]);
  }
  startTransition();
  if(rebuildUIFn) rebuildUIFn();
}

function generateSystemCmd(count){
  system.generate(count, baker);
  focusIndex = -1;
  startTransition();
  if(rebuildUIFn) rebuildUIFn();
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
  focusOn,
  updateFull: updateFocusedFull,
  updateRuntime: updateFocusedRuntime,
  buildPlanet: rebuildFocusedPlanet,
  buildAtmosphere: rebuildFocusedAtmo,
  updateBloomParams,
  exportPNG,
  getSystem: () => system,
  getFocusIndex: () => focusIndex,
};

rebuildUIFn = makeUI(ctx);

// Hand tracking
const handTracker = initHandTracking(camera, scene, ctx);

// Initial system
generateSystemCmd(5);

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

  system.update(dt, t, focusIndex < 0);
  handTracker.tick();
  updateBloomParams();
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
    generateSystemCmd(system.bodies.length - 1 || 5);
  }
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
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
