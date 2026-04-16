precision highp float;
varying vec2 vUv;
uniform int uFace;
uniform samplerCube uElevMap;
uniform float uHue;
uniform int uArchetype;
uniform float uLavaLevel;
uniform float uLavaGlow;
uniform float uLavaFreq;
uniform vec3 uPalette[8];
uniform float uSeed;
#include_common

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

vec3 hsl2rgb(vec3 c){
  vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0);
  return c.z + c.y*(rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
}

void main(){
  vec3 sN = cubeDir(uFace, vUv);
  vec3 sP = sN + seedOffset(uSeed);
  vec3 emissive = vec3(0.0);

  if(uArchetype == 4){
    // Lava world: cracks between tectonic plates glow with magma
    float elev = textureLod(uElevMap, sN, 0.0).r;

    // Domain-warped voronoi for tectonic crack network
    vec3 q = vec3(fbm(sP+vec3(0.0,0.0,0.0),3), fbm(sP+vec3(5.2,1.3,2.1),3), fbm(sP+vec3(2.1,4.7,9.2),3));
    vec3 wp = sP + 0.6 * q;
    vec3 vor = voronoi3D(wp * uLavaFreq);
    float edgeDist = vor.y - vor.x;

    // Primary cracks — thin bright lines at plate boundaries
    float crack = smoothstep(0.12, 0.0, edgeDist);
    // Secondary finer cracks
    vec3 vor2 = voronoi3D(wp * uLavaFreq * 2.8 + vec3(7.3));
    float crack2 = smoothstep(0.06, 0.0, vor2.y - vor2.x) * 0.4;

    // Low areas (below lava level) flood with lava
    float lavaFlood = smoothstep(uLavaLevel + 0.02, uLavaLevel - 0.03, elev);

    // Combine: cracks + flooded lowlands
    float lavaIntensity = clamp(crack + crack2 + lavaFlood * 0.7, 0.0, 1.0);

    // Temperature variation — hotter at crack centers, cooler at edges
    float tempVar = fbm(sP * 8.0, 3) * 0.3 + 0.7;
    lavaIntensity *= tempVar;

    // Lava color: hot core (yellow-white) → orange → deep red at edges
    vec3 hotCore = hsl2rgb(vec3(fract(0.08 + uHue), 0.95, 0.85));
    vec3 midLava = hsl2rgb(vec3(fract(0.05 + uHue), 0.95, 0.55));
    vec3 coolEdge = hsl2rgb(vec3(fract(0.0 + uHue), 0.90, 0.30));

    vec3 lavaColor = mix(coolEdge, midLava, smoothstep(0.0, 0.5, lavaIntensity));
    lavaColor = mix(lavaColor, hotCore, smoothstep(0.5, 1.0, lavaIntensity));

    emissive = lavaColor * lavaIntensity * uLavaGlow;
  }

  gl_FragColor = vec4(emissive, 1.0);
}
