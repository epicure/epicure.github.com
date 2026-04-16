import * as THREE from 'three';
import { kelvinToRGB } from './params.js';
import { injectCommon, getShader } from './shaders.js';
import { hex2rgb } from './palette.js';

function mkAtmo(radius, color, density, power, ray){
  const g = new THREE.SphereGeometry(radius, 64, 48);
  const m = new THREE.ShaderMaterial({
    vertexShader: getShader('atmo-vs'), fragmentShader: getShader('atmo-fs'),
    uniforms:{
      uSunDir:{value: new THREE.Vector3(0,1,0)}, uColor:{value:color},
      uDensity:{value:density}, uPower:{value:power}, uRayleigh:{value:ray}
    },
    transparent:true, blending:THREE.AdditiveBlending, side:THREE.BackSide, depthWrite:false
  });
  return new THREE.Mesh(g, m);
}

export function createAtmoLayers(params){
  const layers = { haze:null, scatter:null, exo:null, clouds:null, rings:null };
  if(params.archetype === 5 || params.archetype === 6) return layers;

  const hc = hex2rgb(params.hazeColor);
  const sc = hex2rgb(params.scatterColor);
  const ec = hex2rgb(params.exoColor);
  layers.haze    = mkAtmo(1.02, new THREE.Vector3(hc[0],hc[1],hc[2]), params.haze, 2.5, 0.7);
  layers.scatter = mkAtmo(1.08, new THREE.Vector3(sc[0],sc[1],sc[2]), params.scatter, 3.5, params.rayleigh);
  layers.exo     = mkAtmo(1.22, new THREE.Vector3(ec[0],ec[1],ec[2]), params.exo, 6.0, 0.8);

  const cg = new THREE.SphereGeometry(1.045, 128, 96);
  const cm = new THREE.ShaderMaterial({
    vertexShader: getShader('cloud-vs'),
    fragmentShader: injectCommon(getShader('cloud-fs')),
    uniforms:{
      uSunDir:{value: new THREE.Vector3(0,1,0)}, uTime:{value:0},
      uCoverage:{value:params.cloudCov}, uWind:{value:params.cloudWind}, uFlowSpeed:{value:params.cloudFlowSpeed},
      uDensity:{value:params.cloudDens}, uHue:{value:params.cloudHue}, uSat:{value:params.cloudSat}
    },
    transparent:true, depthWrite:false
  });
  layers.clouds = new THREE.Mesh(cg, cm);
  layers.clouds.renderOrder = 1;
  layers.scatter.renderOrder = 2;
  layers.exo.renderOrder = 3;
  layers.haze.renderOrder = 0;

  if(params.ringsOn){
    const rg = new THREE.RingGeometry(params.ringInner, params.ringOuter, 256, 4);
    rg.rotateX(-Math.PI / 2);
    const rm = new THREE.ShaderMaterial({
      vertexShader: getShader('ring-vs'), fragmentShader: getShader('ring-fs'),
      uniforms:{
        uSunDir:{value: new THREE.Vector3(0,1,0)},
        uSunColor:{value: new THREE.Vector3(1,1,1)},
        uInner:{value:params.ringInner}, uOuter:{value:params.ringOuter},
        uDensity:{value:params.ringDensity}, uHue:{value:params.ringHue},
        uSeed:{value:params.ringSeed}
      },
      transparent:true, side:THREE.DoubleSide, depthWrite:false
    });
    layers.rings = new THREE.Mesh(rg, rm);
    layers.rings.rotation.z = params.ringTilt * Math.PI / 180;
    layers.rings.renderOrder = 4;
  }

  return layers;
}

export function addAtmoToGroups(layers, params, spinGroup, atmoGroup){
  if(layers.haze && params.hazeOn)    spinGroup.add(layers.haze);
  if(layers.scatter && params.scatterOn) spinGroup.add(layers.scatter);
  if(layers.exo && params.exoOn)      spinGroup.add(layers.exo);
  if(layers.clouds && params.cloudsOn) spinGroup.add(layers.clouds);
  if(layers.rings) atmoGroup.add(layers.rings);
}

export function removeAtmoFromGroups(layers, spinGroup, atmoGroup){
  if(!layers) return;
  for(const key of ['haze','scatter','exo','clouds']){
    if(layers[key]) spinGroup.remove(layers[key]);
  }
  if(layers.rings) atmoGroup.remove(layers.rings);
}

export function syncAtmoUniforms(layers, params, sunDir, ringSunDir, sunColor, t){
  if(!layers) return;
  for(const key of ['haze','scatter','exo']){
    if(layers[key]) layers[key].material.uniforms.uSunDir.value.copy(sunDir);
  }
  if(layers.haze){
    layers.haze.material.uniforms.uDensity.value = params.haze;
    const hc = hex2rgb(params.hazeColor);
    layers.haze.material.uniforms.uColor.value.set(hc[0],hc[1],hc[2]);
  }
  if(layers.scatter){
    layers.scatter.material.uniforms.uDensity.value = params.scatter;
    layers.scatter.material.uniforms.uRayleigh.value = params.rayleigh;
    const sc = hex2rgb(params.scatterColor);
    layers.scatter.material.uniforms.uColor.value.set(sc[0],sc[1],sc[2]);
  }
  if(layers.exo){
    layers.exo.material.uniforms.uDensity.value = params.exo;
    const ec = hex2rgb(params.exoColor);
    layers.exo.material.uniforms.uColor.value.set(ec[0],ec[1],ec[2]);
  }
  if(layers.clouds){
    const cu = layers.clouds.material.uniforms;
    cu.uSunDir.value.copy(sunDir);
    cu.uTime.value = t;
    cu.uCoverage.value = params.cloudCov;
    cu.uWind.value = params.cloudWind;
    cu.uFlowSpeed.value = params.cloudFlowSpeed;
    cu.uDensity.value = params.cloudDens;
    cu.uHue.value = params.cloudHue;
    cu.uSat.value = params.cloudSat;
    layers.clouds.rotation.y = t * 0.01 * params.cloudFlowSpeed;
  }
  if(layers.rings){
    // Transform tiltLocalSunDir into ring geometry space by undoing ringTilt
    const ringTiltRad = params.ringTilt * Math.PI / 180;
    const cr = Math.cos(ringTiltRad), sr = Math.sin(ringTiltRad);
    const rx = ringSunDir.x * cr + ringSunDir.y * sr;
    const ry = -ringSunDir.x * sr + ringSunDir.y * cr;
    layers.rings.material.uniforms.uSunDir.value.set(rx, ry, ringSunDir.z);
    layers.rings.material.uniforms.uSunColor.value.copy(sunColor);
    layers.rings.material.uniforms.uDensity.value = params.ringDensity;
    layers.rings.material.uniforms.uHue.value = params.ringHue;
    layers.rings.rotation.z = ringTiltRad;
  }
}

export function disposeAtmoLayers(layers){
  if(!layers) return;
  for(const m of Object.values(layers)){
    if(m){ m.geometry.dispose(); m.material.dispose(); }
  }
}
