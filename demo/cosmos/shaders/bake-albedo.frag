precision highp float;
varying vec2 vUv;
uniform int uFace;
uniform samplerCube uElevMap;
uniform float uSeaLevel;
uniform float uHue;
uniform int uArchetype;
uniform int uRockyMode;
uniform float uCraterL;
uniform float uCraterM;
uniform float uCraterS;
uniform float uWarp;
uniform float uCrackFreq;
uniform float uCrackIntensity;
uniform float uLunarLightness;
uniform float uLunarSaturation;
uniform vec3 uPalette[8];
uniform float uSeed;
uniform float uBands;
uniform float uBandShear;
uniform float uStormDensity;
uniform float uStormSize;
uniform float uTime;
uniform float uDynamics;
uniform vec3 uStarColor;
uniform float uGranulation;
uniform float uSunspotDensity;
uniform float uGranuleEdge;
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

vec3 hsl2rgb(vec3 c){
  vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
  return c.z + c.y*(rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
}

// Hue rotation around the gray axis (1,1,1)/sqrt(3) in RGB space
vec3 hueRotate(vec3 col, float h){
  if(abs(h) < 0.001) return col;
  float angle = h * 6.28318;
  float c = cos(angle), s = sin(angle);
  float k = 0.57735;
  vec3 axis = vec3(k, k, k);
  return col * c + cross(axis, col) * s + axis * dot(axis, col) * (1.0 - c);
}

vec3 rockyAlbedo(vec3 p, float h){
  vec3 deep    = hueRotate(uPalette[0], uHue);
  vec3 shallow = hueRotate(uPalette[1], uHue);
  vec3 sand    = hueRotate(uPalette[2], uHue);
  vec3 grass   = hueRotate(uPalette[3], uHue);
  vec3 forest  = hueRotate(uPalette[4], uHue);
  vec3 rock    = hueRotate(uPalette[5], uHue);
  vec3 snow    = hueRotate(uPalette[6], uHue);
  float lat = abs(p.y);
  float snowLine = mix(0.45, 0.15, lat);
  float sea = uSeaLevel;
  // Warp fuzz input for a more fractal, curvy coastline — fuzz noise
  // sampled on a perturbed grid produces irregular archipelagos and
  // peninsulas rather than a smooth ±band around contours.
  vec3 fq = vec3(fbm(p+vec3(1.7,3.2,5.1),3), fbm(p+vec3(4.3,8.9,2.2),3), fbm(p+vec3(6.1,1.5,7.7),3));
  vec3 fp = p + 0.6 * fq;
  float coastFuzz = (fbm(fp * 18.0 + vec3(1.3, 7.8, 4.2), 4) * 2.0 - 1.0) * 0.035;
  float beachFuzz = (fbm(fp * 25.0 + vec3(6.1, 2.9, 8.7), 3) * 2.0 - 1.0) * 0.008;
  float biomeFuzz = (fbm(fp * 8.0  + vec3(3.4, 9.1, 5.6), 4) * 2.0 - 1.0) * 0.06;
  float snowFuzz  = (fbm(fp * 14.0 + vec3(2.7, 4.5, 1.9), 4) * 2.0 - 1.0) * 0.04;
  float hC = h + coastFuzz;
  float hBe= h + beachFuzz;
  float hB = h + biomeFuzz;
  float hS = h + snowFuzz;
  vec3 col;
  if(hC < sea - 0.01){
    // Base deep-to-shallow from contour, plus an independent low-freq
    // "bathymetry" field that adds the turquoise/teal variation seen in
    // real oceans — lighter over continental shelves, darker in trenches.
    float baseMix = smoothstep(sea-0.15, sea-0.01, hC);
    float bathy = fbm(p * 3.5 + vec3(2.1, 6.8, 1.3), 4) * 0.5 + 0.5;
    float shallowness = clamp(baseMix + (bathy - 0.5) * 0.7, 0.0, 1.0);
    col = mix(deep, shallow, shallowness);
  }
  else if(hBe < sea + 0.005) col = sand;
  else if(hB < sea + 0.08)   col = mix(grass, forest, smoothstep(sea+0.005, sea+0.08, hB));
  else if(hS < snowLine)     col = mix(forest, rock, smoothstep(sea+0.08, snowLine, hB));
  else                        col = mix(rock, snow, smoothstep(snowLine, snowLine+0.05, hS));
  float v = fbm(p*12.0, 4);
  col *= (0.85 + 0.3*v);
  return col;
}

vec3 lunarAlbedo(vec3 p){
  float L = uLunarLightness;
  float S = uLunarSaturation;
  // Apply lightness/saturation modifiers to palette colors
  vec3 baseHighland = hueRotate(uPalette[0], uHue);
  vec3 baseBright   = hueRotate(uPalette[1], uHue);
  vec3 baseMare     = hueRotate(uPalette[2], uHue);
  // Modulate lightness and saturation
  vec3 gray0 = vec3(dot(baseHighland, vec3(0.299,0.587,0.114)));
  vec3 gray1 = vec3(dot(baseBright, vec3(0.299,0.587,0.114)));
  vec3 gray2 = vec3(dot(baseMare, vec3(0.299,0.587,0.114)));
  vec3 highland   = mix(gray0, baseHighland, S) * (0.5 + L);
  vec3 highBright = mix(gray1, baseBright, S) * (0.5 + L);
  vec3 mare       = mix(gray2, baseMare, S) * (0.5 + L);
  float mareField = fbm(p * 1.2 + vec3(11.3, 5.7, 8.9), 4);
  float mareMask = smoothstep(0.58, 0.42, mareField);
  vec3 base = mix(highland, mare, mareMask);
  float brightField = fbm(p * 3.0 + vec3(7.1, 3.4, 2.8), 4);
  float brightMask = smoothstep(0.58, 0.72, brightField) * (1.0 - mareMask);
  base = mix(base, highBright, brightMask * 0.7);
  float speckle = fbm(p * 35.0, 3);
  base *= 0.88 + 0.18 * speckle;
  float mottle = fbm(p * 6.0 + vec3(4.3, 1.9, 7.1), 4);
  base *= 0.92 + 0.12 * mottle;
  vec3 swirlP = p * 2.5 + vec3(3.7, 1.2, 8.4);
  vec3 swirlWarp = vec3(fbm(swirlP, 3), fbm(swirlP+vec3(5.2,1.3,2.1), 3), fbm(swirlP+vec3(2.1,4.7,9.2), 3));
  vec3 swp = p * 2.0 + swirlWarp * 1.8;
  float swirlField = fbm(swp, 5);
  float swirlMask = smoothstep(0.62, 0.78, swirlField) * (1.0 - mareMask * 0.8);
  base += vec3(swirlMask * 0.35);
  return base;
}

vec3 iceAlbedo(vec3 p){
  vec3 q = vec3(fbm(p+vec3(0.0,0.0,0.0),3), fbm(p+vec3(5.2,1.3,2.1),3), fbm(p+vec3(2.1,4.7,9.2),3));
  vec3 wp = p + uWarp * q;
  vec3 vor = voronoi3D(wp * uCrackFreq);
  float crack = smoothstep(0.08, 0.0, vor.y - vor.x) * uCrackIntensity;
  vec3 vor2 = voronoi3D(wp * uCrackFreq * 2.5);
  float crack2 = smoothstep(0.04, 0.0, vor2.y - vor2.x) * uCrackIntensity * 0.5;
  float tintMix = fbm(wp * 4.0, 5) * 0.5 + 0.5;
  float dirt = fbm(p * 20.0, 3);
  vec3 clean = hueRotate(uPalette[0], uHue);
  vec3 tint  = hueRotate(uPalette[1], uHue);
  vec3 crackC= hueRotate(uPalette[2], uHue);
  vec3 col = mix(clean, tint, tintMix);
  col = mix(col, crackC, clamp(crack + crack2, 0.0, 0.95));
  col *= 0.88 + 0.18 * dirt;
  return col;
}

// Lava world — dark volcanic crust
vec3 lavaAlbedo(vec3 p, float h){
  vec3 basalt   = hueRotate(uPalette[0], uHue);
  vec3 darkRock = hueRotate(uPalette[1], uHue);
  vec3 warmRock = hueRotate(uPalette[2], uHue);
  float variation = fbm(p * 6.0, 4) * 0.5 + 0.5;
  vec3 col = mix(basalt, darkRock, variation);
  float detail = fbm(p * 18.0, 3) * 0.5 + 0.5;
  col = mix(col, warmRock, detail * 0.25);
  col *= 0.85 + 0.25 * fbm(p * 12.0, 3);
  return col;
}

// Ocean base color (without wave normal / specular — those stay in realtime frag)
vec3 oceanBase(vec3 p){
  vec3 deep = hueRotate(uPalette[0], uHue);
  vec3 mid  = hueRotate(uPalette[1], uHue);
  float depthField = fbm(p * 4.0, 4) * 0.5 + 0.5;
  vec3 water = mix(deep, mid, smoothstep(0.3, 0.7, depthField));
  float current = fbm(p * 12.0, 3) * 0.5 + 0.5;
  water *= 0.9 + 0.2 * current;
  return water;
}

// Gas giant — baked band structure + storms
vec3 gasAlbedo(vec3 p){
  vec3 sOff = seedOffset(uSeed);
  float lat = p.y;
  float tAnim = uTime * uDynamics;

  float shearDir = sin(lat * uBands * 3.14159);
  float shearAngle = uBandShear * shearDir / max(uBands / 5.0, 1.0);
  float cs = cos(shearAngle), sn = sin(shearAngle);
  vec2 xz = mat2(cs, -sn, sn, cs) * p.xz;
  vec3 pShape = vec3(xz.x, p.y, xz.y) + sOff;

  float zonalFlow = shearDir * tAnim * 0.15;
  vec3 windDrift = vec3(tAnim * 0.08 + zonalFlow, 0.0, tAnim * 0.06);
  vec3 pFlow = pShape + windDrift;
  vec3 pStorm = p + sOff;

  vec3 stormQ = pStorm * (1.8 + uBands * 0.04);
  vec3 sc = floor(stormQ), sf = fract(stormQ);
  float bestD2 = 8.0, secD2 = 8.0;
  vec3 bestR = vec3(0.0);
  float bestHash = 0.0;

  for(int k=-1;k<=1;k++) for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec3 off = vec3(float(i),float(j),float(k));
    vec3 nc = sc + off;
    vec3 jit = hash3(nc) * 0.5 + 0.5;
    vec3 r = off + jit - sf;
    float d2 = dot(r,r);
    if(d2 < bestD2){ secD2=bestD2; bestD2=d2; bestR=r; bestHash=hash1(nc); }
    else if(d2 < secD2){ secD2=d2; }
  }

  float sDist = sqrt(bestD2);
  float sRadius = (0.10 + bestHash * 0.15) * uStormSize;
  bool isStorm = bestHash > (1.0 - uStormDensity);

  float stormLatWarp = 0.0;
  if(isStorm && sDist < sRadius * 3.0){
    float prox = smoothstep(sRadius * 3.0, 0.0, sDist);
    float wAngle = prox * prox * 3.0;
    float cw = cos(wAngle), sw = sin(wAngle);
    stormLatWarp = (sw * bestR.x + cw * bestR.z - bestR.z) * prox * 0.06;
  }

  float bw1 = fbm(pShape * 2.0, 4) * 0.12;
  float bw2 = fbm(pShape * 5.5, 3) * 0.04;
  float wLat = lat + bw1 + bw2 + stormLatWarp;
  float band1 = sin(wLat * uBands * 3.14159);
  float band2 = sin(wLat * uBands * 6.28318 + 1.7) * 0.25;
  float bandMix = (band1 + band2) * 0.5 + 0.5;

  float turb = fbm(pFlow * 4.0, 5);
  float fineTurb = fbm(pFlow * 10.0, 3);

  vec3 c1 = hueRotate(uPalette[0], uHue);
  vec3 c2 = hueRotate(uPalette[1], uHue);
  vec3 c3 = hueRotate(uPalette[2], uHue);

  vec3 bandBaseCol = mix(c2, c1, bandMix);
  vec3 col = bandBaseCol;
  col = mix(col, c3, turb * 0.25);
  col *= 0.88 + 0.24 * fineTurb;

  if(isStorm && sDist < sRadius * 2.0){
    float mask = smoothstep(sRadius, sRadius * 0.08, sDist);
    vec3 N = normalize(p);
    vec3 up2 = abs(N.y) < 0.99 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
    vec3 T = normalize(cross(N, up2));
    vec3 B = cross(N, T);
    vec2 rTangent = vec2(dot(bestR, T), dot(bestR, B));
    float spinA = tAnim * 1.5;
    float cSpin = cos(spinA), sSpin = sin(spinA);
    vec2 rRot = mat2(cSpin, -sSpin, sSpin, cSpin) * rTangent;
    float sAngle = atan(rRot.y, rRot.x);
    float normD = sDist / max(sRadius, 0.001);
    float spiral = sin(sAngle * 3.0 - log(max(normD, 0.15)) * 4.0) * 0.5 + 0.5;
    float rings = sin(normD * 18.0) * 0.5 + 0.5;
    float structure = mix(spiral, rings, 0.25);
    vec3 vDark = bandBaseCol * 0.55;
    vec3 vLight = bandBaseCol * 1.25 + vec3(0.02);
    vec3 vCol = mix(vDark, vLight, structure);
    float edgeNoise = fbm(pStorm * 8.0, 3) * 0.12;
    mask = smoothstep(0.0, 0.25 + edgeNoise, mask);
    col = mix(col, vCol, mask * 0.75);
  }

  return col;
}

