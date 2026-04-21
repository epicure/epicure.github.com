import * as THREE from 'three';
import { kelvinToRGB } from './params.js';
import { generateRandomParams } from './randomize.js';
import { Body } from './body.js';

const PLANET_ARCHETYPES = [0, 1, 2, 3, 4, 6];
const ORBIT_BASE_SPEED = 0.5;
const ORBIT_BASE_OPACITY = 0.4;
const ORBIT_FADE_TAU = 0.25; // seconds — exp lerp time constant

// Moon system constants
const MOON_RT_RESOLUTION = 256;
const MOON_MAX_PLANETS   = 3;   // at most 3 planets in a system have moons
const MOON_MAX_TOTAL     = 5;   // at most 5 moons per system
const MOON_PLANET_PROB   = 0.45;
const MOON_ELIGIBLE_PARENT_ARCHETYPES = new Set([0, 1, 2, 3, 4]); // exclude Star(5), Asteroid(6)

// Moon archetype: always Rocky/Asteroid. Ice allowed except when parent is Lava.
function pickMoonArchetype(parentArch){
  const pool = [[0, 0.55], [6, 0.30]]; // rocky, asteroid
  if(parentArch !== 4) pool.push([2, 0.15]); // ice (not when parent is lava)
  const total = pool.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for(const [a, w] of pool){
    r -= w;
    if(r <= 0) return a;
  }
  return 0;
}

export class StarSystem {
  constructor(){
    this.bodies = [];
    this.moons  = []; // flat list; each also attached to its parent's .moons
    this.group = new THREE.Group();
    this.orbitGroup = new THREE.Group();
    this.group.add(this.orbitGroup);
    this.bakeQueue = [];
    this.showOrbits = true;
    this.orbitOpacity = ORBIT_BASE_OPACITY; // current lerped opacity
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

    // Assign moons after rings (so ring bounds affect moon orbit safety)
    this._assignMoons(baker);

    this.bakeQueue = [...this.bodies, ...this.moons];
    this.buildOrbitLines();
  }

  _assignMoons(baker){
    const parents = this.bodies.filter(b => MOON_ELIGIBLE_PARENT_ARCHETYPES.has(b.params.archetype));
    // Shuffle for fair selection
    for(let i = parents.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [parents[i], parents[j]] = [parents[j], parents[i]];
    }
    let moonPlanetCount = 0;
    let totalMoons = 0;
    for(const parent of parents){
      if(moonPlanetCount >= MOON_MAX_PLANETS) break;
      if(totalMoons >= MOON_MAX_TOTAL) break;
      if(Math.random() > MOON_PLANET_PROB) continue;

      // Collision-safe cap: moon orbit cannot reach neighboring bodies' orbits.
      // 50% of smallest gap (to star or nearest neighbor). Moon always orbits WITHIN this cap.
      let minGap = Infinity;
      for(const other of this.bodies){
        if(other === parent) continue;
        const d = Math.abs(parent.orbitRadius - other.orbitRadius);
        if(d > 0 && d < minGap) minGap = d;
      }
      const safeCap = minGap * 0.5;

      // Initial cursor: parent surface + margin, or outer ring edge if present
      let cursor = parent.bodyRadius * (parent.params.ringsOn ? Math.max(1.0, parent.params.ringOuter) : 1.0) + 0.4;
      // If cursor already exceeds cap (tight spacing or huge rings), skip this planet
      if(cursor + 0.3 > safeCap) continue;

      // Weighted moon count: 50% 1, 35% 2, 15% 3
      const roll = Math.random();
      let count = roll < 0.5 ? 1 : roll < 0.85 ? 2 : 3;
      count = Math.min(count, MOON_MAX_TOTAL - totalMoons);

      parent.moons = [];
      for(let k = 0; k < count; k++){
        if(cursor + 0.3 > safeCap) break; // no more room for another moon
        const moon = this._createMoon(parent, baker, cursor, safeCap);
        if(!moon) break;
        parent.moons.push(moon);
        this.moons.push(moon);
        this.group.add(moon.group);
        // Space next moon beyond this one's orbit
        cursor = moon.moonOrbit.radius + moon.bodyRadius + 0.6;
      }
      if(parent.moons.length === 0) continue; // nothing assigned; don't count

      moonPlanetCount++;
      totalMoons += parent.moons.length;
    }
  }

