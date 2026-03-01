import { Project, Pattern } from './types';

export const BASS_PRESETS: Record<string, { waveform: 'sawtooth' | 'square'; octave: number; cutoff: number; resonance: number; envMod: number; decay: number }> = {
  '303':   { waveform: 'sawtooth', octave: 2, cutoff: 0.35, resonance: 0.75, envMod: 0.8,  decay: 0.3  },
  'ORGAN': { waveform: 'square',   octave: 3, cutoff: 0.70, resonance: 0.05, envMod: 0.05, decay: 0.7  },
  'WOBBLE':{ waveform: 'sawtooth', octave: 2, cutoff: 0.20, resonance: 0.65, envMod: 0.6,  decay: 0.15 },
  'SUB':   { waveform: 'square',   octave: 1, cutoff: 0.18, resonance: 0.05, envMod: 0.05, decay: 0.9  },
};

export const SYNTH_PRESETS: Record<string, { octave: number; attack: number; release: number; cutoff: number; detune: number }> = {
  'ORGANIC':  { octave: 4, attack: 0.35, release: 0.55, cutoff: 0.55, detune: 0.2  },
  'METAL':    { octave: 4, attack: 0.05, release: 0.25, cutoff: 0.85, detune: 0.75 },
  'HEAVENLY': { octave: 5, attack: 0.65, release: 0.80, cutoff: 0.45, detune: 0.4  },
  'TEXTURED': { octave: 3, attack: 0.25, release: 0.50, cutoff: 0.25, detune: 0.85 },
};

export const DRUM_KIT_PROFILES = {
  '808': {
    BD: { freqMult: 1.0, decayMult: 1.2 },
    SD: { freqMult: 1.0, decayMult: 1.15 },
    HC: { freqMult: 0.8, decayMult: 1.1 },
    OH: { freqMult: 0.9, decayMult: 1.3 },
    LT: { freqMult: 0.75, decayMult: 1.4 },
    HT: { freqMult: 0.65, decayMult: 1.2 },
  },
  '909': {
    BD: { freqMult: 0.85, decayMult: 0.7 },
    SD: { freqMult: 1.2, decayMult: 0.8 },
    HC: { freqMult: 1.25, decayMult: 0.5 },
    OH: { freqMult: 1.1, decayMult: 0.7 },
    LT: { freqMult: 1.3, decayMult: 0.6 },
    HT: { freqMult: 1.2, decayMult: 0.6 },
  }
} as const;

export const INITIAL_PATTERN = (id: string, name: string): Pattern => ({
  id,
  name,
  drums: {
    BD: Array(16).fill({ active: false, velocity: 0.8 }),
    SD: Array(16).fill({ active: false, velocity: 0.8 }),
    HC: Array(16).fill({ active: false, velocity: 0.8 }),
    OH: Array(16).fill({ active: false, velocity: 0.8 }),
    LT: Array(16).fill({ active: false, velocity: 0.8 }),
    HT: Array(16).fill({ active: false, velocity: 0.8 }),
  },
  bass: Array(16).fill({ active: false, note: '', velocity: 0.8, length: 1 }),
  synth: Array(16).fill({ active: false, note: '', velocity: 0.6, length: 4 }),
  samplerSteps: Array.from({ length: 16 }, () => Array(16).fill(false)),
});

export const INITIAL_PROJECT: Project = {
  name: 'Untitled Project',
  bpm: 120,
  swing: 0,
  patterns: [INITIAL_PATTERN('p1', 'Pattern 1')],
  arrangement: [{ id: 'a1', patternId: 'p1', startStep: 0, length: 16 }],
  drumKit: '808',
  mixer: {
    drums: { volume: 0.8, eq: { low: 0, mid: 0, high: 0 }, reverb: 0, delay: { time: 0.3, feedback: 0.3, mix: 0 } },
    bass: { volume: 0.8, eq: { low: 0, mid: 0, high: 0 }, reverb: 0, delay: { time: 0.3, feedback: 0.3, mix: 0 } },
    synth: { volume: 0.7, eq: { low: 0, mid: 0, high: 0 }, reverb: 0, delay: { time: 0.3, feedback: 0.3, mix: 0 } },
    master: { volume: 1.0, drive: 0, reverb: 0.2, delay: { time: 0.3, feedback: 0.3, mix: 0 }, compressor: { threshold: -12, knee: 6, ratio: 4, attack: 0.003, release: 0.25 } }
  },
  bassParams: { waveform: 'sawtooth', octave: 2, cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 },
  synthParams: { octave: 4, attack: 0.5, release: 0.5, cutoff: 0.5, detune: 0.5 }
};