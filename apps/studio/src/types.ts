export type DrumInstrument = 'BD' | 'SD' | 'HC' | 'OH' | 'LT' | 'HT';

export interface Step { active: boolean; velocity: number; }
export interface NoteStep { active: boolean; note: string; velocity: number; length: number; }

export interface Pattern {
  id: string;
  name: string;
  drums: Record<DrumInstrument, Step[]>;
  bass: NoteStep[];
  synth: NoteStep[]; // NEW
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

export interface Project {
  name: string;
  bpm: number;
  swing: number;
  patterns: Pattern[];
  arrangement: ArrangementRegion[];

  drumKit?: '808' | '909';
  bassPreset?: string;
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
    };
  };
}