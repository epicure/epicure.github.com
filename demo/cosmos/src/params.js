import * as THREE from 'three';

export const P = {
  seed: 42, archetype: 0, hue: 0, detail: 6,
  palette: ['#0e284e','#1c5e6e','#b8904e','#3c6c3c','#0e3c12','#4c4840','#f0f0f4','#000000'],
  amp: 0.035, seaLevel: 0.0, plateFreq: 0.5, warp: 0.8, mountains: 1.0, craters: 0,
  craterL: 0.5, craterM: 0.35, craterS: 0.2,
  polarCaps: 0.0, rockyMode: 0, normalStrength: 4.0,
  crackFreq: 10.0, crackIntensity: 0.0, iceSheen: 0.35,
  lunarLightness: 0.5, lunarSaturation: 1.0,
  oceanSpeed: 1.0, oceanFoam: 0.7, oceanSheen: 0.15, oceanDepthTint: 0.4, oceanSSS: 1.0,
  lavaLevel: 0.0, lavaGlow: 2.0, lavaFreq: 3.0,
  bands: 8, bandShear: 0.05, dynamics: 0.5, stormDensity: 0.15, stormSize: 1.0,
  hazeOn:true, haze:0.25, hazeColor:'#b39980', cloudsOn:true, cloudCov:0.45, cloudWind:1.0, cloudFlowSpeed:1.0, cloudDens:0.85, cloudHue:0.0, cloudSat:0.0,
  scatterOn:true, scatter:1.0, scatterColor:'#6699ff', rayleigh:1.0,
  exoOn:true, exo:0.3, exoColor:'#4d80e6',
  ambient: 0.03,
  sunAz: 45, sunEl: 15, sunTemp:5800,
  ringsOn: false, ringInner: 1.4, ringOuter: 2.5, ringDensity: 0.9, ringHue: 0.1, ringTilt: 0, ringSeed: 7,
  rotateOn: true, rotSpeed: 0.15, rotDir: 1, axialTilt: 23.5,
  elongation: 0.3, bumpiness: 0.5, craterScale: 1.0,
  starTemp: 5778, granulation: 0.5, sunspotDensity: 0.3, limbDarkening: 0.6, granuleEdge: 1.0,
  starBrightness: 2.0, bloomStrength: 1.5, bloomRadius: 0.6, bloomThreshold: 0.9
};

export function kelvinToRGB(k){
  k = k/100;
  let r,g,b;
  r = k<=66 ? 255 : 329.698727446 * Math.pow(k-60, -0.1332047592);
  g = k<=66 ? 99.4708025861*Math.log(k)-161.1195681661 : 288.1221695283*Math.pow(k-60,-0.0755148492);
  b = k>=66 ? 255 : (k<=19? 0 : 138.5177312231*Math.log(k-10)-305.0447927307);
  return [r,g,b].map(x=>Math.max(0,Math.min(255,x))/255);
}

export function sunVec(){
  const az = P.sunAz*Math.PI/180, el = P.sunEl*Math.PI/180;
  return new THREE.Vector3(Math.cos(el)*Math.cos(az), Math.sin(el), Math.cos(el)*Math.sin(az));
}

export function cloneParams(src){
  const p = {};
  for(const k of Object.keys(src)){
    p[k] = Array.isArray(src[k]) ? [...src[k]] : src[k];
  }
  return p;
}

export const DEFAULT_PARAMS = cloneParams(P);
