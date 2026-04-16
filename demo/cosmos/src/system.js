import * as THREE from 'three';
import { kelvinToRGB } from './params.js';
import { generateRandomParams } from './randomize.js';
import { Body } from './body.js';

const PLANET_ARCHETYPES = [0, 1, 2, 3, 4, 6];
const ORBIT_BASE_SPEED = 0.5;

export class StarSystem {
  constructor(){
    this.bodies = [];
    this.group = new THREE.Group();
    this.orbitGroup = new THREE.Group();
    this.group.add(this.orbitGroup);
    this.bakeQueue = [];
    this.showOrbits = true;
  }

  generate(planetCount, baker){
    this.dispose();

    // Star at center
    const starParams = generateRandomParams(5);
    const star = new Body(starParams, baker.createRTs());
    star.orbitRadius = 0;
    star.updatePosition();
    this.bodies.push(star);
    this.group.add(star.group);

    // Planets — guarantee at least one Earth-like (archetype 0, tectonic mode)
    const earthIndex = Math.floor(Math.random() * planetCount);
    for(let i = 0; i < planetCount; i++){
      let arch, params;
      if(i === earthIndex){
        arch = 0;
        params = generateRandomParams(arch, 0); // rockyMode 0 = tectonic (Earth-like)
      } else {
        arch = PLANET_ARCHETYPES[Math.floor(Math.random() * PLANET_ARCHETYPES.length)];
        params = generateRandomParams(arch);
      }
      const body = new Body(params, baker.createRTs());
      body.orbitRadius = 5 + i * 3.5 + (Math.random() - 0.5) * 1.5;
      body.orbitAngle = Math.random() * Math.PI * 2;
      // Prograde for all; asteroids ~10% retrograde
      body.orbitDir = (arch === 6 && Math.random() < 0.1) ? -1 : 1;
      body.updatePosition();
      this.bodies.push(body);
      this.group.add(body.group);
    }

    // Assign rings: any non-star body can have rings, but at most 2 in the system
    const ringCandidates = this.bodies.filter(b => b.params.archetype !== 5);
    const maxRings = Math.floor(Math.random() * 3); // 0, 1, or 2
    if(maxRings > 0 && ringCandidates.length > 0){
      // Shuffle candidates
      for(let i = ringCandidates.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [ringCandidates[i], ringCandidates[j]] = [ringCandidates[j], ringCandidates[i]];
      }
      for(let i = 0; i < Math.min(maxRings, ringCandidates.length); i++){
        const p = ringCandidates[i].params;
        p.ringsOn = true;
        p.ringInner = 1.2 + Math.random() * 0.8;
        p.ringOuter = p.ringInner + 0.3 + Math.random() * 1.5;
        p.ringDensity = 0.3 + Math.random() * 1.2;
        p.ringHue = Math.random();
        p.ringTilt = (Math.random() - 0.5) * 60;
        p.ringSeed = Math.floor(Math.random() * 100);
      }
    }

    this.bakeQueue = [...this.bodies];
    this.buildOrbitLines();
  }

  processBakeQueue(baker){
    if(this.bakeQueue.length === 0) return false;
    const body = this.bakeQueue.shift();
    body.bake(baker);
    body.buildAll();
    return true;
  }

  get bakeProgress(){
    const total = this.bodies.length;
    const remaining = this.bakeQueue.length;
    return { done: total - remaining, total };
  }

  get baking(){ return this.bakeQueue.length > 0; }

  buildOrbitLines(){
    while(this.orbitGroup.children.length){
      const c = this.orbitGroup.children[0];
      c.geometry.dispose(); c.material.dispose();
      this.orbitGroup.remove(c);
    }
    for(let i = 1; i < this.bodies.length; i++){
      const r = this.bodies[i].orbitRadius;
      const pts = [];
      for(let a = 0; a <= 128; a++){
        const angle = (a / 128) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.4 });
      this.orbitGroup.add(new THREE.LineLoop(geo, mat));
    }
    this.orbitGroup.visible = this.showOrbits;
  }

  toggleOrbits(){
    this.showOrbits = !this.showOrbits;
    this.orbitGroup.visible = this.showOrbits;
  }

  update(dt, t, isOverview){
    if(this.bodies.length === 0) return;
    const star = this.bodies[0];

    // Orbital motion — only in Overview mode, Kepler T ∝ r^1.5
    if(isOverview){
      for(let i = 1; i < this.bodies.length; i++){
        const body = this.bodies[i];
        const r = body.orbitRadius;
        const angularSpeed = ORBIT_BASE_SPEED / Math.pow(r, 1.5);
        body.orbitAngle += angularSpeed * (body.orbitDir || 1) * dt;
        body.updatePosition();
      }
    }

    const starPos = star.group.position;
    const sunColor = new THREE.Vector3(1, 1, 1);

    for(const body of this.bodies){
      let sunDir;
      if(body === star){
        sunDir = new THREE.Vector3(0, 0, 1);
      } else {
        sunDir = new THREE.Vector3().subVectors(starPos, body.group.position).normalize();
      }
      body.update(dt, t, sunDir, sunColor);
    }
  }

  dispose(){
    for(const body of this.bodies){
      this.group.remove(body.group);
      body.dispose();
    }
    this.bodies = [];
    this.bakeQueue = [];
    while(this.orbitGroup.children.length){
      const c = this.orbitGroup.children[0];
      c.geometry.dispose(); c.material.dispose();
      this.orbitGroup.remove(c);
    }
  }
}
