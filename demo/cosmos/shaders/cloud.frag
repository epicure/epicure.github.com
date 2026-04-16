precision highp float;
varying vec3 vN;
varying vec3 vLP;
varying vec3 vWP;
uniform vec3 uSunDir;
uniform float uTime;
uniform float uCoverage;
uniform float uWind;
uniform float uFlowSpeed;
uniform float uDensity;
uniform float uHue;
uniform float uSat;
#include_common

vec3 hsl2rgbC(vec3 c){
  vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
  return c.z + c.y*(rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
}

void main(){
  vec3 p = normalize(vLP);
  float lat = p.y;
  float windWeight = cos(lat * 3.14159);
  float animTime = uTime * uFlowSpeed;
  float windStr = uWind * 0.15;
  vec3 wind = vec3(sin(animTime*0.05)*0.2*windStr, 0.0, animTime*0.08*windWeight*windStr);
  float n = fbm(p*3.5 + wind, 5) * 0.5 + 0.5;
  float m = fbm(p*8.0 + wind*1.5, 4) * 0.5 + 0.5;
  float raw = n*0.7 + m*0.3;
  float density = smoothstep(1.0 - uCoverage, 1.0 - uCoverage*0.5, raw);
  vec3 L = normalize(uSunDir);
  vec3 N = normalize(vN);
  float NdotL = dot(N, L);
  float lit = max(NdotL, 0.0)*0.75 + 0.25;

  // Base tint — when uSat=0, stays white
  vec3 tinted = hsl2rgbC(vec3(fract(uHue), uSat, 0.85));
  vec3 base = mix(vec3(1.0), tinted, uSat);

  // Twilight: warm orange on terminator (NdotL near 0)
  float twilight = smoothstep(0.3, -0.1, NdotL) * smoothstep(-0.6, -0.1, NdotL);
  vec3 sunset = vec3(1.0, 0.55, 0.3);
  base = mix(base, sunset, twilight * 0.5);

  vec3 col = base * lit;
  float a = density * uDensity;
  if(a < 0.01) discard;
  gl_FragColor = vec4(col, a);
}
