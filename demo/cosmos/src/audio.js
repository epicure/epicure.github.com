import * as Tone from 'tone';

let _master = null;
let _limiter = null;
let _reverb = null;
let _delay = null;
let _presets = null;
let _whooshIn = null;
let _whooshOut = null;
let _whooshFilterIn = null;
let _whooshFilterOut = null;
let _novaDrone = null;
let _novaDroneGain = null;
let _novaChord = null;
let _novaHiss = null;
let _novaHissFilter = null;
let _novaHissGain = null;
let _novaSub = null;
let _instruments = null;
let _built = false;
let _unlocked = false;
let _muted = false;
let _masterDb = -12;

// System-wide musical key (all bodies share scale to avoid clashes)
const SCALES = {
  pentMinor: [0, 3, 5, 7, 10],
  pentMajor: [0, 2, 4, 7, 9],
  lydian:    [0, 2, 4, 6, 7, 9, 11],
  mixo:      [0, 2, 4, 5, 7, 9, 10],
};
const ROOTS = ['C', 'D', 'E', 'F', 'G', 'A'];
let _systemRoot = 'C';
let _systemScale = SCALES.pentMinor;

// Octave offset per archetype from root octave 3
const ARCH_OCT = {
  0:  0,   // Rocky
  1: -2,   // Gas Giant — deep
  2: +2,   // Ice — high bell
  3:  0,   // Ocean
  4: -2,   // Lava
  5: +1,   // Star — bright
  6:  0,   // Asteroid (no pitch used)
};

function buildGraph(){
  _master  = new Tone.Volume(_masterDb);
  _limiter = new Tone.Limiter(-3);
  _master.chain(_limiter, Tone.Destination);

  // Shared reverb bus
  _reverb = new Tone.Reverb({ decay: 4.0, preDelay: 0.02, wet: 1.0 });
  const reverbBus = new Tone.Channel({ volume: 0 });
  reverbBus.receive('reverb');
  reverbBus.chain(_reverb, _master);

  // Shared ping-pong delay bus (for depth & stereo motion)
  _delay = new Tone.PingPongDelay({ delayTime: 0.22, feedback: 0.35, wet: 1.0 });
  const delayBus = new Tone.Channel({ volume: -3 });
  delayBus.receive('delay');
  delayBus.chain(_delay, _master);

  // Shared whoosh layers
  _whooshFilterIn = new Tone.Filter(300, 'lowpass');
  _whooshIn = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.25, decay: 0.35, sustain: 0.0, release: 0.2, attackCurve: 'exponential' },
  });
  const whooshInCh = new Tone.Channel({ volume: -18 }).connect(_master);
  whooshInCh.send('delay', -6);
  whooshInCh.send('reverb', -9);
  _whooshIn.connect(_whooshFilterIn);
  _whooshFilterIn.connect(whooshInCh);

  _whooshFilterOut = new Tone.Filter(4000, 'lowpass');
  _whooshOut = new Tone.NoiseSynth({
    noise: { type: 'pink' },
    envelope: { attack: 0.02, decay: 0.12, sustain: 0.5, release: 0.6, releaseCurve: 'exponential' },
  });
  const whooshOutCh = new Tone.Channel({ volume: -20 }).connect(_master);
  whooshOutCh.send('delay', -6);
  whooshOutCh.send('reverb', -6);
  _whooshOut.connect(_whooshFilterOut);
  _whooshFilterOut.connect(whooshOutCh);

  // Nova charge drone (continuous sub tone; gain driven externally)
  _novaDrone = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.02, decay: 0, sustain: 1, release: 0.3 },
    portamento: 0.05,
  });
  _novaDroneGain = new Tone.Gain(0);
  const droneCh = new Tone.Channel({ volume: -6 }).connect(_master);
  droneCh.send('reverb', -12);
  _novaDrone.chain(_novaDroneGain, droneCh);

  // Nova charge hiss (resonant noise for tension texture)
  _novaHissFilter = new Tone.Filter({ type: 'bandpass', frequency: 300, Q: 7 });
  _novaHiss = new Tone.Noise('white');
  _novaHiss.start();
  _novaHissGain = new Tone.Gain(0);
  const hissCh = new Tone.Channel({ volume: -10 }).connect(_master);
  hissCh.send('delay',  -15);
  hissCh.send('reverb', -9);
  _novaHiss.chain(_novaHissFilter, _novaHissGain, hissCh);

  // Nova bloom chord (bright bell at peak — short, focused)
  _novaChord = new Tone.PolySynth(Tone.FMSynth, {
    harmonicity: 2,
    modulationIndex: 5,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.8, attackCurve: 'linear' },
  });
  const chordCh = new Tone.Channel({ volume: -3 }).connect(_master);
  chordCh.send('reverb', -4);
  chordCh.send('delay',  -9);
  _novaChord.connect(chordCh);

  // Nova sub thump at peak (weight, no transient bite)
  _novaSub = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.005, decay: 0.22, sustain: 0, release: 0.3 },
  });
  const subCh = new Tone.Channel({ volume: -6 }).connect(_master);
  subCh.send('reverb', -15);
  _novaSub.connect(subCh);

  _presets = buildPresets();
  _instruments = buildBodyInstruments();
  _built = true;
}

