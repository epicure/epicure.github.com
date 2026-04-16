import * as THREE from 'three';
import { createPlanetMesh, syncPlanetUniforms } from './planet.js';
import { createAtmoLayers, addAtmoToGroups, removeAtmoFromGroups, syncAtmoUniforms, disposeAtmoLayers } from './atmosphere.js';

const BODY_RADII = {
  5: [1.8, 1.8],    // Star
  1: [0.7, 1.2],    // Gas Giant
  0: [0.3, 0.5],    // Rocky
  2: [0.3, 0.5],    // Ice
  3: [0.35, 0.55],  // Ocean
  4: [0.25, 0.45],  // Lava
  6: [0.08, 0.15],  // Asteroid
};

function worldDirToLocal(dir, tiltRad, spinRad){
  // Undo tilt (Rz by -tiltRad)
  const ct = Math.cos(tiltRad), st = Math.sin(tiltRad);
  const x1 = dir.x * ct + dir.y * st;
  const y1 = -dir.x * st + dir.y * ct;
  const z1 = dir.z;
  // Undo spin (Ry by -spinRad)
  const cs = Math.cos(spinRad), ss = Math.sin(spinRad);
  return new THREE.Vector3(x1*cs - z1*ss, y1, x1*ss + z1*cs);
}

export class Body {
  constructor(params, rts){
    this.params = params;
    this.rts = rts;
    this.planet = null;
    this.atmoLayers = null;

    // Scene graph: group → tiltGroup → spinGroup (planet+atmo) + atmoGroup (rings)
    this.group = new THREE.Group();
    this.tiltGroup = new THREE.Group();
    this.spinGroup = new THREE.Group();
    this.atmoGroup = new THREE.Group();
    this.tiltGroup.add(this.spinGroup);
    this.tiltGroup.add(this.atmoGroup);
    this.group.add(this.tiltGroup);

    this.orbitRadius = 0;
    this.orbitAngle = Math.random() * Math.PI * 2;
    this.spinAngle = 0;

    const [minR, maxR] = BODY_RADII[params.archetype] || [0.3, 0.5];
    this.bodyRadius = minR + Math.random() * (maxR - minR);
    this.group.scale.setScalar(this.bodyRadius);
  }

  get textures(){
    return {
      elev: this.rts.elevRT.texture,
      normal: this.rts.normalRT.texture,
      albedo: this.rts.albedoRT.texture,
      emissive: this.rts.emissiveRT.texture,
    };
  }

  bake(baker){
    baker.bakeBody(this);
  }

  buildMesh(){
    if(this.planet) this.spinGroup.remove(this.planet);
    this.planet = createPlanetMesh(this.textures, this.params);
    this.spinGroup.add(this.planet);
  }

  buildAtmo(){
    if(this.atmoLayers) removeAtmoFromGroups(this.atmoLayers, this.spinGroup, this.atmoGroup);
    if(this.atmoLayers) disposeAtmoLayers(this.atmoLayers);
    this.atmoLayers = createAtmoLayers(this.params);
    addAtmoToGroups(this.atmoLayers, this.params, this.spinGroup, this.atmoGroup);
  }

  buildAll(){
    this.buildMesh();
    this.buildAtmo();
  }

  updatePosition(){
    this.group.position.set(
      Math.cos(this.orbitAngle) * this.orbitRadius,
      0,
      Math.sin(this.orbitAngle) * this.orbitRadius
    );
  }

  update(dt, t, sunDir, sunColor){
    const p = this.params;
    const tiltRad = p.axialTilt * Math.PI / 180;

    this.tiltGroup.rotation.z = tiltRad;
    if(p.rotateOn) this.spinAngle += p.rotSpeed * p.rotDir * dt;
    this.spinGroup.rotation.y = this.spinAngle;

    // Transform sunDir to local spaces
    const localSunDir = worldDirToLocal(sunDir, tiltRad, this.spinAngle);
    const tiltLocalSunDir = worldDirToLocal(sunDir, tiltRad, 0);

    if(this.planet){
      this.planet.material.uniforms.uTime.value = t;
      syncPlanetUniforms(this.planet, p, localSunDir, sunColor);
    }
    if(this.atmoLayers){
      syncAtmoUniforms(this.atmoLayers, p, localSunDir, tiltLocalSunDir, sunColor, t);
    }
  }

  dispose(){
    if(this.planet){
      this.spinGroup.remove(this.planet);
      this.planet.geometry.dispose();
      this.planet.material.dispose();
    }
    if(this.atmoLayers){
      removeAtmoFromGroups(this.atmoLayers, this.spinGroup, this.atmoGroup);
      disposeAtmoLayers(this.atmoLayers);
    }
    for(const rt of Object.values(this.rts)) rt.dispose();
  }
}
