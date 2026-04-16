varying vec3 vNormalS;
varying vec3 vWorldPos;
varying vec3 vLocalPos;
varying float vElev;
uniform float uAmp;
uniform int uArchetype;
uniform float uSeed;
uniform float uElongation;
uniform float uBumpiness;
uniform samplerCube uElevMap;
#include_common

void main(){
  vec3 sN = normalize(position);
  float elev = (uArchetype == 1 || uArchetype == 5) ? 0.0 : textureLod(uElevMap, sN, 0.0).r;
  vElev = elev;

  vec3 displaced;
  if(uArchetype == 6){
    // Asteroid — deform sphere into irregular elongated shape
    vec3 seedOff = seedOffset(uSeed + 137.0);
    // Elongation: stretch X, compress Y/Z for potato shape
    vec3 scale = vec3(1.0 + uElongation, 1.0 / (1.0 + uElongation * 0.3), 1.0 / (1.0 + uElongation * 0.15));
    vec3 deformed = sN * scale;
    // Low-frequency bumps for irregular rocky shape
    float bump = fbm(sN * 1.5 + seedOff, 3) * 0.7 + fbm(sN * 3.0 + seedOff + vec3(42.0), 3) * 0.3;
    deformed += sN * bump * uBumpiness * 0.25;
    // Baked elevation displacement on top
    displaced = deformed + sN * elev * uAmp;
  } else {
    displaced = sN * (1.0 + elev * uAmp);
  }

  vNormalS = sN;
  vLocalPos = displaced;
  vec4 wp = modelMatrix * vec4(displaced, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
