# Components Reference

All components are in `apps/studio/src/components/`. They are pure presentational/controlled components — no internal async logic or direct audio access.

---

## TransportBar

**File:** `TransportBar.tsx`

Global playback controls and tempo settings. Rendered directly below the header in `App.tsx`.

### Props

```typescript
interface TransportBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  swing: number;
  onSwingChange: (swing: number) => void;
}
```

### Behaviour

- **Play/Stop button**: Renders a `Play` icon when stopped, `Square` icon when playing. Background turns emerald green while playing.
- **BPM input**: `<input type="number">`, min=60, max=200. Calls `onBpmChange` on every change.
- **Swing**: `<input type="range">`, 0–100 in steps of 1. Displays the current value as a percentage label.
- Both the Play button and spacebar (handled in `App.tsx`) call `onTogglePlay`.

---

## PatternEditor

**File:** `PatternEditor.tsx`

The main sequencer view. Contains three sections: drums, bass, and synth.

### Props

```typescript
interface PatternEditorProps {
  pattern: Pattern;
  currentStep: number;
  onToggleDrumStep: (inst: DrumInstrument, step: number) => void;
  onToggleBassStep: (step: number, note: string) => void;
  onToggleSynthStep: (step: number, note: string) => void;
  drumParams?: Record<string, { tune: number; decay: number; mute?: boolean; solo?: boolean }>;
  onUpdateDrumParam: (inst: string, param: string, value: any) => void;
  bassParams?: { waveform: string; cutoff: number; resonance: number; envMod: number; decay: number };
  onUpdateBassParam: (param: string, value: any) => void;
  synthParams?: { attack: number; release: number; cutoff: number; detune: number };
  onUpdateSynthParam: (param: string, value: any) => void;
}
```

### Sections

#### Drums section

- Iterates `Object.entries(pattern.drums)` — all 6 instruments in insertion order.
- Each row: `[label] [M] [S] [16 step buttons]`
- `currentStep` adds `ring-2 ring-white` to the active step column.
- Active steps: `bg-[#10b981]` (emerald green).
- **Mute button (M)**: Turns red when `p.mute === true`. Calls `onUpdateDrumParam(inst, 'mute', !isMuted)`.
- **Solo button (S)**: Turns amber when `p.solo === true`. Calls `onUpdateDrumParam(inst, 'solo', !isSoloed)`.

#### Drum params panel

- Scrollable horizontal row of cards, one per instrument (`instruments = ['BD','SD','HC','OH','LT','HT']`).
- Each card has Tune and Decay sliders (0–1, step 0.01).
- Defaults to `{ tune: 0.5, decay: 0.5 }` if the instrument has no entry in `drumParams`.

#### Bass section

- 12 notes: `['B','A#','A','G#','G','F#','F','E','D#','D','C#','C']` (high to low).
- Step toggle: if clicking the same note that's already active → toggles off. If clicking a different note → activates the step with the new note.
- Bass params bar (top right): waveform toggle (SAW/SQR) + Cutoff, Res, Env, Decay sliders in a column layout.
- Step notes are stored as `${note}2` (octave 2, e.g. `"C2"`).

#### Synth section

- Same 12-note layout as bass.
- Notes stored as `${note}4` (octave 4).
- Synth params: Attack, Release, Cutoff, Detune sliders.
- Falls back to `Array(16).fill({ active: false, note: '', velocity: 0.6, length: 4 })` if `pattern.synth` is undefined.

---

## PatternSwitcher

**File:** `PatternSwitcher.tsx`

Pattern slot selector and creator.

### Props

```typescript
interface PatternSwitcherProps {
  patterns: Pattern[];
  activePatternId: string;
  onSelectPattern: (id: string) => void;
  onAddPattern: () => void;
}
```

### Behaviour

- Renders a fixed 32-slot grid. Slots 0–`patterns.length-1` show pattern names; remaining slots are disabled.
- Active pattern slot: `border-[#10b981]` (emerald border).
- Clicking an occupied slot calls `onSelectPattern(pattern.id)`.
- The **+** button appends a new pattern and switches to it (logic in `App.tsx`).
- New pattern IDs are generated as `p${patterns.length + 1}`.

---

## MixerView

**File:** `MixerView.tsx`

Mixing console with three channel strips and a master bus.

### Props

```typescript
interface MixerViewProps {
  mixer: Project['mixer'];
  onMixerChange: (mixer: Project['mixer']) => void;
}
```

### Internal structure