// 7 mallet-family PolySynth instruments for body hits (per archetype).
function buildBodyInstruments(){
  const I = [];

  // 0 Rocky — FMSynth tuned for warm wooden marimba (triangle carrier + triangle mod)
  {
    const p = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 1.0, modulationIndex: 2.5,
      oscillator: { type: 'triangle' }, modulation: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.7, sustain: 0, release: 0.5 },
      modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.3 },
    });
    const ch = new Tone.Channel({ volume: 2 }).connect(_master);
    ch.send('reverb', -10);
    ch.send('delay',  -13);
    p.connect(ch);
    I[0] = p;
  }

  // 1 Gas Giant — FMSynth with slow Tremolo (airy, sustained vibraphone)
  {
    const p = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2.5, modulationIndex: 5,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.8, sustain: 0.5, release: 3.2 },
      modulationEnvelope: { attack: 0.05, decay: 1.2, sustain: 0.4, release: 2.0 },
    });
    const trem = new Tone.Tremolo({ frequency: 3.5, depth: 0.65 }).start();
    const ch = new Tone.Channel({ volume: 1 }).connect(_master);
    ch.send('reverb', -6);
    ch.send('delay',  -10);
    p.chain(trem, ch);
    I[1] = p;
  }

  // 2 Ice — FMSynth with square modulator (metallic glockenspiel)
  {
    const p = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 5.01, modulationIndex: 16,
      oscillator: { type: 'sine' }, modulation: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.18, sustain: 0, release: 1.8 },
      modulationEnvelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.5 },
    });
    const ch = new Tone.Channel({ volume: 0 }).connect(_master);
    ch.send('reverb', -3);
    ch.send('delay',  -8);
    p.connect(ch);
    I[2] = p;
  }

  // 3 Ocean — AMSynth w/ Chorus (watery rippling)
  {
    const p = new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 1.5,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.015, decay: 0.6, sustain: 0.3, release: 3.0 },
      modulationEnvelope: { attack: 0.8, decay: 0.5, sustain: 0.4, release: 2.0 },
    });
    const chorus = new Tone.Chorus({ frequency: 1.2, delayTime: 4, depth: 0.75 }).start();
    const ch = new Tone.Channel({ volume: 1 }).connect(_master);
    ch.send('reverb', -2);
    ch.send('delay',  -7);
    p.chain(chorus, ch);
    I[3] = p;
  }

  // 4 Lava — FMSynth sawtooth with heavy Distortion (hot/harsh)
  {
    const p = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 1.0, modulationIndex: 12,
      oscillator: { type: 'sawtooth' }, modulation: { type: 'sawtooth' },
      envelope: { attack: 0.003, decay: 0.3, sustain: 0, release: 0.35 },
      modulationEnvelope: { attack: 0.002, decay: 0.15, sustain: 0, release: 0.25 },
    });
    const dist = new Tone.Distortion(0.5);
    const ch = new Tone.Channel({ volume: -1 }).connect(_master);
    ch.send('reverb', -10);
    ch.send('delay',  -16);
    p.chain(dist, ch);
    I[4] = p;
  }

  // 5 Star — FMSynth extreme harmonicity (crotales / tuned bell, very long decay)
  {
    const p = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 7.01, modulationIndex: 20,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.35, sustain: 0.15, release: 4.5 },
      modulationEnvelope: { attack: 0.002, decay: 0.25, sustain: 0, release: 1.5 },
    });
    const ch = new Tone.Channel({ volume: 0 }).connect(_master);
    ch.send('reverb', -1);
    ch.send('delay',  -5);
    p.connect(ch);
    I[5] = p;
  }

  // 6 Asteroid — FMSynth ultra-short click (wood block / temple block)
  {
    const p = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 0.5, modulationIndex: 20,
      oscillator: { type: 'square' }, modulation: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.08 },
      modulationEnvelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.04 },
    });
    const ch = new Tone.Channel({ volume: -3 }).connect(_master);
    ch.send('reverb', -16);
    p.connect(ch);
    I[6] = p;
  }

  return I;
}

