# Data Model

All TypeScript interfaces are in `apps/studio/src/types.ts`. Initial values are in `apps/studio/src/constants.ts`.

---

## Type Definitions

### `DrumInstrument`

```typescript
type DrumInstrument = 'BD' | 'SD' | 'HC' | 'OH' | 'LT' | 'HT';
```

The six drum voices. Also used as keys in `pattern.drums` and `project.drumParams`.

Display names in `PatternEditor`:
| Value | Display | Voice |
|---|---|---|
| `BD` | BD | Kick |
| `SD` | SD | Snare |
| `HC` | HC | Closed Hat |
| `OH` | OH | Open Hat |
| `LT` | LT | Long Tom |
| `HT` | HT | High Tom / Rim |

---

### `Step`

```typescript
interface Step {
  active: boolean;
  velocity: number;   // 0–1, default 0.8 for drums
}
```

Used for drum track steps. `note` is not stored here — drum instruments have fixed pitch (controlled by `tune` in `DrumVoiceParams`).

---

### `NoteStep`

```typescript
interface NoteStep {
  active: boolean;
  note: string;       // e.g. "C2", "A#4"
  velocity: number;   // 0–1
  length: number;     // step count (bass default: 1, synth default: 4)
}
```

Used for bass and synth steps. When `active` is false, `note` may be an empty string `''`.

---

### `Pattern`

```typescript
interface Pattern {
  id: string;         // e.g. "p1", "p2"
  name: string;       // e.g. "Pattern 1"
  drums: Record<DrumInstrument, Step[]>;   // 6 tracks × 16 steps
  bass: NoteStep[];                         // 16 steps
  synth: NoteStep[];                        // 16 steps
}
```

Every pattern always has exactly 16 steps per track. Patterns are not dynamically resizable.

---

### `DrumVoiceParams`

```typescript
interface DrumVoiceParams {
  tune: number;     // 0–1, controls pitch
  decay: number;    // 0–1, controls decay time
  mute?: boolean;
  solo?: boolean;
}
```

Stored in `project.drumParams` keyed by the instrument string (`'BD'`, `'SD'`, etc.). Not stored inside `Pattern` — these settings are global across all patterns.

---

### `ChannelMixer`

```typescript
interface ChannelMixer {
  volume: number;                              // 0–1.5 (gain multiplier)
  eq: { low: number; mid: number; high: number }; // dB, each ±12
  reverb?: number;                             // 0–1 (send level)
  delay?: { time: number; feedback: number; mix: number };
}
```

`reverb` and `delay` are optional for backwards compatibility with older saved projects that may not have these fields. The audio engine defaults them to 0.

---

### `MasterDelay`

```typescript
interface MasterDelay {
  time: number;       // 0.1–1.0 seconds
  feedback: number;   // 0–0.9
  mix: number;        // 0–1
}
```

---

### `ArrangementRegion`

```typescript
interface ArrangementRegion {
  id: string;
  patternId: string;
  startStep: number;
  length: number;     // in steps
}
```

Used by `ArrangementView` (not yet connected to the live scheduler).

---

### `Project`

```typescript
interface Project {
  name: string;
  bpm: number;
  swing: number;             // 0–100
  patterns: Pattern[];       // up to 32, at least 1
  arrangement: ArrangementRegion[];

  // Global synth params (shared across all patterns)
  drumParams?: Record<string, DrumVoiceParams>;
  bassParams?: {
    waveform: 'sawtooth' | 'square';
    cutoff: number;       // 0–1
    resonance: number;    // 0–1
    envMod: number;       // 0–1
    decay: number;        // 0–1
  };
  synthParams?: {
    attack: number;       // 0–1
    release: number;      // 0–1
    cutoff: number;       // 0–1
    detune: number;       // 0–1
  };

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
```

`Project` is the root state object. The entire thing is serialised to localStorage on every change (debounced 1s).

Note: `drumParams`, `bassParams`, and `synthParams` are **project-level** (not per-pattern). Changing a drum's decay affects all patterns in the project.

---

## Initial State (`constants.ts`)

### `INITIAL_PATTERN(id, name)`

