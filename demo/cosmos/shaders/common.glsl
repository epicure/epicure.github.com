// Seed-based coordinate offset: hash the seed into a large 3D displacement
// so the same noise functions produce entirely different terrain.
vec3 seedOffset(float seed){
  return vec3(
    fract(sin(seed * 127.1) * 43758.5453) * 200.0 - 100.0,
    fract(sin(seed * 269.5) * 25173.7137) * 200.0 - 100.0,
    fract(sin(seed * 419.3) * 31571.1013) * 200.0 - 100.0
  );
}

vec3 hash3(vec3 p){
  p = vec3(dot(p,vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float hash1(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7))) * 43758.5453); }
vec4 gnoiseD(vec3 x){
  vec3 p = floor(x); vec3 w = fract(x);
  vec3 u = w*w*w*(w*(w*6.0-15.0)+10.0);
  vec3 du = 30.0*w*w*(w*(w-2.0)+1.0);
  vec3 ga=hash3(p+vec3(0.0,0.0,0.0)), gb=hash3(p+vec3(1.0,0.0,0.0));
  vec3 gc=hash3(p+vec3(0.0,1.0,0.0)), gd=hash3(p+vec3(1.0,1.0,0.0));
  vec3 ge=hash3(p+vec3(0.0,0.0,1.0)), gf=hash3(p+vec3(1.0,0.0,1.0));
  vec3 gg=hash3(p+vec3(0.0,1.0,1.0)), gh=hash3(p+vec3(1.0,1.0,1.0));
  float va=dot(ga,w-vec3(0.0,0.0,0.0)), vb=dot(gb,w-vec3(1.0,0.0,0.0));
  float vc=dot(gc,w-vec3(0.0,1.0,0.0)), vd=dot(gd,w-vec3(1.0,1.0,0.0));
  float ve=dot(ge,w-vec3(0.0,0.0,1.0)), vf=dot(gf,w-vec3(1.0,0.0,1.0));
  float vg=dot(gg,w-vec3(0.0,1.0,1.0)), vh=dot(gh,w-vec3(1.0,1.0,1.0));
  float v = va + u.x*(vb-va) + u.y*(vc-va) + u.z*(ve-va)
          + u.x*u.y*(va-vb-vc+vd) + u.y*u.z*(va-vc-ve+vg) + u.z*u.x*(va-vb-ve+vf)
          + u.x*u.y*u.z*(-va+vb+vc-vd+ve-vf-vg+vh);
  vec3 d = ga + u.x*(gb-ga) + u.y*(gc-ga) + u.z*(ge-ga)
    + u.x*u.y*(ga-gb-gc+gd) + u.y*u.z*(ga-gc-ge+gg) + u.z*u.x*(ga-gb-ge+gf)
    + u.x*u.y*u.z*(-ga+gb+gc-gd+ge-gf-gg+gh)
    + du * vec3(
        vb-va + u.y*(va-vb-vc+vd) + u.z*(va-vb-ve+vf) + u.y*u.z*(-va+vb+vc-vd+ve-vf-vg+vh),
        vc-va + u.z*(va-vc-ve+vg) + u.x*(va-vb-vc+vd) + u.z*u.x*(-va+vb+vc-vd+ve-vf-vg+vh),
        ve-va + u.x*(va-vb-ve+vf) + u.y*(va-vc-ve+vg) + u.x*u.y*(-va+vb+vc-vd+ve-vf-vg+vh));
  return vec4(v, d);
}
float gnoise(vec3 x){ return gnoiseD(x).x; }
vec4 fbmD(vec3 p, int octaves, float H){
  float f=1.0, a=1.0, sum=0.0, amp=0.0; vec3 d=vec3(0.0); float G = exp2(-H);
  for(int i=0;i<8;i++){ if(i>=octaves) break;
    vec4 n = gnoiseD(p*f); sum += a*n.x; d += a*f*n.yzw; amp += a; a *= G; f *= 2.0;
  }
  return vec4(sum/max(amp,0.0001), d/max(amp,0.0001));
}
float fbm(vec3 p, int o){ return fbmD(p,o,1.0).x; }
float sabs(float x, float k){ return sqrt(x*x + k) - sqrt(k); }
float ridgedMF(vec3 p, int octaves){
  float f=1.0, a=1.0, sum=0.0, amp=0.0;
  for(int i=0;i<8;i++){ if(i>=octaves) break;
    float n = 1.0 - sabs(gnoise(p*f), 0.001); n *= n;
    sum += a*n; amp += a; a *= 0.5; f *= 2.0;
  }
  return sum/amp;
}
float hybridMF(vec3 p, int octaves, float H, float offset){
  float f = 1.0; float result = (gnoise(p) + offset); float weight = result;
  float G = exp2(-H); float a = G;
  for(int i=1;i<8;i++){ if(i>=octaves) break;
    if(weight > 1.0) weight = 1.0;
    float signal = (gnoise(p*f*2.0) + offset) * a;
    result += weight * signal; weight *= signal; a *= G; f *= 2.0;
  }
  return result * 0.5 - offset;
}
vec3 voronoi3D(vec3 x){
  vec3 p = floor(x), f = fract(x);
  float F1=8.0, F2=8.0; vec3 id=vec3(0.0);
  for(int k=-1;k<=1;k++) for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec3 b=vec3(float(i),float(j),float(k));
    vec3 h = hash3(p+b)*0.5+0.5;
    vec3 r = b + h - f; float d = dot(r,r);
    if(d<F1){ F2=F1; F1=d; id=p+b; } else if(d<F2){ F2=d; }
  }
  return vec3(sqrt(F1), sqrt(F2), hash1(id));
}
vec3 warp(vec3 p, float str){
  vec3 q = vec3(fbm(p+vec3(0.0,0.0,0.0),3), fbm(p+vec3(5.2,1.3,2.1),3), fbm(p+vec3(2.1,4.7,9.2),3));
  return p + str*q;
}
// Jitter-grid crater overlay — returns vec3(elevation, rim, ray).
// Used for optional crater overlay on tectonic rocky, ice, ocean surfaces.
// Lighter-weight than lunarCraters3 (5 vs 7 octaves).
vec3 craters3(vec3 p, float density){
  float deepest = 0.0;
  float rimMax = 0.0;
  float raySum = 0.0;
  for(int k=0; k<5; k++){
    float scale = 3.0 * pow(2.0, float(k));
    float bDensity = density * (k < 2 ? 0.8 : 1.0);
    if(bDensity <= 0.001) continue;
    vec3 gp = p * scale + float(k) * 23.7;
    vec3 cell = floor(gp);
    vec3 frac = fract(gp);
    float bestD = 999.0;
    float bestR = 0.0;
    float bestSeed = 0.0;
    for(int z=-1; z<=1; z++)
    for(int y=-1; y<=1; y++)
    for(int x=-1; x<=1; x++){
      vec3 off = vec3(float(x), float(y), float(z));
      vec3 nc = cell + off;
      float exists = hash1(nc + vec3(17.0));
      if(exists > bDensity) continue;
      vec3 jitter = hash3(nc) * 0.5 + 0.5;
      float sizeHash = hash1(nc + vec3(31.0));
      float sizeExp = (k < 2) ? 1.5 : 2.5;
      float rMax = (k < 2) ? 0.38 : 0.28;
      float r = 0.12 + pow(sizeHash, sizeExp) * rMax;
      vec3 center = off + 0.5 + (jitter - 0.5) * (1.0 - 2.0*r);
      float d = length(center - frac);
      if(d < bestD){ bestD = d; bestR = r; bestSeed = sizeHash; }
    }
    if(bestR < 0.001) continue;
    float d = bestD, r = bestR;
    float depthScale = 0.5 + r * 1.3;
    float bowlShape = smoothstep(r * 1.05, 0.0, d);
    float bowl = -bowlShape * 0.85 * depthScale;
    float rim = (smoothstep(r+0.03, r, d) - smoothstep(r, r-0.04, d)*0.5) * 1.2 * depthScale;
    float contrib = (bowl + rim) * 0.05;
    if(contrib < deepest) deepest = contrib;
    rimMax = max(rimMax, max(rim, 0.0) * 0.4);
    if(k < 2){
      float freshness = step(0.8, bestSeed);
      if(freshness > 0.5){
        float rayReach = r * 3.5;
        if(d > r && d < rayReach){
          float angNoise = fbm(p * scale * 3.0 + float(k)*7.0, 3);
          float radFalloff = 1.0 - smoothstep(r, rayReach, d);
          float streaks = smoothstep(0.55, 0.7, angNoise);
          raySum += streaks * radFalloff * 0.3;
        }
      }
    }
  }
  return vec3(deepest, rimMax, raySum);
}
float craters(vec3 p, float density){ return craters3(p, density).x; }
// Jitter-grid crater field.
// Each grid cell has ONE crater center placed at a jittered position.
// We sample the 27 neighbor cells in 3D to find the closest crater center
// to the query point — distance-to-center gives a perfect circular footprint
// regardless of grid topology. Radius is derived from a per-cell hash.
// This replaces the Voronoi approach, which suffered from polygonal cell
// clipping (craters looked squashed into hex/pent shapes).
vec3 lunarCraters3(vec3 p, float dL, float dM, float dS, float sizeMul){
  float deepest = 0.0;
  float rimSum  = 0.0;
  float raySum  = 0.0;

  for(int k=0; k<7; k++){
    // For large craters, split sizeMul between grid reduction and radius increase
    // via sqrt — total world-size = sizeMul, but r/cell stays within ±1 search range
    float gridAdj = (k < 2 && sizeMul > 1.0) ? sqrt(sizeMul) : 1.0;
    float scale = (k<2 ? 1.3 : 2.0) * pow(1.9, float(k)) / gridAdj;
    float bandDensity = (k<2) ? dL : ((k<5) ? dM : dS);
    if(bandDensity <= 0.001) continue;

    // Number of grid passes: 1 normally, 2 when density > 1.0
    int nPasses = (bandDensity > 1.0) ? 2 : 1;

    for(int pass = 0; pass < 2; pass++){
      if(pass >= nPasses) break;
      float passDensity = (pass == 0) ? min(bandDensity, 1.0) : (bandDensity - 1.0);
      if(passDensity <= 0.001) continue;
      // Offset second pass grid by half-cell to avoid overlap
      vec3 gridOffset = (pass == 0) ? vec3(0.0) : vec3(0.5);
      vec3 hashSalt   = (pass == 0) ? vec3(0.0) : vec3(43.0);

      vec3 gp = p * scale + float(k) * 29.1 + gridOffset;
      vec3 cell = floor(gp);
      vec3 frac = fract(gp);

      float bestD = 999.0;
      float bestRadius = 0.0;
      float bestSeed = 0.0;
      for(int z=-1; z<=1; z++)
      for(int y=-1; y<=1; y++)
      for(int x=-1; x<=1; x++){
        vec3 off = vec3(float(x), float(y), float(z));
        vec3 nc = cell + off;
        vec3 jitter = hash3(nc + hashSalt) * 0.5 + 0.5;
        float exists = hash1(nc + vec3(17.0) + hashSalt);
        if(exists > passDensity) continue;
        float sizeHash = hash1(nc + vec3(31.0) + hashSalt);
        // Broader distribution for large craters — let them grow bigger
        float sizeExp = (k<2) ? 1.3 : 2.5;
        float rMax    = (k<2) ? 0.42 : 0.32;
        float r = (0.14 + pow(sizeHash, sizeExp) * rMax) * sizeMul / gridAdj;
        // Constrain center so crater stays reachable from neighbor search
        float jitterRange = max(1.0 - 2.0 * r, 0.05);
        vec3 centerInCell = off + 0.5 + (jitter - 0.5) * jitterRange;
        vec3 delta = centerInCell - frac;
        float d = length(delta);
        if(d < bestD){
          bestD = d;
          bestRadius = r;
          bestSeed = sizeHash;
        }
      }

      if(bestRadius < 0.001) continue;
      float d = bestD;
      float r = bestRadius;

      // Profile — each pass contributes independently so no grid-boundary clipping
      float depthScale = 0.5 + r * 1.5;
      float bowlShape = smoothstep(r * 1.05, 0.0, d);
      float bowl = -bowlShape * 0.9 * depthScale;
      float rim = (smoothstep(r+0.035, r, d) - smoothstep(r, r-0.045, d)*0.6) * 1.3 * depthScale;
      float contrib = (bowl + rim) * 0.07;
      if(contrib < deepest) deepest = contrib;
      rimSum = max(rimSum, max(rim, 0.0) * 0.5);

      // Rays for fresh large craters only
      if(k < 3){
        float freshness = step(0.85, bestSeed);
        if(freshness > 0.5){
          float rayReach = r * 4.0;
          if(d > r && d < rayReach){
            float angularNoise = fbm(p * scale * 4.0 + float(k)*7.0 + float(pass)*13.0, 3);
            float radialFalloff = 1.0 - smoothstep(r, rayReach, d);
            float streaks = smoothstep(0.58, 0.72, angularNoise);
            raySum += streaks * radialFalloff * 0.4;
          }
        }
      }
    } // end pass loop
  }
  return vec3(deepest, rimSum, raySum);
}
vec3 lunarCraters(vec3 p, float density){ return lunarCraters3(p, density, density * 0.8, density * 0.6, 1.0); }

