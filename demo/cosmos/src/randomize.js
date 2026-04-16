import { P, cloneParams, DEFAULT_PARAMS } from './params.js';
import { getPaletteKey, getDefaultPalette } from './palette.js';

const hsl2hex = (h,s,l) => {
  const rgb = [0,4,2].map(off => {
    const k = (h*6+off)%6;
    return Math.max(0,Math.min(1,Math.abs(k-3)-1));
  }).map(v => Math.max(0,Math.min(1,l+s*(v-0.5)*(1-Math.abs(2*l-1)))));
  return '#'+rgb.map(c=>Math.round(c*255).toString(16).padStart(2,'0')).join('');
};

/** Pure function — returns a complete random params object without side effects. */
export function generateRandomParams(archetype, rockyMode){
  const p = cloneParams(DEFAULT_PARAMS);
  p.archetype = archetype;
  p.seed = Math.floor(Math.random() * 99999);

  if(archetype === 0){
    p.rockyMode = rockyMode !== undefined ? rockyMode : (Math.random() > 0.5 ? 1 : 0);
  } else {
    p.rockyMode = 0;
  }

  // Hue
  if(archetype === 1){
    p.hue = Math.floor(Math.random()*120 - 60);
  } else {
    p.hue = Math.floor(Math.random()*360 - 180);
  }

  // Per-archetype terrain
  if(archetype === 0){
    p.amp = 0.015 + Math.random()*0.06;
    p.normalStrength = 2 + Math.random()*10;
    if(p.rockyMode === 0){
      p.seaLevel = (Math.random()-0.5) * 0.6;
      p.plateFreq = 1.0 + Math.random()*4.5;
      p.warp = Math.random()*1.8;
      p.mountains = Math.random()*1.8;
    } else {
      p.craterScale = 0.5 + Math.random()*2.5;
      p.craterL = 0.2 + Math.random()*0.8;
      p.craterM = Math.random()*0.6;
      p.craterS = Math.random()*0.4;
      p.lunarLightness = 0.2 + Math.random()*0.6;
      p.lunarSaturation = 0.3 + Math.random()*1.4;
    }
  } else if(archetype === 1){
    p.bands = 4 + Math.floor(Math.random()*7);
    p.bandShear = Math.random()*0.3;
    p.dynamics = 0.2 + Math.random()*0.8;
    p.stormDensity = Math.random()*0.5;
    p.stormSize = 0.4 + Math.random()*2.0;
  } else if(archetype === 2){
    p.amp = 0.01 + Math.random()*0.05;
    p.plateFreq = 0.5 + Math.random()*5;
    p.warp = Math.random()*1.5;
    p.crackFreq = 3 + Math.random()*25;
    p.crackIntensity = Math.random();
    p.iceSheen = Math.random()*0.8;
    p.normalStrength = 2 + Math.random()*12;
  } else if(archetype === 3){
    p.amp = 0.005 + Math.random()*0.035;
    p.oceanSpeed = 0.3 + Math.random()*3;
    p.oceanFoam = Math.random()*1.5;
    p.oceanSheen = Math.random()*0.8;
    p.oceanDepthTint = Math.random()*0.8;
    p.oceanSSS = 0.3 + Math.random()*1.5;
    p.normalStrength = 2 + Math.random()*10;
  } else if(archetype === 4){
    p.amp = 0.02 + Math.random()*0.06;
    p.plateFreq = 1.0 + Math.random()*4.5;
    p.warp = 0.3 + Math.random()*1.5;
    p.mountains = Math.random()*1.8;
    p.lavaLevel = (Math.random()-0.5) * 0.5;
    p.lavaGlow = 1.0 + Math.random()*3.0;
    p.lavaFreq = 1.5 + Math.random()*5;
    p.normalStrength = 3 + Math.random()*12;
  } else if(archetype === 5){
    p.starTemp = 2400 + Math.random() * 37600;
    p.granulation = 0.2 + Math.random() * 0.8;
    p.sunspotDensity = Math.random() * 0.6;
    p.limbDarkening = 0.2 + Math.random() * 1.0;
    p.granuleEdge = 0.8 + Math.random() * 1.2;
    p.starBrightness = 1.5 + Math.random() * 1.5;
  } else if(archetype === 6){
    p.elongation = Math.random() * 0.8;
    p.bumpiness = 0.2 + Math.random() * 0.8;
    p.amp = 0.02 + Math.random() * 0.04;
    p.craterScale = 0.5 + Math.random() * 2.5;
    p.craterL = 0.2 + Math.random() * 1.0;
    p.craterM = 0;
    p.craterS = 0;
    p.lunarLightness = 0.3 + Math.random() * 0.4;
    p.lunarSaturation = 0.5 + Math.random() * 1.0;
    p.normalStrength = 6 + Math.random() * 12;
  }

  // Surface modifiers
  if(archetype !== 1 && archetype !== 5 && archetype !== 6){
    p.craters = Math.random() < 0.4 ? Math.random() : 0;
    p.polarCaps = Math.random() < 0.5 ? Math.random()*0.5 : 0;
  }

  // Atmosphere toggles
  if(archetype === 5 || archetype === 6){
    p.hazeOn = false; p.cloudsOn = false; p.scatterOn = false; p.exoOn = false;
  } else if(archetype === 1){
    p.hazeOn = false; p.cloudsOn = false;
    p.scatterOn = Math.random() > 0.3;
    p.exoOn = Math.random() > 0.4;
    p.scatter = Math.random()*0.8;
    p.exo = Math.random()*0.4;
  } else {
    p.hazeOn = Math.random() > 0.3;
    p.scatterOn = Math.random() > 0.2;
    p.exoOn = Math.random() > 0.3;
    p.cloudsOn = Math.random() > 0.3;
  }

  // Atmosphere values
  p.cloudCov = p.cloudsOn ? (0.1 + Math.random()*0.8) : 0;
  p.cloudDens = 0.3 + Math.random()*1.0;
  p.cloudWind = Math.random()*3;
  p.cloudFlowSpeed = 0.5 + Math.random()*1.5;
  p.cloudHue = 0;
  p.cloudSat = Math.random() < 0.2 ? Math.random()*0.4 : 0;
  p.haze = Math.random()*0.6;
  if(archetype !== 1) p.scatter = Math.random()*1.6;
  p.rayleigh = Math.random()*1.5;
  p.exo = Math.random()*0.5;

  // Atmosphere colors
  const atmoHue = Math.random();
  const atmoSpread = 0.05 + Math.random()*0.1;
  p.hazeColor = hsl2hex(atmoHue, 0.2+Math.random()*0.4, 0.4+Math.random()*0.3);
  p.scatterColor = hsl2hex((atmoHue+atmoSpread)%1, 0.3+Math.random()*0.5, 0.4+Math.random()*0.3);
  p.exoColor = hsl2hex((atmoHue+atmoSpread*2)%1, 0.3+Math.random()*0.4, 0.3+Math.random()*0.3);

  // Rings — Gas Giant only
  if(archetype === 1){
    p.ringsOn = Math.random() > 0.5;
  } else {
    p.ringsOn = false;
  }
  if(p.ringsOn){
    p.ringInner = 1.2 + Math.random()*0.8;
    p.ringOuter = p.ringInner + 0.3 + Math.random()*1.5;
    p.ringDensity = 0.3 + Math.random()*1.2;
    p.ringHue = Math.random();
    p.ringTilt = (Math.random()-0.5)*60;
    p.ringSeed = Math.floor(Math.random()*100);
  }

  // Rotation
  p.axialTilt = (Math.random()-0.5)*60;
  p.rotSpeed = 0.05 + Math.random()*0.5;
  p.rotDir = Math.random() > 0.1 ? 1 : -1;

  // Palette
  p.palette = getDefaultPalette(getPaletteKey(p.archetype, p.rockyMode));

  return p;
}

/** Mutating wrapper — randomizes focused body via P proxy. */
export function randomizeParams({ rebuildUI, buildPlanet, buildAtmosphere, updateFull }){
  const saved = { detail: P.detail, bloomStrength: P.bloomStrength, bloomRadius: P.bloomRadius, bloomThreshold: P.bloomThreshold };
  const newP = generateRandomParams(P.archetype, P.rockyMode);
  for(const k of Object.keys(newP)) P[k] = Array.isArray(newP[k]) ? [...newP[k]] : newP[k];
  Object.assign(P, saved);
  rebuildUI();
  buildPlanet();
  buildAtmosphere();
  updateFull();
}
