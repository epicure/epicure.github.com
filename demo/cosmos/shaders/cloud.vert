varying vec3 vN;
varying vec3 vLP;
varying vec3 vWP;
void main(){
  vN = normalize(normal);
  vLP = position;
  vec4 wp = modelMatrix * vec4(position,1.0);
  vWP = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
