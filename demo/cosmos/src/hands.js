import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { P } from './params.js';
import { audio } from './audio.js';

/* ── Parameters ── */
const HP = {
  smoothingAlpha: 0.3,
  calibTime: 2.0,
  deadzone: 1.5,
  zSensitivity: 80,
  worldScale: 20,
  spaceScale: 15,
  jointSize: 0.2,
  boneThickness: 0.2,
  swayBackDist: 8.0,
  swayBackWindow: 0.5,
  noHandTimeout: 5.0, // focus mode auto-return when both hands missing
};

const DEFAULT_HAND_Z = -18;
const DEFAULT_SCALE = 1.0;

/* ── Dynamic hand-to-planet spatial mapping ── */
// Neutral hand sits at GAP_RATIO × bodyRadius from body surface (consistent across sizes)
const GAP_RATIO = 0.5;
function computeHandSpace(body){
  if(!body) return { handZ: DEFAULT_HAND_Z, scale: DEFAULT_SCALE };
  const r = body.bodyRadius;
  const camDist = Math.max(r * 4.56, 0.5);              // matches main.js startTransition
  const handToCam = camDist - r * (1 + GAP_RATIO);      // camera → neutral hand plane
  const handZ = -handToCam;
  const scale = handToCam / Math.abs(DEFAULT_HAND_Z);
  return { handZ, scale };
}

// Interpolated values used each frame
const handDyn = { handZ: DEFAULT_HAND_Z, scale: DEFAULT_SCALE };
const LERP_SPEED = 0.06;

// Fingertip landmark indices: 엄지, 검지, 중지, 약지, 새끼
const FINGER_TIPS = [4, 8, 12, 16, 20];
// High-saturation rainbow colors per finger
const FINGER_COLORS = [0xff1744, 0xff9100, 0xffea00, 0x00e676, 0x2979ff];
const FINGER_GAP_THRESHOLD = 1.0; // Gap / r ≤ 1.0

// Finger-driven parameter editing
const TICK_MS = 80;
const STEP_ANGLE = Math.PI / 36; // 5°
const MAX_STEPS_PER_TICK = 2;
const DIM_OPACITY = 0.25;
const ACTIVE_OPACITY = 1.0;

// Fingertip → body pushback (values operate on pushGroup.position, which lives in
// body.group's scaled frame — so position units are *body radii*)
const PUSH_K  = 120;   // spring stiffness (restoration)
const PUSH_C  = 24;    // damping (ζ≈1.1 off, ≈0.44 w/ single finger engaged)
const PUSH_KP = 600;   // per-finger repulsion stiffness
const PUSH_MAX_R = 1.2;  // max displacement (radius units)
const PUSH_DT_CAP = 1/60; // stability

// Slot order: L thumb, L index, L middle, L ring, L pinky, R thumb, R index, R middle, R ring, R pinky
const ARCHETYPE_FINGER_MAP = [
  // 0 Rocky — terrain-heavy + hue/normal/clouds/form
  ['mountains','plateFreq','amp','warp','seaLevel',     'hue','normalStrength','cloudCov','polarCaps','craters'],
  // 1 Gas Giant — bands/storms + hue/ring shape
  ['bands','bandShear','dynamics','stormDensity','stormSize','hue','ringInner','ringOuter','ringDensity','rayleigh'],
  // 2 Ice — cracks/terrain + hue/normal/form
  ['crackFreq','crackIntensity','iceSheen','amp','plateFreq','hue','normalStrength','warp','polarCaps','craters'],
  // 3 Ocean — ocean params + terrain/clouds/color
  ['oceanSpeed','oceanFoam','oceanSheen','oceanDepthTint','oceanSSS','amp','cloudCov','cloudDens','polarCaps','hue'],
  // 4 Lava — lava/terrain + warp/normal/hue/color
  ['lavaLevel','lavaGlow','lavaFreq','mountains','plateFreq','warp','normalStrength','hue','amp','rayleigh'],
  // 5 Star
  ['starTemp','granulation','sunspotDensity','limbDarkening','granuleEdge','starBrightness','bloomStrength','bloomRadius','bloomThreshold',null],
  // 6 Asteroid
  ['elongation','bumpiness','amp','craterScale','craterL','normalStrength','hue','lunarLightness','lunarSaturation','craterM'],
];

const SLIDER_META = {
  hue:            { min:-180, max:180, step:1 },
  haze:           { min:0, max:1, step:0.02 },
  cloudCov:       { min:0, max:1, step:0.02 },
  cloudDens:      { min:0, max:1.5, step:0.05 },
  scatter:        { min:0, max:2, step:0.05 },
  rayleigh:       { min:0, max:2, step:0.05 },
  exo:            { min:0, max:1, step:0.02 },
  rotSpeed:       { min:0, max:1.5, step:0.01 },
  axialTilt:      { min:-180, max:180, step:1 },
  polarCaps:      { min:0, max:1, step:0.02 },
  bands:          { min:2, max:10, step:1 },
  bandShear:      { min:0, max:0.3, step:0.01 },
  dynamics:       { min:0, max:1, step:0.02 },
  stormDensity:   { min:0, max:0.6, step:0.02 },
  stormSize:      { min:0.3, max:2.5, step:0.05 },
  ringDensity:    { min:0, max:2, step:0.02 },
  ringTilt:       { min:-90, max:90, step:1 },
  crackFreq:      { min:2, max:30, step:0.5 },
  crackIntensity: { min:0, max:1, step:0.02 },
  iceSheen:       { min:0, max:1, step:0.02 },
  oceanSpeed:     { min:0, max:5, step:0.1 },
  oceanFoam:      { min:0, max:2, step:0.05 },
  oceanSheen:     { min:0, max:1, step:0.02 },
  oceanDepthTint: { min:0, max:1, step:0.02 },
  oceanSSS:       { min:0, max:2, step:0.05 },
  lavaLevel:      { min:-0.3, max:0.3, step:0.01 },
  lavaGlow:       { min:0, max:4, step:0.1 },
  lavaFreq:       { min:1, max:8, step:0.1 },
  mountains:      { min:0, max:2, step:0.05 },
  plateFreq:      { min:0.5, max:6, step:0.1 },
  starTemp:       { min:2400, max:40000, step:100 },
  granulation:    { min:0, max:1, step:0.02 },
  sunspotDensity: { min:0, max:0.6, step:0.02 },
  limbDarkening:  { min:0.1, max:1.5, step:0.02 },
  granuleEdge:    { min:0.8, max:2.0, step:0.02 },
  starBrightness: { min:0.5, max:4.0, step:0.05 },
  bloomStrength:  { min:0, max:5, step:0.05 },
  bloomRadius:    { min:0, max:2, step:0.01 },
  bloomThreshold: { min:0, max:1, step:0.01 },
  elongation:     { min:0, max:1, step:0.02 },
  bumpiness:      { min:0, max:1, step:0.02 },
  craterScale:    { min:0.5, max:3.0, step:0.05 },
  amp:            { min:0, max:0.08, step:0.001 },
  seaLevel:       { min:-0.3, max:0.3, step:0.01 },
  warp:           { min:0, max:2, step:0.05 },
  normalStrength: { min:-20, max:20, step:0.5 },
  craters:        { min:0, max:1, step:0.02 },
  craterL:        { min:0, max:2, step:0.02 },
  craterM:        { min:0, max:1, step:0.02 },
  lunarLightness: { min:0, max:1, step:0.02 },
  lunarSaturation:{ min:0, max:2, step:0.05 },
  ringInner:      { min:1.1, max:3.0, step:0.01 },
  ringOuter:      { min:1.3, max:5.0, step:0.01 },
};

