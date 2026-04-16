precision highp float;
varying vec3 vN;
varying vec3 vWP;
varying vec3 vViewLocal;
uniform vec3 uSunDir;
uniform vec3 uColor;
uniform float uDensity;
uniform float uPower;
uniform float uRayleigh;
void main(){
  vec3 V = normalize(vViewLocal);
  vec3 L = normalize(uSunDir);
  vec3 N = normalize(vN);
  float fres = pow(1.0 - max(dot(N,V),0.0), uPower);
  float lit = max(dot(N, L), 0.0);
  float wrap = dot(N,L)*0.5+0.5;
  float mie = pow(max(dot(V, L), 0.0), 8.0) * 0.6;
  vec3 col = uColor * fres * (lit*0.7 + wrap*0.3) * uRayleigh + vec3(1.0,0.85,0.7)*mie*fres;
  gl_FragColor = vec4(col * uDensity, fres * uDensity * 0.9);
}
