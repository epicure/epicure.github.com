varying vec3 vN;
varying vec3 vWP;
varying vec3 vViewLocal;
void main(){
  vN = normalize(normal);
  vec4 wp = modelMatrix * vec4(position,1.0);
  vWP = wp.xyz;
  vViewLocal = transpose(mat3(modelMatrix)) * (cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
