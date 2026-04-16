import * as THREE from 'three';
import { kelvinToRGB } from './params.js';
import { injectCommon, getShader } from './shaders.js';
import { hex2rgb } from './palette.js';

export class PlanetBaker {
  constructor(renderer, resolution = 512){
    this.renderer = renderer;
    this.resolution = resolution;

    this.scene = new THREE.Scene();
    const geo = new THREE.PlaneGeometry(2, 2);

    this.elevMat = new THREE.ShaderMaterial({
      vertexShader: getShader('bake-vs'),
      fragmentShader: injectCommon(getShader('bake-elev-fs')),
      uniforms: {
        uFace:{value:0}, uSeaLevel:{value:0}, uPlateFreq:{value:2.5},
        uWarp:{value:0.8}, uMountains:{value:1.0}, uCraters:{value:0.15},
        uCraterL:{value:0.5}, uCraterM:{value:0.35}, uCraterS:{value:0.2},
        uArchetype:{value:0}, uRockyMode:{value:0},
        uSeed:{value:42}, uLavaFreq:{value:3.0}, uCraterScale:{value:1.0},
      },
    });
    this.normalMat = new THREE.ShaderMaterial({
      vertexShader: getShader('bake-vs'),
      fragmentShader: getShader('bake-normal-fs'),
      uniforms: {
        uFace:{value:0}, uElevMap:{value:null},
        uAmp:{value:0.035}, uStrength:{value:8.0}, uTexelStep:{value:4.0*(2.0/resolution)},
      },
    });
    this.albedoMat = new THREE.ShaderMaterial({
      vertexShader: getShader('bake-vs'),
      fragmentShader: injectCommon(getShader('bake-albedo-fs')),
      uniforms: {
        uFace:{value:0}, uElevMap:{value:null},
        uSeaLevel:{value:0}, uHue:{value:0},
        uArchetype:{value:0}, uRockyMode:{value:0},
        uCraterL:{value:0.5}, uCraterM:{value:0.35}, uCraterS:{value:0.2},
        uWarp:{value:0.8}, uCrackFreq:{value:10.0}, uCrackIntensity:{value:0.85},
        uLunarLightness:{value:0.5}, uLunarSaturation:{value:1.0},
        uPalette:{value: Array(8).fill(null).map(()=>new THREE.Vector3())},
        uSeed:{value:42},
        uBands:{value:8}, uBandShear:{value:0.05},
        uStormDensity:{value:0.15}, uStormSize:{value:1.0},
        uTime:{value:0}, uDynamics:{value:0.5},
        uStarColor:{value:new THREE.Vector3(1,0.9,0.7)},
        uGranulation:{value:0.5}, uSunspotDensity:{value:0.3}, uGranuleEdge:{value:1.0},
      },
    });
    this.emissiveMat = new THREE.ShaderMaterial({
      vertexShader: getShader('bake-vs'),
      fragmentShader: injectCommon(getShader('bake-emissive-fs')),
      uniforms: {
        uFace:{value:0}, uElevMap:{value:null},
        uHue:{value:0}, uArchetype:{value:0},
        uLavaLevel:{value:0.0}, uLavaGlow:{value:2.0}, uLavaFreq:{value:3.0},
        uPalette:{value: Array(8).fill(null).map(()=>new THREE.Vector3())},
        uSeed:{value:42},
      },
    });

    this.quad = new THREE.Mesh(geo, this.elevMat);
    this.scene.add(this.quad);
    this.camera = new THREE.Camera();
  }

  createRTs(){
    const res = this.resolution;
    const opts = { magFilter: THREE.LinearFilter, minFilter: THREE.LinearFilter, generateMipmaps: false };
    return {
      elevRT:     new THREE.WebGLCubeRenderTarget(res, { ...opts, type: THREE.FloatType,        format: THREE.RGBAFormat }),
      normalRT:   new THREE.WebGLCubeRenderTarget(res, { ...opts, type: THREE.UnsignedByteType, format: THREE.RGBAFormat }),
      albedoRT:   new THREE.WebGLCubeRenderTarget(res, { ...opts, type: THREE.UnsignedByteType, format: THREE.RGBAFormat }),
      emissiveRT: new THREE.WebGLCubeRenderTarget(res, { ...opts, type: THREE.UnsignedByteType, format: THREE.RGBAFormat }),
    };
  }

