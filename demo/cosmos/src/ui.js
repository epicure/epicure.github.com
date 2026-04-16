import { P } from './params.js';
import { PRESETS, applyPreset } from './presets.js';
import { randomizeParams } from './randomize.js';
import { PALETTE_LABELS, getPresetsForKey, getPaletteKey, getDefaultPalette, randomPalette } from './palette.js';

const BAKE_KEYS = new Set([
  'seed', 'archetype', 'rockyMode', 'hue',
  'amp', 'seaLevel', 'plateFreq', 'warp', 'mountains',
  'craters', 'craterL', 'craterM', 'craterS', 'craterScale',
  'normalStrength',
  'crackFreq', 'crackIntensity',
  'lunarLightness', 'lunarSaturation',
  'lavaLevel', 'lavaGlow', 'lavaFreq',
  'palette',
  'bands', 'bandShear', 'stormDensity', 'stormSize',
  'starTemp', 'granulation', 'sunspotDensity', 'granuleEdge',
]);

const ARCHETYPE_NAMES = ['Rocky','Gas Giant','Ice','Ocean','Lava','Star','Asteroid'];
const ui = document.getElementById('ui');

export function makeUI(ctx){
  const rebuildUI = () => _rebuild(ctx, rebuildUI);
  rebuildUI();
  return rebuildUI;
}