```typescript
{
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
  bass:  Array(16).fill({ active: false, note: '', velocity: 0.8, length: 1 }),
  synth: Array(16).fill({ active: false, note: '', velocity: 0.6, length: 4 }),
}
```

Synth velocity defaults to `0.6` (lower than drums/bass) and length to `4` (four sixteenth notes = one beat) to give pads a natural sustain.

### `INITIAL_PROJECT`

```typescript
{
  name: 'Untitled Project',
  bpm: 120,
  swing: 0,
  patterns: [INITIAL_PATTERN('p1', 'Pattern 1')],
  arrangement: [{ id: 'a1', patternId: 'p1', startStep: 0, length: 16 }],
  mixer: {
    drums: { volume: 0.8, eq: { low: 0, mid: 0, high: 0 } },
    bass:  { volume: 0.8, eq: { low: 0, mid: 0, high: 0 } },
    synth: { volume: 0.7, eq: { low: 0, mid: 0, high: 0 } },
    master: { volume: 1.0, drive: 0, reverb: 0.2, delay: { time: 0.3, feedback: 0.3, mix: 0 } }
  }
}
```

Synth starts at 0.7 volume (slightly quieter) to avoid overpowering the mix. Master reverb is pre-set to 0.2 but no channels have reverb sends > 0, so it's inaudible until the mixer is adjusted.

---

## LocalStorage Schema

**Key:** `'sequencer-project'`
**Value:** `JSON.stringify(Project)`

The full `Project` object is stored. On load:

```typescript
const [project, setProject] = useState<Project>(() => {
  const saved = localStorage.getItem('sequencer-project');
  return saved ? JSON.parse(saved) : INITIAL_PROJECT;
});
```

There is no versioning or migration. If a new required field is added to `Project`, old saved projects won't have it and the app will rely on runtime defaults (`|| {}`, `?? 0`, etc.) scattered throughout the audio engine and component code.

---

## Synth Parameter Mappings

Normalised 0–1 values from sliders are mapped to audio ranges in `utils/audio.ts`:

### Bass Parameters

| Param | Range (0–1) | Audio range |
|---|---|---|
| `cutoff` | 0–1 | 50–5000 Hz (base filter frequency) |
| `resonance` | 0–1 | 0–25 (filter Q) |
| `envMod` | 0–1 | adds 0–8000 Hz to peak filter frequency |
| `decay` | 0–1 | 0.1–1.5s (filter envelope + amplitude decay) |

### Synth Parameters

| Param | Range (0–1) | Audio range |
|---|---|---|
| `attack` | 0–1 | 0.05–2.05s |
| `release` | 0–1 | 0.1–3.1s |
| `cutoff` | 0–1 | 200–6200 Hz (static lowpass) |
| `detune` | 0–1 | 0–50 cents per oscillator |

### Drum Parameters

| Param | Range (0–1) | BD | SD | HC | OH | LT | HT |
|---|---|---|---|---|---|---|---|
| `tune` | 0–1 | pitch 50–250 Hz | noise HP 500–1500 Hz | noise HP 5–9 kHz | noise HP 5–9 kHz | noise HP 4–8 kHz | pitch 300–700 Hz |
| `decay` | 0–1 | 0.1–0.9s | 0.1–0.4s | 20–120ms | 100–500ms | 300–1100ms | 50–250ms |

---

## Notes on Partial State

Several fields in the data model are optional (`?`) and are handled with defaults throughout the codebase. These exist to support projects saved before those fields were added:

- `pattern.synth` — falls back to `Array(16).fill({...})` in `App.tsx` and `PatternEditor`
- `drumParams[inst]` — defaults to `{ tune: 0.5, decay: 0.5, mute: false, solo: false }`
- `bassParams` — defaults to `{ waveform: 'sawtooth', cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 }`
- `synthParams` — defaults to `{ attack: 0.5, release: 0.5, cutoff: 0.5, detune: 0.5 }`
- `channel.reverb` — defaults to `0`
- `channel.delay` — defaults to `{ time: 0.3, feedback: 0.3, mix: 0 }`