  _renderTo(rt, mat){
    const prev = this.renderer.getRenderTarget();
    this.quad.material = mat;
    for(let f = 0; f < 6; f++){
      mat.uniforms.uFace.value = f;
      this.renderer.setRenderTarget(rt, f);
      this.renderer.render(this.scene, this.camera);
    }
    this.renderer.setRenderTarget(prev);
  }

  bakeBody(body){
    const p = body.params;
    const rts = body.rts;
    const palVecs = p.palette.map(h => { const c = hex2rgb(h); return new THREE.Vector3(c[0],c[1],c[2]); });
    while(palVecs.length < 8) palVecs.push(new THREE.Vector3());

    // Elevation
    const e = this.elevMat.uniforms;
    e.uSeaLevel.value=p.seaLevel; e.uPlateFreq.value=p.plateFreq;
    e.uWarp.value=p.warp; e.uMountains.value=p.mountains;
    e.uCraters.value=p.craters; e.uCraterL.value=p.craterL;
    e.uCraterM.value=p.craterM; e.uCraterS.value=p.craterS;
    e.uArchetype.value=p.archetype; e.uRockyMode.value=p.rockyMode;
    e.uSeed.value=p.seed; e.uLavaFreq.value=p.lavaFreq; e.uCraterScale.value=p.craterScale;
    this._renderTo(rts.elevRT, this.elevMat);

    // Normal — point uElevMap to this body's elevation
    const n = this.normalMat.uniforms;
    n.uElevMap.value = rts.elevRT.texture;
    n.uAmp.value = (p.archetype === 1) ? 0 : p.amp;
    n.uStrength.value = p.normalStrength;
    this._renderTo(rts.normalRT, this.normalMat);

    // Albedo
    const a = this.albedoMat.uniforms;
    a.uElevMap.value = rts.elevRT.texture;
    a.uPalette.value = palVecs;
    a.uSeed.value=p.seed;
    a.uSeaLevel.value=p.seaLevel; a.uHue.value=p.hue/360;
    a.uArchetype.value=p.archetype; a.uRockyMode.value=p.rockyMode;
    a.uCraterL.value=p.craterL; a.uCraterM.value=p.craterM; a.uCraterS.value=p.craterS;
    a.uWarp.value=p.warp;
    a.uCrackFreq.value=p.crackFreq; a.uCrackIntensity.value=p.crackIntensity;
    a.uLunarLightness.value=p.lunarLightness; a.uLunarSaturation.value=p.lunarSaturation;
    a.uBands.value=p.bands; a.uBandShear.value=p.bandShear;
    a.uStormDensity.value=p.stormDensity; a.uStormSize.value=p.stormSize;
    a.uTime.value=0; a.uDynamics.value=p.dynamics;
    const starC = kelvinToRGB(p.starTemp);
    a.uStarColor.value.set(starC[0],starC[1],starC[2]);
    a.uGranulation.value=p.granulation; a.uSunspotDensity.value=p.sunspotDensity;
    a.uGranuleEdge.value=p.granuleEdge;
    this._renderTo(rts.albedoRT, this.albedoMat);

    // Emissive
    const em = this.emissiveMat.uniforms;
    em.uElevMap.value = rts.elevRT.texture;
    em.uPalette.value = palVecs;
    em.uSeed.value=p.seed;
    em.uHue.value=p.hue/360; em.uArchetype.value=p.archetype;
    em.uLavaLevel.value=p.lavaLevel; em.uLavaGlow.value=p.lavaGlow;
    em.uLavaFreq.value=p.lavaFreq;
    this._renderTo(rts.emissiveRT, this.emissiveMat);
  }
}
