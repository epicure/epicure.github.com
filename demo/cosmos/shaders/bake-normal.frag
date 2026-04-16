precision highp float;
varying vec2 vUv;
uniform int uFace;
uniform samplerCube uElevMap;
uniform float uAmp;
uniform float uStrength;
uniform float uTexelStep;

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

void main(){
  vec3 sN = cubeDir(uFace, vUv);
  vec3 up = abs(sN.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 tu = normalize(cross(up, sN));
  vec3 tv = cross(sN, tu);

  float eps = uTexelStep;
  float hU  = textureLod(uElevMap, normalize(sN + tu * eps), 0.0).r;
  float hU2 = textureLod(uElevMap, normalize(sN - tu * eps), 0.0).r;
  float hV  = textureLod(uElevMap, normalize(sN + tv * eps), 0.0).r;
  float hV2 = textureLod(uElevMap, normalize(sN - tv * eps), 0.0).r;

  float dU = (hU - hU2) / (2.0 * eps);
  float dV = (hV - hV2) / (2.0 * eps);

  vec3 grad = (tu * dU + tv * dV) * uAmp * uStrength;
  vec3 n = normalize(sN - grad);

  gl_FragColor = vec4(n * 0.5 + 0.5, 1.0);
}
