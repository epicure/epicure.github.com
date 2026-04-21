attribute float aSeed;
attribute float aSize;
attribute float aBright;

uniform float uTime;
uniform float uPixelRatio;

varying float vTwinkle;
varying float vBright;

void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;

  // Twinkle: two slow sinusoids at per-star phases
  float ph = aSeed * 6.2831853;
  float t1 = sin(uTime * 1.7 + ph);
  float t2 = sin(uTime * 0.6 + ph * 2.3);
  vTwinkle = 0.65 + 0.35 * (t1 * 0.7 + t2 * 0.3);

  vBright = aBright;

  // Attenuate with distance; keep min size so they don't disappear
  float size = aSize * (300.0 / max(-mv.z, 0.01));
  gl_PointSize = clamp(size * uPixelRatio, 1.0, 8.0);
}
