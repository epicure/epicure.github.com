precision highp float;
varying vec3 vWP;
varying vec2 vUV;
varying vec3 vLP;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uInner;
uniform float uOuter;
uniform float uDensity;
uniform float uHue;
uniform float uSeed;
float hashR(float x){ return fract(sin(x * 127.1 + uSeed*13.7) * 43758.5453); }
float valR(float x){
  float i = floor(x), f = fract(x);
  float u = f*f*(3.0-2.0*f);
  return mix(hashR(i), hashR(i+1.0), u);
}
float fbmR(float x, int oct){
  float s = 0.0, a = 0.5, f = 1.0;
  for(int i=0; i<8; i++){ if(i >= oct) break; s += a * valR(x*f); a *= 0.5; f *= 2.0; }
  return s;
}
vec3 hsl2rgb(vec3 c){
  vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
  return c.z + c.y*(rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
}
float planetShadow(vec3 P, vec3 L){
  float b = dot(P, L);
  float c = dot(P, P) - 1.0;
  float disc = b*b - c;
  if(disc < 0.0) return 0.0;
  if(b > 0.0) return 0.0;
  float closest = sqrt(max(dot(P,P) - b*b, 0.0));
  return 1.0 - smoothstep(0.97, 1.03, closest);
}
void main(){
  float r = length(vLP.xz);
  if(r < uInner || r > uOuter) discard;
  float t = (r - uInner) / (uOuter - uInner);
  float broad = fbmR(t * 4.0, 4);
  float fine = fbmR(t * 30.0, 4);
  float density = broad * 0.7 + fine * 0.4;
  float gap1 = smoothstep(0.02, 0.0, abs(t - 0.42));
  float gap2 = smoothstep(0.015, 0.0, abs(t - 0.68));
  float gap3 = smoothstep(0.008, 0.0, abs(t - 0.28));
  density *= (1.0 - gap1 * 0.95) * (1.0 - gap2 * 0.8) * (1.0 - gap3 * 0.6);
  density *= smoothstep(0.0, 0.05, t) * smoothstep(1.0, 0.92, t);
  density = clamp(density * uDensity, 0.0, 1.0);
  if(density < 0.005) discard;
  vec3 icy = hsl2rgb(vec3(fract(uHue), 0.15, 0.85));
  vec3 dust = hsl2rgb(vec3(fract(uHue - 0.05), 0.5, 0.45));
  vec3 col = mix(dust, icy, fbmR(t * 12.0, 3));
  float shadow = planetShadow(vWP, normalize(uSunDir));
  col *= uSunColor * (1.0 - shadow * 0.92);
  vec3 V = normalize(cameraPosition - vWP);
  float fwd = pow(max(dot(V, normalize(uSunDir)), 0.0), 4.0) * 0.3;
  col += vec3(fwd * density);
  gl_FragColor = vec4(col, density);
}
