import * as THREE from 'three';
import { kelvinToRGB } from './params.js';
import { injectCommon, getShader } from './shaders.js';
import { hex2rgb } from './palette.js';

export function createPlanetMesh(textures, params){
  const geo = new THREE.IcosahedronGeometry(1.0, params.detail || 6);
  const mat = new THREE.ShaderMaterial({
    vertexShader: injectCommon(getShader('planet-vs')),
    fragmentShader: injectCommon(getShader('planet-fs')),
    uniforms: {
      uElevMap:{value: textures.elev},
      uNormalMap:{value: textures.normal},
      uAlbedoMap:{value: textures.albedo},
      uEmissiveMap:{value: textures.emissive},
      uSunDir:{value: new THREE.Vector3(0,1,0)},
      uSunColor:{value: new THREE.Vector3(1,1,1)},
      uAmp:{value: params.archetype===1 ? 0 : params.amp},
      uSeaLevel:{value:params.seaLevel},
      uPlateFreq:{value:params.plateFreq}, uWarp:{value:params.warp},
      uMountains:{value:params.mountains}, uCraters:{value:params.craters},
      uCraterL:{value:params.craterL}, uCraterM:{value:params.craterM}, uCraterS:{value:params.craterS},
      uCraterNormalStr:{value:params.normalStrength * 0.02},
      uPolarCaps:{value:params.polarCaps},
      uAmbient:{value:params.ambient},
      uArchetype:{value:params.archetype}, uRockyMode:{value:params.rockyMode}, uHue:{value:params.hue/360},
      uTime:{value:0}, uBands:{value:params.bands}, uBandShear:{value:params.bandShear},
      uDynamics:{value:params.dynamics},
      uOceanSpeed:{value:params.oceanSpeed}, uOceanFoam:{value:params.oceanFoam},
      uOceanSheen:{value:params.oceanSheen}, uOceanDepthTint:{value:params.oceanDepthTint},
      uOceanSSS:{value:params.oceanSSS},
      uStormDensity:{value:params.stormDensity}, uStormSize:{value:params.stormSize},
      uCrackFreq:{value:params.crackFreq}, uCrackIntensity:{value:params.crackIntensity},
      uIceSheen:{value:params.iceSheen},
      uPalette:{value: params.palette.map(h=>{ const c=hex2rgb(h); return new THREE.Vector3(c[0],c[1],c[2]); })},
      uSeed:{value:params.seed},
      uElongation:{value:params.elongation}, uBumpiness:{value:params.bumpiness},
      uStarColor:{value: new THREE.Vector3(...kelvinToRGB(params.starTemp))},
      uGranulation:{value:params.granulation}, uSunspotDensity:{value:params.sunspotDensity},
      uLimbDarkening:{value:params.limbDarkening}, uGranuleEdge:{value:params.granuleEdge},
      uStarBrightness:{value:params.starBrightness}
    }
  });
  return new THREE.Mesh(geo, mat);
}

export function syncPlanetUniforms(mesh, params, sunDir, sunColor){
  const u = mesh.material.uniforms;
  u.uSunDir.value.copy(sunDir);
  u.uSunColor.value.copy(sunColor);
  u.uAmp.value = params.archetype===1 ? 0 : params.amp;
  u.uSeaLevel.value = params.seaLevel;
  u.uPlateFreq.value = params.plateFreq;
  u.uWarp.value = params.warp;
  u.uMountains.value = params.mountains;
  u.uCraters.value = params.craters;
  u.uCraterL.value = params.craterL;
  u.uCraterM.value = params.craterM;
  u.uCraterS.value = params.craterS;
  u.uCraterNormalStr.value = params.normalStrength * 0.02;
  u.uPolarCaps.value = params.polarCaps;
  u.uAmbient.value = params.ambient;
  u.uArchetype.value = params.archetype;
  u.uRockyMode.value = params.rockyMode;
  u.uHue.value = params.hue/360;
  u.uBands.value = params.bands;
  u.uBandShear.value = params.bandShear;
  u.uDynamics.value = params.dynamics;
  u.uOceanSpeed.value = params.oceanSpeed;
  u.uOceanFoam.value = params.oceanFoam;
  u.uOceanSheen.value = params.oceanSheen;
  u.uOceanDepthTint.value = params.oceanDepthTint;
  u.uOceanSSS.value = params.oceanSSS;
  u.uStormDensity.value = params.stormDensity;
  u.uStormSize.value = params.stormSize;
  u.uCrackFreq.value = params.crackFreq;
  u.uCrackIntensity.value = params.crackIntensity;
  u.uIceSheen.value = params.iceSheen;
  u.uPalette.value = params.palette.map(h=>{ const c=hex2rgb(h); return new THREE.Vector3(c[0],c[1],c[2]); });
  u.uSeed.value = params.seed;
  u.uElongation.value = params.elongation;
  u.uBumpiness.value = params.bumpiness;
  u.uStarColor.value.set(...kelvinToRGB(params.starTemp));
  u.uGranulation.value = params.granulation;
  u.uSunspotDensity.value = params.sunspotDensity;
  u.uLimbDarkening.value = params.limbDarkening;
  u.uGranuleEdge.value = params.granuleEdge;
  u.uStarBrightness.value = params.starBrightness;
}