const ATMO_BUILD_KEYS = new Set(['ringInner','ringOuter']);

// Mirror of BAKE_KEYS in ui.js — keep in sync
const BAKE_KEYS = new Set([
  'hue','amp','seaLevel','plateFreq','warp','mountains',
  'craters','craterL','craterM','craterS','craterScale','normalStrength',
  'crackFreq','crackIntensity','lunarLightness','lunarSaturation',
  'lavaLevel','lavaGlow','lavaFreq',
  'bands','bandShear','stormDensity','stormSize',
  'starTemp','granulation','sunspotDensity','granuleEdge',
]);
const BLOOM_KEYS = new Set(['bloomStrength','bloomRadius','bloomThreshold']);

const BONE_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17],[1,5]
];

/* ── EMA Filter ── */
class EMAFilter {
  constructor(){ this.value = null; }
  filter(v, alpha){
    if(!this.value) return (this.value = v.clone()).clone();
    this.value.lerp(v, alpha);
    return this.value.clone();
  }
}

/* ── Calibration Buffer ── */
class CalibrationBuffer {
  constructor(max = 30){ this.frames = []; this.max = max; }
  push(l, r){
    this.frames.push({ l: l.clone(), r: r.clone() });
    if(this.frames.length > this.max) this.frames.shift();
  }
  clear(){ this.frames = []; }
  getAverage(){
    if(!this.frames.length) return { l: new THREE.Vector3(), r: new THREE.Vector3() };
    const aL = new THREE.Vector3(), aR = new THREE.Vector3();
    this.frames.forEach(f => { aL.add(f.l); aR.add(f.r); });
    return { l: aL.divideScalar(this.frames.length), r: aR.divideScalar(this.frames.length) };
  }
}

/* ── Hand Analysis ── */
function getAngle(a, b, c){
  const ab = a.clone().sub(b).normalize();
  const cb = c.clone().sub(b).normalize();
  return Math.acos(THREE.MathUtils.clamp(ab.dot(cb), -1, 1));
}

function isIndexExtended(pts){
  const angPIP = getAngle(pts[5], pts[6], pts[7]);
  const angDIP = getAngle(pts[6], pts[7], pts[8]);
  return angPIP > 2.5 && angDIP > 2.3;
}

function analyzeHand(pts){
  const wrist = pts[0];
  const fingers = [[5,6,7,8],[9,10,11,12],[13,14,15,16],[17,18,19,20]];
  let ext = 0, curled = 0;
  for(const [m,p,d,t] of fingers){
    const angPIP = getAngle(pts[m], pts[p], pts[d]);
    const angDIP = getAngle(pts[p], pts[d], pts[t]);
    const dTipW = pts[t].distanceTo(wrist);
    const dMcpW = pts[m].distanceTo(wrist);
    const dPipW = pts[p].distanceTo(wrist);
    const straight = angPIP > 2.7 && angDIP > 2.5 && dTipW > dPipW;
    const bent = angPIP < 1.9 || dTipW < dMcpW * 0.95;
    if(straight) ext++;
    else if(bent) curled++;
  }
  if(curled >= 4) return 'Fist';
  if(ext >= 4) return 'Open';
  return `${ext}`;
}

function getPalmCenter(pts){
  const c = new THREE.Vector3();
  [0,5,9,13,17].forEach(i => { if(pts[i]) c.add(pts[i]); });
  return c.multiplyScalar(0.2);
}

/* ── Hand Mesh Builder ── */
const BASE_JOINT_EMI = 0.35, BASE_BONE_EMI = 0.25;
const PEAK_JOINT_EMI = 3.0,  PEAK_BONE_EMI = 2.0;
const matLJ = new THREE.MeshStandardMaterial({ color: 0x42A5F5, roughness: 0.2, emissive: 0x42A5F5, emissiveIntensity: BASE_JOINT_EMI });
const matLB = new THREE.MeshStandardMaterial({ color: 0x1E88E5, roughness: 0.9, emissive: 0x1E88E5, emissiveIntensity: BASE_BONE_EMI });
const matRJ = new THREE.MeshStandardMaterial({ color: 0xEF5350, roughness: 0.2, emissive: 0xEF5350, emissiveIntensity: BASE_JOINT_EMI });
const matRB = new THREE.MeshStandardMaterial({ color: 0xE53935, roughness: 0.9, emissive: 0xE53935, emissiveIntensity: BASE_BONE_EMI });
const geoJoint = new THREE.IcosahedronGeometry(1, 2);
const geoBone = new THREE.CylinderGeometry(1, 1, 1, 8);
geoBone.translate(0, 0.5, 0);

function createHandMesh(isLeft, camera){
  const matJ = isLeft ? matLJ : matRJ;
  const matB = isLeft ? matLB : matRB;
  const group = new THREE.Group();
  const joints = [], bones = [];
  for(let i = 0; i < 21; i++){
    const m = new THREE.Mesh(geoJoint, matJ);
    m.scale.setScalar(HP.jointSize);
    joints.push(m); group.add(m);
  }
  for(let i = 0; i < BONE_CONNECTIONS.length; i++){
    const m = new THREE.Mesh(geoBone, matB);
    bones.push(m); group.add(m);
  }
  camera.add(group);
  return { group, joints, bones };
}

