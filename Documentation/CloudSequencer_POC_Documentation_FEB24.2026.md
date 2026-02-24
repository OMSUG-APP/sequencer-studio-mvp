# AudioCoach CloudSequencer POC - Context & Roadmap

## 1. Project Snapshot
- **Date:** February 23, 2026
- **Repo:** https://github.com/OMSUG-APP/sequencer-studio-poc.git
- **Current State:** Stable MVP with 3 instruments (Drums, Bass, Atmospheric Pad), per-instrument FX, and WAV export.

## 2. What Was Achieved in This Phase

### 2.1 Instruments & Sound Engine
- Extended drum synthesis so **BD, SD, HC, OH, LT, HT** all produce sound.
- Confirmed bass synth and atmospheric pad are playable via the step sequencer.
- Ensured all three instruments route through a structured mixer (drums, bass, synth buses + master bus).

### 2.2 Effects & Mixer
- Implemented **per-instrument FX control**:
  - Reverb send per channel.
  - Delay time / feedback / mix per channel.
- Built a **Mixer Console** UI (right sidebar) with:
  - Volume faders for Drums, Bass, Synth, and Master.
  - 3-band EQ sliders per instrument (Hi, Mid, Low).
  - Reverb and Delay controls per instrument.
- Fixed slider interaction bugs by adjusting CSS (removing problematic `appearance-none` usage where it broke dragging).

### 2.3 Playback & Scheduling
- Restored a **stable Web Audio scheduler** using:
  - `setInterval` (~25 ms) + 100 ms audio look-ahead window.
  - 16-step looping pattern.
- Ensured the transport loops correctly and no longer speeds up or stops early.
- Resolved an incident where an experimental "Arrangement Mode" and top transport bar caused timing bugs. Final stable build does **not** include arrangement or song mode yet.

### 2.4 Export Features
- Reconfirmed WAV export functionality (from previous work):
  - Master mix export.
  - Stem export (per-instrument), rendered through the full FX chain using `OfflineAudioContext`.

### 2.5 Stability & Recovery Work
- Performed a full recovery when the project became unstable:
  - Created backup folder: `sequencer-studio-poc-BACKUP2`.
  - Cloned a **fresh copy** from GitHub (`OMSUG-APP/sequencer-studio-poc`).
  - Cleared browser `localStorage` key `sequencer-project` to remove corrupted state from earlier experiments.
- Verified that the clean clone plus cleared storage produced a stable, looping sequencer again.

## 3. Current Architecture Overview

### 3.1 Frontend Stack
- **Framework:** React (Vite)
- **Styling:** Tailwind CSS
- **Build Tool:** Vite

### 3.2 Important Files
- `apps/studio/src/App.tsx`
  - Main layout and high-level state (project, patterns, mixer, persistence).
  - Hosts `PatternEditor` and `MixerView` components.
  - Wires `useAudioEngine` to UI controls (Play/Stop, BPM, etc.).

- `apps/studio/src/hooks/useAudioEngine.ts`
  - Encapsulates the Web Audio scheduling logic.
  - Responsible for:
    - Creating / managing `AudioContext`.
    - Scheduling 16-step playback.
    - Triggering drum, bass, and pad voices.

- `apps/studio/src/components/PatternEditor.tsx`
  - UI for:
    - Drum step sequencer (rows: BD, SD, HC, OH, LT, HT).
    - Bass step sequencer (note grid).
    - Atmospheric pad step sequencer (note grid).
  - Displays per-drum tune/decay sliders beneath the grid.

- `apps/studio/src/components/MixerView.tsx`
  - Right-side Mixer Console UI:
    - Channel strips for Drums, Bass, Synth.
    - Master Bus controls.
    - Volume, EQ, Reverb, Delay sliders.

- `packages/bass-engine/src/BassSynth.ts`
  - Bass synth implementation used by `useAudioEngine` when bass steps are active.

- `apps/studio/src/utils/audio.ts`
  - Drum synthesis utilities (kick, snare, hats, toms, etc.).

### 3.3 Data Model (High Level)
- `Project` object contains:
  - Global tempo (BPM) and swing.
  - `patterns[]` (currently one is used for playback).
  - Mixer state (per-instrument + master).
  - Per-instrument parameter objects (drum params, bass params, synth params).

## 4. Known Good Baseline (Use This As Reset Point)

When starting a new development session or AI-assisted refactor, the **trusted baseline** is:

1. Fresh clone from GitHub:
   - Repo: `https://github.com/OMSUG-APP/sequencer-studio-poc.git`
2. Install and run:
   - `npm install`
   - `npm run dev`
3. In browser dev tools, ensure `localStorage` key `sequencer-project` is either:
   - Cleared, or
   - Holds valid data matching the current `INITIAL_PROJECT` shape.

If playback timing or UI state becomes corrupted during experiments, the recovery protocol is:
- Stop dev server.
- Optionally backup current folder.
- Re-clone from GitHub.
- Clear `localStorage` for `localhost:5173` (remove `sequencer-project`).

## 5. Roadmap: Next Updates & UI Redesign

This roadmap is intended for future work (including new Abacus chats) and should be treated as the canonical plan.

### 5.1 Phase A – UI Polish & Ergonomics

