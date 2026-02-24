# Audio Engine

All audio logic lives in two files:
- `apps/studio/src/utils/audio.ts` — synthesis engine factories
- `apps/studio/src/hooks/useAudioEngine.ts` — Web Audio graph, scheduler, mixer sync

---

## Synthesis Engines (`utils/audio.ts`)

All three factories follow the same pattern: they accept a `BaseAudioContext` and a destination `AudioNode`, and return an object with play functions. A new set of oscillators/buffers is created on every trigger — there is no voice pooling.

---

### `createDrumEngine(ctx, dest)`

Returns: `{ playBD, playSD, playHC, playOH, playLT, playHT }`

All drum functions share the signature:
```typescript
(time: number, velocity: number, p: { tune: number; decay: number }) => void
```

`time` is an AudioContext timestamp (seconds from context start). `velocity` is 0–1 gain multiplier. `p.tune` and `p.decay` are normalised 0–1 values mapped to frequency/time ranges.

#### `playBD` — Kick Drum
- Single sine oscillator with exponential pitch envelope
- Pitch: `50 + tune × 200` Hz → 0.01 Hz over `0.1 + decay × 0.8` seconds
- Amplitude: velocity → 0.01 over the same decay time

#### `playSD` — Snare
- **Noise layer**: white noise buffer → highpass filter (500–1500 Hz) → gain
  - Noise decay: `0.1 + decay × 0.3` seconds
  - Filter frequency: `500 + tune × 1000` Hz
- **Tone layer**: triangle oscillator (100–250 Hz) → gain
  - Fixed decay: 0.1s
- Both layers connect directly to `dest`; they are summed at equal level (`velocity × 0.5` each)

#### `playHC` — Closed Hi-Hat
- White noise buffer → highpass filter (5000–9000 Hz) → gain
- Decay: `0.02 + decay × 0.1` seconds (20–120ms)
- Gain: `velocity × 0.3`

#### `playOH` — Open Hi-Hat
- Same circuit as HC with longer decay: `0.1 + decay × 0.4` seconds (100–500ms)
- Same highpass frequency range (5000–9000 Hz)

#### `playLT` — Long Tom
- Same noise + highpass circuit with the longest decay: `0.3 + decay × 0.8` seconds (300–1100ms)
- Slightly lower highpass range: 4000–8000 Hz

#### `playHT` — High Tom / Rim
- Single oscillator with a minimal pitch drop
- Frequency: `300 + tune × 400` Hz → `baseFreq × 0.8` over `0.05 + decay × 0.2` seconds (50–250ms)
- Gain: `velocity × 0.6`

---

### `createBassEngine(ctx, dest)`

Returns: `{ playNote }`

```typescript
playNote(
  time: number,
  freq: number,
  duration: number,
  velocity: number,
  p: { waveform: 'sawtooth' | 'square'; cutoff: number; resonance: number; envMod: number; decay: number }
) => void
```

**Signal path:** oscillator → lowpass filter → gain → dest

- **Oscillator**: sawtooth or square, pitch set to `freq`
- **Filter**: single-pole lowpass
  - Base cutoff: `50 + cutoff × 4950` Hz (50–5000 Hz)
  - Peak cutoff at trigger: `min(baseCutoff + envMod × 8000, 20000)` Hz
  - Envelope: exponential ramp from peak → base over `0.1 + decay × 1.4` seconds
  - Resonance (Q): `resonance × 25` (0–25)
- **Amplitude**: `velocity × 0.4`, decays via `setTargetAtTime(0, time, decayTime/3)`

The bass engine is monophonic by construction — every call creates independent nodes and they stack. Voice stealing is not implemented; rapid notes will overlap briefly.

---

### `createSynthEngine(ctx, dest)`

Returns: `{ playNote }`

```typescript
playNote(
  time: number,
  freq: number,
  duration: number,
  velocity: number,
  p: { attack: number; release: number; cutoff: number; detune: number }
) => void
```

**Signal path:** osc1 + osc2 + osc3 → lowpass filter → gain → dest

