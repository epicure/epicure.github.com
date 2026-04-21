// Color palette system — maps named color stops to uniform arrays.
// Each archetype uses a subset of the 8 palette slots.

function hsl(h, s, l) {
  // Matches the shader's hsl2rgb exactly
  const rgb = [0, 4, 2].map(off => {
    const k = (h * 6 + off) % 6;
    return Math.max(0, Math.min(1, Math.abs(k - 3) - 1));
  });
  return rgb.map(v => {
    const c = l + s * (v - 0.5) * (1 - Math.abs(2 * l - 1));
    return Math.max(0, Math.min(1, c));
  });
}

function rgb2hex([r, g, b]) {
  const h = c => Math.round(c * 255).toString(16).padStart(2, '0');
  return '#' + h(r) + h(g) + h(b);
}

export function hex2rgb(hex) {
  hex = hex.replace('#', '');
  return [
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255,
  ];
}

// Palette slot labels per archetype+mode
export const PALETTE_LABELS = {
  '0_0': ['Deep ocean', 'Shallow', 'Sand', 'Grass', 'Forest', 'Rock', 'Snow'],
  '0_1': ['Highland', 'Bright highland', 'Mare'],
  '1':   ['Band 1', 'Band 2', 'Accent'],
  '2':   ['Clean ice', 'Tint', 'Crack'],
  '3':   ['Deep water', 'Mid water'],
  '4':   ['Basalt', 'Dark rock', 'Warm rock'],
  '5':   ['Granule bright', 'Granule dark', 'Spot umbra'],
  '6':   ['Highland', 'Bright ejecta', 'Dark terrain'],
};

export function getPaletteKey(archetype, rockyMode) {
  if (archetype === 0) return '0_' + rockyMode;
  return '' + archetype;
}

// Meaningful color-slot counts per archetype (trailing slots are just padding).
export const PALETTE_COUNTS = {
  '0_0': 7, '0_1': 3, '1': 3, '2': 3, '3': 2, '4': 3, '5': 3, '6': 3,
};

// Default palettes (computed from the original hardcoded HSL values)
const DEFAULTS = {
  '0_0': [hsl(.60,.7,.18), hsl(.55,.6,.35), hsl(.12,.45,.58), hsl(.28,.45,.32), hsl(.33,.55,.18), hsl(.08,.15,.32), [.95,.95,.95]],
  '0_1': [hsl(.08,.05,.65), hsl(.10,.04,.82), hsl(.05,.10,.22)],
  '1':   [hsl(.08,.55,.65), hsl(.05,.4,.32), hsl(.55,.3,.78)],
  '2':   [hsl(.58,.12,.92), hsl(.55,.35,.72), hsl(.55,.55,.30)],
  '3':   [hsl(.60,.85,.12), hsl(.56,.75,.28)],
  '4':   [hsl(.0,.05,.06), hsl(.02,.08,.10), hsl(.04,.12,.15)],
  '5':   [[1.0,.95,.85], [.92,.82,.65], [.35,.20,.10]],
  '6':   [hsl(.08,.05,.55), hsl(.10,.04,.72), hsl(.05,.08,.18)],
};

