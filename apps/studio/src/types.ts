export type DrumInstrument = 'BD' | 'SD' | 'HC' | 'OH' | 'LT' | 'HT';

export interface Step { active: boolean; velocity: number; }
export interface NoteStep { active: boolean; note: string; velocity: number; length: number; }

export interface Pattern {
  id: string;
  name: string;
  drums: Record<DrumInstrument, Step[]>;
  bass: NoteStep[];
  synth: NoteStep[];
  samplerSteps?: boolean[][]; // [padId 0-15][step 0-15]
}

export interface ArrangementRegion { id: string; patternId: string; startStep: number; length: number; }

export interface DrumVoiceParams {
  tune: number;
  decay: number;
  mute?: boolean;
  solo?: boolean;
}

export interface ChannelMixer {
  volume: number;
  eq: { low: number; mid: number; high: number };
  reverb?: number;
  delay?: { time: number; feedback: number; mix: number };
}

export interface MasterDelay {
  time: number;
  feedback: number;
  mix: number;
}

// ─── Sampler ────────────────────────────────────────────────────────────────

export interface SamplerEnvelope {
  attack: number;   // 0.001 – 2.0 s
  decay: number;    // 0.001 – 2.0 s
  sustain: number;  // 0.0   – 1.0 (amplitude level)
  release: number;  // 0.001 – 4.0 s
}

export interface SamplerFilter {
  cutoff: number;    // 20 – 20000 Hz
  resonance: number; // 0.0 – 20.0 (Q)
}

/** Serialisable per-pad state. AudioBuffer is held separately in a ref. */
export interface SamplerPad {
  id: number;
  label: string;
  fileName: string | null;
  volume: number;       // 0.0 – 1.5
  pitch: number;        // semitones -24 – +24
  envelope: SamplerEnvelope;
  filter: SamplerFilter;
  mute: boolean;
  solo: boolean;
  color: string;
}

export type PadLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

// ─── Project ─────────────────────────────────────────────────────────────────

export interface Project {
  name: string;
  bpm: number;
  swing: number;
  patterns: Pattern[];
  arrangement: ArrangementRegion[];

  drumKit?: '808' | '909';
  bassPreset?: string;
  synthPreset?: string;
  drumParams?: Record<string, DrumVoiceParams>;
  bassParams?: { waveform: 'sawtooth' | 'square'; octave: number; cutoff: number; resonance: number; envMod: number; decay: number; };
  synthParams?: { octave: number; attack: number; release: number; cutoff: number; detune: number; };

  mixer: {
    drums: ChannelMixer;
    bass: ChannelMixer;
    synth: ChannelMixer;
    master: {
      volume: number;
      drive: number;
      reverb: number;
      delay: MasterDelay;
      compressor?: {
        threshold: number;
        knee: number;
        ratio: number;
        attack: number;
        release: number;
      };
    };
  };
}