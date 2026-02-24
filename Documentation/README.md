# Sequencer Studio — Documentation

A browser-based music production sequencer built with React, TypeScript, and the Web Audio API.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Feature Summary](#feature-summary)
- [Documentation Index](#documentation-index)

---

## Overview

Sequencer Studio is a fully self-contained DAW-lite running in the browser. It has no backend — all synthesis, mixing, and export is done via the Web Audio API. The project is structured as an npm monorepo where the main `apps/studio` React app imports audio engine logic from local `packages/`.

The current build is a POC (Proof of Concept) that reached MVP status with three instruments, a mixer console, and WAV export.

---

## Quick Start

```bash
# Install all dependencies (root + workspaces)
npm install

# Start the dev server (Vite, port 3000)
npm run dev

# Open http://localhost:3000
```

**Spacebar** toggles play/stop from anywhere in the UI.

---

## Feature Summary

### Instruments
| Instrument | Type | Notes |
|---|---|---|
| BD | Kick drum | Sine oscillator with pitch envelope |
| SD | Snare | Noise + triangle oscillator blend |
| HC | Closed Hi-Hat | High-pass filtered noise, 20–120ms decay |
| OH | Open Hi-Hat | High-pass filtered noise, 100–500ms decay |
| LT | Long Tom | Extended open hat, 300–1100ms decay |
| HT | High Tom / Rim | Pitched oscillator ping, 50–250ms decay |
| Bass | Monophonic synth | Sawtooth or square, resonant filter envelope |
| Pad | Atmospheric synth | 3-oscillator unison, ADSR envelope |

### Sequencer
- 16-step pattern grid per track
- 32 pattern slots (switchable in real-time)
- Per-drum Mute and Solo buttons
- Swing control (0–100%)
- BPM control

### Mixer
- Per-channel volume fader (0–1.5× gain)
- 3-band EQ per channel: Low shelf (250 Hz), Mid peak (1 kHz), High shelf (4 kHz), ±12 dB each
- Reverb send per channel (shared convolver bus)
- Delay send per channel (shared feedback delay bus)
- Master volume, master drive (soft-knee saturation)

### Export
- **Export Master** — full stereo mix, 4 loops + 3s tail
- **Export Stems** — drums, bass, and synth as separate WAV files
- Format: 44.1 kHz, 16-bit PCM WAV
- Rendered via `OfflineAudioContext` (faster than real-time)

### Persistence
- Project saved to `localStorage` automatically (1s debounce)
- Editable project name in the header

---

## Documentation Index

| File | Contents |
|---|---|
| [architecture.md](./architecture.md) | Component tree, data flow, state management, audio graph |
| [audio-engine.md](./audio-engine.md) | Synthesis engines, scheduler, effects chains, export pipeline |
| [components.md](./components.md) | All React component props and behaviour |
| [data-model.md](./data-model.md) | TypeScript types, initial state, localStorage schema |

---

## Project Structure

```
sequencer-studio-poc/
├── apps/
│   └── studio/                  # Main Vite + React app
│       ├── src/
│       │   ├── App.tsx           # Root component & state
│       │   ├── types.ts          # TypeScript interfaces
│       │   ├── constants.ts      # INITIAL_PROJECT / INITIAL_PATTERN
│       │   ├── index.css         # Global styles & CSS vars
│       │   ├── components/       # UI components
│       │   │   ├── TransportBar.tsx
│       │   │   ├── PatternEditor.tsx
│       │   │   ├── PatternSwitcher.tsx
│       │   │   ├── MixerView.tsx
│       │   │   ├── Slider.tsx
│       │   │   └── ArrangementView.tsx
│       │   ├── hooks/
│       │   │   └── useAudioEngine.ts
│       │   └── utils/
│       │       ├── audio.ts      # Synthesis engine factories
│       │       └── export.ts     # OfflineAudioContext renderer
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       └── tsconfig.json
└── packages/
    ├── drum-engine/              # Class-based drum synth (unused in live path)
    ├── bass-engine/              # Class-based bass synth (unused in live path)
    ├── core/                     # Transport & Scheduler classes
    ├── audio-utils/              # WAV encoding utilities
    └── contracts/                # Shared Zod-validated types
```

> **Note:** The `packages/` directory contains modular engines that were built as a foundation. The live audio path in `apps/studio` currently uses the lighter factory functions in `utils/audio.ts` rather than the class-based packages.