// Named palette presets
export const PALETTE_PRESETS = {
  // Rocky tectonic
  'Earth':           { key: '0_0', colors: DEFAULTS['0_0'].map(rgb2hex) },
  'Arid Mars':       { key: '0_0', colors: [hsl(.03,.6,.14), hsl(.05,.5,.28), hsl(.08,.5,.52), hsl(.06,.35,.38), hsl(.04,.3,.22), hsl(.02,.12,.30), [.9,.85,.78]].map(rgb2hex) },
  'Alien Purple':    { key: '0_0', colors: [hsl(.75,.7,.15), hsl(.70,.5,.30), hsl(.85,.3,.55), hsl(.78,.5,.35), hsl(.80,.6,.20), hsl(.72,.15,.30), [.95,.92,.98]].map(rgb2hex) },
  'Toxic Green':     { key: '0_0', colors: [hsl(.35,.7,.10), hsl(.38,.6,.25), hsl(.15,.5,.50), hsl(.30,.6,.30), hsl(.32,.5,.15), hsl(.25,.12,.28), [.90,.95,.88]].map(rgb2hex) },
  'Desert':          { key: '0_0', colors: [hsl(.08,.5,.12), hsl(.10,.4,.22), hsl(.10,.45,.55), hsl(.12,.35,.45), hsl(.08,.3,.35), hsl(.06,.15,.30), [.95,.92,.88]].map(rgb2hex) },
  'Frozen':          { key: '0_0', colors: [hsl(.58,.5,.15), hsl(.55,.4,.30), hsl(.60,.2,.65), hsl(.55,.3,.45), hsl(.52,.25,.30), hsl(.50,.10,.35), [.97,.98,1.]].map(rgb2hex) },
  'Volcanic':        { key: '0_0', colors: [hsl(.0,.3,.08), hsl(.02,.2,.15), hsl(.05,.4,.40), hsl(.08,.25,.25), hsl(.03,.2,.15), hsl(.0,.08,.22), [.75,.70,.65]].map(rgb2hex) },
  // Rocky cratered
  'Lunar':           { key: '0_1', colors: DEFAULTS['0_1'].map(rgb2hex) },
  'Dark Moon':       { key: '0_1', colors: [hsl(.08,.04,.45), hsl(.10,.03,.60), hsl(.05,.08,.12)].map(rgb2hex) },
  'Rusty Moon':      { key: '0_1', colors: [hsl(.06,.12,.55), hsl(.08,.10,.70), hsl(.03,.18,.18)].map(rgb2hex) },
  // Gas giant
  'Jupiter':         { key: '1', colors: DEFAULTS['1'].map(rgb2hex) },
  'Hot Gas':         { key: '1', colors: [hsl(.02,.7,.60), hsl(.08,.5,.30), hsl(.95,.4,.70)].map(rgb2hex) },
  'Ice Gas':         { key: '1', colors: [hsl(.55,.4,.65), hsl(.58,.3,.40), hsl(.50,.2,.80)].map(rgb2hex) },
  'Neon':            { key: '1', colors: [hsl(.80,.6,.55), hsl(.85,.5,.30), hsl(.45,.5,.70)].map(rgb2hex) },
  // Ice
  'Europa':          { key: '2', colors: DEFAULTS['2'].map(rgb2hex) },
  'Warm Ice':        { key: '2', colors: [hsl(.08,.10,.90), hsl(.06,.20,.70), hsl(.04,.35,.35)].map(rgb2hex) },
  // Ocean
  'Blue Ocean':      { key: '2', colors: DEFAULTS['3'].map(rgb2hex) },
  'Methane Sea':     { key: '3', colors: [hsl(.45,.7,.10), hsl(.42,.5,.22)].map(rgb2hex) },
  // Lava
  'Basalt':          { key: '4', colors: DEFAULTS['4'].map(rgb2hex) },
  'Obsidian':        { key: '4', colors: [hsl(.70,.05,.04), hsl(.72,.06,.07), hsl(.68,.08,.12)].map(rgb2hex) },
  // Star
  // Asteroid
  'Stony':           { key: '6', colors: DEFAULTS['6'].map(rgb2hex) },
  'Carbonaceous':    { key: '6', colors: [hsl(.06,.06,.35), hsl(.08,.05,.50), hsl(.04,.10,.12)].map(rgb2hex) },
  'Metallic':        { key: '6', colors: [hsl(.10,.08,.60), hsl(.12,.06,.75), hsl(.08,.12,.25)].map(rgb2hex) },
  // Star
  'Solar':           { key: '5', colors: DEFAULTS['5'].map(rgb2hex) },
  'Cool Star':       { key: '5', colors: [[1.0,.75,.55], [.88,.60,.38], [.30,.12,.05]].map(rgb2hex) },
  'Hot Star':        { key: '5', colors: [[.85,.90,1.0], [.70,.78,.95], [.25,.28,.40]].map(rgb2hex) },
};

// Get the default palette (hex array, padded to 8) for an archetype key
export function getDefaultPalette(key) {
  const def = DEFAULTS[key];
  if (!def) return Array(8).fill('#000000');
  const hexes = def.map(rgb2hex);
  while (hexes.length < 8) hexes.push('#000000');
  return hexes;
}

// Generate a random harmonious palette with `count` colors (padded to 8)
export function randomPalette(count) {
  // Pick a random base hue and generate colors with controlled variation
  const baseHue = Math.random();
  const scheme = Math.random(); // 0-0.33: analogous, 0.33-0.66: complementary, 0.66-1: triadic
  const colors = [];
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(count - 1, 1);
    let h;
    if (scheme < 0.33) {
      // Analogous: hues within ±0.15 of base
      h = baseHue + (t - 0.5) * 0.3;
    } else if (scheme < 0.66) {
      // Complementary: half near base, half near base+0.5
      h = (i % 2 === 0) ? baseHue + (Math.random() - 0.5) * 0.08 : baseHue + 0.5 + (Math.random() - 0.5) * 0.08;
    } else {
      // Triadic: spread across 3 hue anchors
      h = baseHue + (i % 3) / 3 + (Math.random() - 0.5) * 0.06;
    }
    h = ((h % 1) + 1) % 1;
    const s = 0.25 + Math.random() * 0.55;
    const l = 0.08 + t * 0.7 + (Math.random() - 0.5) * 0.15;
    colors.push(rgb2hex(hsl(h, s, Math.max(0.05, Math.min(0.92, l)))));
  }
  while (colors.length < 8) colors.push('#000000');
  return colors;
}

// Get palette presets applicable to a given archetype key
export function getPresetsForKey(key) {
  const result = {};
  for (const [name, p] of Object.entries(PALETTE_PRESETS)) {
    if (p.key === key) result[name] = p;
  }
  return result;
}
