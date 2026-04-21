precision highp float;

varying float vTwinkle;
varying float vBright;

void main(){
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  if(r > 0.5) discard;
  // Soft round sprite with tiny halo
  float core = smoothstep(0.5, 0.0, r);
  float halo = smoothstep(0.5, 0.15, r) * 0.35;
  float a = (core + halo) * vTwinkle * vBright;
  gl_FragColor = vec4(vec3(a), a);
}
