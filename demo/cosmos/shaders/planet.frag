precision highp float;
varying vec3 vNormalS;
varying vec3 vWorldPos;
varying vec3 vLocalPos;
varying float vElev;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uHue;
uniform int uArchetype;
uniform int uRockyMode;
uniform float uTime;
uniform float uBands;
uniform float uBandShear;
uniform float uDynamics;
uniform float uOceanSpeed;
uniform float uOceanFoam;
uniform float uOceanSheen;
uniform float uOceanDepthTint;
uniform float uOceanSSS;
uniform float uStormDensity;
uniform float uStormSize;
uniform float uPolarCaps;
uniform float uAmbient;
uniform float uCraterNormalStr;
uniform float uIceSheen;
uniform samplerCube uAlbedoMap;
uniform samplerCube uNormalMap;
uniform samplerCube uEmissiveMap;
uniform samplerCube uElevMap;
uniform vec3 uPalette[8];
uniform float uSeed;
uniform vec3 uStarColor;
uniform float uGranulation;
uniform float uSunspotDensity;
uniform float uLimbDarkening;
uniform float uGranuleEdge;
uniform float uStarBrightness;
#include_common

vec3 hsl2rgb(vec3 c){
  vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
  return c.z + c.y*(rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
}

vec3 hueRotate(vec3 col, float h){
  if(abs(h) < 0.001) return col;
  float angle = h * 6.28318;
  float c = cos(angle), s = sin(angle);
  float k = 0.57735;
  vec3 axis = vec3(k, k, k);
  return col * c + cross(axis, col) * s + axis * dot(axis, col) * (1.0 - c);
}

vec3 rotY(vec3 p, float a){
  float c = cos(a), s = sin(a);
  return vec3(p.x*c - p.z*s, p.y, p.x*s + p.z*c);
}

// 4-tap crater normal from elevation G channel (crater bump height)
vec3 craterNormal4tap(vec3 sN, float strength){
  vec3 up = abs(sN.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tu = normalize(cross(up, sN));
  vec3 tv = cross(sN, tu);
  float eps = 0.0012;
  float hU  = texture(uElevMap, normalize(sN + tu * eps)).g;
  float hU2 = texture(uElevMap, normalize(sN - tu * eps)).g;
  float hV  = texture(uElevMap, normalize(sN + tv * eps)).g;
  float hV2 = texture(uElevMap, normalize(sN - tv * eps)).g;
  float dU = (hU - hU2) / (2.0 * eps);
  float dV = (hV - hV2) / (2.0 * eps);
  vec3 grad = (tu * dU + tv * dV) * strength;
  return normalize(sN - grad);
}

// Ocean — realtime. Wave normal from analytic fbm derivatives.
// Time offsets give slow ocean current drift and living wave motion.
vec3 oceanShaded(vec3 sN, vec3 V, vec3 L, out vec3 Nout, out float outFoam, out vec3 outSSS){
  float t = uTime * 0.18 * uOceanSpeed;
  // Animate waves by rotating noise coordinates around Y axis.
  // Rigid transform — no stretching, no polar convergence.
  // Different speeds per scale create parallax depth.
  // At speed=0 all angles are 0 — static FBM waves still visible.
  float a1 = t * 0.08, a2 = t * 0.13, a3 = t * 0.22;
  vec4 big    = fbmD(rotY(sN, a1) * 4.0,  4, 1.0);
  vec4 medium = fbmD(rotY(sN, a2) * 12.0, 3, 1.0);
  vec4 small  = fbmD(rotY(sN, a3) * 35.0, 3, 1.0);
  // Rotate gradients back to original space for correct normal perturbation
  vec3 grad = rotY(big.yzw, -a1) * 0.5 + rotY(medium.yzw, -a2) * 0.3 + rotY(small.yzw, -a3) * 0.2;
  vec3 tangentGrad = grad - dot(grad, sN) * sN;
  vec3 N = normalize(sN - tangentGrad * 0.05);
  Nout = N;

  // Whitecap foam — steep wave gradient = breaking waves
  float steepness = length(tangentGrad);
  float foam = smoothstep(0.35, 0.7, steepness);
  // Add fine noise breakup so foam isn't uniform blobs
  float foamNoise = fbm(rotY(sN, a3 * 1.5) * 50.0, 3) * 0.5 + 0.5;
  foam *= smoothstep(0.3, 0.6, foamNoise);
  outFoam = foam;

  // Slow current drift on albedo lookup via rotation
  vec3 water = texture(uAlbedoMap, rotY(sN, t * 0.03)).rgb;

  // Depth-based tint — elevation drives shallow vs deep appearance
  float elev = texture(uElevMap, sN).r;
  float shallowMask = smoothstep(-0.02, 0.04, elev);
  vec3 shallowTint = hueRotate(uPalette[1], uHue) * 1.2 + vec3(0.05);
  water = mix(water, shallowTint, shallowMask * uOceanDepthTint);
  // Darken deep areas
  float deepMask = smoothstep(0.0, -0.08, elev);
  water *= 1.0 - deepMask * uOceanDepthTint * 0.75;

  vec3 sky = hueRotate(mix(uPalette[0], uPalette[1], 0.5) + vec3(0.3), uHue);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 4.0);
  // Attenuate sky reflection on the dark side — no sky light to reflect there
  float skyLit = smoothstep(-0.1, 0.3, dot(sN, L));
  vec3 col = mix(water, sky, fres * 0.7 * skyLit);

  // Subsurface scattering — output separately so it bypasses diffuse lighting
  float sss = max(dot(-sN, L), 0.0) * 0.3;
  float waveTranslucency = max(big.x * 0.5 + 0.5, 0.0);
  vec3 sssColor = vec3(0.0, 0.18, 0.25) * (1.0 + waveTranslucency * 0.5);
  outSSS = sssColor * sss * uOceanSSS * (1.0 - fres);

  // Mix in foam (white, slightly transparent)
  col = mix(col, vec3(0.9, 0.93, 0.95), foam * uOceanFoam);

  return col;
}

void main(){
  vec3 sN = normalize(vNormalS);
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 L = normalize(uSunDir);
  vec3 N = sN;
  vec3 col;

  float oceanFoam = 0.0;
  vec3 oceanSSS = vec3(0.0);
  bool isStar = (uArchetype == 5);
  if(isStar){
    // Star — baked surface + view-dependent limb darkening & rim bloom
    vec3 worldN = normalize(vWorldPos);
    vec3 bakedSurface = texture(uAlbedoMap, vNormalS).rgb;
    float NdotV = max(dot(worldN, V), 0.0);
    float limb = pow(NdotV, uLimbDarkening);
    vec3 coolSurface = bakedSurface * vec3(0.7, 0.35, 0.1);
    col = mix(coolSurface, bakedSurface, pow(limb, 0.6)) * limb;
    float rimGlow = 1.0 - pow(NdotV, 0.5);
    col += uStarColor * rimGlow * uStarBrightness;
    gl_FragColor = vec4(col, 1.0);
    return;
  } else if(uArchetype == 1){
    // Gas giant — baked bands + storms
    col = texture(uAlbedoMap, sN).rgb;
  } else if(uArchetype == 3){
    // Ocean — hybrid: baked water tone + realtime wave normal
    col = oceanShaded(sN, V, L, N, oceanFoam, oceanSSS);
  } else {
    // Rocky / Cratered / Ice / Lava — fully baked
    col = texture(uAlbedoMap, sN).rgb;
    N = normalize(texture(uNormalMap, sN).rgb * 2.0 - 1.0);

    // 4-tap crater normals from baked crater bump (elevation G channel)
    float craterBump = texture(uElevMap, sN).g;
    if(abs(craterBump) > 0.0001 && uCraterNormalStr > 0.0){
      vec3 cN = craterNormal4tap(sN, uCraterNormalStr);
      // Blend crater normal perturbation onto terrain normal
      vec3 craterOffset = cN - sN;
      N = normalize(N + craterOffset);
    }
  }

  // Polar caps
  if(uArchetype != 1 && uPolarCaps > 0.0){
    float lat = abs(vNormalS.y);
    float edge = fbm(vNormalS * 4.0, 4) * 0.08;
    float capLine = 1.0 - uPolarCaps * 0.7;
    float capMask = smoothstep(capLine - 0.08 + edge, capLine + 0.04 + edge, lat);
    col = mix(col, vec3(0.96, 0.97, 0.98), capMask);
  }

  float NdotL = max(dot(N, L), 0.0);
  float wrap = dot(N, L) * 0.5 + 0.5;
  vec3 lit = col * uSunColor * (NdotL*0.85 + wrap*0.15 + uAmbient);

  if(uArchetype == 3){
    vec3 H = normalize(L + V);
    float NdH = max(dot(N, H), 0.0);
    float NdV = max(dot(N, V), 0.0);
    // Schlick Fresnel — water base reflectance ~0.02
    float fresnel = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
    // Broad ocean sheen
    float sheen = pow(NdH, 16.0);
    lit += uSunColor * sheen * uOceanSheen * fresnel;
    // Sharp sun disk reflection
    float sunDisk = pow(NdH, 256.0);
    lit += uSunColor * sunDisk * 2.5 * fresnel;
    // Foam catches light more
    lit += vec3(oceanFoam * uOceanFoam * 0.2) * uSunColor * max(dot(sN, L), 0.0);
  }

  if(uArchetype == 2 && uIceSheen > 0.0){
    vec3 H = normalize(L + V);
    float NdH = max(dot(N, H), 0.0);
    float NdV = max(dot(N, V), 0.0);
    // Schlick Fresnel — ice base reflectance ~0.02, rises at grazing angles
    float fresnel = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
    // Two-lobe sheen: broad gloss + tighter highlight
    float sheen = pow(NdH, 32.0) * 0.6 + pow(NdH, 128.0) * 0.4;
    lit += uSunColor * sheen * fresnel * uIceSheen;
  }

  // SSS — added after diffuse lighting so it isn't killed by dark-side attenuation
  lit += oceanSSS * uSunColor;

  // Emissive — added after lighting so it glows independently of sun
  vec3 emissive = texture(uEmissiveMap, sN).rgb;
  lit += emissive;

  gl_FragColor = vec4(lit, 1.0);
}
