import { P } from './params.js';
import { getPaletteKey, getDefaultPalette } from './palette.js';

export const PRESETS = {
  'Earth-like':    { archetype:0, normalStrength:3, hue:0,    amp:0.025, seaLevel:-0.05, plateFreq:1.6, warp:1.4, mountains:0.15, craters:0.0,  polarCaps:0.3, axialTilt:23.5, rotSpeed:0.2, rotDir:1, hazeOn:true,  haze:0.25, hazeColor:'#b39980', cloudsOn:true,  cloudCov:0.5,  cloudDens:0.9,  scatterOn:true, scatter:1.0, scatterColor:'#6699ff', rayleigh:1.0, exoOn:true, exo:0.3, exoColor:'#4d80e6', sunTemp:5800 },
  'Mars-like':     { archetype:0, normalStrength:5, hue:-30,  amp:0.05,  seaLevel:-0.3, plateFreq:1.8, warp:0.6, mountains:1.4, craters:0.0,  polarCaps:0.5, axialTilt:25.2, rotSpeed:0.2, rotDir:1, hazeOn:true,  haze:0.5,  hazeColor:'#c49468', cloudsOn:false, cloudCov:0.1,  cloudDens:0.3,  scatterOn:true, scatter:0.3, scatterColor:'#c49975', rayleigh:0.2, exoOn:true, exo:0.1, exoColor:'#a08060', sunTemp:5200 },
  'Moon-like':     { archetype:0, rockyMode:1, normalStrength:14, hue:0,    amp:0.045, craterL:0.55, craterM:0.35, craterS:0.2, polarCaps:0.0, axialTilt:6.7,  rotSpeed:0.015,rotDir:1, hazeOn:false, haze:0.0,  cloudsOn:false, cloudCov:0.0,  cloudDens:0.0,  scatterOn:false, scatter:0.0, rayleigh:0.0, exoOn:false, exo:0.0, sunTemp:5800 },
  'Mercury-like':  { archetype:0, rockyMode:1, normalStrength:14, lunarLightness:0.42, lunarSaturation:1.2, hue:-10,  amp:0.04,  craterL:0.7,  craterM:0.4,  craterS:0.15,polarCaps:0.0, axialTilt:0.03, rotSpeed:0.04, rotDir:1, hazeOn:false, haze:0.0,  cloudsOn:false, cloudCov:0.0,  cloudDens:0.0,  scatterOn:false, scatter:0.0, rayleigh:0.0, exoOn:false, exo:0.0, sunTemp:5800 },
  'Venus-like':    { archetype:0, normalStrength:3, cloudHue:0.12, cloudSat:0.55, hue:20,   amp:0.02,  seaLevel:0.0,  plateFreq:2.0, warp:0.7, mountains:0.8, craters:0.0,  polarCaps:0.0, axialTilt:177.4,rotSpeed:0.02, rotDir:-1,hazeOn:true,  haze:0.9,  hazeColor:'#d4a050', cloudsOn:true,  cloudCov:0.95, cloudDens:1.3,  scatterOn:true, scatter:1.5, scatterColor:'#ccaa55', rayleigh:0.6, exoOn:true, exo:0.4, exoColor:'#b8993d', sunTemp:4800 },
  'Alien Rocky':   { archetype:0, normalStrength:5, hue:120,  amp:0.06,  seaLevel:-0.1, plateFreq:3.5, warp:1.4, mountains:1.6, craters:0.0,  polarCaps:0.2, axialTilt:35,   rotSpeed:0.3,  rotDir:1, hazeOn:true,  haze:0.3,  hazeColor:'#80b399', cloudsOn:true,  cloudCov:0.4,  cloudDens:0.8,  scatterOn:true, scatter:1.2, scatterColor:'#66ccaa', rayleigh:1.0, exoOn:true, exo:0.4, exoColor:'#55aa88', sunTemp:4500 },
  'Hot Super-Earth':{archetype:0, normalStrength:5, cloudHue:0.05, cloudSat:0.25, hue:-10,  amp:0.05,  seaLevel:-0.4, plateFreq:4.0, warp:1.2, mountains:1.8, craters:0.0,  polarCaps:0.0, axialTilt:5,    rotSpeed:0.5,  rotDir:1, hazeOn:true,  haze:0.6,  hazeColor:'#cc7755', cloudsOn:true,  cloudCov:0.3,  cloudDens:0.7,  scatterOn:true, scatter:0.9, scatterColor:'#cc8855', rayleigh:0.3, exoOn:true, exo:0.3, exoColor:'#aa6644', sunTemp:3500 },
  'Jupiter-like':  { archetype:1, stormDensity:0.3, stormSize:1.2, hue:0,    bands:10,  bandShear:0.08, axialTilt:3.1,  rotSpeed:0.5, rotDir:1, hazeOn:false, cloudsOn:false, cloudCov:0.0, scatterOn:true, scatter:0.6, scatterColor:'#9988aa', rayleigh:0.5, exoOn:true, exo:0.5, exoColor:'#8877aa', sunTemp:5800, ringsOn:false },
  'Saturn-like':   { archetype:1, stormDensity:0.1, stormSize:0.8, hue:40,   bands:14,  bandShear:0.04, axialTilt:26.7, rotSpeed:0.45,rotDir:1, hazeOn:false, cloudsOn:false, cloudCov:0.0, scatterOn:true, scatter:0.4, scatterColor:'#ccbb88', rayleigh:0.4, exoOn:true, exo:0.4, exoColor:'#bbaa77', sunTemp:5800, ringsOn:true, ringInner:1.35, ringOuter:2.6, ringDensity:1.0, ringHue:0.12, ringTilt:0, ringSeed:11 },
  'Uranus-like':   { archetype:1, stormDensity:0.05, stormSize:0.6, hue:170,  bands:4,   bandShear:0.03, axialTilt:97.8, rotSpeed:0.35,rotDir:-1,hazeOn:false, cloudsOn:false, cloudCov:0.0, scatterOn:true, scatter:1.0, scatterColor:'#66bbdd', rayleigh:1.3, exoOn:true, exo:0.5, exoColor:'#55aacc', sunTemp:5800, ringsOn:true, ringInner:1.55, ringOuter:2.1, ringDensity:0.55, ringHue:0.6, ringTilt:0, ringSeed:23 },
  'Neptune-like':  { archetype:1, stormDensity:0.25, stormSize:1.4, hue:200,  bands:6,   bandShear:0.12, axialTilt:28.3, rotSpeed:0.4, rotDir:1, hazeOn:false, cloudsOn:false, cloudCov:0.0, scatterOn:true, scatter:1.2, scatterColor:'#4488cc', rayleigh:1.4, exoOn:true, exo:0.6, exoColor:'#3377bb', sunTemp:5800, ringsOn:false },
  'Europa-like':   { archetype:2, normalStrength:4, crackFreq:14, crackIntensity:0.9, hue:0,    amp:0.025, warp:0.8, craters:0.0,  polarCaps:0.0, axialTilt:0.1,  rotSpeed:0.12, rotDir:1, hazeOn:false, cloudsOn:false, scatterOn:false, exoOn:true, exo:0.15, exoColor:'#aabbcc', sunTemp:5800 },
  'Enceladus-like':{ archetype:2, normalStrength:3, crackFreq:7, crackIntensity:0.7, hue:-20,  amp:0.02,  warp:0.6, craters:0.0,  polarCaps:0.3, axialTilt:0,    rotSpeed:0.2,  rotDir:1, hazeOn:false, cloudsOn:false, scatterOn:false, exoOn:true, exo:0.2, exoColor:'#bbccdd', sunTemp:5800 },
  'Callisto-like': { archetype:2, normalStrength:12, crackFreq:22, crackIntensity:0.4, hue:10,   amp:0.035, warp:0.5, craters:0.0,  polarCaps:0.0, axialTilt:0,    rotSpeed:0.04, rotDir:1, hazeOn:false, cloudsOn:false, scatterOn:false, exoOn:true, exo:0.1, exoColor:'#99aabb', sunTemp:5800 },
  'Ocean World':   { archetype:3, normalStrength:4, cloudHue:0.58, cloudSat:0.12, hue:0,    amp:0.015, polarCaps:0.25, axialTilt:23.5, rotSpeed:0.2, rotDir:1, hazeOn:true, haze:0.3, cloudsOn:true, cloudCov:0.6, cloudDens:1.0, scatterOn:true, scatter:1.2, scatterColor:'#5599dd', rayleigh:1.1, exoOn:true, exo:0.35, exoColor:'#4488cc', sunTemp:5800 },
  'Lava World':    { archetype:4, normalStrength:8, hue:0,   amp:0.04, plateFreq:2.5, warp:1.0, mountains:1.2, craters:0.0, polarCaps:0.0, axialTilt:5, rotSpeed:0.08, rotDir:1, lavaLevel:0.0, lavaGlow:2.5, lavaFreq:3.0, hazeOn:true, haze:0.4, hazeColor:'#cc6644', cloudsOn:false, scatterOn:true, scatter:0.5, scatterColor:'#aa5533', rayleigh:0.2, exoOn:true, exo:0.2, exoColor:'#884422', sunTemp:4000 },
  'Molten Hell':   { archetype:4, normalStrength:6, hue:10,  amp:0.03, plateFreq:3.5, warp:1.4, mountains:0.8, craters:0.0, polarCaps:0.0, axialTilt:2, rotSpeed:0.05, rotDir:1, lavaLevel:0.15, lavaGlow:3.5, lavaFreq:2.5, hazeOn:true, haze:0.7, hazeColor:'#dd5533', cloudsOn:false, scatterOn:true, scatter:0.8, scatterColor:'#bb4422', rayleigh:0.15, exoOn:true, exo:0.35, exoColor:'#993311', sunTemp:3200 },
  'Cooling Crust': { archetype:4, normalStrength:10, hue:-5, amp:0.05, plateFreq:2.0, warp:0.8, mountains:1.5, craters:0.0, polarCaps:0.0, axialTilt:12, rotSpeed:0.12, rotDir:1, lavaLevel:-0.15, lavaGlow:1.5, lavaFreq:4.0, hazeOn:true, haze:0.3, hazeColor:'#aa7766', cloudsOn:false, scatterOn:false, exoOn:true, exo:0.15, exoColor:'#886655', sunTemp:5800 },
  'Vesta-like':    { archetype:6, normalStrength:12, hue:0, amp:0.035, elongation:0.12, bumpiness:0.3, craterScale:1.8, craterL:0.6, craterM:0, craterS:0, lunarLightness:0.5, lunarSaturation:1.0, axialTilt:29, rotSpeed:0.3, rotDir:1, hazeOn:false, cloudsOn:false, scatterOn:false, exoOn:false, ringsOn:false, sunTemp:5800 },
  'Eros-like':     { archetype:6, normalStrength:14, hue:-10, amp:0.04, elongation:0.7, bumpiness:0.6, craterScale:2.2, craterL:0.4, craterM:0, craterS:0, lunarLightness:0.45, lunarSaturation:0.8, axialTilt:11, rotSpeed:0.25, rotDir:1, hazeOn:false, cloudsOn:false, scatterOn:false, exoOn:false, ringsOn:false, sunTemp:5800 },
  'Itokawa-like':  { archetype:6, normalStrength:10, hue:5, amp:0.03, elongation:0.6, bumpiness:0.8, craterScale:2.5, craterL:0.2, craterM:0, craterS:0, lunarLightness:0.55, lunarSaturation:0.7, axialTilt:178, rotSpeed:0.5, rotDir:1, hazeOn:false, cloudsOn:false, scatterOn:false, exoOn:false, ringsOn:false, sunTemp:5800 },
  'Sun-like':      { archetype:5, starTemp:5778, granulation:0.5, sunspotDensity:0.3, limbDarkening:0.6, granuleEdge:1.0, starBrightness:2.0, bloomStrength:1.5, bloomRadius:0.6, bloomThreshold:0.9, axialTilt:7.25, rotSpeed:0.1, rotDir:1, hazeOn:false, cloudsOn:false, scatterOn:false, exoOn:false, ringsOn:false },
  'Red Dwarf':     { archetype:5, starTemp:3200, granulation:0.7, sunspotDensity:0.5, limbDarkening:0.8, granuleEdge:0.85, starBrightness:1.8, bloomStrength:1.2, bloomRadius:0.7, bloomThreshold:0.85, axialTilt:0, rotSpeed:0.06, rotDir:1, hazeOn:false, cloudsOn:false, scatterOn:false, exoOn:false, ringsOn:false },
  'Blue Giant':    { archetype:5, starTemp:25000, granulation:0.3, sunspotDensity:0.1, limbDarkening:0.4, granuleEdge:1.4, starBrightness:2.5, bloomStrength:2.0, bloomRadius:0.5, bloomThreshold:0.9, axialTilt:0, rotSpeed:0.2, rotDir:1, hazeOn:false, cloudsOn:false, scatterOn:false, exoOn:false, ringsOn:false },
  'Orange Giant':  { archetype:5, starTemp:4500, granulation:0.8, sunspotDensity:0.2, limbDarkening:0.7, granuleEdge:0.9, starBrightness:1.8, bloomStrength:1.4, bloomRadius:0.8, bloomThreshold:0.85, axialTilt:5, rotSpeed:0.04, rotDir:1, hazeOn:false, cloudsOn:false, scatterOn:false, exoOn:false, ringsOn:false },
};