  _createMoon(parent, baker, minOrbitRadius, safeCap){
    const arch = pickMoonArchetype(parent.params.archetype);
    // Rocky moons prefer cratered mode (lunar-like)
    const rockyMode = (arch === 0) ? 1 : undefined;
    const params = generateRandomParams(arch, rockyMode);
    // Moons: no atmosphere / rings / clouds / polar caps
    params.hazeOn = false;
    params.cloudsOn = false;
    params.scatterOn = false;
    params.exoOn = false;
    params.ringsOn = false;
    params.polarCaps = 0;

    const rts = baker.createRTs(MOON_RT_RESOLUTION);
    const moon = new Body(params, rts);

    // Moon size: fraction of parent radius
    const ratio = (arch === 6)
      ? (0.08 + Math.random() * 0.10) // asteroid moon: small, bumpy
      : (0.16 + Math.random() * 0.18); // rocky / ice moon: moderate
    moon.bodyRadius = parent.bodyRadius * ratio;
    moon.group.scale.setScalar(moon.bodyRadius);

    // Orbit radius: above cursor, capped by collision-safe limit
    const wantSpread = 0.5 + Math.random() * 2.0 + moon.bodyRadius;
    const roomLeft = Math.max(0, safeCap - minOrbitRadius);
    const orbitRadius = minOrbitRadius + Math.min(wantSpread, roomLeft - 0.1);
    if(orbitRadius <= minOrbitRadius){
      // Couldn't fit; caller will abort
      moon.dispose();
      return null;
    }

    // Orbit direction: 85% prograde (match parent's rotation direction), 15% retrograde
    const parentRotDir = parent.params.rotDir || 1;
    const orbitDir = (Math.random() < 0.85) ? parentRotDir : -parentRotDir;

    // Orbit speed — noticeably faster than planet's around star
    const orbitSpeed = 1.4 / Math.pow(orbitRadius, 0.75);

    // Inclination: small, up to ±15°
    const inclination = (Math.random() - 0.5) * (Math.PI / 6);

    moon.orbitParent = parent;
    moon.moonOrbit = {
      radius: orbitRadius,
      angle: Math.random() * Math.PI * 2,
      speed: orbitSpeed,
      dir: orbitDir,
      inclination,
    };

    // Tidal-lock approximation: spin rate/direction match orbit
    moon.params.rotSpeed = orbitSpeed;
    moon.params.rotDir = orbitDir;
    moon.params.axialTilt = (Math.random() - 0.5) * 15; // small axial tilt

    // Place at initial orbit position
    this._updateMoonPosition(moon);
    return moon;
  }

  _updateMoonPosition(moon){
    const p = moon.orbitParent;
    const mo = moon.moonOrbit;
    const cosA = Math.cos(mo.angle), sinA = Math.sin(mo.angle);
    const x = cosA * mo.radius;
    const z = sinA * mo.radius;
    const cosI = Math.cos(mo.inclination), sinI = Math.sin(mo.inclination);
    // Rotate base orbit (xz plane) around X-axis by inclination
    const y = -z * sinI;
    const zR = z * cosI;
    const pp = p.group.position;
    moon.group.position.set(pp.x + x, pp.y + y, pp.z + zR);
  }

  processBakeQueue(baker){
    if(this.bakeQueue.length === 0) return false;
    const body = this.bakeQueue.shift();
    body.bake(baker);
    body.buildAll();
    return true;
  }

  get bakeProgress(){
    const total = this.bodies.length + this.moons.length;
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
      const mat = new THREE.LineBasicMaterial({ color: 0x334455, transparent: true, opacity: this.orbitOpacity });
      this.orbitGroup.add(new THREE.LineLoop(geo, mat));
    }
    this.orbitGroup.visible = this.showOrbits && this.orbitOpacity > 0.001;
  }

  toggleOrbits(){
    this.showOrbits = !this.showOrbits;
    // visibility is driven by the per-frame fade in update()
  }

  _updateOrbitFade(dt, isOverview){
    // Target: base opacity in overview, 0 in focus (and 0 if toggled off)
    const target = (isOverview && this.showOrbits) ? ORBIT_BASE_OPACITY : 0;
    const k = 1 - Math.exp(-dt / ORBIT_FADE_TAU);
    this.orbitOpacity += (target - this.orbitOpacity) * k;

    const visible = this.orbitOpacity > 0.001;
    if(this.orbitGroup.visible !== visible) this.orbitGroup.visible = visible;
    if(visible){
      for(const child of this.orbitGroup.children){
        if(child.material) child.material.opacity = this.orbitOpacity;
      }
    }
  }

  update(dt, t, isOverview, focusIndex = -1){
    if(this.bodies.length === 0) return;
    const star = this.bodies[0];

    this._updateOrbitFade(dt, isOverview);

    // Orbital motion — only in Overview mode, Kepler T ∝ r^1.5
    if(isOverview){
      for(let i = 1; i < this.bodies.length; i++){
        const body = this.bodies[i];
        const r = body.orbitRadius;
        const angularSpeed = ORBIT_BASE_SPEED / Math.pow(r, 1.5);
        body.orbitAngle += angularSpeed * (body.orbitDir || 1) * dt;
        body.updatePosition();
      }
      // Advance moon orbit angles + reposition relative to moving parent
      for(const moon of this.moons){
        if(!moon.moonOrbit) continue;
        moon.moonOrbit.angle += moon.moonOrbit.speed * moon.moonOrbit.dir * dt;
        this._updateMoonPosition(moon);
      }
    } else {
      // Focus mode: parents don't move, but moons still orbit visually
      for(const moon of this.moons){
        if(!moon.moonOrbit) continue;
        moon.moonOrbit.angle += moon.moonOrbit.speed * moon.moonOrbit.dir * dt;
        this._updateMoonPosition(moon);
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

    // Update moons' shading (sun dir from their world position)
    const focusedBody = (focusIndex >= 0 && focusIndex < this.bodies.length) ? this.bodies[focusIndex] : null;
    for(const moon of this.moons){
      // Hide the focused body's moons in focus mode; show all in overview.
      moon.group.visible = isOverview || moon.orbitParent !== focusedBody;
      if(!moon.group.visible) continue;
      const sunDir = new THREE.Vector3().subVectors(starPos, moon.group.position).normalize();
      moon.update(dt, t, sunDir, sunColor);
    }
  }

  dispose(){
    for(const body of this.bodies){
      this.group.remove(body.group);
      body.dispose();
    }
    for(const moon of this.moons){
      this.group.remove(moon.group);
      moon.dispose();
    }
    this.bodies = [];
    this.moons  = [];
    this.bakeQueue = [];
    while(this.orbitGroup.children.length){
      const c = this.orbitGroup.children[0];
      c.geometry.dispose(); c.material.dispose();
      this.orbitGroup.remove(c);
    }
  }
}
