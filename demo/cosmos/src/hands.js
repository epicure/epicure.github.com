import * as THREE from 'three';

/* ── Parameters ── */
const HP = {
  smoothingAlpha: 0.2,
  calibTime: 2.0,
  deadzone: 1.5,
  zSensitivity: 80,
  worldScale: 15,
  spaceScale: 15,
  jointSize: 0.2,
  boneThickness: 0.2,
};

const DEFAULT_HAND_Z = -18;
const DEFAULT_SCALE = 1.0;

/* ── Dynamic hand-to-planet spatial mapping ── */
// Computes target hand parameters based on focused body
function computeHandSpace(body){
  if(!body) return { handZ: DEFAULT_HAND_Z, scale: DEFAULT_SCALE };
  const r = body.bodyRadius;
  const camDist = r * 4 + 1;            // matches main.js startTransition
  const surfaceDist = camDist - r;       // camera → planet surface
  const handZ = -surfaceDist;
  const scale = surfaceDist / Math.abs(DEFAULT_HAND_Z);
  return { handZ, scale };
}

// Interpolated values used each frame
const handDyn = { handZ: DEFAULT_HAND_Z, scale: DEFAULT_SCALE };
const LERP_SPEED = 0.06;

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

function analyzeHand(pts){
  let ext = 0;
  const check = (m, p, d, t) => {
    if(getAngle(pts[m],pts[p],pts[d]) > 2.6 && getAngle(pts[p],pts[d],pts[t]) > 2.6) ext++;
  };
  check(5,6,7,8); check(9,10,11,12); check(13,14,15,16); check(17,18,19,20);
  if(ext === 0) return 'Fist';
  if(ext >= 4) return 'Open';
  return `${ext}`;
}

function getPalmCenter(pts){
  const c = new THREE.Vector3();
  [0,5,9,13,17].forEach(i => { if(pts[i]) c.add(pts[i]); });
  return c.multiplyScalar(0.2);
}

