varying vec3 vWP;
varying vec2 vUV;
varying vec3 vLP;
void main(){
  vLP = position;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWP = wp.xyz;
  vUV = uv;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