const Y_UP = new THREE.Vector3(0, 1, 0);

function updateHandMesh(handObj, filteredPts, scale){
  const js = HP.jointSize * scale;
  const bt = HP.boneThickness * scale;
  for(let i = 0; i < 21; i++){
    handObj.joints[i].position.copy(filteredPts[i]);
    handObj.joints[i].scale.setScalar(js);
  }
  for(let i = 0; i < BONE_CONNECTIONS.length; i++){
    const start = filteredPts[BONE_CONNECTIONS[i][0]];
    const end = filteredPts[BONE_CONNECTIONS[i][1]];
    const bone = handObj.bones[i];
    const delta = end.clone().sub(start);
    const len = delta.length();
    bone.scale.set(bt, len, bt);
    bone.position.copy(start);
    if(len > 0.001){
      const dir = delta.normalize();
      if(dir.dot(Y_UP) > -0.999) bone.quaternion.setFromUnitVectors(Y_UP, dir);
    }
  }
}

/* ── UI Builder ── */
function buildHandUI(){
  const panel = document.getElementById('hand-ui');
  panel.innerHTML = '';

  const section = (t) => {
    const h = document.createElement('h3'); h.textContent = t; panel.appendChild(h);
  };

  // Settings
  section('Settings');
  {
    const row = document.createElement('div'); row.className = 'data-row';
    row.style.justifyContent = 'flex-end'; row.style.gap = '4px';
    const hideBtn = document.createElement('button');
    hideBtn.textContent = 'Hide UI (H)';
    hideBtn.style.fontSize = '9px'; hideBtn.style.padding = '2px 6px';
    hideBtn.onclick = () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', bubbles: true })); };
    const fsBtn = document.createElement('button');
    fsBtn.textContent = 'Fullscreen';
    fsBtn.style.fontSize = '9px'; fsBtn.style.padding = '2px 6px';
    fsBtn.onclick = () => { if(!document.fullscreenElement) document.documentElement.requestFullscreen(); };
    row.append(hideBtn, fsBtn); panel.appendChild(row);
  }
  // Sound (mute + volume)
  {
    const muteRow = document.createElement('div'); muteRow.className = 'row';
    const muteLbl = document.createElement('label'); muteLbl.textContent = 'Sound';
    const muteChk = document.createElement('input'); muteChk.type = 'checkbox'; muteChk.checked = true;
    muteChk.style.marginLeft = 'auto';
    muteChk.onchange = () => audio.setMuted(!muteChk.checked);
    muteRow.append(muteLbl, muteChk); panel.appendChild(muteRow);

    const volRow = document.createElement('div'); volRow.className = 'row';
    const volLbl = document.createElement('label'); volLbl.textContent = 'Volume (dB)';
    const volRng = document.createElement('input'); volRng.type = 'range';
    volRng.min = -30; volRng.max = 0; volRng.step = 1; volRng.value = -12;
    const volVal = document.createElement('span'); volVal.className = 'val';
    volVal.textContent = '-12';
    volRng.oninput = () => { audio.setMasterVolume(+volRng.value); volVal.textContent = volRng.value; };
    volRow.append(volLbl, volRng, volVal); panel.appendChild(volRow);
  }

  // Calibration
  section('Calibration');
  const calibBox = document.createElement('div'); calibBox.id = 'calib-box';
  const calibTitle = document.createElement('div');
  calibTitle.style.cssText = 'font-size:10px;color:#aaa;margin-bottom:4px';
  calibTitle.textContent = 'Hold both fists to calibrate';
  const calibStatus = document.createElement('div'); calibStatus.id = 'calib-status';
  const progBg = document.createElement('div'); progBg.id = 'calib-progress-bg';
  const progFill = document.createElement('div'); progFill.id = 'calib-progress-fill';
  progBg.appendChild(progFill);
  calibBox.append(calibTitle, calibStatus, progBg);
  panel.appendChild(calibBox);

  // No-hand Return — own section, placed above Left Hand
  section('No-hand Return');
  const autoReturnRefs = {};
  {
    const sRow = document.createElement('div'); sRow.className = 'row';
    const sLbl = document.createElement('label'); sLbl.textContent = 'Timeout (s)';
    const sInp = document.createElement('input'); sInp.type = 'range';
    sInp.min = 1; sInp.max = 10; sInp.step = 0.5; sInp.value = HP.noHandTimeout;
    const sVal = document.createElement('span'); sVal.className = 'val';
    sVal.textContent = (+HP.noHandTimeout).toFixed(1);
    sInp.oninput = () => { HP.noHandTimeout = +sInp.value; sVal.textContent = (+HP.noHandTimeout).toFixed(1); };
    sRow.append(sLbl, sInp, sVal); panel.appendChild(sRow);

    const box = document.createElement('div');
    box.style.cssText = 'margin-top:6px;opacity:0;transition:opacity .2s;font-size:10px';
    const lblRow = document.createElement('div');
    lblRow.style.cssText = 'display:flex;justify-content:space-between;color:#aaa;margin-bottom:3px';
    const lblL = document.createElement('span'); lblL.textContent = 'Returning to Overview';
    const lblR = document.createElement('span'); lblR.style.color = '#6cf'; lblR.textContent = '0.0s';
    lblRow.append(lblL, lblR);
    const barBg = document.createElement('div');
    barBg.style.cssText = 'width:100%;height:4px;background:#222;border-radius:2px;overflow:hidden';
    const barFill = document.createElement('div');
    barFill.style.cssText = 'height:100%;width:100%;background:#6cf;transition:background .15s';
    barBg.appendChild(barFill);
    box.append(lblRow, barBg);
    panel.appendChild(box);

    autoReturnRefs.box = box;
    autoReturnRefs.text = lblR;
    autoReturnRefs.fill = barFill;
  }

  // Hand data sections
  const createHandSection = (label, dotClass, prefix) => {
    section(label);
    const makeRow = (lbl) => {
      const row = document.createElement('div'); row.className = 'data-row';
      const l = document.createElement('span'); l.className = 'data-label'; l.textContent = lbl;
      const v = document.createElement('span'); v.className = 'data-value'; v.id = `${prefix}-${lbl.toLowerCase().replace(/[^a-z]/g,'')}`;
      v.textContent = '-';
      row.append(l, v); panel.appendChild(row);
      return v;
    };
    return {
      pose: makeRow('Pose'),
      disp: makeRow('Offset'),
      dist: makeRow('Distance'),
      gap: makeRow('Gap / r'),
      gesture: makeRow('Gesture'),
    };
  };

  const lUI = createHandSection('Left Hand', 'dot-l', 'l');
  const rUI = createHandSection('Right Hand', 'dot-r', 'r');

  // Tracking
  section('Tracking');
  const makeSlider = (label, key, min, max, step) => {
    const row = document.createElement('div'); row.className = 'row';
    const l = document.createElement('label'); l.textContent = label;
    const r = document.createElement('input'); r.type = 'range';
    r.min = min; r.max = max; r.step = step; r.value = HP[key];
    const v = document.createElement('span'); v.className = 'val';
    v.textContent = (+HP[key]).toFixed(step < 1 ? 2 : 0);
    r.oninput = () => { HP[key] = +r.value; v.textContent = (+HP[key]).toFixed(step < 1 ? 2 : 0); };
    row.append(l, r, v); panel.appendChild(row);
  };
  makeSlider('Smoothing', 'smoothingAlpha', 0.01, 1, 0.01);
  makeSlider('Deadzone', 'deadzone', 0.5, 5, 0.1);
  makeSlider('Z Sensitivity', 'zSensitivity', 10, 200, 5);
  makeSlider('Hand Scale', 'worldScale', 1, 50, 1);
  // Sway sliders hidden (feature disabled)
  // makeSlider('Sway Distance', 'swayBackDist', 5, 20, 0.5);
  // makeSlider('Sway Window', 'swayBackWindow', 0.1, 1.5, 0.05);

  return {
    panel, calibBox, calibStatus, progFill,
    left: lUI, right: rUI,
    autoReturn: autoReturnRefs,
  };
}

