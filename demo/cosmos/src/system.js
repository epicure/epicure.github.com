import * as THREE from 'three';
import { kelvinToRGB } from './params.js';
import { generateRandomParams } from './randomize.js';
import { Body } from './body.js';

const PLANET_ARCHETYPES = [0, 1, 2, 3, 4, 6];

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

    // Planets
    for(let i = 0; i < planetCount; i++){
      const arch = PLANET_ARCHETYPES[Math.floor(Math.random() * PLANET_ARCHETYPES.length)];
      const params = generateRandomParams(arch);
      const body = new Body(params, baker.createRTs());
      body.orbitRadius = 5 + i * 3.5 + (Math.random() - 0.5) * 1.5;
      body.orbitAngle = Math.random() * Math.PI * 2;
      body.updatePosition();
      this.bodies.push(body);
      this.group.add(body.group);
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

  update(dt, t){
    if(this.bodies.length === 0) return;
    const star = this.bodies[0];
    const starPos = star.group.position;
    const sc = kelvinToRGB(star.params.starTemp);
    const sunColor = new THREE.Vector3(sc[0], sc[1], sc[2]);

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
