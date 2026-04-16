varying vec3 vWP;
varying vec2 vUV;
varying vec3 vLP;
varying vec3 vSunDirWorld;
uniform vec3 uSunDir;
void main(){
  vLP = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  vUV = uv;
  vSunDirWorld = mat3(modelMatrix) * uSunDir;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