export function applyPreset(name, { rebuildUI, buildPlanet, buildAtmosphere, updateFull }){
  const p = PRESETS[name]; if(!p) return;
  if(!('ringsOn' in p)) P.ringsOn = false;
  if(!('rockyMode' in p)) P.rockyMode = 0;
  if(!('cloudHue' in p)) P.cloudHue = 0;
  if(!('cloudSat' in p)) P.cloudSat = 0;
  if(!('cloudFlowSpeed' in p)) P.cloudFlowSpeed = 1.0;
  if(!('normalStrength' in p)) P.normalStrength = 8.0;
  if(!('crackFreq' in p)) P.crackFreq = 10.0;
  if(!('crackIntensity' in p)) P.crackIntensity = 0.0;
  if(!('lunarLightness' in p)) P.lunarLightness = 0.5;
  if(!('lunarSaturation' in p)) P.lunarSaturation = 1.0;
  if(!('stormDensity' in p)) P.stormDensity = 0.15;
  if(!('stormSize' in p)) P.stormSize = 1.0;
  if(!('dynamics' in p)) P.dynamics = 0.5;
  if(!('oceanSpeed' in p)) P.oceanSpeed = 1.0;
  if(!('oceanFoam' in p)) P.oceanFoam = 0.7;
  if(!('oceanSheen' in p)) P.oceanSheen = 0.15;
  if(!('oceanDepthTint' in p)) P.oceanDepthTint = 0.4;
  if(!('oceanSSS' in p)) P.oceanSSS = 1.0;
  if(!('lavaLevel' in p)) P.lavaLevel = 0.0;
  if(!('lavaGlow' in p)) P.lavaGlow = 2.0;
  if(!('lavaFreq' in p)) P.lavaFreq = 3.0;
  if(!('hazeColor' in p)) P.hazeColor = '#b39980';
  if(!('scatterColor' in p)) P.scatterColor = '#6699ff';
  if(!('exoColor' in p)) P.exoColor = '#4d80e6';
  if(!('craters' in p)) P.craters = 0;
  if(!('starTemp' in p)) P.starTemp = 5778;
  if(!('granulation' in p)) P.granulation = 0.5;
  if(!('sunspotDensity' in p)) P.sunspotDensity = 0.3;
  if(!('limbDarkening' in p)) P.limbDarkening = 0.6;
  if(!('granuleEdge' in p)) P.granuleEdge = 1.0;
  if(!('starBrightness' in p)) P.starBrightness = 2.0;
  if(!('bloomStrength' in p)) P.bloomStrength = 1.5;
  if(!('bloomRadius' in p)) P.bloomRadius = 0.6;
  if(!('bloomThreshold' in p)) P.bloomThreshold = 0.9;
  if(!('elongation' in p)) P.elongation = 0.0;
  if(!('bumpiness' in p)) P.bumpiness = 0.0;
  if(!('craterScale' in p)) P.craterScale = 1.0;
  if(!('craterL' in p)) P.craterL = 0.5;
  if(!('craterM' in p)) P.craterM = 0.35;
  if(!('craterS' in p)) P.craterS = 0.2;
  for(const k in p) P[k] = p[k];
  // Reset palette to defaults for this archetype unless preset specifies one
  if(!('palette' in p)) {
    const rm = ('rockyMode' in p) ? p.rockyMode : P.rockyMode;
    P.palette = getDefaultPalette(getPaletteKey(P.archetype, rm));
  }
  rebuildUI();
  buildPlanet();
  buildAtmosphere();
  updateFull();
}