- **osc1**: sawtooth at `freq`, no detune
- **osc2**: sawtooth at `freq`, detune `+detune × 50` cents
- **osc3**: square at `freq / 2` (sub octave), detune `-detune × 50` cents
- **Filter**: lowpass at `200 + cutoff × 6000` Hz (200–6200 Hz), static (no envelope)
- **Amplitude envelope (ADSR)**:
  - Attack: linear ramp 0 → `velocity × 0.15` over `0.05 + attack × 2.0` seconds
  - Sustain: held at `velocity × 0.15` for `duration` seconds
  - Release: linear ramp → 0 over `0.1 + release × 3.0` seconds
- Total node lifetime: `duration + releaseTime`

The low `velocity × 0.15` ceiling prevents the pad from overpowering the mix.

---

### `noteToFreq(note: string): number`

Converts a note string like `"C2"`, `"A#4"` to Hz.

```typescript
const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
semitones = noteIndex + (octave + 1) * 12;
freq = 440 * Math.pow(2, (semitones - 69) / 12);
```

Uses standard 12-TET tuning (A4 = 440 Hz). Note: the formula uses `(octave + 1)` as an octave offset, so octave numbers in the UI map to standard MIDI octave convention.

---

## Scheduler (`useAudioEngine.ts`)

### Timing model

The scheduler runs on a `window.setTimeout(scheduler, 25)` loop — approximately every 25ms.

On each tick it looks 100ms ahead (`audioCtxRef.current.currentTime + 0.1`) and schedules all steps that fall within that window:

```typescript
while (nextNoteTimeRef.current < audioCtx.currentTime + 0.1) {
  scheduleNote(stepRef.current, nextNoteTimeRef.current);
  nextNoteTimeRef.current += secondsPerStep;
  stepRef.current = (stepRef.current + 1) % 16;
  setCurrentStep(stepRef.current);
}
```

`secondsPerStep = 60 / bpm / 4` — one sixteenth note at the current BPM.

The 100ms lookahead ensures notes are scheduled before the browser's audio processing deadline, preventing dropouts. The 25ms interval means the scheduler fires roughly 4× before the lookahead window expires, providing redundancy.

### Swing

Odd-numbered steps (1, 3, 5, …15) are time-shifted forward:

```typescript
if (step % 2 === 1) {
  adjustedTime += secondsPerStep * (swing / 100);
}
```

At `swing = 0`: perfectly quantised grid.
At `swing = 50`: odd steps delayed by half a sixteenth — classic triplet swing feel.
At `swing = 100`: odd steps delayed by a full sixteenth (no swing, notes double up).

Swing is applied at schedule time using the live `project.swing` value (via `projectRef`), so it takes effect immediately without restarting.

### Mute / Solo logic

Evaluated per-instrument at schedule time:

```typescript
const anySoloed = drumInstruments.some(inst => drumParams[inst]?.solo);
const effectiveMuted = isMuted || (anySoloed && !isSoloed);
layerGain.gain.setValueAtTime(effectiveMuted ? 0 : 1, adjustedTime);
```

The synthesis still runs (oscillators are created), but their output is gated to 0. This is simpler than skipping synthesis and avoids click artifacts.

---

## Audio Graph Setup

The full graph is built **once** when `togglePlay()` is called for the first time. It persists for the lifetime of the page.

### Master bus

```
masterGain → masterDrive (WaveShaper, 4× oversample) → AudioContext.destination
```

### Shared reverb bus

- `ConvolverNode` loaded with a synthetic impulse response (2.5s, decay=2.0)
- IR generated by `createReverbIR()`: two channels of white noise × exponential decay envelope
- Output through a fixed return gain of 0.8 into `masterGain`

### Shared delay bus

```
sharedDelay (DelayNode, max 2s)
    → sharedDelayFeedback (GainNode) ──┐
    ↑─────────────────────────────────┘  (feedback loop)
    → sharedDelayReturn (gain 0.8) → masterGain
```

Delay time and feedback are set from `project.mixer.drums.delay`. All channels send to this single bus.

### Channel strips (identical structure for drums, bass, synth)