`ChannelRack` is a component defined **outside** `MixerView` (at module scope). This is intentional — if defined inside, React would recreate it on every `MixerView` render, resetting internal DOM state and causing visual glitches when sliders are dragged.

```typescript
const ChannelRack = ({ title, color, section, data, updateMixer }: any) => (...)
```

### `updateMixer(section, param, value, subParam?)`

The shared update function, defined inside `MixerView` and passed as a prop to `ChannelRack`. Produces a new mixer object via deep clone (`JSON.parse(JSON.stringify(mixer))`), then calls `onMixerChange`.

Handles nested updates:
```typescript
if (subParam) newMixer[section][param][subParam] = value;
else          newMixer[section][param] = value;
```

It also ensures default structures exist for all channels before writing, so partial mixer objects in `localStorage` don't break the UI.

### ChannelRack layout

| Area | Controls |
|---|---|
| Left column | Vertical volume fader (0–1.5) + "Vol" label |
| Right column — EQ | EQ HI (−12 to +12 dB), EQ MID, EQ LOW |
| Divider | Horizontal rule |
| Right column — FX | REVERB, D.TIME (0.1–1.0s), D.FDBK (0–0.9), D.MIX (0–1) |

### Master Bus

Separate JSX block (not a `ChannelRack`). Uses a darker background (`bg-[#1a1a1a]`) to stand out.

| Control | Range | Notes |
|---|---|---|
| Volume fader (vertical) | 0–1.5 | `accent-white` styling |
| DRIVE | 0–1 | Red accent (`#ef4444`) |

---

## Slider

**File:** `Slider.tsx`

Reusable controlled slider with optional label. Created to reduce boilerplate; currently not yet adopted in `PatternEditor` or `MixerView` (see git history).

### Props

```typescript
interface SliderProps {
  label?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  color?: string;          // accentColor for the range thumb. Default: '#a1a1aa'
  labelColor?: string;     // CSS color for the label text. Default: '#a1a1aa'
  orientation?: 'horizontal' | 'vertical';  // Default: 'horizontal'
  labelWidth?: string;     // Tailwind width class for the label. Default: 'w-12'
  faderHeight?: string;    // Tailwind height class (vertical only). Default: 'h-48'
  className?: string;      // Extra classes on the wrapper div (horizontal only)
}
```

### Rendering

**Horizontal** (default):
```html
<div class="flex items-center gap-2 {className}">
  <span class="text-[9px] uppercase font-bold {labelWidth}" style="color: labelColor">
    {label}
  </span>
  <input type="range" class="flex-1 h-1 bg-[#1a1a1a] rounded-lg cursor-pointer"
         style="accentColor: color" />
</div>
```

**Vertical**:
```html
<div class="flex flex-col items-center">
  <input type="range" class="w-1 {faderHeight} bg-[#1a1a1a] rounded-lg cursor-pointer"
         style="writingMode: vertical-lr; direction: rtl; accentColor: color" />
  <span class="text-[9px] mt-2 uppercase" style="color: labelColor">
    {label}
  </span>
</div>
```

`writingMode: vertical-lr` + `direction: rtl` rotates the range input 90° so dragging up increases the value (conventional fader direction).

---

## ArrangementView

**File:** `ArrangementView.tsx`

Timeline editor for pattern arrangement. **Currently not rendered in `App.tsx`** — it exists as infrastructure for a future arrangement mode.

### Props

```typescript
interface ArrangementViewProps {
  arrangement: ArrangementRegion[];
  patterns: Pattern[];
  currentStep: number;
}
```

### Behaviour

- Renders a horizontal timeline with grid lines.
- Each `ArrangementRegion` is a coloured block showing the pattern name.
- Horizontally scrollable.
- Read-only: no drag or edit interactions are implemented.

---

## Color Conventions

| Instrument / element | Color |
|---|---|
| Drums (active steps, params, EQ) | `#10b981` (emerald) |
| Bass (active steps, params, EQ) | `#f97316` (orange) |
| Synth (active steps, params, EQ) | `#8b5cf6` (purple) |
| Master Drive | `#ef4444` (red) |
| Export Master button | `#f97316` (orange) |
| Playing state (transport) | `#10b981` (emerald) |
| Solo button | `#f59e0b` (amber) |
| Mute button | `#ef4444` (red) |
| Background | `#0a0a0a` (near black) |
| Panel background | `#121212` |
| Border | `#27272a` |
| Muted text | `#a1a1aa` |