function attachChain(synth, filter, sendDbReverb, sendDbDelay){
  const channel = new Tone.Channel({ volume: 0 }).connect(_master);
  channel.send('reverb', sendDbReverb);
  channel.send('delay',  sendDbDelay);
  if(filter){
    synth.connect(filter);
    filter.connect(channel);
  } else {
    synth.connect(channel);
  }
  return channel;
}

function buildPresets(){
  const P = [];

  // 0 Rocky — FM mid with percussive attack
  {
    const s = new Tone.FMSynth({
      harmonicity: 2.5, modulationIndex: 2.5,
      oscillator: { type: 'sine' }, modulation: { type: 'triangle' },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.25, release: 0.8 },
    });
    const f = new Tone.Filter(2200, 'lowpass');
    const ch = attachChain(s, f, -9, -12);
    P[0] = { synth: s, filter: f, channel: ch };
  }

  // 1 Gas Giant — deep saw drone
  {
    const s = new Tone.FMSynth({
      harmonicity: 0.5, modulationIndex: 6,
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.3, decay: 0.5, sustain: 0.45, release: 1.8 },
    });
    const f = new Tone.Filter(550, 'lowpass');
    const ch = attachChain(s, f, -6, -9);
    P[1] = { synth: s, filter: f, channel: ch };
  }

  // 2 Ice — high FM bell
  {
    const s = new Tone.FMSynth({
      harmonicity: 3.01, modulationIndex: 10,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.25, sustain: 0.0, release: 1.8 },
      modulationEnvelope: { attack: 0.005, decay: 0.5, sustain: 0.0, release: 0.5 },
    });
    const ch = attachChain(s, null, -3, -6);
    P[2] = { synth: s, filter: null, channel: ch };
  }

  // 3 Ocean — sine + chorus + lush reverb
  {
    const s = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.2, decay: 0.4, sustain: 0.3, release: 1.5 },
    });
    const f = new Tone.Filter(1500, 'lowpass');
    const chorus = new Tone.Chorus({ frequency: 1.5, delayTime: 4, depth: 0.7 }).start();
    const channel = new Tone.Channel({ volume: 0 }).connect(_master);
    channel.send('reverb', -2);
    channel.send('delay', -9);
    s.connect(f); f.connect(chorus); chorus.connect(channel);
    P[3] = { synth: s, filter: f, channel, chorus };
  }

  // 4 Lava — distorted saw
  {
    const s = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { type: 'lowpass', frequency: 400, Q: 4 },
      envelope: { attack: 0.08, decay: 0.4, sustain: 0.3, release: 0.9 },
    });
    const dist = new Tone.Distortion(0.35);
    const channel = new Tone.Channel({ volume: -2 }).connect(_master);
    channel.send('reverb', -12);
    channel.send('delay', -18);
    s.connect(dist); dist.connect(channel);
    P[4] = { synth: s, filter: null, channel, dist };
  }

  // 5 Star — FM bell, majestic long release
  {
    const s = new Tone.FMSynth({
      harmonicity: 2, modulationIndex: 5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.15, decay: 0.4, sustain: 0.5, release: 2.8 },
    });
    const f = new Tone.Filter(6000, 'lowpass');
    const ch = attachChain(s, f, -4, -6);
    P[5] = { synth: s, filter: f, channel: ch };
  }

  // 6 Asteroid — short noise hit
  {
    const s = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.005, decay: 0.18, sustain: 0, release: 0.4 },
    });
    const f = new Tone.Filter(1400, 'bandpass');
    const ch = attachChain(s, f, -15, -12);
    P[6] = { synth: s, filter: f, channel: ch };
  }

  return P;
}