// Sunspot field — jitter-grid approach adapted from craters.
// Returns vec2(darkening, faculaeBrightening).
// Umbra (dark core) + penumbra (lighter ring) + faculae (bright halo).
vec2 sunspots(vec3 p, float density){
  float darkening = 0.0;
  float faculae = 0.0;
  for(int k = 0; k < 3; k++){
    float scale = 2.5 * pow(1.8, float(k));
    float bDensity = density * (k == 0 ? 0.6 : (k == 1 ? 0.8 : 1.0));
    if(bDensity <= 0.001) continue;
    vec3 gp = p * scale + float(k) * 19.3;
    vec3 cell = floor(gp);
    vec3 frac = fract(gp);
    float bestD = 999.0;
    float bestR = 0.0;
    for(int z=-1; z<=1; z++)
    for(int y=-1; y<=1; y++)
    for(int x=-1; x<=1; x++){
      vec3 off = vec3(float(x), float(y), float(z));
      vec3 nc = cell + off;
      float exists = hash1(nc + vec3(17.0));
      if(exists > bDensity) continue;
      vec3 jitter = hash3(nc) * 0.5 + 0.5;
      float sizeHash = hash1(nc + vec3(31.0));
      float r = 0.06 + pow(sizeHash, 1.8) * 0.22;
      vec3 center = off + 0.5 + (jitter - 0.5) * (1.0 - 2.0 * r);
      float d = length(center - frac);
      if(d < bestD){ bestD = d; bestR = r; }
    }
    if(bestR < 0.001) continue;
    float d = bestD, r = bestR;
    // Umbra — dark core
    float umbra = smoothstep(r * 0.5, 0.0, d) * 0.85;
    // Penumbra — lighter ring around umbra
    float penumbra = smoothstep(r, r * 0.5, d) * 0.45;
    darkening = max(darkening, umbra + penumbra);
    // Faculae — bright halo outside spot (only for larger spots)
    if(k < 2){
      float facRing = smoothstep(r * 2.5, r * 1.1, d) * smoothstep(r * 0.8, r * 1.3, d);
      faculae = max(faculae, facRing * 0.15);
    }
  }
  return vec2(darkening, faculae);
}
