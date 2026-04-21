precision highp float;

#include_common

varying vec3 vWorldPos;

uniform float uTime;
uniform float uFocusMix;
uniform vec3  uFocusPos;
uniform vec3  uColorA;   // cool
uniform vec3  uColorB;   // neutral
uniform vec3  uColorC;   // warm / accent
uniform vec3  uColorAxis;
uniform float uIntensity;

// 3-tier sampler: low picks region color, mid is main clouds,
// high is fine filaments (ridged -> stringy, not blobby).
float nebulaDensity(vec3 p, out float midOut, out float lowOut){
  float tA = uTime * 0.008;
  float tB = uTime * 0.015;

  // Low (color region, 1 octave gradient-noise is enough)
  float low = gnoise(p * 0.8 + vec3(tA * 0.2, -tA * 0.15, tA * 0.1)) * 0.5 + 0.5;
  lowOut = low;

  // Domain warp for mid/high so structures curve rather than clump
  vec3 w = vec3(
    gnoise(p * 1.1 + vec3(tA, 0.0, 0.0)),
    gnoise(p * 1.1 + vec3(0.0, tA, 0.0)),
    gnoise(p * 1.1 + vec3(0.0, 0.0, tA))
  );
  vec3 q = p + w * 0.45;

  // Mid (clouds): 2 octaves, remapped
  float mid = fbm(q * 2.0 + vec3(tA * 0.5, -tA * 0.3, tA * 0.7), 2) * 0.5 + 0.5;
  midOut = mid;

  // High (filaments): ridged at 2 octaves
  float hi = ridgedMF(q * 6.0 - vec3(tB * 0.4, tB * 0.2, -tB * 0.5), 2);

  // Sharpen: pow curves crush darks, keep highlights
  float midC = pow(clamp(mid, 0.0, 1.0), 2.2);
  float hiC  = pow(clamp(hi,  0.0, 1.0), 3.0);

  // Density = main body (mid) modulated by filament ridges,
  // so filaments live inside cloud regions.
  float d = midC * 0.75 + hiC * midC * 0.9;
  return d;
}

vec3 nebulaColor(float low, vec3 dir){
  // Directional axis gradient → hemispheric tint (cool ↔ warm)
  float axis = dot(normalize(dir), normalize(uColorAxis));
  float g = smoothstep(-0.8, 0.8, axis);

  // Bend the palette: A (cool) ↔ B (neutral) ↔ C (warm) picked by axis,
  // with local variation from low-frequency noise.
  vec3 base = mix(uColorA, uColorB, smoothstep(0.0, 0.5, g));
  vec3 warm = mix(uColorB, uColorC, smoothstep(0.5, 1.0, g));
  vec3 dirCol = mix(base, warm, step(0.5, g));

  // Small local hue variation so regions don't feel uniform
  vec3 local = mix(uColorA, uColorC, low);
  return mix(dirCol, local, 0.35);
}

void main(){
  vec3 farDir  = normalize(vWorldPos);
  vec3 nearDir = normalize(vWorldPos - cameraPosition * 0.25 - uFocusPos * 0.4);

  float midF, lowF;
  float dFar  = nebulaDensity(farDir * 1.0,  midF, lowF);
  float midN, lowN;
  float dNear = nebulaDensity(nearDir * 1.7, midN, lowN);

  // Combine layers: far carries tone, near adds depth
  float d = dFar * 0.45 + dNear * 0.30;

  // Focus softening: drop high-frequency contribution when focused
  // (uFocusMix is smoothed in JS, so this also cross-fades temporally)
  d = mix(d, dFar * 0.9, uFocusMix * 0.5);

  // Color from far layer's low-frequency region
  vec3 col = nebulaColor(lowF, farDir);

  // Add a subtle highlight where filaments peak
  float peak = pow(clamp(midF * 1.1, 0.0, 1.0), 6.0);
  col += uColorC * peak * 0.08;

  col *= d;

  // Focus desaturation
  float gray = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(col, vec3(gray), uFocusMix * 0.35);
  col *= mix(1.0, 0.5, uFocusMix);

  col *= uIntensity;
  col = min(col, vec3(0.38));

  gl_FragColor = vec4(col, 1.0);
}