function pickSystemKey(){
  _systemRoot = ROOTS[Math.floor(Math.random() * ROOTS.length)];
  const names = Object.keys(SCALES);
  _systemScale = SCALES[names[Math.floor(Math.random() * names.length)]];
  // Retune continuous drone to new root (sub register)
  if(_novaDrone){
    try { _novaDrone.setNote(`${_systemRoot}2`); } catch(e){}
  }
}

function pickNote(archetype, bodyParams){
  if(archetype === 6) return null; // no pitch for asteroid
  const offsets = _systemScale;
  const r = bodyParams?.bodyRadius ?? 1;
  const o = bodyParams?.orbitRadius ?? 0.7;
  const seed = Math.floor(r * 13 + o * 17);
  const i = Math.abs(seed) % offsets.length;
  const rootOct = 3 + (ARCH_OCT[archetype] ?? 0);
  const rootNote = `${_systemRoot}${rootOct}`;
  return Tone.Frequency(rootNote).transpose(offsets[i]).toNote();
}

async function unlock(){
  if(_unlocked) return;
  try {
    await Tone.start();
    if(!_built){
      buildGraph();
      pickSystemKey();
    }
    // Start persistent drone (gain 0); controlled via setNovaCharge
    try { _novaDrone.triggerAttack(`${_systemRoot}2`); } catch(e){}
    _unlocked = true;
  } catch(err){
    console.warn('Audio unlock failed:', err);
  }
}

function playTransition(archetype, direction, bodyParams){
  if(!_unlocked || _muted) return;
  if(archetype == null) return;
  const preset = _presets[archetype];
  if(!preset) return;

  const now = Tone.now();
  const isNoise = (archetype === 6);
  const isFocusIn = (direction === 'focusIn');

  // ── Tone envelope per direction ─────────────────────
  const env = preset.synth.envelope;
  if(env && !isNoise){
    if(isFocusIn){
      env.attack = 0.22;
      env.attackCurve = 'exponential';   // reverse-swell feel
      env.release = 0.6;
      env.releaseCurve = 'exponential';
    } else {
      env.attack = 0.03;
      env.attackCurve = 'linear';
      env.release = 1.3;
      env.releaseCurve = 'exponential';
    }
  }

  // ── Detune glide (Doppler-ish) on tonal synths ──────
  if(!isNoise && preset.synth.detune){
    const d = preset.synth.detune;
    try {
      d.cancelScheduledValues(now);
      if(isFocusIn){
        d.setValueAtTime(-500, now);               // ~fourth below
        d.linearRampToValueAtTime(0, now + 0.3);
      } else {
        d.setValueAtTime(0, now);
        d.linearRampToValueAtTime(-500, now + 0.6);
      }
    } catch(e){}
  }

  // ── Release any in-flight voice ─────────────────────
  try { preset.synth.triggerRelease?.(now); } catch(e){}

  // ── Trigger tone ────────────────────────────────────
  try {
    if(isNoise){
      preset.synth.triggerAttackRelease(isFocusIn ? 0.25 : 0.4, now);
    } else {
      const note = pickNote(archetype, bodyParams);
      const dur = isFocusIn ? 0.6 : 0.9;
      preset.synth.triggerAttackRelease(note, dur, now);
    }
  } catch(err){
    console.warn('Audio trigger failed:', err);
  }

  // ── Whoosh layer with filter sweep ──────────────────
  try {
    if(isFocusIn){
      _whooshFilterIn.frequency.cancelScheduledValues(now);
      _whooshFilterIn.frequency.setValueAtTime(300, now);
      _whooshFilterIn.frequency.exponentialRampToValueAtTime(4500, now + 0.45);
      _whooshIn.triggerAttackRelease(0.6, now);
    } else {
      _whooshFilterOut.frequency.cancelScheduledValues(now);
      _whooshFilterOut.frequency.setValueAtTime(4500, now);
      _whooshFilterOut.frequency.exponentialRampToValueAtTime(300, now + 0.55);
      _whooshOut.triggerAttackRelease(0.7, now);
    }
  } catch(e){}
}

function setMasterVolume(db){
  _masterDb = db;
  if(_master) _master.volume.value = db;
}

function setMuted(m){
  _muted = !!m;
  if(_master) _master.mute = _muted;
}

