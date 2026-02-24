# Architecture

## Component Tree

```
App
├── Header (inline JSX)
│   ├── Project name input
│   ├── Export Stems button
│   └── Export Master button
├── TransportBar
│   ├── Play/Stop button
│   ├── BPM input
│   └── Swing slider
├── Main content (flex row)
│   ├── Left column
│   │   ├── PatternEditor
│   │   │   ├── Drums section
│   │   │   │   ├── Per-instrument row (label + M/S buttons + 16-step grid)
│   │   │   │   └── Drum params panel (Tune/Decay per instrument)
│   │   │   ├── Bass section
│   │   │   │   ├── Bass params (waveform toggle + Cutoff/Res/Env/Decay)
│   │   │   │   └── 12-note × 16-step grid
│   │   │   └── Synth section
│   │   │       ├── Synth params (Attack/Release/Cutoff/Detune)
│   │   │       └── 12-note × 16-step grid
│   │   └── PatternSwitcher
│   │       └── 32-slot pattern grid + Add button
│   └── Right column (w-80)
│       └── MixerView
│           ├── ChannelRack × 3 (Drums / Bass / Synth)
│           │   ├── Volume fader (vertical)
│           │   ├── EQ section (HI / MID / LOW)
│           │   └── FX section (Reverb / D.Time / D.Fdbk / D.Mix)
│           └── Master Bus
│               ├── Volume fader (vertical)
│               └── Drive slider
└── useAudioEngine (hook — no UI)
```

---

## State Management

All state lives in `App.tsx`. There is no external state library.

### Primary state

```typescript
const [project, setProject] = useState<Project>(/* loaded from localStorage */);
const [activePatternId, setActivePatternId] = useState(project.patterns[0].id);
const [isExporting, setIsExporting] = useState(false);
```

### Derived values

```typescript
const activePattern = project.patterns.find(p => p.id === activePatternId);
```

### Audio engine state (inside useAudioEngine)

```typescript
const [isPlaying, setIsPlaying] = useState(false);
const [currentStep, setCurrentStep] = useState(0);
```

These are returned from the hook and passed down as props where needed.

### Update pattern helper

`updateActivePattern(updater)` is a memoised helper that maps over `project.patterns` and applies `updater` only to the currently active pattern. Used by all step-toggle handlers.

---

## Data Flow

### Playback

```
User clicks Play
  → togglePlay() in useAudioEngine
    → AudioContext created (first time only) + full audio graph wired
    → scheduler() starts on 25ms setInterval
      → scheduleNote(step, time)
        → reads projectRef.current (always current project)
        → calls drum/bass/synth engine factories
        → triggers synthesis at precise future time
      → stepRef advances, setCurrentStep() fires
        → PatternEditor highlights active step column
```

`projectRef` is a ref kept in sync with the `project` prop on every render, so the scheduler always reads live state without needing to restart.

### Edit

```
User clicks a step button in PatternEditor
  → handleToggle*Step() in App.tsx
    → updateActivePattern() produces new project state
    → setProject() triggers re-render
    → localStorage debounce timer resets (saves after 1s idle)
    → projectRef.current updated via useEffect
```

### Mixer change

```
User moves a slider in MixerView
  → onMixerChange(newMixer) → setProject()
    → project.mixer changes
    → useEffect in useAudioEngine fires (watches project.mixer)
      → sets gainNode.gain.value, filter.gain.value, etc. directly
      → no audio graph rebuild needed
```

Mixer updates are cheap: they write directly to live audio node parameters without restarting or rebuilding the graph.

### Export

```
User clicks Export Master / Export Stems
  → setIsExporting(true) + button shows "Rendering..."
  → renderToWav(project, activePattern, mode)
    → creates OfflineAudioContext (stereo, 44.1kHz)
    → rebuilds master bus + FX buses + channel strips
    → schedules 4 × 16 steps of notes
    → ctx.startRendering() → AudioBuffer (fast, non-real-time)
    → audioBufferToWav() → Blob
  → downloadBlob() creates <a> and clicks it → browser download
  → setIsExporting(false)
```

Stem export runs `renderToWav` three times in sequence (drums → bass → synth) with 500ms pauses between downloads to prevent browser popup blocking.

---

## Audio Graph

The full Web Audio graph created on first play:

```
Drum voices (BD/SD/HC/OH/LT/HT)
    └→ Per-instrument layerGain (mute/solo control)
         └→ drumGain (channel volume)
              └→ drumLow → drumMid → drumHigh (3-band EQ)
                   ├→ masterGain (dry path)
                   ├→ drumReverbSend → sharedReverb (convolver)
                   └→ drumDelaySend → sharedDelay

Bass oscillator → filter → gain
    └→ bassGain
         └→ bassLow → bassMid → bassHigh
              ├→ masterGain
              ├→ bassReverbSend → sharedReverb
              └→ bassDelaySend → sharedDelay

Synth osc1/osc2/osc3 → filter → gain
    └→ synthGain
         └→ synthLow → synthMid → synthHigh
              ├→ masterGain
              ├→ synthReverbSend → sharedReverb
              └→ synthDelaySend → sharedDelay

sharedReverb (ConvolverNode)
    └→ sharedReverbReturn (gain 0.8)
         └→ masterGain

sharedDelay (DelayNode)
    ↑← sharedDelayFeedback (feedback loop)
    └→ sharedDelayReturn (gain 0.8)
         └→ masterGain

masterGain
    └→ masterDrive (WaveShaperNode, 4× oversample)
         └→ AudioContext.destination
```

**Key design decisions:**

- The audio graph is built **once** when play is first pressed and never torn down. Stopping playback just cancels the scheduler timer; resuming restarts it.
- Per-instrument `layerGain` nodes for drums allow mute/solo to be applied at scheduling time without rebuilding the graph.
- EQ filters are post-channel-gain (before the master bus), so the channel fader affects wet and dry equally.
- Reverb and delay sends tap **after** EQ, so EQ changes affect what goes into the FX buses.
- The shared delay bus uses the **Drums** channel's delay time and feedback settings. All three channels send to this same bus; only the send level (D.MIX) differs per channel.

---

## Persistence

Project state is serialised to JSON and stored in `localStorage` under the key `'sequencer-project'`.

A 1-second debounce prevents writes on every keystroke or slider move:

```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    localStorage.setItem('sequencer-project', JSON.stringify(project));
  }, 1000);
  return () => clearTimeout(timeout);
}, [project]);
```

On app load, the saved value is read synchronously inside the `useState` initialiser. If no saved project exists, `INITIAL_PROJECT` from `constants.ts` is used.

There is no migration logic — if the schema changes, the saved JSON may be stale. A page reload with cleared localStorage resets to defaults.

---

## Known Architectural Limitations

1. **Scheduler reads only `patterns[0]`** — `scheduleNote` in `useAudioEngine.ts` hard-codes `currentProject.patterns[0]` as the pattern to play, ignoring `activePatternId`. Pattern switching during live playback has no effect.

2. **Shared delay bus driven by drums** — All three channels' delay time and feedback come from `project.mixer.drums.delay`. Bass and synth delay time/feedback sliders exist in the UI but are not independently connected to the audio graph.

3. **New AudioContext on every first play** — The `AudioContext` is created inside `togglePlay()`. Calling stop and play again reuses the same context, but a full page reload requires first play to create it again.

4. **No pattern chaining** — The `arrangement` field in `Project` and `ArrangementView` component exist but are not connected to the scheduler.