**Goals:** Improve clarity, usability, and professional look without changing core audio behavior.

1. **Unified Slider Component**
   - Create a reusable `<Slider>` component with props:
     - `value`, `min`, `max`, `step`, `onChange`.
     - `color` (theme: emerald/orange/purple/white).
     - `orientation` (horizontal/vertical).
   - Replace raw `<input type="range">` usages in:
     - `PatternEditor` (drum tune/decay, bass filter/env, pad ADSR).
     - `MixerView` (channel EQ, FX sends, volume, master controls).
   - Ensure accessibility and keyboard control remain intact.

2. **Visual State & Feedback**
   - Add hover/active states for:
     - Drum steps.
     - Bass/pad notes.
     - Play/Stop button and Export buttons.
   - Light meter-style glow on active steps in current step column.

3. **Typography & Layout Refinements**
   - Standardize font sizes and letter-spacing for labels:
     - Section titles (e.g., "DRUM MACHINE", "BASS SYNTHESIZER").
     - Control labels (e.g., "TUNE", "DECAY", "EQ HI").
   - Align grids more tightly with consistent gutters and padding.

4. **Note Label Improvements**
   - Confirm and, if needed, adjust rows in Bass and Pad grids to match musical octaves (e.g., C2–C4).
   - Potentially show note + octave (e.g., `C2`, `D#2`) in a tooltip or small label.

### 5.2 Phase B – Transport Bar & Project Controls

**Goals:** Introduce a robust, fixed transport and project header without touching the core scheduler logic initially.

1. **Transport Bar Layout (UI Only First)**
   - Fixed bar at top containing:
     - Project name (editable).
     - Play / Stop buttons.
     - BPM control.
     - Swing control.
     - Export buttons (Master, Stems).
   - Initially, these controls should simply proxy to existing props/state in `App.tsx` and `useAudioEngine`.

2. **Non-Destructive Refactor**
   - Extract current play/tempo controls from the central panel into a new component, e.g. `TransportBar.tsx`.
   - Ensure the move does **not** change `useAudioEngine` timing – only relocate the UI wiring.

3. **Save/Load UX**
   - Add small indicators:
     - "Saved" / "Saving…" when `localStorage` updates.
     - A simple preset system for patterns/projects in localStorage (optional for later).

### 5.3 Phase C – Arrangement & Song Mode (Careful, High Impact)

> Important: All future work in this phase must **respect the existing stable scheduler** and should be implemented incrementally.

1. **Data Model Extension**
   - Introduce `ArrangementBlock` type, e.g.:
     - `id`, `patternId`, `startBar`, `lengthBars`, `label`, `color`.
   - Extend `Project` type with `arrangement: ArrangementBlock[]`.
   - Default: a single block referencing the first pattern, spanning 4 bars.

2. **Read-Only Arrangement Timeline (UI Only)**
   - Build a top-of-screen timeline showing blocks across bars.
   - Initially: non-editable, single block matching the active pattern.
   - No changes to audio – purely visual scaffolding.

3. **Scheduler Extension (Audio + Data)**
   - Carefully adapt `useAudioEngine` to:
     - Compute the current bar and position within bar from global step index.
     - Map global step to `(patternId, stepIndex)` using `arrangement`.
   - Keep a feature flag or fallback path to the old behavior during development.

4. **Interactive Arrangement Editing**
   - Enable drag-and-drop arrangement editing:
     - Add/remove blocks.
     - Duplicate patterns.
     - Change order (Intro, Verse, Break, etc.).
   - Ensure changes propagate to and from `Project` state and persist to `localStorage`.

### 5.4 Phase D – AI & AudioCoach Features

1. **AI Pattern Generation**
   - Add a small "AI" or wand icon per instrument.
   - Clicking it sends current pattern context (BPM, style tokens) to an AI endpoint.
   - Replace or merge pattern steps with AI-generated content.

2. **AI Smart Mixing**
   - One-click analysis of current pattern to set:
     - Channel volumes.
     - Basic EQ curves.
     - Reverb/Delay amounts.

3. **AI Arrangement Suggestions**
   - Given existing patterns, generate a recommended arrangement (e.g., 32 bars: intro, build, drop, breakdown, outro).

## 6. Guidelines for Future Abacus / AI Sessions

When starting a new Abacus Chat or AI-assisted development session, use this checklist:

1. **Load Context**
   - Provide this `CONTEXT.md` to the assistant.
   - State clearly which phase you are working on (e.g., "Phase A – slider polish" or "Phase C – arrangement timeline").

2. **Protect the Audio Engine**
   - Avoid large refactors of `useAudioEngine.ts` unless explicitly working on Phase C.
   - Prefer UI-only changes, new components, or small additions to existing types.

3. **Work Incrementally**
   - Implement one feature at a time.
   - After each feature:
     - Run `npm run dev`.
     - Test looping and playback.
     - Commit to Git with a descriptive message.

4. **Recovery Protocol**
   - If timing breaks or UI becomes unresponsive:
     - Stop dev server.
     - Revert to last commit or re-clone repo.
     - Clear `localStorage` key `sequencer-project`.

This document should be treated as the single source of truth for the current state and intended direction of the AudioCoach CloudSequencer POC/MVP.
