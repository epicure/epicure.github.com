precision highp float;
varying vec2 vUv;
uniform int uFace;
uniform float uSeaLevel;
uniform float uPlateFreq;
uniform float uWarp;
uniform float uMountains;
uniform float uCraters;
uniform float uCraterL;
uniform float uCraterM;
uniform float uCraterS;
uniform int uArchetype;
uniform int uRockyMode;
uniform float uSeed;
uniform float uLavaFreq;
uniform float uCraterScale;
#include_common

vec3 cubeDir(int face, vec2 uv){
  float s = uv.x * 2.0 - 1.0;
  float t = uv.y * 2.0 - 1.0;
  vec3 d;
  if(face == 0) d = vec3( 1.0, -t, -s);
  else if(face == 1) d = vec3(-1.0, -t,  s);
  else if(face == 2) d = vec3( s,  1.0,  t);
  else if(face == 3) d = vec3( s, -1.0, -t);
  else if(face == 4) d = vec3( s, -t,  1.0);
  else               d = vec3(-s, -t, -1.0);
  return normalize(d);
}

float rockyElevation(vec3 p){
  vec3 q = vec3(fbm(p+vec3(0.0,0.0,0.0),3), fbm(p+vec3(5.2,1.3,2.1),3), fbm(p+vec3(2.1,4.7,9.2),3));
  vec3 wp1 = p + uWarp * q;
  vec3 r = vec3(fbm(wp1+vec3(1.7,9.2,4.3),3), fbm(wp1+vec3(8.3,2.8,6.1),3), fbm(wp1+vec3(4.1,7.6,3.5),3));
  vec3 wp = wp1 + uWarp * 0.6 * r;
  vec3 vor = voronoi3D(wp * uPlateFreq);
  float plateBias = fbm(wp * 0.8, 3) * 0.35;
  float base = hybridMF(wp * 1.5, 6, 1.0, 0.7) * 0.6;
  float rawBoundary = 1.0 - smoothstep(0.0, 0.18, vor.y - vor.x);
  float fuzz = fbm(wp * 6.0, 3) * 0.5 + 0.5;
  float boundary = rawBoundary * fuzz;
  float mtn = ridgedMF(wp * 2.5, 5) * boundary * uMountains;
  float raw = plateBias * 0.25 + base * 0.55 + mtn * 0.5;
  // Add mountain detail to high-elevation areas (matches albedo rock/snow bands)
  float highMask = smoothstep(0.25, 0.45, raw);
  float mtnDetail = ridgedMF(wp * 5.0, 4) * highMask * uMountains * 0.15;
  return raw + mtnDetail;
}
float iceElevation(vec3 p){
  vec3 q = vec3(fbm(p+vec3(0.0,0.0,0.0),3), fbm(p+vec3(5.2,1.3,2.1),3), fbm(p+vec3(2.1,4.7,9.2),3));
  vec3 wp1 = p + uWarp * q;
  vec3 r = vec3(fbm(wp1+vec3(1.7,9.2,4.3),3), fbm(wp1+vec3(8.3,2.8,6.1),3), fbm(wp1+vec3(4.1,7.6,3.5),3));
  vec3 wp = wp1 + uWarp * 0.6 * r;
  float chaos = hybridMF(wp * 1.2, 5, 1.0, 0.5) * 0.4;
  float ridges = ridgedMF(wp * 3.0, 5) * 0.3;
  // Voronoi seam as concave groove (negative = inward)
  vec3 vor = voronoi3D(wp * uPlateFreq);
  float seamDepth = -smoothstep(0.15, 0.0, vor.y - vor.x) * 0.15;
  return chaos + ridges + seamDepth;
}
// Returns vec3(totalElevation, craterOnlyHeight, 0)
vec3 crateredRockyElevation(vec3 p){
  float base = fbm(p * 1.5, 3) * 0.15;
  float mareField = fbm(p * 1.2 + vec3(11.3, 5.7, 8.9), 4);
  float mareMask = smoothstep(0.55, 0.40, mareField);
  float mare = -mareMask * 0.20;
  vec3 cr = lunarCraters3(p, uCraterL, uCraterM, uCraterS, uCraterScale);
  return vec3(base + mare + cr.x, cr.x, 0.0);
}
float oceanElevation(vec3 p){ return fbm(p*3.0, 3) * 0.15; }

// Lava elevation — rocky base + voronoi seam depression (concave channels)
float lavaElevation(vec3 p){
  float base = rockyElevation(p);
  // Domain-warped voronoi for tectonic seam depression
  vec3 q = vec3(fbm(p+vec3(0.0,0.0,0.0),3), fbm(p+vec3(5.2,1.3,2.1),3), fbm(p+vec3(2.1,4.7,9.2),3));
  vec3 wp = p + 0.6 * q;
  vec3 vor = voronoi3D(wp * uLavaFreq);
  float seamDepth = -smoothstep(0.12, 0.0, vor.y - vor.x) * 0.12;
  // Secondary finer seams
  vec3 vor2 = voronoi3D(wp * uLavaFreq * 2.8 + vec3(7.3));
  float seamDepth2 = -smoothstep(0.06, 0.0, vor2.y - vor2.x) * 0.05;
  return base + seamDepth + seamDepth2;
}

void main(){
  vec3 sN = cubeDir(uFace, vUv);
  vec3 sP = sN + seedOffset(uSeed);  // seed-offset position for noise
  float elev = 0.0;
  float craterBump = 0.0;
  if(uArchetype == 0) {
    if(uRockyMode == 1) {
      vec3 cre = crateredRockyElevation(sP);
      elev = cre.x;
      // Store crater-only height for 4-tap normal detail in planet.frag
      craterBump = cre.y;
    } else {
      elev = rockyElevation(sP);
    }
  }
  else if(uArchetype == 2) elev = iceElevation(sP);
  else if(uArchetype == 3) elev = oceanElevation(sP);
  else if(uArchetype == 4) elev = lavaElevation(sP);
  else if(uArchetype == 6) {
    vec3 cre = crateredRockyElevation(sP);
    elev = cre.x;
    craterBump = cre.y;
  }

  // Crater overlay — stored in G channel as bump height only (not added to elevation)
  // Planet.frag will use 4-tap sampling on G to compute crater normals
  if(uArchetype != 1 && uArchetype != 6 && uRockyMode != 1 && uCraters > 0.0) {
    vec3 cr = craters3(sP, uCraters);
    craterBump = cr.x;
    // Mask craters under sea level for tectonic surfaces
    if(uArchetype == 0) {
      float seaMask = smoothstep(uSeaLevel - 0.02, uSeaLevel + 0.02, elev);
      craterBump *= seaMask;
    }
  }

  // R = terrain elevation, G = crater bump height (for 4-tap normal)
  gl_FragColor = vec4(elev, craterBump, 0.0, 1.0);
}
