import { DrumInstrument, Step, NoteStep } from '../types';

// ─── Public types ─────────────────────────────────────────────────────────────

export type DrumStyle  = 'house' | 'hiphop' | 'techno' | 'dnb';
export type Density    = 'low' | 'mid' | 'high';
export type MusicalKey = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';
export type ScaleName  = 'Minor' | 'Major' | 'Minor Pent' | 'Dorian';

export const MUSICAL_KEYS:    MusicalKey[] = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const SCALE_NAMES:     ScaleName[]  = ['Minor','Major','Minor Pent','Dorian'];
export const DRUM_STYLES:     DrumStyle[]  = ['house','hiphop','techno','dnb'];
export const DRUM_STYLE_LABELS: Record<DrumStyle, string> = {
  house: 'House', hiphop: 'Hip-hop', techno: 'Techno', dnb: 'D&B',
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'] as const;

const KEY_INDEX: Record<MusicalKey, number> = {
  C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11,
};

const SCALE_INTERVALS: Record<ScaleName, number[]> = {
  'Minor':      [0, 2, 3, 5, 7, 8, 10],
  'Major':      [0, 2, 4, 5, 7, 9, 11],
  'Minor Pent': [0, 3, 5, 7, 10],
  'Dorian':     [0, 2, 3, 5, 7, 9, 10],
};

function getScaleNotes(key: MusicalKey, scale: ScaleName): string[] {
  const root = KEY_INDEX[key];
  return SCALE_INTERVALS[scale].map(interval => NOTE_NAMES[(root + interval) % 12]);
}

const r = () => Math.random();
const randInt = (min: number, max: number) => Math.floor(r() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(r() * arr.length)];

/** Humanised velocity: base ± half-spread, clamped 0.2–1.0 */
const humanVel = (base = 0.8, spread = 0.2) =>
  Math.min(1, Math.max(0.2, base + (r() - 0.5) * spread));

// ─── Drum generation ─────────────────────────────────────────────────────────
//
// Each style defines a per-step probability map (0–1) for every drum voice.
// 1.0 = always fires at any density. 0.0 = never fires.
// Density threshold: low=0.75, mid=0.5, high=0.25.
// A step fires when its probability ≥ threshold,
// or randomly when 0 < prob < threshold (weighted chance).

type DrumProbMap = Record<DrumInstrument, number[]>;

const DRUM_PROB_MAPS: Record<DrumStyle, DrumProbMap> = {
  // ── House: 4-on-the-floor kick, snare 2&4, driving 16th hats ──────────────
  house: {
    BD: [1.0, 0.0, 0.0, 0.15, 1.0, 0.0, 0.0, 0.15, 1.0, 0.0, 0.0, 0.15, 1.0, 0.0, 0.3,  0.1 ],
    SD: [0.0, 0.0, 0.0, 0.0,  1.0, 0.0, 0.0, 0.3,  0.0, 0.0, 0.0, 0.0,  1.0, 0.0, 0.35, 0.1 ],
    HC: [0.9, 0.5, 0.9, 0.5,  0.9, 0.5, 0.9, 0.5,  0.9, 0.5, 0.9, 0.5,  0.9, 0.5, 0.9,  0.5 ],
    OH: [0.0, 0.0, 0.6, 0.0,  0.0, 0.0, 0.6, 0.0,  0.0, 0.0, 0.6, 0.0,  0.0, 0.0, 0.6,  0.0 ],
    LT: [0.0, 0.0, 0.0, 0.3,  0.0, 0.0, 0.0, 0.0,  0.0, 0.0, 0.0, 0.3,  0.0, 0.0, 0.0,  0.0 ],
    HT: [0.0, 0.0, 0.0, 0.0,  0.0, 0.3, 0.0, 0.0,  0.0, 0.0, 0.0, 0.0,  0.0, 0.3, 0.0,  0.0 ],
  },

  // ── Hip-hop: syncopated kick, ghost snares, swung 8th hats ───────────────
  hiphop: {
    BD: [1.0, 0.0, 0.0, 0.3,  0.0, 0.0, 0.7, 0.0,  0.0, 0.75, 0.5, 0.0, 0.0, 0.4,  0.3,  0.0 ],
    SD: [0.0, 0.0, 0.0, 0.0,  1.0, 0.0, 0.0, 0.4,  0.0, 0.0,  0.0, 0.0, 1.0, 0.0,  0.0,  0.4 ],
    HC: [0.9, 0.0, 0.65, 0.3, 0.8, 0.0, 0.65, 0.3, 0.8, 0.0,  0.65,0.3, 0.8, 0.0,  0.65, 0.3 ],
    OH: [0.0, 0.0, 0.0, 0.0,  0.0, 0.0, 0.5, 0.0,  0.0, 0.0,  0.0, 0.0, 0.0, 0.0,  0.5,  0.0 ],
    LT: [0.0, 0.0, 0.0, 0.0,  0.0, 0.0, 0.0, 0.0,  0.0, 0.4,  0.3, 0.0, 0.0, 0.0,  0.0,  0.0 ],
    HT: [0.0, 0.0, 0.0, 0.3,  0.0, 0.0, 0.0, 0.3,  0.0, 0.0,  0.0, 0.0, 0.0, 0.0,  0.0,  0.0 ],
  },

  // ── Techno: relentless kick, driving 16th hats, sparse snare ─────────────
  techno: {
    BD: [1.0, 0.0, 0.0, 0.0,  1.0, 0.0, 0.0, 0.4,  1.0, 0.0, 0.0, 0.0,  1.0, 0.0, 0.7,  0.0 ],
    SD: [0.0, 0.0, 0.0, 0.0,  0.9, 0.0, 0.0, 0.0,  0.3, 0.0, 0.0, 0.0,  0.9, 0.0, 0.0,  0.4 ],
    HC: [1.0, 0.8, 1.0, 0.8,  1.0, 0.8, 1.0, 0.8,  1.0, 0.8, 1.0, 0.8,  1.0, 0.8, 1.0,  0.8 ],
    OH: [0.0, 0.0, 0.7, 0.0,  0.0, 0.0, 0.7, 0.0,  0.0, 0.0, 0.7, 0.0,  0.0, 0.0, 0.7,  0.0 ],
    LT: [0.0, 0.0, 0.0, 0.0,  0.0, 0.0, 0.0, 0.4,  0.0, 0.0, 0.0, 0.0,  0.0, 0.0, 0.0,  0.4 ],
    HT: [0.0, 0.0, 0.0, 0.0,  0.0, 0.4, 0.0, 0.0,  0.0, 0.0, 0.0, 0.4,  0.0, 0.0, 0.0,  0.0 ],
  },

  // ── D&B: broken kick, syncopated snare, relentless hats ──────────────────
  dnb: {
    BD: [1.0, 0.0, 0.3, 0.6,  0.0, 0.0, 0.3, 0.0,  0.0, 1.0, 0.0, 0.6,  0.3, 0.0, 0.0,  0.0 ],
    SD: [0.0, 0.0, 0.0, 0.0,  1.0, 0.0, 0.4, 0.0,  0.0, 0.0, 0.6, 0.0,  1.0, 0.0, 0.5,  0.3 ],
    HC: [1.0, 0.8, 1.0, 0.8,  1.0, 0.8, 1.0, 0.8,  1.0, 0.8, 1.0, 0.8,  1.0, 0.8, 1.0,  0.8 ],
    OH: [0.0, 0.0, 0.0, 0.0,  0.5, 0.0, 0.7, 0.0,  0.0, 0.0, 0.0, 0.0,  0.5, 0.0, 0.7,  0.0 ],
    LT: [0.0, 0.0, 0.0, 0.4,  0.0, 0.0, 0.0, 0.0,  0.0, 0.4, 0.3, 0.0,  0.0, 0.0, 0.0,  0.0 ],
    HT: [0.0, 0.0, 0.0, 0.0,  0.0, 0.0, 0.0, 0.4,  0.0, 0.0, 0.0, 0.5,  0.0, 0.0, 0.0,  0.0 ],
  },
};

/** Probability threshold per density: steps with prob ≥ threshold always fire */
const DENSITY_THRESHOLD: Record<Density, number> = { low: 0.75, mid: 0.5, high: 0.25 };

export function generateDrumPattern(
  style: DrumStyle,
  density: Density,
): Record<DrumInstrument, Step[]> {
  const probMap   = DRUM_PROB_MAPS[style];
  const threshold = DENSITY_THRESHOLD[density];
  const instruments: DrumInstrument[] = ['BD', 'SD', 'HC', 'OH', 'LT', 'HT'];

  const result = {} as Record<DrumInstrument, Step[]>;
  for (const inst of instruments) {
    result[inst] = Array.from({ length: 16 }, (_, i) => {
      const prob   = probMap[inst][i];
      const active = prob >= threshold
        ? true
        : prob > 0 && r() < prob / threshold;
      return {
        active,
        velocity: active ? humanVel(0.72 + prob * 0.22) : 0.8,
      };
    });
  }
  return result;
}

// ─── Bass generation ─────────────────────────────────────────────────────────
//
// Each style defines primary (strong-beat) and secondary (off-beat) step pools.
// Steps are picked from the pool then assigned scale notes,
// with root/fifth bias on primary (strong-beat) positions.

const GROOVE_POOLS: Record<DrumStyle, { primary: number[]; secondary: number[] }> = {
  house:  { primary: [0, 4, 8, 12],     secondary: [2, 6, 10, 14, 3, 11]     },
  hiphop: { primary: [0, 6, 10],        secondary: [3, 4, 8, 9, 12, 13]      },
  techno: { primary: [0, 4, 8, 12],     secondary: [2, 6, 10, 14, 7, 15]     },
  dnb:    { primary: [0, 3, 9],         secondary: [4, 6, 8, 11, 12, 14]     },
};

const BASS_COUNT: Record<Density, [number, number]> = {
  low: [3, 5], mid: [5, 8], high: [8, 12],
};

export function generateBassPattern(
  key: MusicalKey,
  scale: ScaleName,
  style: DrumStyle,
  density: Density,
  octave: number,
): NoteStep[] {
  const notes  = getScaleNotes(key, scale);
  const [min, max] = BASS_COUNT[density];
  const count  = randInt(min, max);
  const { primary, secondary } = GROOVE_POOLS[style];

  // Shuffle full pool, bias toward primary positions by placing them first
  const pool    = [...primary.sort(() => r() - 0.5), ...secondary.sort(() => r() - 0.5)];
  const active  = new Set(pool.slice(0, count));

  // Find fifth index in scale intervals (semitone 7)
  const fifthDeg = SCALE_INTERVALS[scale].findIndex(n => n === 7);

  return Array.from({ length: 16 }, (_, i) => {
    if (!active.has(i)) return { active: false, note: '', velocity: 0.8, length: 1 };

    const isStrong = primary.includes(i);
    let note: string;
    if (isStrong && r() < 0.55)                      note = notes[0];                  // root
    else if (r() < 0.25 && fifthDeg >= 0)            note = notes[fifthDeg];           // fifth
    else                                              note = pick(notes);

    return { active: true, note: `${note}${octave}`, velocity: humanVel(), length: 1 };
  });
}

// ─── Synth generation ─────────────────────────────────────────────────────────
//
// Sparse, atmosphere-first. Chord tones (root/3rd/5th) preferred.
// Steps anchored to bar-start positions and expanded outward by density.

const SYNTH_STEP_PRIORITY = [0, 8, 4, 12, 2, 6, 10, 14, 1, 3, 5, 7, 9, 11, 13, 15];

const SYNTH_COUNT: Record<Density, [number, number]> = {
  low: [2, 3], mid: [3, 5], high: [5, 7],
};

export function generateSynthPattern(
  key: MusicalKey,
  scale: ScaleName,
  _style: DrumStyle,
  density: Density,
  octave: number,
): NoteStep[] {
  const notes  = getScaleNotes(key, scale);
  const [min, max] = SYNTH_COUNT[density];
  const count  = randInt(min, max);

  // Shuffle within each priority tier so it's never identical
  const shuffled = [...SYNTH_STEP_PRIORITY].sort(() => r() - 0.5);
  const active   = new Set(shuffled.slice(0, count));

  // Chord tones: root, 3rd degree, 5th degree of the scale (if they exist)
  const chordTones = [0, 2, 4].map(idx => notes[idx]).filter(Boolean);

  return Array.from({ length: 16 }, (_, i) => {
    if (!active.has(i)) return { active: false, note: '', velocity: 0.6, length: 4 };
    const note = r() < 0.68 && chordTones.length ? pick(chordTones) : pick(notes);
    return { active: true, note: `${note}${octave}`, velocity: humanVel(0.65, 0.15), length: 4 };
  });
}

// ─── Sampler generation ───────────────────────────────────────────────────────
//
// Each loaded pad is assigned a rhythmic groove role (cycled through the style's
// groove pool) so different pads land on complementary subdivisions.

const PAD_GROOVES: Record<DrumStyle, number[][]> = {
  house:  [[0, 4, 8, 12], [2, 6, 10, 14], [1, 5, 9, 13], [3, 7, 11, 15]],
  hiphop: [[0, 10],        [4, 12],         [6, 9, 14],    [3, 7, 11]    ],
  techno: [[0, 4, 8, 12], [2, 6, 10, 14], [1, 3, 9, 11], [5, 7, 13, 15]],
  dnb:    [[0, 9],         [4, 12],         [3, 6, 11],    [2, 7, 10, 14]],
};

const SAMPLER_COUNT: Record<Density, [number, number]> = {
  low: [2, 4], mid: [4, 7], high: [7, 11],
};

export function generateSamplerSteps(
  loadedPadIds: number[],
  style: DrumStyle,
  density: Density,
): boolean[][] {
  const [min, max] = SAMPLER_COUNT[density];
  const grooves    = PAD_GROOVES[style];

  return Array.from({ length: 16 }, (_, padId) => {
    const padIndex = loadedPadIds.indexOf(padId);
    if (padIndex === -1) return Array(16).fill(false);

    const baseGroove  = grooves[padIndex % grooves.length];
    const count       = randInt(min, max);
    const extraSteps  = Array.from({ length: 16 }, (_, i) => i)
      .filter(i => !baseGroove.includes(i))
      .sort(() => r() - 0.5);

    const pool      = [...baseGroove.sort(() => r() - 0.5), ...extraSteps];
    const activeSet = new Set(pool.slice(0, count));
    return Array.from({ length: 16 }, (_, i) => activeSet.has(i));
  });
}