/* ── Hand Mesh Builder ── */
const matLJ = new THREE.MeshStandardMaterial({ color: 0x42A5F5, roughness: 0.2, emissive: 0x42A5F5, emissiveIntensity: 0.35 });
const matLB = new THREE.MeshStandardMaterial({ color: 0x1E88E5, roughness: 0.9, emissive: 0x1E88E5, emissiveIntensity: 0.25 });
const matRJ = new THREE.MeshStandardMaterial({ color: 0xEF5350, roughness: 0.2, emissive: 0xEF5350, emissiveIntensity: 0.35 });
const matRB = new THREE.MeshStandardMaterial({ color: 0xE53935, roughness: 0.9, emissive: 0xE53935, emissiveIntensity: 0.25 });
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

  // Display
  section('Display');
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
      gesture: makeRow('Gesture'),
    };
  };

  const lUI = createHandSection('Left Hand', 'dot-l', 'l');
  const rUI = createHandSection('Right Hand', 'dot-r', 'r');

  // Settings
  section('Tracking Settings');
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

  return {
    panel, calibBox, calibStatus, progFill,
    left: lUI, right: rUI,
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

  // Filters
  const filters = {
    Left:  { joints: Array.from({length:21}, () => new EMAFilter()), pos: new EMAFilter() },
    Right: { joints: Array.from({length:21}, () => new EMAFilter()), pos: new EMAFilter() },
  };

  // State
  const state = {
    Left:  { pose: 'None', center: new THREE.Vector3(), isDetected: false, lastTime: 0, actionText: '' },
    Right: { pose: 'None', center: new THREE.Vector3(), isDetected: false, lastTime: 0, actionText: '' },
  };

  let isCalibrated = false;
  let calibTimer = 0;
  const calibBuffer = new CalibrationBuffer(30);
  const calibOrigin = { Left: new THREE.Vector3(), Right: new THREE.Vector3() };
  let lastTime = performance.now();

  // Collision state
  const collision = { leftDist: Infinity, rightDist: Infinity, leftHit: false, rightHit: false };

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

        // Image-plane palm center → base offset
        const pImg = getPalmCenter(imgLms);
        const perim = Math.hypot(imgLms[0].x-imgLms[5].x, imgLms[0].y-imgLms[5].y)
                    + Math.hypot(imgLms[5].x-imgLms[17].x, imgLms[5].y-imgLms[17].y)
                    + Math.hypot(imgLms[17].x-imgLms[0].x, imgLms[17].y-imgLms[0].y);

        const s = handDyn.scale;
        const tX = -(pImg.x - 0.5) * HP.spaceScale * s;
        const tY = -(pImg.y - 0.5) * HP.spaceScale * s;
        const tZ = (0.45 - perim) * HP.zSensitivity * s + handDyn.handZ;
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

    // Calibration
    if(lFist && rFist && state.Left.isDetected && state.Right.isDetected){
      calibTimer += dt;
      calibBuffer.push(state.Left.center, state.Right.center);
      if(calibTimer >= HP.calibTime){
        isCalibrated = true;
        const avg = calibBuffer.getAverage();
        calibOrigin.Left.copy(avg.l);
        calibOrigin.Right.copy(avg.r);
        ui.calibBox.classList.add('active');
      }
    } else {
      calibTimer = 0;
      calibBuffer.clear();
    }

    // Collision detection against focused body
    const system = ctx.getSystem();
    const fi = ctx.getFocusIndex();
    if(fi >= 0 && fi < system.bodies.length){
      const body = system.bodies[fi];
      const targetWP = new THREE.Vector3();
      body.group.getWorldPosition(targetWP);
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

    // Navigation via gesture (open hand swipe)
    // Left hand open + move left/right → prev/next planet
    // (throttled by requiring return to Idle between navigations)
    updateNavigationGesture();

    updateHandUI();
  }

  let navLock = false;
  function updateNavigationGesture(){
    const s = state.Left;
    if(!isCalibrated || !s.isDetected){ navLock = false; return; }
    if(s.pose === 'Open' && !navLock){
      const system = ctx.getSystem();
      const fi = ctx.getFocusIndex();
      if(s.actionText === 'Move L'){
        navLock = true;
        if(fi <= 0) ctx.focusOn(system.bodies.length - 1);
        else ctx.focusOn(fi - 1);
      } else if(s.actionText === 'Move R'){
        navLock = true;
        if(fi >= system.bodies.length - 1) ctx.focusOn(0);
        else ctx.focusOn(fi + 1);
      }
    }
    if(s.actionText === 'Idle') navLock = false;
  }

  /* ── UI update ── */
  function updateHandUI(){
    // Calibration
    if(isCalibrated){
      ui.calibStatus.textContent = 'Calibrated';
      ui.calibStatus.style.color = '#4CAF50';
      ui.progFill.style.width = '100%';
    } else {
      ui.calibStatus.textContent = calibTimer > 0 ? 'Hold...' : 'Waiting...';
      ui.calibStatus.style.color = calibTimer > 0 ? '#FF9800' : '#888';
      ui.progFill.style.width = `${Math.min((calibTimer / HP.calibTime) * 100, 100)}%`;
      ui.calibBox.classList.remove('active');
    }

    // Hand data
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
        } else {
          uiSide.disp.textContent = '-';
          uiSide.dist.textContent = '-';
          uiSide.dist.className = 'data-value';
        }
        uiSide.gesture.textContent = s.actionText;
      } else {
        uiSide.pose.textContent = '-';
        uiSide.disp.textContent = '-';
        uiSide.dist.textContent = '-';
        uiSide.dist.className = 'data-value';
        uiSide.gesture.textContent = '-';
      }
    };
    updateSide('Left', ui.left);
    updateSide('Right', ui.right);
  }

  /* ── Visibility tick (called from main loop) ── */
  function tick(){
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