```
channelGain
    → lowEQ (lowshelf, 250 Hz) → midEQ (peaking, 1 kHz) → highEQ (highshelf, 4 kHz)
         ├→ masterGain          (dry)
         ├→ reverbSend → sharedReverb
         └→ delaySend → sharedDelay
```

EQ filter gains are set from `project.mixer.[channel].eq.{low,mid,high}` (±12 dB range).

### Drum layer gains

For each drum instrument that triggers, a `layerGain` node is created on first use and cached in `drumLayerGainsRef`. They sit between the synthesis destination and `drumGain`:

```
drumVoice → drumLayerGain[inst] → drumGain
```

This allows per-instrument mute/solo without per-note gain node allocation after the first trigger.

---

## Effects

### Distortion (Master Drive)

```typescript
function makeDistortionCurve(amount: number) {
  // amount = drive × 400 (range 0–400)
  const k = amount;
  for (let i = 0; i < 44100; i++) {
    const x = (i * 2) / 44100 - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
}
```

This is a soft-knee saturation curve. At `drive = 0`, the curve is nearly linear. At higher values it compresses peaks and adds harmonic saturation. The `4×` oversample mode on the WaveShaperNode reduces aliasing.

The drive knob in the UI maps 0–1 to 0–400 for this formula.

### Reverb IR

```typescript
function createReverbIR(ctx, duration, decay) {
  // duration = 2.5s, decay = 2.0
  left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
}
```

Generates a synthetic impulse response by shaping white noise with an exponential decay envelope. Used in the `ConvolverNode` to simulate room reverb. The same IR is used for both the live engine and the export renderer (though the export uses `duration=2.0`).

---

## Mixer Sync

The `useEffect` in `useAudioEngine` watches `project.mixer` and applies changes directly to audio node parameters:

| Mixer value | Audio node update |
|---|---|
| `channel.volume` | `channelGain.gain.value = volume` |
| `channel.eq.low` | `lowEQ.gain.value = eq.low` |
| `channel.eq.mid` | `midEQ.gain.value = eq.mid` |
| `channel.eq.high` | `highEQ.gain.value = eq.high` |
| `channel.reverb` | `channelReverbSend.gain.value = reverb` |
| `channel.delay.mix` | `channelDelaySend.gain.value = mix` |
| `drums.delay.time` | `sharedDelay.delayTime.setTargetAtTime(time, now, 0.1)` |
| `drums.delay.feedback` | `sharedDelayFeedback.gain.value = feedback` |
| `master.volume` | `masterGain.gain.value = volume` |
| `master.drive` | `masterDrive.curve = makeDistortionCurve(drive × 400)` |

`setTargetAtTime` is used for delay time to avoid clicks from abrupt changes.

---

## Export Pipeline (`utils/export.ts`)

### `renderToWav(project, pattern, mode)`

```typescript
mode: 'master' | 'drums' | 'bass' | 'synth'
```

Creates an `OfflineAudioContext` at 44.1 kHz for the full render duration:

```
duration = (4 loops × 16 steps × secondsPerStep) + 3s tail
```

The 3-second tail gives reverb and delay time to decay fully before the WAV ends.

**Audio graph** (mirrors the live graph):
```
driveNode → masterGain → ctx.destination
reverbNode → driveNode
delayNode (with feedback) → driveNode
channelStrips (drums/bass/synth) → driveNode + reverb send + delay send
```

**Stem muting**: If `mode !== 'master'`, any channel whose name doesn't match `mode` has its gain set to 0:
```typescript
if (mode !== 'master' && mode !== name) {
  gain.gain.value = 0;
}
```

**Scheduling loop**:
```typescript
for loop in 0..3:
  for step in 0..15:
    time = (loop * 16 + step) * stepTime
    // schedule drums, bass, synth at time
```

Synth notes use `stepTime × 4` duration (4 sixteenth notes) to let chords ring. Bass notes use `stepTime × step.length` (default 1 step).

**WAV encoding** (`audioBufferToWav`):
- Writes standard RIFF/WAVE header (44 bytes)
- Interleaves L/R channel samples
- Clamps each sample to [-1, 1], converts to 16-bit signed integer
- Returns `Blob` with MIME type `audio/wav`