function _rebuild(ctx, rebuildUI){
  const { generateSystem, focusOn, buildPlanet, buildAtmosphere,
          updateRuntime, updateFull, updateBloomParams, exportPNG,
          getSystem, getFocusIndex } = ctx;

  const system = getSystem();
  const fi = getFocusIndex();
  const focused = fi >= 0 && fi < system.bodies.length;
  const updateFor = (key) => BAKE_KEYS.has(key) ? updateFull : updateRuntime;

  ui.innerHTML = '';

  // ── helpers ──
  const section = (t) => {
    const h = document.createElement('h3'); h.textContent = t; ui.appendChild(h);
  };

  const slider = (label, key, min, max, step, onChange) => {
    const row = document.createElement('div'); row.className = 'row';
    const l = document.createElement('label'); l.textContent = label;
    const r = document.createElement('input'); r.type = 'range';
    r.min = min; r.max = max; r.step = step; r.value = P[key];
    const v = document.createElement('span'); v.className = 'val';
    v.textContent = (+P[key]).toFixed(step < 1 ? 2 : 0);
    const doUpdate = updateFor(key);
    r.oninput = () => {
      P[key] = +r.value;
      v.textContent = (+P[key]).toFixed(step < 1 ? 2 : 0);
      if(onChange) onChange();
      doUpdate();
    };
    row.append(l, r, v); ui.appendChild(row);
  };

  const bloomSlider = (label, key, min, max, step) => {
    const row = document.createElement('div'); row.className = 'row';
    const l = document.createElement('label'); l.textContent = label;
    const r = document.createElement('input'); r.type = 'range';
    r.min = min; r.max = max; r.step = step; r.value = P[key];
    const v = document.createElement('span'); v.className = 'val';
    v.textContent = (+P[key]).toFixed(step < 1 ? 2 : 0);
    r.oninput = () => {
      P[key] = +r.value;
      v.textContent = (+P[key]).toFixed(step < 1 ? 2 : 0);
      updateBloomParams();
    };
    row.append(l, r, v); ui.appendChild(row);
  };

  const selectCtrl = (label, key, options, onChange) => {
    const row = document.createElement('div'); row.className = 'row';
    const l = document.createElement('label'); l.textContent = label;
    const s = document.createElement('select');
    options.forEach((o, i) => {
      const op = document.createElement('option'); op.value = i; op.textContent = o; s.appendChild(op);
    });
    s.value = P[key];
    const doUpdate = updateFor(key);
    s.onchange = () => { P[key] = +s.value; if(onChange) onChange(); doUpdate(); };
    row.append(l, s); ui.appendChild(row);
  };

  const toggle = (label, key, onChange) => {
    const row = document.createElement('div'); row.className = 'row';
    const l = document.createElement('label'); l.textContent = label;
    const c = document.createElement('input'); c.type = 'checkbox'; c.checked = P[key];
    c.onchange = () => { P[key] = c.checked; if(onChange) onChange(); };
    row.append(l, c); ui.appendChild(row);
  };

  const colorPicker = (label, key, onChange) => {
    const row = document.createElement('div'); row.className = 'row';
    const l = document.createElement('label'); l.textContent = label;
    const c = document.createElement('input'); c.type = 'color';
    c.value = P[key] || '#000000';
    c.style.flex = '1'; c.style.height = '20px';
    c.style.border = '1px solid #333'; c.style.background = 'none'; c.style.cursor = 'pointer';
    c.oninput = () => { P[key] = c.value; if(onChange) onChange(); };
    row.append(l, c); ui.appendChild(row);
  };

  // ═══════════════ System ═══════════════
  section('System');
  {
    const row = document.createElement('div'); row.className = 'row';
    const l = document.createElement('label'); l.textContent = 'Planets';
    const s = document.createElement('select');
    [4, 5, 6].forEach(n => {
      const o = document.createElement('option'); o.value = n; o.textContent = n; s.appendChild(o);
    });
    s.value = 5;
    const b = document.createElement('button'); b.textContent = 'Generate System'; b.style.flex = '1';
    b.onclick = () => generateSystem(+s.value);
    row.append(l, s, b); ui.appendChild(row);
  }
  {
    const row = document.createElement('div'); row.className = 'row';
    const sp = document.createElement('span');
    sp.id = 'bake-progress'; sp.style.color = '#8af'; sp.style.fontSize = '11px';
    row.appendChild(sp); ui.appendChild(row);
  }

  // ═══════════════ Navigation ═══════════════
  if(system.bodies.length > 0){
    section('Navigation');
    {
      const row = document.createElement('div'); row.className = 'row';
      row.style.justifyContent = 'center'; row.style.gap = '8px';
      const prev = document.createElement('button'); prev.textContent = '◀'; prev.style.width = '36px';
      prev.onclick = () => {
        if(fi <= 0) focusOn(system.bodies.length - 1);
        else focusOn(fi - 1);
      };
      const lbl = document.createElement('span');
      lbl.style.flex = '1'; lbl.style.textAlign = 'center'; lbl.style.lineHeight = '24px';
      if(fi < 0) lbl.textContent = 'Overview';
      else if(fi === 0) lbl.textContent = '★ Star';
      else lbl.textContent = `Planet ${fi} (${ARCHETYPE_NAMES[system.bodies[fi].params.archetype]})`;
      const next = document.createElement('button'); next.textContent = '▶'; next.style.width = '36px';
      next.onclick = () => {
        if(fi >= system.bodies.length - 1) focusOn(0);
        else focusOn(fi + 1);
      };
      row.append(prev, lbl, next); ui.appendChild(row);
    }
    {
      const row = document.createElement('div'); row.className = 'row'; row.style.gap = '4px';
      const ov = document.createElement('button'); ov.textContent = 'Overview'; ov.style.flex = '1';
      ov.onclick = () => focusOn(-1);
      if(fi < 0){ ov.style.background = '#446'; ov.style.color = '#cdf'; }
      const orb = document.createElement('button'); orb.style.flex = '1';
      orb.textContent = system.showOrbits ? 'Orbits ✓' : 'Orbits ✗';
      orb.onclick = () => { system.toggleOrbits(); rebuildUI(); };
      row.append(ov, orb); ui.appendChild(row);
    }
  }

  // ═══════════════ Bloom (global) ═══════════════
  section('Bloom');
  bloomSlider('Strength', 'bloomStrength', 0, 3, 0.05);
  bloomSlider('Radius', 'bloomRadius', 0, 1.5, 0.02);
  bloomSlider('Threshold', 'bloomThreshold', 0, 1.5, 0.02);

  // ═══════════════ Body (when focused) ═══════════════
  if(!focused) return;

  // Identity
  section('Identity');
  {
    const row = document.createElement('div'); row.className = 'row';
    const l = document.createElement('label'); l.textContent = 'Preset';
    const s = document.createElement('select');
    const opt0 = document.createElement('option'); opt0.textContent = '— choose —'; opt0.value = ''; s.appendChild(opt0);
    Object.keys(PRESETS).forEach(n => {
      const o = document.createElement('option'); o.value = n; o.textContent = n; s.appendChild(o);
    });
    s.onchange = () => { if(s.value) applyPreset(s.value, { rebuildUI, buildPlanet, buildAtmosphere, updateFull }); };
    row.append(l, s); ui.appendChild(row);
  }
  {
    const row = document.createElement('div'); row.className = 'row';
    const l = document.createElement('label'); l.textContent = 'Seed';
    const inp = document.createElement('input'); inp.type = 'number'; inp.value = P.seed; inp.style.flex = '1';
    inp.onchange = () => { P.seed = +inp.value; buildPlanet(); };
    row.append(l, inp); ui.appendChild(row);
  }
  {
    const row = document.createElement('div'); row.className = 'row';
    const l = document.createElement('label'); l.textContent = 'Randomize';
    const b = document.createElement('button'); b.textContent = '🎲 Shuffle'; b.style.flex = '1';
    b.onclick = () => randomizeParams({ rebuildUI, buildPlanet, buildAtmosphere, updateFull });
    row.append(l, b); ui.appendChild(row);
  }

  // Archetype (only for planets — index > 0)
  if(fi > 0){
    selectCtrl('Archetype', 'archetype', ARCHETYPE_NAMES, () => {
      P.palette = getDefaultPalette(getPaletteKey(P.archetype, P.rockyMode));
      if(P.archetype === 6){ P.craterM = 0; P.craterS = 0; }
      buildPlanet(); buildAtmosphere(); rebuildUI();
    });
  }
  slider('Hue shift', 'hue', -180, 180, 1);

  // Palette
  {
    section('Palette');
    const palKey = getPaletteKey(P.archetype, P.rockyMode);
    const labels = PALETTE_LABELS[palKey] || [];
    const presets = getPresetsForKey(palKey);

    const pRow = document.createElement('div'); pRow.className = 'row';
    const pLabel = document.createElement('label'); pLabel.textContent = 'Palette';
    const pSel = document.createElement('select');
    const pOpt0 = document.createElement('option'); pOpt0.textContent = '— custom —'; pOpt0.value = ''; pSel.appendChild(pOpt0);
    Object.keys(presets).forEach(n => {
      const o = document.createElement('option'); o.value = n; o.textContent = n; pSel.appendChild(o);
    });
    pSel.onchange = () => {
      if(!pSel.value) return;
      const preset = presets[pSel.value];
      if(!preset) return;
      const colors = [...preset.colors];
      while(colors.length < 8) colors.push('#000000');
      P.palette = colors;
      rebuildUI(); updateFull();
    };
    pRow.append(pLabel, pSel); ui.appendChild(pRow);

    labels.forEach((name, i) => {
      const row = document.createElement('div'); row.className = 'row';
      const l = document.createElement('label'); l.textContent = name;
      const c = document.createElement('input'); c.type = 'color';
      c.value = P.palette[i] || '#000000';
      c.style.flex = '1'; c.style.height = '20px';
      c.style.border = '1px solid #333'; c.style.background = 'none'; c.style.cursor = 'pointer';
      c.oninput = () => { P.palette[i] = c.value; updateFull(); };
      row.append(l, c); ui.appendChild(row);
    });

    const rRow = document.createElement('div'); rRow.className = 'row'; rRow.style.gap = '4px';
    const rLabel = document.createElement('label'); rLabel.textContent = '';
    const rBtn = document.createElement('button'); rBtn.textContent = 'Reset'; rBtn.style.flex = '1';
    rBtn.onclick = () => { P.palette = getDefaultPalette(palKey); rebuildUI(); updateFull(); };
    const randBtn = document.createElement('button'); randBtn.textContent = 'Randomize'; randBtn.style.flex = '1';
    randBtn.onclick = () => { P.palette = randomPalette(labels.length); rebuildUI(); updateFull(); };
    rRow.append(rLabel, rBtn, randBtn); ui.appendChild(rRow);
  }

  // Detail
  {
    const row = document.createElement('div'); row.className = 'row';
    const l = document.createElement('label'); l.textContent = 'Detail';
    const s = document.createElement('select');
    [4, 5, 6, 7].forEach(v => {
      const o = document.createElement('option'); o.value = v; o.textContent = 'Subdiv ' + v; s.appendChild(o);
    });
    s.value = P.detail;
    s.onchange = () => { P.detail = +s.value; buildPlanet(); };
    row.append(l, s); ui.appendChild(row);
  }

  // ── Archetype-specific sections ──
  if(P.archetype === 0){
    {
      const row = document.createElement('div'); row.className = 'row';
      const l = document.createElement('label'); l.textContent = 'Rocky mode';
      const s = document.createElement('select');
      [['Tectonic', 0], ['Cratered', 1]].forEach(([t, v]) => {
        const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o);
      });
      s.value = P.rockyMode;
      s.onchange = () => {
        P.rockyMode = +s.value;
        P.palette = getDefaultPalette(getPaletteKey(P.archetype, P.rockyMode));
        rebuildUI(); buildPlanet(); updateFull();
      };
      row.append(l, s); ui.appendChild(row);
    }
    if(P.rockyMode === 0){
      section('Terrain (Tectonic)');
      slider('Amplitude', 'amp', 0, 0.08, 0.001);
      slider('Sea level', 'seaLevel', -0.3, 0.3, 0.01);
      slider('Plate freq', 'plateFreq', 0.5, 6, 0.1);
      slider('Domain warp', 'warp', 0, 2, 0.05);
      slider('Mountains', 'mountains', 0, 2, 0.05);
    } else {
      section('Terrain (Cratered)');
      slider('Amplitude', 'amp', 0, 0.08, 0.001);
      slider('Crater size', 'craterScale', 0.5, 3.0, 0.05);
      slider('Large craters', 'craterL', 0, 1, 0.02);
      slider('Medium craters', 'craterM', 0, 1, 0.02);
      slider('Small craters', 'craterS', 0, 1, 0.02);
      slider('Lunar lightness', 'lunarLightness', 0, 1, 0.02);
      slider('Lunar saturation', 'lunarSaturation', 0, 2, 0.05);
    }
  } else if(P.archetype === 1){
    section('Gas Giant');
    slider('Bands', 'bands', 2, 10, 1);
    slider('Band shear', 'bandShear', 0, 0.3, 0.01);
    slider('Dynamics', 'dynamics', 0, 1, 0.02);
    slider('Storm density', 'stormDensity', 0, 0.6, 0.02);
    slider('Storm size', 'stormSize', 0.3, 2.5, 0.05);
  } else if(P.archetype === 2){
    section('Ice');
    slider('Amplitude', 'amp', 0, 0.06, 0.001);
    slider('Plate freq', 'plateFreq', 0.5, 6, 0.1);
    slider('Domain warp', 'warp', 0, 2, 0.05);
    slider('Crack freq', 'crackFreq', 2, 30, 0.5);
    slider('Crack intensity', 'crackIntensity', 0, 1, 0.02);
    slider('Specular', 'iceSheen', 0, 1, 0.02);
  } else if(P.archetype === 3){
    section('Ocean');
    slider('Amplitude', 'amp', 0, 0.04, 0.001);
    slider('Ocean speed', 'oceanSpeed', 0, 5, 0.1);
    slider('Foam', 'oceanFoam', 0, 2, 0.05);
    slider('Sheen', 'oceanSheen', 0, 1, 0.02);
    slider('Depth tint', 'oceanDepthTint', 0, 1, 0.02);
    slider('Subsurface', 'oceanSSS', 0, 2, 0.05);
  } else if(P.archetype === 4){
    section('Lava');
    slider('Amplitude', 'amp', 0, 0.08, 0.001);
    slider('Plate freq', 'plateFreq', 0.5, 6, 0.1);
    slider('Domain warp', 'warp', 0, 2, 0.05);
    slider('Mountains', 'mountains', 0, 2, 0.05);
    slider('Lava level', 'lavaLevel', -0.3, 0.3, 0.01);
    slider('Lava glow', 'lavaGlow', 0, 4, 0.1);
    slider('Lava freq', 'lavaFreq', 1, 8, 0.1);
  } else if(P.archetype === 5){
    section('Star');
    slider('Temperature (K)', 'starTemp', 2400, 40000, 100);
    slider('Granulation', 'granulation', 0, 1, 0.02);
    slider('Sunspot density', 'sunspotDensity', 0, 0.6, 0.02);
    slider('Limb darkening', 'limbDarkening', 0.1, 1.5, 0.02);
    slider('Granule edge', 'granuleEdge', 0.8, 2.0, 0.02);
    slider('Brightness', 'starBrightness', 0.5, 4.0, 0.05);
  } else if(P.archetype === 6){
    section('Asteroid');
    slider('Elongation', 'elongation', 0, 1, 0.02);
    slider('Bumpiness', 'bumpiness', 0, 1, 0.02);
    slider('Amplitude', 'amp', 0, 0.08, 0.001);
    slider('Crater size', 'craterScale', 0.5, 3.0, 0.05);
    slider('Large craters', 'craterL', 0, 2, 0.02);
    slider('Medium craters', 'craterM', 0, 1, 0.02);
    slider('Small craters', 'craterS', 0, 1, 0.02);
    slider('Lightness', 'lunarLightness', 0, 1, 0.02);
    slider('Saturation', 'lunarSaturation', 0, 2, 0.05);
    slider('Normal strength', 'normalStrength', -20, 20, 0.5);
  }

  // Surface modifiers
  if(P.archetype !== 1 && P.archetype !== 5 && P.archetype !== 6){
    section('Surface Modifiers');
    if(!(P.archetype === 0 && P.rockyMode === 1)) slider('Craters', 'craters', 0, 1, 0.02);
    slider('Polar caps', 'polarCaps', 0, 1, 0.02);
    slider('Normal strength', 'normalStrength', -20, 20, 0.5);
  }

  // Atmosphere (not for star / asteroid)
  if(P.archetype !== 5 && P.archetype !== 6){
    section('Atmosphere');
    toggle('Haze', 'hazeOn', () => buildAtmosphere());
    slider('Haze density', 'haze', 0, 1, 0.02);
    toggle('Clouds', 'cloudsOn', () => buildAtmosphere());
    slider('Cloud coverage', 'cloudCov', 0, 1, 0.02);
    slider('Cloud wind', 'cloudWind', 0, 5, 0.1);
    slider('Cloud flow speed', 'cloudFlowSpeed', 0, 3, 0.05);
    slider('Cloud density', 'cloudDens', 0, 1.5, 0.05);
    slider('Cloud hue', 'cloudHue', 0, 1, 0.01);
    slider('Cloud sat', 'cloudSat', 0, 1, 0.02);
    toggle('Scatter', 'scatterOn', () => buildAtmosphere());
    slider('Scatter density', 'scatter', 0, 2, 0.05);
    slider('Rayleigh', 'rayleigh', 0, 2, 0.05);
    toggle('Exosphere', 'exoOn', () => buildAtmosphere());
    slider('Exo density', 'exo', 0, 1, 0.02);

    section('Atmosphere Colors');
    colorPicker('Haze color', 'hazeColor', () => buildAtmosphere());
    colorPicker('Scatter color', 'scatterColor', () => buildAtmosphere());
    colorPicker('Exo color', 'exoColor', () => buildAtmosphere());
    {
      const row = document.createElement('div'); row.className = 'row'; row.style.gap = '4px';
      const l = document.createElement('label'); l.textContent = '';
      const randBtn = document.createElement('button'); randBtn.textContent = 'Randomize'; randBtn.style.flex = '1';
      randBtn.onclick = () => {
        const baseH = Math.random();
        const spread = 0.05 + Math.random() * 0.1;
        const hsl2hex = (h, s, ll) => {
          const rgb = [0, 4, 2].map(off => {
            const k = (h * 6 + off) % 6;
            return Math.max(0, Math.min(1, Math.abs(k - 3) - 1));
          }).map(v => Math.max(0, Math.min(1, ll + s * (v - 0.5) * (1 - Math.abs(2 * ll - 1)))));
          return '#' + rgb.map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
        };
        P.hazeColor = hsl2hex(baseH, 0.2 + Math.random() * 0.4, 0.4 + Math.random() * 0.3);
        P.scatterColor = hsl2hex((baseH + spread) % 1, 0.3 + Math.random() * 0.5, 0.4 + Math.random() * 0.3);
        P.exoColor = hsl2hex((baseH + spread * 2) % 1, 0.3 + Math.random() * 0.4, 0.3 + Math.random() * 0.3);
        rebuildUI(); buildAtmosphere();
      };
      row.append(l, randBtn); ui.appendChild(row);
    }

    section('Rings');
    toggle('Enable rings', 'ringsOn', () => buildAtmosphere());
    slider('Inner radius', 'ringInner', 1.1, 3.0, 0.01, () => buildAtmosphere());
    slider('Outer radius', 'ringOuter', 1.3, 5.0, 0.01, () => buildAtmosphere());
    slider('Density', 'ringDensity', 0, 2, 0.02);
    slider('Hue', 'ringHue', 0, 1, 0.01);
    slider('Tilt (°)', 'ringTilt', -90, 90, 1);
    {
      const row = document.createElement('div'); row.className = 'row';
      const l = document.createElement('label'); l.textContent = 'Seed';
      const inp = document.createElement('input'); inp.type = 'number'; inp.value = P.ringSeed; inp.style.flex = '1';
      inp.onchange = () => { P.ringSeed = +inp.value; buildAtmosphere(); };
      row.append(l, inp); ui.appendChild(row);
    }
  }

  // Rotation
  section('Rotation');
  toggle('Spin', 'rotateOn');
  slider('Speed', 'rotSpeed', 0, 1.5, 0.01);
  {
    const row = document.createElement('div'); row.className = 'row';
    const l = document.createElement('label'); l.textContent = 'Direction';
    const s = document.createElement('select');
    [['Prograde (+)', 1], ['Retrograde (−)', -1]].forEach(([t, v]) => {
      const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o);
    });
    s.value = P.rotDir;
    s.onchange = () => { P.rotDir = +s.value; };
    row.append(l, s); ui.appendChild(row);
  }
  slider('Axial tilt (°)', 'axialTilt', -180, 180, 1);

  // Lighting — only ambient (sun direction/color from star)
  if(P.archetype !== 5){
    section('Lighting');
    slider('Ambient', 'ambient', 0, 0.3, 0.005);
  }

  // Export
  section('Export');
  {
    const row = document.createElement('div'); row.className = 'row';
    const l = document.createElement('label'); l.textContent = 'Resolution';
    const s = document.createElement('select');
    [[1024, '1024'], [2048, '2048'], [4096, '4096']].forEach(([v, t]) => {
      const o = document.createElement('option'); o.value = v; o.textContent = t + 'px'; s.appendChild(o);
    });
    s.value = 2048;
    const b = document.createElement('button'); b.textContent = 'Download PNG'; b.style.flex = '1';
    b.onclick = () => { exportPNG(+s.value); };
    row.append(l, s, b); ui.appendChild(row);
  }
}