/* ── Main Controller ── */
export function initHandTracking(camera, scene, ctx){
  const ui = buildHandUI();
  ui.panel.style.display = 'block';

  // Add directional light to camera for hand illumination
  const camLight = new THREE.DirectionalLight(0xffffff, 0.6);
  camLight.position.set(0, 5, 0);
  camera.add(camLight);

  // Hand meshes (children of camera)
  const meshes = {
    Left: createHandMesh(true, camera),
    Right: createHandMesh(false, camera),
  };

  // Fingertip → body-center lines (scene-space, focused mode only)
  // 10 slots: L0..L4, R0..R4 — each with its own material for per-line opacity
  const resolution = new THREE.Vector2(innerWidth, innerHeight);
  const slotLines = [];
  const slotMats = [];
  for(let slotIdx = 0; slotIdx < 10; slotIdx++){
    const fingerIdx = slotIdx % 5;
    const mat = new LineMaterial({
      color: FINGER_COLORS[fingerIdx],
      linewidth: 3,
      resolution,
      transparent: true,
      opacity: ACTIVE_OPACITY,
    });
    const geo = new LineGeometry();
    geo.setPositions([0,0,0, 0,0,0]);
    const line = new Line2(geo, mat);
    line.computeLineDistances();
    line.visible = false;
    scene.add(line);
    slotLines.push(line);
    slotMats.push(mat);
  }

  addEventListener('resize', () => {
    resolution.set(innerWidth, innerHeight);
    slotMats.forEach(m => m.resolution.copy(resolution));
  });

  // Per-slot state for commit-tick editing
  const slotState = Array.from({length:10}, () => ({ active:false, theta0:0 }));
  let tickAccum = 0;

  function computeTheta(tipWP, bodyWP){
    const dx = tipWP.x - bodyWP.x, dy = tipWP.y - bodyWP.y, dz = tipWP.z - bodyWP.z;
    const r = Math.hypot(dx, dy, dz);
    if(r < 1e-6) return 0;
    return Math.acos(THREE.MathUtils.clamp(dy / r, -1, 1));
  }

  function slotLabel(slotIdx){ return slotIdx < 5 ? 'Left' : 'Right'; }
  function slotFinger(slotIdx){ return slotIdx % 5; }

  // Filters
  const filters = {
    Left:  { joints: Array.from({length:21}, () => new EMAFilter()), pos: new EMAFilter() },
    Right: { joints: Array.from({length:21}, () => new EMAFilter()), pos: new EMAFilter() },
  };

  // State
  const state = {
    Left:  { pose: 'None', center: new THREE.Vector3(), isDetected: false, lastTime: 0, actionText: '', rawZ: 0 },
    Right: { pose: 'None', center: new THREE.Vector3(), isDetected: false, lastTime: 0, actionText: '', rawZ: 0 },
  };

  let isCalibrated = false;
  let calibTimer = 0;
  let generateCooldown = 0;
  let calibGlow = 0; // 0..1 — both-fist brightness ramp for bloom
  let noHandTimer = 0; // seconds both hands have been missing in focus mode
  let hasSeenHand = false; // true once any hand has been detected in this session

  // Impact detection per fingertip (10 slots = 5 × 2 hands)
  const hitWasInside = new Array(10).fill(false);
  const hitPrevTip  = Array.from({length: 10}, () => ({ valid: false, pos: new THREE.Vector3() }));
  const hitLastTime = new Array(10).fill(0); // performance.now() of last trigger per finger
  let swayCooldown = 0;
  const swayBuffer = []; // [{ t: seconds, z: number }, ...]
  const calibBuffer = new CalibrationBuffer(30);
  const calibOrigin = { Left: new THREE.Vector3(), Right: new THREE.Vector3() };
  let lastTime = performance.now();

  // Collision state
  const collision = { leftDist: Infinity, rightDist: Infinity, leftHit: false, rightHit: false };

  // Fingertip→body pushback physics state (operates on focused body's pushGroup)
  const pushVel = new THREE.Vector3();
  let pushLastBodyIdx = -1;

  /* ── MediaPipe callback ── */
  function onResults(results){
    const now = performance.now();
    state.Left.isDetected = state.Right.isDetected = false;

    if(results.multiHandLandmarks && results.multiHandWorldLandmarks && results.multiHandedness){
      for(let idx = 0; idx < results.multiHandLandmarks.length; idx++){
        const imgLms = results.multiHandLandmarks[idx];
        const worldLms = results.multiHandWorldLandmarks[idx];
        if(!imgLms || !worldLms || imgLms.length < 21 || worldLms.length < 21) continue;
        if(!results.multiHandedness[idx]) continue;
        // Mirror: MediaPipe 'Right' = user's left
        const label = results.multiHandedness[idx].label === 'Right' ? 'Left' : 'Right';

        state[label].isDetected = true;
        state[label].lastTime = now;
        hasSeenHand = true;

        // Image-plane palm center → base offset
        const pImg = getPalmCenter(imgLms);
        const perim = Math.hypot(imgLms[0].x-imgLms[5].x, imgLms[0].y-imgLms[5].y)
                    + Math.hypot(imgLms[5].x-imgLms[17].x, imgLms[5].y-imgLms[17].y)
                    + Math.hypot(imgLms[17].x-imgLms[0].x, imgLms[17].y-imgLms[0].y);

        const s = handDyn.scale;
        const tX = -(pImg.x - 0.5) * HP.spaceScale * s;
        const tY = -(pImg.y - 0.5) * HP.spaceScale * s;
        const tZ = (0.45 - perim) * HP.zSensitivity * s + handDyn.handZ;
        state[label].rawZ = (0.45 - perim) * HP.zSensitivity;
        const basePos = filters[label].pos.filter(new THREE.Vector3(tX, tY, tZ), HP.smoothingAlpha * 0.5);

        // World landmarks → local points (scaled by dynamic factor)
        const localPts = worldLms.map(w => new THREE.Vector3(-w.x, -w.y, w.z).multiplyScalar(HP.worldScale * s));
        const wCenter = getPalmCenter(localPts);

        const filteredPts = [];
        for(let i = 0; i < 21; i++){
          localPts[i].sub(wCenter).add(basePos);
          filteredPts.push(filters[label].joints[i].filter(localPts[i], HP.smoothingAlpha));
        }

        updateHandMesh(meshes[label], filteredPts, handDyn.scale);

        state[label].pose = analyzeHand(filteredPts);
        state[label].center.copy(getPalmCenter(filteredPts));
      }
    }

    updateLogic((now - lastTime) / 1000);
    lastTime = now;
  }

  /* ── Logic update ── */
  function updateLogic(dt){
    const lFist = state.Left.pose === 'Fist';
    const rFist = state.Right.pose === 'Fist';

    // Cooldown tick
    if(generateCooldown > 0) generateCooldown = Math.max(0, generateCooldown - dt);

    // Calibration
    if(lFist && rFist && state.Left.isDetected && state.Right.isDetected){
      if(generateCooldown > 0){
        calibTimer = 0;
        calibBuffer.clear();
      } else {
        calibTimer += dt;
        calibBuffer.push(state.Left.center, state.Right.center);
        if(calibTimer >= HP.calibTime){
          isCalibrated = true;
          const avg = calibBuffer.getAverage();
          calibOrigin.Left.copy(avg.l);
          calibOrigin.Right.copy(avg.r);
          ui.calibBox.classList.add('active');
          // Trigger system generation and start cooldown
          const sys = ctx.getSystem();
          ctx.generateSystem(sys.bodies.length - 1 || 6);
          generateCooldown = 3.0;
          calibTimer = 0;
          calibBuffer.clear();
        }
      }
    } else {
      calibTimer = 0;
      calibBuffer.clear();
    }

    // Emit calibration progress to Nova effect (rays build from 50% onward)
    if(ctx.setNovaProgress){
      const p = (generateCooldown > 0) ? 0 : Math.min(calibTimer / HP.calibTime, 1);
      ctx.setNovaProgress(p);
    }

    // Auto-return: in focus mode, if both hands missing for N seconds → overview
    // Only engages once user has calibrated (avoids triggering in no-camera sessions)
    const anyHand = state.Left.isDetected || state.Right.isDetected;
    const inFocus = ctx.getFocusIndex() >= 0;
    const transitioning = ctx.isTransitioning();
    if(inFocus && hasSeenHand && !anyHand && !transitioning){
      noHandTimer += dt;
      if(noHandTimer >= HP.noHandTimeout){
        ctx.focusOn(-1);
        noHandTimer = 0;
      }
    } else {
      noHandTimer = 0;
    }
    // Sync indicator UI
    const ar = ui.autoReturn;
    if(ar && ar.box){
      const showing = inFocus && hasSeenHand && !anyHand && !transitioning && noHandTimer > 0.5;
      ar.box.style.opacity = showing ? '1' : '0';
      if(showing){
        const remaining = Math.max(0, HP.noHandTimeout - noHandTimer);
        ar.text.textContent = remaining.toFixed(1) + 's';
        ar.fill.style.width = (100 * remaining / HP.noHandTimeout).toFixed(1) + '%';
        const urgent = remaining < 1.0;
        ar.fill.style.background = urgent ? '#EF5350' : '#6cf';
        ar.text.style.color = urgent ? '#EF5350' : '#6cf';
      }
    }

    // Collision detection against focused body
    const system = ctx.getSystem();
    const fi = ctx.getFocusIndex();
    if(fi >= 0 && fi < system.bodies.length){
      const body = system.bodies[fi];
      const targetWP = new THREE.Vector3();
      (body.pushGroup || body.group).getWorldPosition(targetWP);
      const threshold = body.bodyRadius * 1.2;

      const checkDist = (label) => {
        if(!state[label].isDetected) return { dist: Infinity, hit: false };
        const tipWP = new THREE.Vector3();
        meshes[label].joints[8].getWorldPosition(tipWP);
        const dist = tipWP.distanceTo(targetWP);
        return { dist, hit: dist < threshold };
      };

      const lR = checkDist('Left'), rR = checkDist('Right');
      collision.leftDist = lR.dist; collision.leftHit = lR.hit;
      collision.rightDist = rR.dist; collision.rightHit = rR.hit;
    }

    // Gesture interpretation
    ['Left','Right'].forEach(label => {
      const s = state[label];
      if(!isCalibrated || !s.isDetected){ s.actionText = isCalibrated ? 'Idle' : 'Need calib'; return; }
      const disp = s.center.clone().sub(calibOrigin[label]);
      if(disp.length() > HP.deadzone){
        const ax = Math.abs(disp.x), ay = Math.abs(disp.y), az = Math.abs(disp.z);
        if(ax > ay && ax > az) s.actionText = disp.x > 0 ? 'Move R' : 'Move L';
        else if(ay > ax && ay > az) s.actionText = disp.y > 0 ? 'Move Up' : 'Move Down';
        else s.actionText = disp.z > 0 ? 'Pull' : 'Push';
      } else {
        s.actionText = 'Idle';
      }
    });

    // (Fingertip lines & commit-tick run at render rate — see tick())

    // Sway-back gesture (disabled — kept for reference)
    // updateSwayBack(dt);

    // Index-finger raycast (Overview mode only)
    updatePointerRaycast();

    updateHandUI();
  }

  function updateSwayBack(dt){
    if(swayCooldown > 0) swayCooldown = Math.max(0, swayCooldown - dt);

    const s = state.Right;
    const transitioning = ctx.isTransitioning();

    if(!s.isDetected || transitioning){
      swayBuffer.length = 0;
      return;
    }

    const now = performance.now() / 1000;
    swayBuffer.push({ t: now, z: s.rawZ });
    const windowStart = now - HP.swayBackWindow;
    while(swayBuffer.length && swayBuffer[0].t < windowStart) swayBuffer.shift();

    const fi = ctx.getFocusIndex();
    if(fi < 0 || swayCooldown > 0 || swayBuffer.length < 2) return;

    const oldest = swayBuffer[0];
    const dz = s.rawZ - oldest.z;
    if(dz >= HP.swayBackDist){
      swayBuffer.length = 0;
      swayCooldown = 0.4;
      ctx.focusOn(-1);
    }
  }

  function updateFingerLines(){
    const fi = ctx.getFocusIndex();
    const system = ctx.getSystem();
    const body = (fi >= 0 && fi < system.bodies.length) ? system.bodies[fi] : null;

    if(!body){
      for(let i = 0; i < 10; i++){ slotLines[i].visible = false; slotState[i].active = false; }
      return;
    }

    const archetype = body.params ? body.params.archetype : 0;
    const mapping = ARCHETYPE_FINGER_MAP[archetype] || [];
    // bodyWP = visual center (pushGroup) — used for line endpoint and gap/r display threshold
    // restWP = rest center (body.group) — used as θ reference so pushback motion doesn't leak
    const bodyWP = new THREE.Vector3();
    const restWP = new THREE.Vector3();
    (body.pushGroup || body.group).getWorldPosition(bodyWP);
    body.group.getWorldPosition(restWP);
    const r = body.bodyRadius;
    const tipWP = new THREE.Vector3();

    for(let slotIdx = 0; slotIdx < 10; slotIdx++){
      const label = slotLabel(slotIdx);
      const fingerIdx = slotFinger(slotIdx);
      const line = slotLines[slotIdx];
      const mat = slotMats[slotIdx];

      if(!state[label].isDetected){
        line.visible = false;
        slotState[slotIdx].active = false;
        continue;
      }

      meshes[label].joints[FINGER_TIPS[fingerIdx]].getWorldPosition(tipWP);
      const gap = tipWP.distanceTo(bodyWP) - r;
      const gapRatio = gap / r;

      if(gapRatio <= FINGER_GAP_THRESHOLD){
        line.geometry.setPositions([tipWP.x, tipWP.y, tipWP.z, bodyWP.x, bodyWP.y, bodyWP.z]);
        line.visible = true;
        const hasKey = mapping[slotIdx] != null;
        mat.opacity = hasKey ? ACTIVE_OPACITY : DIM_OPACITY;

        // Editing gate: only when hovering (not in contact). Collision freezes edits
        // so pushback-induced motion can't be mistaken for user intent.
        const editable = gapRatio > 0;
        if(editable){
          if(!slotState[slotIdx].active){
            slotState[slotIdx].theta0 = computeTheta(tipWP, restWP);
            slotState[slotIdx].active = true;
          }
        } else {
          slotState[slotIdx].active = false;
        }
      } else {
        line.visible = false;
        slotState[slotIdx].active = false;
      }
    }
  }

  function quantizeToStep(val, step, min, max){
    const v = THREE.MathUtils.clamp(val, min, max);
    const q = Math.round(v / step) * step;
    const decimals = step < 1 ? Math.max(0, -Math.floor(Math.log10(step))) : 0;
    return +q.toFixed(decimals);
  }

  function tickCommit(dt){
    tickAccum += dt;
    if(tickAccum < TICK_MS / 1000) return;
    tickAccum = 0;

    const fi = ctx.getFocusIndex();
    const system = ctx.getSystem();
    const body = (fi >= 0 && fi < system.bodies.length) ? system.bodies[fi] : null;
    if(!body) return;
    const archetype = body.params ? body.params.archetype : 0;
    const mapping = ARCHETYPE_FINGER_MAP[archetype] || [];

    // θ reference: rest position (body.group) — immune to pushback motion
    const restWP = new THREE.Vector3();
    body.group.getWorldPosition(restWP);
    const tipWP = new THREE.Vector3();

    let bakeChanged = false, runtimeChanged = false, bloomChanged = false, atmoChanged = false, anyChanged = false;

    for(let slotIdx = 0; slotIdx < 10; slotIdx++){
      if(!slotState[slotIdx].active) continue;
      const key = mapping[slotIdx];
      if(!key) continue;
      const meta = SLIDER_META[key];
      if(!meta) continue;

      const label = slotLabel(slotIdx);
      const fingerIdx = slotFinger(slotIdx);
      if(!state[label].isDetected) continue;

      meshes[label].joints[FINGER_TIPS[fingerIdx]].getWorldPosition(tipWP);
      const theta = computeTheta(tipWP, restWP);
      const dTheta = theta - slotState[slotIdx].theta0;
      let n = Math.round(dTheta / STEP_ANGLE);
      n = THREE.MathUtils.clamp(n, -MAX_STEPS_PER_TICK, MAX_STEPS_PER_TICK);
      if(n === 0) continue;

      const cur = P[key];
      const next = quantizeToStep(cur + n * meta.step, meta.step, meta.min, meta.max);
      slotState[slotIdx].theta0 = theta; // re-anchor regardless
      if(next === cur) continue;

      P[key] = next;
      anyChanged = true;
      if(BLOOM_KEYS.has(key)) bloomChanged = true;
      else if(BAKE_KEYS.has(key)) bakeChanged = true;
      else runtimeChanged = true;
      if(ATMO_BUILD_KEYS.has(key)) atmoChanged = true;
    }

    if(bakeChanged) ctx.updateFull();
    else if(runtimeChanged) ctx.updateRuntime();
    if(bloomChanged && ctx.updateBloomParams) ctx.updateBloomParams();
    if(atmoChanged && ctx.buildAtmosphere) ctx.buildAtmosphere();
    if(anyChanged && ctx.rebuildUI) ctx.rebuildUI();
  }

  const pointerState = { Left: { lastHitIdx: -1 }, Right: { lastHitIdx: -1 } };

  function updatePointerRaycast(){
    const fi = ctx.getFocusIndex();
    const inOverview = fi < 0;
    const system = ctx.getSystem();

    if(!inOverview || swayCooldown > 0 || ctx.isTransitioning()) return;

    const camWP = new THREE.Vector3();
    camera.getWorldPosition(camWP);

    let focusTarget = -1;

    for(const label of ['Left', 'Right']){
      const s = state[label];
      if(!s.isDetected){
        pointerState[label].lastHitIdx = -1;
        continue;
      }

      const tipWP = new THREE.Vector3();
      meshes[label].joints[8].getWorldPosition(tipWP);
      const dir = tipWP.clone().sub(camWP);
      if(dir.lengthSq() < 1e-6){ pointerState[label].lastHitIdx = -1; continue; }
      dir.normalize();

      let bestT = Infinity, bestIdx = -1;
      for(let i = 0; i < system.bodies.length; i++){
        const body = system.bodies[i];
        const bwp = new THREE.Vector3();
        body.group.getWorldPosition(bwp);
        const toBody = bwp.clone().sub(camWP);
        const tClosest = toBody.dot(dir);
        if(tClosest < 0) continue;
        const closest = camWP.clone().addScaledVector(dir, tClosest);
        const distToRay = closest.distanceTo(bwp);
        const r = body.bodyRadius * 1.3;
        if(distToRay < r && tClosest < bestT){
          bestT = tClosest;
          bestIdx = i;
        }
      }

      if(bestIdx >= 0 && pointerState[label].lastHitIdx !== bestIdx){
        if(focusTarget < 0) focusTarget = bestIdx;
      }
      pointerState[label].lastHitIdx = bestIdx;
    }

    if(focusTarget >= 0) ctx.focusOn(focusTarget);
  }

  /* ── UI update ── */
  function updateHandUI(){
    // Calibration
    if(generateCooldown > 0){
      ui.calibStatus.textContent = `Cooldown ${generateCooldown.toFixed(1)}s`;
      ui.calibStatus.style.color = '#29B6F6';
      ui.progFill.style.width = `${(generateCooldown / 3.0) * 100}%`;
      ui.calibBox.classList.remove('active');
    } else if(calibTimer > 0){
      ui.calibStatus.textContent = 'Hold...';
      ui.calibStatus.style.color = '#FF9800';
      ui.progFill.style.width = `${Math.min((calibTimer / HP.calibTime) * 100, 100)}%`;
      ui.calibBox.classList.remove('active');
    } else if(isCalibrated){
      ui.calibStatus.textContent = 'Calibrated';
      ui.calibStatus.style.color = '#4CAF50';
      ui.progFill.style.width = '100%';
    } else {
      ui.calibStatus.textContent = 'Waiting...';
      ui.calibStatus.style.color = '#888';
      ui.progFill.style.width = '0%';
      ui.calibBox.classList.remove('active');
    }

    // Hand data
    const focusedBody = (() => {
      const fi = ctx.getFocusIndex();
      const sys = ctx.getSystem();
      return (fi >= 0 && fi < sys.bodies.length) ? sys.bodies[fi] : null;
    })();

    const updateSide = (label, uiSide) => {
      const s = state[label];
      const isL = label === 'Left';
      if(s.isDetected){
        uiSide.pose.textContent = s.pose;
        if(isCalibrated){
          const disp = s.center.clone().sub(calibOrigin[label]);
          uiSide.disp.textContent = `${disp.x.toFixed(1)}, ${disp.y.toFixed(1)}, ${disp.z.toFixed(1)}`;
          const dist = isL ? collision.leftDist : collision.rightDist;
          const hit = isL ? collision.leftHit : collision.rightHit;
          uiSide.dist.textContent = hit ? `${dist.toFixed(1)} HIT` : dist === Infinity ? '-' : dist.toFixed(1);
          uiSide.dist.className = hit ? 'data-value highlight' : 'data-value';
          if(focusedBody && dist !== Infinity){
            const gap = dist - focusedBody.bodyRadius;
            uiSide.gap.textContent = `${(gap / focusedBody.bodyRadius).toFixed(2)} r`;
          } else {
            uiSide.gap.textContent = '-';
          }
        } else {
          uiSide.disp.textContent = '-';
          uiSide.dist.textContent = '-';
          uiSide.dist.className = 'data-value';
          uiSide.gap.textContent = '-';
        }
        uiSide.gesture.textContent = s.actionText;
      } else {
        uiSide.pose.textContent = '-';
        uiSide.disp.textContent = '-';
        uiSide.dist.textContent = '-';
        uiSide.dist.className = 'data-value';
        uiSide.gap.textContent = '-';
        uiSide.gesture.textContent = '-';
      }
    };
    updateSide('Left', ui.left);
    updateSide('Right', ui.right);
  }

  /* ── Fingertip → body pushback (semi-implicit Euler, radius units) ── */
  function updatePushback(dt){
    const system = ctx.getSystem();
    const fi = ctx.getFocusIndex();
    const body = (fi >= 0 && fi < system.bodies.length) ? system.bodies[fi] : null;

    // Focus change: zero out the previously-pushed body and reset velocity
    if(pushLastBodyIdx !== fi){
      if(pushLastBodyIdx >= 0 && pushLastBodyIdx < system.bodies.length){
        const prev = system.bodies[pushLastBodyIdx];
        if(prev && prev.pushGroup) prev.pushGroup.position.set(0,0,0);
      }
      pushVel.set(0,0,0);
      pushLastBodyIdx = fi;
    }

    if(!body || !body.pushGroup) return;

    // Snap during camera transition (avoid mid-fly weirdness)
    if(ctx.isTransitioning()){
      body.pushGroup.position.set(0,0,0);
      pushVel.set(0,0,0);
      return;
    }

    const dtc = Math.min(dt, PUSH_DT_CAP);
    if(dtc <= 0) return;

    const r = body.bodyRadius;
    const x = body.pushGroup.position; // offset in radius units (parent scale = r)

    // Current visual center (includes current pushGroup offset)
    const centerWP = new THREE.Vector3();
    body.pushGroup.getWorldPosition(centerWP);

    // Sum finger repulsion forces (no rotation between local & world, so direction is shared)
    const force = new THREE.Vector3();
    const tipWP = new THREE.Vector3();
    const deltaW = new THREE.Vector3();
    for(const label of ['Left','Right']){
      if(!state[label].isDetected) continue;
      for(let k = 0; k < 5; k++){
        meshes[label].joints[FINGER_TIPS[k]].getWorldPosition(tipWP);
        deltaW.subVectors(centerWP, tipWP);
        const d = deltaW.length();
        if(d >= r || d < 1e-6) continue;
        const p_r = 1 - d / r;            // penetration in radius units (0..1)
        // deltaW/d = unit dir; add (kp * p_r) * dir
        force.addScaledVector(deltaW, (PUSH_KP * p_r) / d);
      }
    }

    // Spring back + damping (in radius units, m=1)
    force.addScaledVector(x, -PUSH_K);
    force.addScaledVector(pushVel, -PUSH_C);

    // Integrate
    pushVel.addScaledVector(force, dtc);
    x.addScaledVector(pushVel, dtc);

    // Clamp offset magnitude
    const mag = x.length();
    if(mag > PUSH_MAX_R){
      x.multiplyScalar(PUSH_MAX_R / mag);
      // Kill outward velocity so it doesn't keep pressing against the clamp
      const outward = x.clone().normalize();
      const vOut = pushVel.dot(outward);
      if(vOut > 0) pushVel.addScaledVector(outward, -vOut);
    }
  }

  /* ── Impact detection: finger enters focused body while it's at rest → note ── */
  const REST_EPSILON = 0.12; // radius units — looser gate for more responsive re-triggering
  const HIT_COOLDOWN_MS = 80; // per-finger minimum gap (allows chord plays on different fingers)
  function detectImpactHits(){
    const system = ctx.getSystem();
    const fi = ctx.getFocusIndex();
    if(fi < 0 || fi >= system.bodies.length){
      hitWasInside.fill(false);
      for(const p of hitPrevTip) p.valid = false;
      return;
    }
    if(ctx.isTransitioning()) return;

    const body = system.bodies[fi];
    if(!body || !body.pushGroup) return;

    const restMag = body.pushGroup.position.length();
    const bodyAtRest = restMag < REST_EPSILON;

    const restWP = new THREE.Vector3();
    body.group.getWorldPosition(restWP);
    const r = body.bodyRadius;

    const tipWP = new THREE.Vector3();
    const delta = new THREE.Vector3();
    const frameDelta = new THREE.Vector3();
    const nowMs = performance.now();

    for(let slotIdx = 0; slotIdx < 10; slotIdx++){
      const label = slotIdx < 5 ? 'Left' : 'Right';
      const fingerIdx = slotIdx % 5;
      if(!state[label].isDetected){
        hitWasInside[slotIdx] = false;
        hitPrevTip[slotIdx].valid = false;
        continue;
      }

      meshes[label].joints[FINGER_TIPS[fingerIdx]].getWorldPosition(tipWP);
      const dist = tipWP.distanceTo(restWP);
      const isInside = dist < r;

      const cooledDown = (nowMs - hitLastTime[slotIdx]) >= HIT_COOLDOWN_MS;
      if(isInside && !hitWasInside[slotIdx] && bodyAtRest && cooledDown){
        delta.subVectors(tipWP, restWP);
        const safeDist = Math.max(dist, 1e-6);
        const theta = Math.acos(THREE.MathUtils.clamp(delta.y / safeDist, -1, 1));
        const phi   = Math.atan2(delta.z, delta.x);

        let intensity = 0.7;
        if(hitPrevTip[slotIdx].valid){
          frameDelta.subVectors(tipWP, hitPrevTip[slotIdx].pos);
          intensity = Math.min(1, frameDelta.length() * 3);
        }

        audio.triggerBodyHit(body.params.archetype, theta, phi, intensity);
        hitLastTime[slotIdx] = nowMs;
      }

      hitWasInside[slotIdx] = isInside;
      hitPrevTip[slotIdx].valid = true;
      hitPrevTip[slotIdx].pos.copy(tipWP);
    }
  }

  /* ── Render-rate tick (called from main loop with dt) ── */
  function tick(dt = 0){
    // Lerp hand spatial params toward target
    const system = ctx.getSystem();
    const fi = ctx.getFocusIndex();
    const body = (fi >= 0 && fi < system.bodies.length) ? system.bodies[fi] : null;
    const target = computeHandSpace(body);
    handDyn.handZ  += (target.handZ  - handDyn.handZ)  * LERP_SPEED;
    handDyn.scale  += (target.scale  - handDyn.scale)  * LERP_SPEED;

    // Visibility
    const now = performance.now();
    ['Left','Right'].forEach(label => {
      meshes[label].group.visible = (now - state[label].lastTime) < 300;
    });

    // Impact detection FIRST — reads last-frame pushGroup state to judge "at rest"
    detectImpactHits();

    // Pushback physics — pushGroup offset is read by the line code below
    updatePushback(dt);

    // Both-fist glow ramp (drives bloom via emissiveIntensity)
    const bothFist = state.Left.pose === 'Fist' && state.Right.pose === 'Fist'
      && state.Left.isDetected && state.Right.isDetected
      && meshes.Left.group.visible && meshes.Right.group.visible;
    const glowTarget = bothFist ? 1 : 0;
    calibGlow += (glowTarget - calibGlow) * Math.min(dt * 3.0, 1);
    const g = calibGlow * calibGlow * (3 - 2 * calibGlow); // smoothstep
    matLJ.emissiveIntensity = matRJ.emissiveIntensity = BASE_JOINT_EMI + g * (PEAK_JOINT_EMI - BASE_JOINT_EMI);
    matLB.emissiveIntensity = matRB.emissiveIntensity = BASE_BONE_EMI  + g * (PEAK_BONE_EMI  - BASE_BONE_EMI);

    // Fingertip → body-center lines + commit-tick run at render rate for smoothness
    updateFingerLines();
    tickCommit(dt);
  }

  /* ── Start MediaPipe ── */
  const videoEl = document.querySelector('.input_video');

  async function startCamera(){
    // Pre-check camera availability
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop()); // release immediately
    } catch(err) {
      console.warn('Camera not available:', err.message);
      ui.calibStatus.textContent = 'No camera';
      ui.calibStatus.style.color = '#EF5350';
      return;
    }

    const hands = new window.Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });
    hands.onResults(onResults);

    const cam = new window.Camera(videoEl, {
      onFrame: async () => { await hands.send({ image: videoEl }); },
      width: 640,
      height: 480,
    });
    cam.start();
  }
  startCamera();

  return { tick };
}