function setSystemKey(){
  pickSystemKey();
}

// Body hit pitch: φ(azimuth) → scale degree, θ(polar) → octave bucket (high/mid/low)
function pickHitNote(archetype, theta, phi){
  const scale = _systemScale;
  const TAU = Math.PI * 2;
  const phiNorm = ((phi % TAU) + TAU) % TAU;
  const scaleIdx = Math.floor((phiNorm / TAU) * scale.length) % scale.length;
  const scaleOffset = scale[scaleIdx];
  const PI = Math.PI;
  let octOffset = 0;
  if(theta < PI / 3)      octOffset = +12;
  else if(theta > 2*PI/3) octOffset = -12;
  const baseOct = 3 + (ARCH_OCT[archetype] ?? 0);
  return Tone.Frequency(`${_systemRoot}${baseOct}`).transpose(octOffset + scaleOffset).toNote();
}

// Triggered on impact-edge + body-at-rest. intensity ∈ [0,1] → slight volume nuance.
function triggerBodyHit(archetype, theta, phi, intensity){
  if(!_unlocked || _muted) return;
  if(archetype == null) return;
  const inst = _instruments?.[archetype];
  if(!inst) return;
  let note;
  try { note = pickHitNote(archetype, theta, phi); } catch(e){ return; }
  if(!note) return;
  const i = Math.min(1, Math.max(0, intensity ?? 0.7));
  const velocity = 0.85 + 0.15 * i; // floor at 85%, up to 100%
  try {
    inst.triggerAttackRelease(note, '4n', Tone.now(), velocity);
  } catch(e){ console.warn('Body hit failed:', e); }
}

// Nova charge: called per frame while user holds both fists.
// p = calibration progress 0..1. Drone joins early (tension), hiss later (bright).
function setNovaCharge(p){
  if(!_unlocked || _muted || !_novaDroneGain) return;
  // Drone: starts at p≈0.1 (~0.2s after fist), quadratic ease-in
  const droneMap = Math.max(0, Math.min(1, (p - 0.1) / 0.9));
  const droneC = droneMap * droneMap;
  // Hiss: joins later at p≈0.3 for rising tension
  const hissMap = Math.max(0, Math.min(1, (p - 0.3) / 0.7));
  const hissC = hissMap * hissMap;
  try {
    _novaDroneGain.gain.rampTo(droneC * 0.7, 0.05);
    if(_novaDrone && _novaDrone.detune){
      _novaDrone.detune.rampTo(droneMap * 400, 0.05); // subtle rise (perfect 3rd-ish)
    }
    if(_novaHissGain){
      _novaHissGain.gain.rampTo(hissC * 0.35, 0.05);
    }
    if(_novaHissFilter){
      _novaHissFilter.frequency.rampTo(300 + hissMap * 2400, 0.08); // 300 → 2700 Hz
    }
  } catch(e){}
}

// Nova burst: short bloom chord + sub thump. Peak coincides with burst, then decays fast.
function playNovaBurst(){
  if(!_unlocked || _muted || !_novaChord) return;
  const now = Tone.now();
  const r     = `${_systemRoot}3`;
  const fifth = Tone.Frequency(r).transpose(7).toNote();
  const oct   = Tone.Frequency(r).transpose(12).toNote();
  const sub   = `${_systemRoot}2`;
  try {
    // Short chord — peaks at burst, tail ~1s
    _novaChord.triggerAttackRelease(r,     0.3, now);
    _novaChord.triggerAttackRelease(fifth, 0.3, now + 0.02);
    _novaChord.triggerAttackRelease(oct,   0.3, now + 0.04);
    // Sub thump at peak — weight without bite
    if(_novaSub) _novaSub.triggerAttackRelease(sub, 0.15, now);
  } catch(e){ console.warn('Nova burst failed:', e); }
  // Snap charge layers off — their energy has been released into the chord
  try {
    if(_novaDroneGain) _novaDroneGain.gain.rampTo(0, 0.08);
    if(_novaHissGain)  _novaHissGain.gain.rampTo(0, 0.08);
  } catch(e){}
}

function isUnlocked(){ return _unlocked; }

export const audio = {
  unlock,
  playTransition,
  setMasterVolume,
  setMuted,
  setSystemKey,
  setNovaCharge,
  playNovaBurst,
  triggerBodyHit,
  isUnlocked,
};
