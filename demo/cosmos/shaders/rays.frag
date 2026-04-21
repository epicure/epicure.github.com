precision highp float;

#include_common

varying vec2 vUV;

uniform float uTime;
uniform float uIntensity; // overall brightness
uniform float uReach;     // 0..1, how far rays extend (1 = quad edge)
uniform vec3  uColor;

#define TAU 6.2831853
#define PI  3.14159265

void main(){
  vec2 d = vUV - 0.5;
  float r = length(d) * 2.0;      // 0 at center, 1 at quad edge
  float a = atan(d.y, d.x) + PI;  // 0..TAU

  // Quantize angle into rays with per-ray hash
  float rayCount = 22.0;
  float idx = floor(a * rayCount / TAU);
  float h = hash1(vec3(idx * 13.7 + 1.3, 23.1, 5.9));

  // Angular distance from ray center — narrow streaks, variable width
  float af = fract(a * rayCount / TAU) - 0.5;
  float width = 1.0 + h * 2.5;
  float angular = exp(-abs(af) * 50.0 / width);

  // Per-ray length variation
  float rayLen = uReach * (0.55 + h * 0.45);

  // Along-ray intensity: inner mask (so near-center doesn't flood) + outer fade
  float inner = smoothstep(0.005, 0.05, r);
  float outer = 1.0 - smoothstep(rayLen * 0.55, rayLen, r);
  float along = inner * outer;

  // Flicker per ray
  float flicker = 0.75 + 0.25 * sin(uTime * 30.0 + idx * 7.3 + h * 12.0);

  // Core glow (always, expands with reach)
  float core = exp(-r * (9.0 - uReach * 4.0)) * 0.55;

  float I = (angular * along * flicker + core) * uIntensity;

  // White-hot inner + star-tinted outer
  vec3 col = (uColor + vec3(0.35)) * I;
  gl_FragColor = vec4(col, 1.0);
}
