# AudioCoach.ai Studio — Technical Reference

> Last updated: 2026-03-01
> Codebase: `apps/studio/src/`
> GitHub: https://github.com/OMSUG-APP/sequencer-studio-mvp

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Layout](#2-repository-layout)
3. [Tech Stack](#3-tech-stack)
4. [Data Model](#4-data-model)
5. [Audio Architecture](#5-audio-architecture)
6. [Scheduling System](#6-scheduling-system)
7. [Synthesis Engines](#7-synthesis-engines)
8. [Sampler System](#8-sampler-system)
9. [Mixer & Effects](#9-mixer--effects)
10. [UI Components](#10-ui-components)
11. [Export System](#11-export-system)
12. [State Management & Persistence](#12-state-management--persistence)
13. [Visual Design System](#13-visual-design-system)
14. [Known Limitations & Technical Debt](#14-known-limitations--technical-debt)

---

## 1. Project Overview

AudioCoach.ai Studio is a browser-based music production environment. It runs entirely client-side using the Web Audio API — no server required for audio generation. The MVP includes:

- **Step Sequencer** — 16-step pattern editor for drums, bass, synth, and sampler
- **Synthesis Engines** — oscillator-based drum machine, monophonic bass synth, polyphonic pad synth
- **Sampler** — 16 pads with drag-drop audio loading, waveform display, and envelope/filter editing
- **Mixer Console** — per-channel volume, 3-band EQ, and send routing to shared FX buses
- **Shared FX Buses** — convolution reverb, feedback delay, and waveshaper distortion
- **Master Bus** — dynamics compressor
- **Export** — offline render to 16-bit PCM WAV (master or per-stem)
- **Persistence** — full project state saved to `localStorage` with 1-second debounce

---

## 2. Repository Layout

```
sequencer-studio-mvp/
├── apps/studio/                    # Main React application (ships to browser)
│   ├── src/
│   │   ├── App.tsx                 # Root component, all project state
│   │   ├── main.tsx                # React entry point
│   │   ├── index.css               # Global styles + CSS variables
│   │   ├── types.ts                # All TypeScript interfaces
│   │   ├── constants.ts            # Presets & INITIAL_PROJECT
│   │   ├── components/
│   │   │   ├── TransportBar.tsx    # Play/stop, BPM, swing
│   │   │   ├── PatternEditor.tsx   # Drum/bass/synth/sampler step grids
│   │   │   ├── MixerView.tsx       # Mixer console
│   │   │   ├── RotaryKnob.tsx      # SVG rotary knob control
│   │   │   ├── Slider.tsx          # Generic slider
│   │   │   ├── ArrangementView.tsx # Arrangement timeline (not yet wired)
│   │   │   └── sampler/
│   │   │       ├── index.ts
│   │   │       ├── SamplerView.tsx
│   │   │       ├── PadGrid.tsx
│   │   │       ├── SamplerPadTile.tsx
│   │   │       ├── PadDetailPanel.tsx
│   │   │       ├── PadEnvelopeControls.tsx
│   │   │       └── PadFilterControls.tsx
│   │   ├── hooks/
│   │   │   ├── useAudioEngine.ts   # Main AudioContext, scheduler, mixer graph
│   │   │   └── useSampler.ts       # Sampler AudioContext, pad state
│   │   └── utils/
│   │       ├── audio.ts            # Drum, bass, synth voice factories
│   │       ├── sampler.ts          # Sample loading, trigger, pad defaults
│   │       └── export.ts           # Offline WAV rendering
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── packages/                       # Workspace packages (future expansion)
│   ├── core/                       # Scheduler, transport primitives
│   ├── drum-engine/                # Standalone drum voices
│   ├── bass-engine/                # Standalone bass synth
│   ├── audio-utils/                # WAV encoder, channel strip helpers
│   └── contracts/                  # Shared types/schema
├── Documentation/
└── package.json                    # npm workspaces root
```

> **Note:** The packages under `packages/` are defined but not yet consumed by the studio app. The studio uses inline implementations in `utils/audio.ts` and `hooks/useAudioEngine.ts`.

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 (StrictMode) |
| Language | TypeScript 5, ES2022 |
| Build | Vite 6 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Audio | Web Audio API (no external audio libraries) |
| Icons | `lucide-react` |
| Persistence | `localStorage` |
| Package Management | npm workspaces (monorepo) |
| AI SDK | `@google/genai` (installed, not yet wired) |

---

## 4. Data Model

All project state is a single `Project` object defined in `types.ts`. This object is serialised to `localStorage` and passed as React state to all components.

### 4.1 Project

```typescript
interface Project {
  name: string;
  bpm: number;           // 60–300, default 120
  swing: number;         // 0–100 (%), default 0
  patterns: Pattern[];
  arrangement: ArrangementRegion[];

  drumKit?: '808' | '909';
  bassPreset?: string;
  synthPreset?: string;
  drumParams?: Record<DrumInstrument, DrumVoiceParams>;
  bassParams?: BassParams;
  synthParams?: SynthParams;

  mixer: MixerConfig;
}
```

### 4.2 Pattern

A pattern holds all step data for one 16-step loop:

```typescript
interface Pattern {
  id: string;
  name: string;
  drums: Record<DrumInstrument, Step[]>;   // 6 instruments × 16 steps
  bass:  NoteStep[];                        // 16 steps
  synth: NoteStep[];                        // 16 steps
  samplerSteps?: boolean[][];              // [padId 0-15][step 0-15]
}

type DrumInstrument = 'BD' | 'SD' | 'HC' | 'OH' | 'LT' | 'HT';

interface Step     { active: boolean; velocity: number; }
interface NoteStep { active: boolean; note: string; velocity: number; length: number; }
```

### 4.3 Mixer Config

```typescript
mixer: {
  drums:   ChannelMixer;
  bass:    ChannelMixer;
  synth:   ChannelMixer;
  sampler: ChannelMixer;   // separate AudioContext, no drive send
  effects: {
    reverb: { return: number };                              // 0–1
    delay:  { time: number; feedback: number; return: number };
    drive:  { amount: number; return: number };
  };
  master: {
    volume: number;
    compressor?: { threshold; knee; ratio; attack; release };
  };
}

interface ChannelMixer {
  volume:     number;                              // 0–1.5
  eq:         { low: number; mid: number; high: number };  // -12 to +12 dB
  reverb?:    number;                              // send amount 0–1
  delay?:     { time: number; feedback: number; mix: number }; // mix = send amount
  driveSend?: number;                              // send amount 0–1 (sequencer channels only)
}
```

### 4.4 Sampler Pad

```typescript
interface SamplerPad {
  id:       number;          // 0–15
  label:    string;
  fileName: string | null;
  volume:   number;          // 0.0–1.5
  pitch:    number;          // semitones -24 to +24
  envelope: SamplerEnvelope;
  filter:   SamplerFilter;
  mute:     boolean;
  solo:     boolean;
  color:    string;          // hex accent colour per pad
}

interface SamplerEnvelope {
  start:    number;    // 0.0–1.0  normalised playback start point in the buffer
  end:      number;    // 0.0–1.0  normalised playback end point (must be > start)
  length:   number;    // 0.0–1.0  amplitude level during playback
  envelope: number;    // 0.005–4.0 s  fade-out/release duration
}

interface SamplerFilter {
  cutoff:    number;   // 20–20000 Hz
  resonance: number;   // 0.0–20.0 (Q factor)
}
```

### 4.5 Presets

Defined in `constants.ts`:

**Bass presets** — 303, ORGAN, WOBBLE, SUB
**Synth presets** — ORGANIC, METAL, HEAVENLY, TEXTURED
**Drum kit profiles** — 808 (longer decays, lower freqs) and 909 (tighter, brighter)
Each drum kit profile provides `freqMult` and `decayMult` per instrument (BD/SD/HC/OH/LT/HT).

---

## 5. Audio Architecture

The studio uses **two separate AudioContexts**:

| Context | Owner | Destination |
|---|---|---|
| `useAudioEngine` | Drums, Bass, Synth, shared FX, master bus | `ctx.destination` |
| `useSampler` | Sampler pads, sampler FX chain | `ctx.destination` |

Separation is intentional — the sampler can load files and trigger pads independently of the sequencer. Cross-context timing is handled explicitly (see §6.2).

### 5.1 Sequencer Audio Graph

```
Drums → drumGain → [Low shelf 250Hz] → [Peak 1kHz] → [Hi shelf 4kHz]
                                                              │
                              ┌──────────────────────────────┤ dry
                              │ drumReverbSend               │
                              │ drumDelaySend    ────→ masterGain ─→ compressor ─→ destination
                              │ drumDriveSend                │
                              └──────────────────────────────┘

Bass → bassGain → [Low shelf] → [Peak] → [Hi shelf] → (same send topology as drums)
Synth → synthGain → [Low shelf] → [Peak] → [Hi shelf] → (same)

FX Buses (shared):
  [drumReverbSend + bassReverbSend + synthReverbSend] → ConvolverNode → reverbReturn → masterGain
  [drumDelaySend + bassDelaySend + synthDelaySend]   → DelayNode ─┐  → delayReturn  → masterGain
                                                       └──feedback─┘
  [drumDriveSend + bassDriveSend + synthDriveSend]   → WaveShaperNode (4x oversample) → driveReturn → masterGain

Master:
  masterGain → DynamicsCompressor → ctx.destination
```

### 5.2 Sampler Audio Graph (per pad trigger)

```
AudioBufferSourceNode (detune = pitch × 100 cents)
  → BiquadFilter (lowpass, cutoff/Q from pad.filter)
  → GainNode (volume envelope: 5ms fade-in, body, configurable fade-out)
  → masterGain (sampler)
  → [Low shelf] → [Peak] → [Hi shelf] → ctx.destination (dry)
                                       → reverbSend → ConvolverNode → reverbReturn → destination
                                       → delaySend  → DelayNode ──→ delayReturn   → destination
                                                        └─feedback─┘
```

The sampler's FX buses connect directly to `ctx.destination` — not to the sequencer's master bus — so sampler effects are fully independent of the sequencer FX bus.

---

## 6. Scheduling System

### 6.1 Look-Ahead Scheduler

`useAudioEngine.ts` uses a classic Web Audio look-ahead scheduling pattern:

- **Interval:** `setTimeout(scheduler, 25)` — fires every 25ms
- **Look-ahead window:** 100ms (`ctx.currentTime + 0.1`)
- While `nextNoteTime < currentTime + 0.1`, schedule notes and advance `nextNoteTime` by one step duration (`60 / bpm / 4` seconds)
- Audio events are scheduled as `AudioContext` absolute times, not wall-clock times — immune to JS timer jitter

```
ctx.currentTime ─────────────────────────────────►
                     │◄── 100ms window ──►│
              already past          notes pre-scheduled here
```

The scheduler also handles `AudioContext` suspension (e.g. tab backgrounding) by calling `ctx.resume()` on each tick.

### 6.2 Cross-Context Timing (Sampler in Sequencer)

The sampler runs in a different `AudioContext`, so its `currentTime` is independent. When the sequencer scheduler fires `schedulePadAtTime(padId, seqTime, seqNow)`:

```typescript
const offsetSeconds = Math.max(0, seqTime - seqNow);
// offsetSeconds = how far in the future seqTime is relative to sequencer's currentTime now
// Schedule on sampler ctx from its own present:
triggerSamplerPad(ctx, buffer, pad, dest, ctx.currentTime + offsetSeconds);
```

`seqNow` is captured at the moment of scheduling inside `scheduleNote`, ensuring the offset is always a positive delta.

### 6.3 Swing

Swing is applied to odd-numbered steps (1, 3, 5, …):

```typescript
if (step % 2 === 1) adjustedTime += secondsPerStep * (swing / 100);
```

At `swing = 0`, all steps land on exact 16th-note boundaries. At `swing = 100`, off-beats are delayed by one full 16th note, producing a straight-8th feel with alternating long/short gaps.

### 6.4 Mute / Solo (Drums)

Drum mute/solo is resolved per-instrument at scheduling time, not via pre-mixed nodes:

```typescript
const anySoloed = drumInstruments.some(inst => drumParams[inst]?.solo);
const effectiveMuted = p.mute || (anySoloed && !p.solo);
layerGain.gain.setValueAtTime(effectiveMuted ? 0 : 1, adjustedTime);
```

Each drum instrument has its own `GainNode` (`drumLayerGainsRef`) inserted between the voice and `drumGainRef`. These nodes are created lazily on first use.

---

## 7. Synthesis Engines

All synth voices are created fresh for each scheduled note (`utils/audio.ts`). Oscillator nodes are cheap to create and auto-garbage-collected after `stop()`.

### 7.1 Drum Machine (`createDrumEngine`)

| Voice | Technique | Key Parameters |
|---|---|---|
| BD (Kick) | Single sine osc, pitch sweep down | `tune` (50–250Hz base), `decay` (0.1–0.9s) |
| SD (Snare) | Highpass noise + triangle click | `tune` (HPF freq), `decay` (noise env) |
| HC (Closed Hat) | Highpass noise, short decay | `tune` (HPF 5–9kHz), `decay` (20–120ms) |
| OH (Open Hat) | Highpass noise, longer decay | Same as HC with longer envelope |
| LT (Low Tom) | Highpass noise | `tune` (HPF 4–8kHz), `decay` (0.3–1.1s) |
| HT (High Tom) | Sine osc, mild pitch sweep | `tune` (300–700Hz), `decay` (50–250ms) |

Kit profiles (808/909) apply multipliers to base frequency and decay time for each voice. 808 is warmer/longer; 909 is tighter/brighter.

**Frequency formula** (BD example):
```
baseFreq = (50 + tune * 200) × kit.BD.freqMult
decayTime = (0.1 + decay * 0.8) × kit.BD.decayMult
```

### 7.2 Bass Synth (`createBassEngine`)

Monophonic. Each note creates one oscillator with an envelope-modulated low-pass filter:

```
Oscillator (sawtooth | square, freq)
  → BiquadFilter (lowpass)
      frequency: peakCutoff → baseCutoff (exponential ramp over decayTime)
      Q: resonance × 25
  → GainNode (velocity × 0.4, setTargetAtTime decay)
  → bassGain
```

Parameters:
- `cutoff` — base filter frequency: `50 + cutoff × 4950` Hz
- `resonance` — filter Q: `resonance × 25`
- `envMod` — filter envelope peak: `baseCutoff + envMod × 8000` Hz
- `decay` — filter and amplitude decay: `0.1 + decay × 1.4` s
- `octave` — integer octave offset applied via `noteToFreq`

### 7.3 Pad Synth (`createSynthEngine`)

3-oscillator unison synth:

```
Oscillator 1: sawtooth, freq
Oscillator 2: sawtooth, freq, detune +amount
Oscillator 3: square, freq/2, detune -amount
  → BiquadFilter (lowpass, cutoff = 200 + p.cutoff × 6000 Hz)
  → GainNode (ADSR: 0 → attack → hold at velocity×0.15 → linear release → 0)
  → synthGain
```

Parameters:
- `attack` — `0.05 + attack × 2.0` s
- `release` — `0.1 + release × 3.0` s
- `cutoff` — `200 + cutoff × 6000` Hz
- `detune` — `detune × 50` cents (osc 2 up, osc 3 down)
- `octave` — integer offset applied via `noteToFreq`

### 7.4 Note-to-Frequency Conversion

```typescript
noteToFreq(note: string, octaveShift: number): number
// note format: "C4", "A#3", "G#5" etc.
// Formula: 440 × 2^((semitones - 69) / 12)  (equal temperament, A4=440Hz)
```

---

## 8. Sampler System

### 8.1 useSampler Hook

The public interface for sampler state and playback:

```typescript
interface UseSamplerReturn {
  pads: SamplerPad[];
  padLoadStatus: PadLoadStatus[];   // 'idle' | 'loading' | 'loaded' | 'error'
  activePadId: number;
  masterVolume: number;
  padWaveforms: (number[] | null)[]; // 256-bin peak data per pad

  loadPadFile(padId, file): Promise<void>;
  clearPad(padId): void;
  triggerPad(padId): void;
  schedulePadAtTime(padId, seqTime, seqNow): void;
  setActivePad(padId): void;

  updatePadLabel / Volume / Pitch / Envelope / Filter / Mute / Solo(...)
  updateMasterVolume(volume): void;
}
```

`useSampler(mixerChannel?: ChannelMixer)` accepts the mixer channel config from the project, applying it to live audio nodes immediately and whenever it changes.

### 8.2 Sample Loading & Waveform

When a file is dropped onto a pad:

1. `loadAudioFile(ctx, file)` — reads the `File` as an `ArrayBuffer`, decodes via `ctx.decodeAudioData`
2. Buffer stored in `buffersRef.current[padId]` (not serialised)
3. **Waveform peak computation** — 256-bin peak extraction from channel 0:
   ```typescript
   blockSize = Math.floor(channelData.length / 256);
   peaks[i] = max(abs(channelData[i*blockSize ... (i+1)*blockSize]));
   ```
4. Peaks stored in `padWaveforms` state and passed to `PadDetailPanel` for SVG rendering
5. Filename truncated to 14 chars, uppercased, used as pad label

### 8.3 Sample Playback (`triggerSamplerPad`)

```typescript
triggerSamplerPad(ctx, buffer, pad, destination, when?)
```

Builds a short node chain per trigger:

```
AudioBufferSourceNode
  .detune = pad.pitch × 100 cents
  .start(when, startOffset, playDuration)
  → BiquadFilter (lowpass, pad.filter.cutoff, pad.filter.resonance)
  → GainNode
      [5ms linear fade-in at start]
      [hold at pad.volume × resolveGain()]
      [linear fade-out from (when + playDuration - env.envelope) to 0]
  → destination
```

Start/end trim:
```typescript
startOffset  = env.start × buffer.duration
playDuration = (env.end - env.start) × buffer.duration  (min 10ms)
```

Mute/solo resolution (`resolveGain`): returns 0 if muted, or if another pad is soloed and this one isn't. Returns 1 otherwise.

---

## 9. Mixer & Effects

### 9.1 Channel Strips

Each sequencer channel (Drums, Bass, Synth) has an identical signal path:

```
channelGain (volume fader)
  → Low shelf @ 250 Hz  (low EQ band)
  → Peaking  @ 1 kHz   (mid EQ band)
  → Hi shelf @ 4 kHz   (high EQ band)
  → masterGain (dry)
  → drumReverbSend → sharedReverb
  → drumDelaySend  → sharedDelay
  → drumDriveSend  → sharedDrive
```

All EQ gains and send levels are `GainNode.gain` values updated live from `project.mixer` via a `useEffect`.

The **Sampler** channel (in `useSampler`) has an equivalent EQ chain but connects to its own AudioContext's destination and its own reverb/delay buses — not the sequencer's shared buses.

### 9.2 Shared FX Buses (Sequencer Context)

**Reverb:**
- Type: ConvolverNode with a synthetically generated impulse response (2.5s, exponential decay factor 2.0)
- IR generated by `createReverbIR(ctx, 2.5, 2.0)` — stereo white noise shaped by `(1 - i/length)^decay`
- `sharedReverbReturn.gain` — global return level (0–1)

**Delay:**
- Type: DelayNode (max 2.0s) with feedback GainNode in a loop
- `sharedDelay.delayTime` — set via `setTargetAtTime` for smooth transitions
- `sharedDelayFeedback.gain` — feedback amount (0–0.95)
- `sharedDelayReturn.gain` — return level

**Drive:**
- Type: WaveShaperNode with `oversample = '4x'`
- Curve: soft-clip formula `((3 + k) × x × 20°) / (π + k|x|)` where `k = amount × 400`
- At `amount = 0`: straight wire (passthrough)
- At `amount = 1`: heavy saturation

### 9.3 Master Bus

```
masterGain → DynamicsCompressor → ctx.destination
```

Compressor parameters (all live-editable):
- `threshold`: -60 to 0 dB (default -12)
- `knee`: softness of knee (default 6 dB)
- `ratio`: 1:1 to 20:1 (default 4)
- `attack`: 0 to 0.5s (default 3ms)
- `release`: 0.01 to 1.0s (default 250ms)

### 9.4 MixerView Component Architecture

```
MixerView
├── ChannelRack × 3 (Drums/Bass/Synth)
│   ├── Volume fader (vertical range input, h-36)
│   ├── 3-band EQ (RotaryKnob × 3: HI / MID / LOW)
│   └── SENDS section (SendSlider × 3: REV / DLY / DRV)
├── SamplerChannelRack
│   ├── Volume fader
│   ├── 3-band EQ
│   └── SENDS (SendSlider × 2: REV / DLY)
├── EffectsPanel
│   ├── REVERB: RETURN slider
│   ├── DELAY: TIME / FDBK / RETURN sliders
│   └── DRIVE: AMOUNT / RETURN sliders
└── Master Bus
    ├── Volume fader
    └── COMP: THRESH / RATIO / ATTACK / RELEASE sliders
```

`SendSlider` is a contained sub-component that wraps `<input type="range">` in a `min-w-0 flex-1` div to prevent overflow in constrained flex containers.

---

## 10. UI Components

### 10.1 App Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Header: Logo | Project Name (editable) | Export Buttons     │
├─────────────────────────────────────────────────────────────┤
│ TransportBar: Play | BPM | Swing                            │
├──────────────────────────────────────────────────────────────┤
│ Tab bar: [SEQUENCER] [SAMPLER]                              │
├──────────────────────────────────────┬──────────────────────┤
│                                      │                      │
│  (Sequencer tab)                     │  Mixer Console       │
│  PatternEditor                       │  (always visible)    │
│   ├─ Drums grid                      │                      │
│   ├─ Bass grid                       │                      │
│   ├─ Synth grid                      │                      │
│   └─ Sampler pad rows                │                      │
│                                      │                      │
│  (Sampler tab)                       │                      │
│  SamplerView                         │                      │
│   ├─ 4×4 PadGrid                     │                      │
│   └─ PadDetailPanel                  │                      │
│                                      │                      │
└──────────────────────────────────────┴──────────────────────┘
```

### 10.2 TransportBar

- **Play/Stop**: calls `togglePlay()` from `useAudioEngine`; glows orange when playing
- **BPM**: `<input type="number">`, updates `project.bpm`
- **Swing**: horizontal slider 0–100%, updates `project.swing`
- Spacebar global shortcut also calls `togglePlay()` (registered in `App.tsx`)

### 10.3 PatternEditor

Renders four instrument sections:

**Drums section:**
- Kit selector (808/909)
- Per-instrument row: mute, solo, Tune knob, Decay knob, 16-step grid
- Active steps highlighted in the instrument's accent colour
- Current playhead step highlighted with a ring

**Bass section:**
- Waveform toggle (SAWTOOTH / SQUARE)
- Preset buttons (303, ORGAN, WOBBLE, SUB)
- Parameter knobs: CUTOFF, RESONANCE, ENV MOD, DECAY
- Octave selector (– / +)
- 12-note × 16-step grid (B down to C)
- Active cell shows note name

**Synth section:**
- Preset buttons (ORGANIC, METAL, HEAVENLY, TEXTURED)
- Parameter knobs: ATTACK, RELEASE, CUTOFF, DETUNE
- Octave selector
- Same 12-note × 16-step grid layout
- Purple (#8b5cf6) accent

**Sampler section (in sequencer):**
- Only shows pads that have a loaded sample
- Each pad row: coloured dot, label, 16-step boolean grid
- Clicking a step calls `onToggleSamplerStep(padId, step)`
- Empty state message if no pads loaded

### 10.4 SamplerView

Two-column layout:
- **Left** (288px): 4×4 `PadGrid` + master volume slider + loaded pad count
- **Right**: `PadDetailPanel` for the active pad

**PadGrid / SamplerPadTile:**
- 16 tiles in a 4×4 grid
- Tile shows: pad number, label (filename), status icon, colour accent
- Click: select + preview trigger
- Drag-drop: `onDragOver` / `onDrop` with `dataTransfer.files[0]`
- Hold: file input fallback

**PadDetailPanel:**
- Waveform SVG (512×80 viewBox):
  - 256-bin peak polylines (top and bottom mirrored)
  - Dimmed rect before start point
  - Dimmed rect after end point
  - Orange marker at start, teal marker at end
  - Centre baseline
- Volume slider (0–1.5×)
- Pitch slider (-24 to +24 semitones)
- Mute / Solo / Preview buttons
- `PadEnvelopeControls`: START / END / LENGTH / ENVELOPE knobs
- `PadFilterControls`: CUTOFF / RES knobs

### 10.5 RotaryKnob

SVG-based control with mouse-drag interaction:

- **Visual**: arc background + coloured value arc + indicator line
- **Interaction**: vertical mouse drag — `mousedown` locks, `mousemove` maps `dy` to value delta, `mouseup` releases
- **Range**: 3 full rotations across the full min–max range for fine control
- **Props**: `min`, `max`, `step`, `value`, `onChange`, `label`, `color`

---

## 11. Export System

### 11.1 Overview

`renderToWav(project, pattern, mode)` uses `OfflineAudioContext` to render audio in accelerated time (faster than real-time).

### 11.2 Render Process

1. Create `OfflineAudioContext(2, sampleRate × duration, 44100)`
   - Duration = 4 loops × 16 steps × stepTime + 3s tail
2. Reconstruct the mixer graph offline (master, compressor, reverb, delay, drive, 3 channel strips)
3. Apply stem muting: if `mode !== 'master'`, channels not matching `mode` get `gain = 0`
4. Schedule all notes for 4 loops via the same `createDrumEngine`/`createBassEngine`/`createSynthEngine` factories
5. `ctx.startRendering()` → `AudioBuffer`
6. `audioBufferToWav()` → standard RIFF WAV `Blob`

### 11.3 WAV Encoding

16-bit PCM, little-endian, stereo, 44.1 kHz:

```
RIFF chunk → WAVE → fmt subchunk (16 bytes, PCM=1, channels, sampleRate, byteRate) → data subchunk
```

Each sample: clamped to [-1, 1], scaled to Int16 (`sample × 32767`), interleaved L/R.

### 11.4 Stem Export

`handleExportStems` in `App.tsx` calls `renderToWav` three times (drums, bass, synth) with 500ms browser delays between downloads to avoid popup blocking.

> **Limitation:** The sampler is not included in stem exports. The export system uses `OfflineAudioContext` and cannot access the live sampler's `AudioBuffer` refs.

---

## 12. State Management & Persistence

### 12.1 State Structure

All application state lives in `App.tsx` as a single `project: Project` React state. Pattern-specific state is accessed by `activePatternId`.

Updates follow immutable patterns:
```typescript
setProject(prev => ({ ...prev, bpm: 130 }));
updateActivePattern(p => ({ ...p, drums: { ...p.drums, BD: newSteps } }));
```

### 12.2 Audio State Synchronisation

The audio graph is managed via `useRef` nodes in `useAudioEngine`. Mixer changes are applied to live nodes via a `useEffect` that watches `project.mixer`:

```typescript
useEffect(() => {
  if (drumGainRef.current) drumGainRef.current.gain.value = drums.volume;
  // ... all other nodes
}, [project.mixer]);
```

This means mixer changes take effect immediately during playback without restarting the scheduler.

### 12.3 Persistence

```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    localStorage.setItem('sequencer-project', JSON.stringify(project));
  }, 1000);
  return () => clearTimeout(timeout);
}, [project]);
```

Debounced 1 second to avoid writing on every keystroke. On load:
```typescript
const saved = localStorage.getItem('sequencer-project');
return saved ? JSON.parse(saved) : INITIAL_PROJECT;
```

> **Note:** `AudioBuffer` objects in `useSampler.buffersRef` are not serialised. On page refresh, the project state loads from `localStorage` but all sampler buffers are cleared — pads must be re-loaded.

---

## 13. Visual Design System

### 13.1 Colour Palette

| Token | Value | Usage |
|---|---|---|
| Background | `#0A0A0B` | App background |
| Panel | `#111113` | Cards, panels |
| Surface | `#1a1a1e` | Inputs, sliders track |
| Border | `#242428` | All borders |
| Text dim | `#8A8A94` | Labels, secondary text |
| Text bright | `#F0F0F2` | Active values, headings |
| Accent | `#FF5F00` | Orange — primary brand, play button, active states |
| Accent hover | `#E05500` | Button hover |
| Drums | `#10b981` | Green — drum channel |
| Bass | `#FF5F00` | Orange — bass channel |
| Synth | `#8b5cf6` | Purple — synth channel |
| Sampler | `#22d3ee` | Cyan — sampler channel |
| Reverb | `#60a5fa` | Blue — reverb in Effects panel |
| Delay | `#a78bfa` | Violet — delay in Effects panel |
| Drive | `#ef4444` | Red — drive in Effects panel |

### 13.2 Typography

- Font: `font-mono` (system monospace stack) throughout
- Labels: `text-[9px]` or `text-[10px]`, `font-bold`, `uppercase`, `tracking-widest`
- Values: `text-[9px] font-mono`
- Headings: `text-xs` or `text-sm`, `font-bold`, `uppercase`, `tracking-widest`

### 13.3 Glow Effects

Orange glow (used on logo, play button, active mixer channel, Master Bus border):
```css
box-shadow: 0 0 12px rgba(255, 95, 0, 0.5);
```

### 13.4 Custom Tailwind Extension

```typescript
// tailwind.config.ts
gridTemplateColumns: {
  '16': 'repeat(16, minmax(0, 1fr))'
}
```

Used in all 16-step grids: `className="grid grid-cols-16"`.

---

## 14. Known Limitations & Technical Debt

### Audio

- **Single pattern playback only.** The scheduler always reads `patterns[0]` — pattern switching during playback not implemented. The `arrangement` field in `Project` is defined but `ArrangementView` is not wired into `App.tsx`.
- **No polyphony for bass.** Each bass step creates a new oscillator. Rapid triggering can produce voice stacking.
- **Offline export does not include sampler.** The `OfflineAudioContext` cannot access live `AudioBuffer` refs held in `useSampler`. Sampler stems would require the buffers to be passed into the export function.
- **Drum kit profiles are duplicated.** The profiles object is inlined inside `createDrumEngine()` in `utils/audio.ts` rather than imported from `constants.ts`.

### State

- **Pattern ID collision.** `handleAddPattern` uses `p${patterns.length + 1}` which can produce duplicate IDs if patterns are deleted (delete is not yet implemented, but the ID scheme is fragile).
- **localStorage only.** No cloud save/load. On a different browser or device, the project is gone.
- **Sampler buffers lost on reload.** Pad files must be re-dragged after every page refresh.

### UI

- **Mixer is always visible** (always rendered to the right of the main panel), while the Pattern Editor / Sampler tab alternates. This means the Mixer occupies permanent horizontal space.
- **No pattern switching UI in the current main layout.** `PatternSwitcher.tsx` exists but is not used in `App.tsx` — there is no way to switch between patterns in the current UI.
- **No mobile / touch support.** The RotaryKnob uses mouse events only. The layout assumes a wide screen.

### Packages

- The `packages/` workspace packages (`core`, `drum-engine`, `bass-engine`, `audio-utils`) are defined with their own source files but are not consumed by the studio — the studio uses inline implementations. These packages represent a future refactoring target.