// Star surface — baked granulation, sunspots, mottling (no limb darkening — view-dependent)
vec3 starAlbedo(vec3 p){
  vec3 sOff = seedOffset(uSeed);
  float t = uTime * 0.015;
  vec3 pRot = p + sOff;
  vec3 pWarped = warp(pRot, 0.3);

  // Large-scale mottling
  vec3 pLarge = warp(pRot * 1.2, 0.7);
  float mottle1 = fbm(pLarge * 1.8 + t * 0.04, 5);
  float mottle2 = fbm(pRot * 3.0 + vec3(t * 0.07), 4) * 0.6;
  float mottle = mottle1 * 0.55 + mottle2 * 0.45;
  float mottleBright = 0.6 + mottle * 0.65;

  // Granulation
  float granScale = 12.0 + uGranulation * 25.0;
  vec3 vor = voronoi3D(pWarped * granScale);
  float edgeNoise = fbm(pWarped * granScale * 0.8 + vec3(7.3), 3) * 0.08;
  float edgeDist = (vor.y - vor.x) + edgeNoise;
  float softness = 0.35 - uGranulation * 0.2;
  float cellEdge = smoothstep(0.0, softness, edgeDist);
  float turbBlend = fbm(pWarped * 8.0 + t * 0.3, 4) * 0.5 + 0.5;
  float granule = mix(turbBlend, cellEdge, 0.5 + uGranulation * 0.35);
  float edgeFloor = 0.5 + uGranuleEdge * 0.25;
  granule = edgeFloor + granule * (1.0 - edgeFloor);

  // Fine turbulence
  float turb1 = fbm(pWarped * 5.0 + t * 0.2, 5) * 0.12;
  float turb2 = fbm(pWarped * 14.0 + t * 0.5, 3) * 0.06;

  // Sunspots
  vec2 spots = sunspots(pRot, uSunspotDensity);
  float spotDark = spots.x;
  float spotFac = spots.y;

  float intensity = (granule + turb1 + turb2) * mottleBright * (1.0 - spotDark) + spotFac;

  // Normalize star color luminance — temperature sets hue, not total energy
  float starLum = dot(uStarColor, vec3(0.299, 0.587, 0.114));
  vec3 starNorm = uStarColor * (0.65 / max(starLum, 0.001));

  vec3 col = starNorm * intensity;
  // Spot color shift — cooler (redder) in spots
  col = mix(col, col * vec3(0.8, 0.4, 0.15), spotDark * 0.7);

  return col;
}

void main(){
  vec3 sN = cubeDir(uFace, vUv);
  vec3 sP = sN + seedOffset(uSeed);
  float h = textureLod(uElevMap, sN, 0.0).r;
  vec3 col;
  if(uArchetype == 0){
    col = (uRockyMode == 1) ? lunarAlbedo(sP) : rockyAlbedo(sP, h);
  } else if(uArchetype == 1){
    col = gasAlbedo(sN);
  } else if(uArchetype == 2){
    col = iceAlbedo(sP);
  } else if(uArchetype == 3){
    col = oceanBase(sP);
  } else if(uArchetype == 4){
    col = lavaAlbedo(sP, h);
  } else if(uArchetype == 6){
    col = lunarAlbedo(sP);
  } else if(uArchetype == 5){
    col = starAlbedo(sN);
  } else {
    col = vec3(0.5);
  }
  gl_FragColor = vec4(col, 1.0);
}
