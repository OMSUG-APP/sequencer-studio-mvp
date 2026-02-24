# AudioCoach.ai - POC to MVP Handoff Documentation

## 1. Project Overview
**AudioCoach.ai** is an AI Studio Assistant for Electronic Music Production. The goal of this phase was to build a lean, mobile-first Proof of Concept (POC) that functions as a beta demo for users. 

The application is a browser-based groovebox and sequencer that allows users to program drum patterns and basslines, adjust mixer settings, and export their loops.

## 2. Architectural Decisions & Reasoning
During the POC phase, several key architectural decisions were made to ensure the app remains lightweight, cloud-neutral, and scalable for the MVP phase:

*   **Tech Stack:** React + Vite + TypeScript + Tailwind CSS.
*   **Audio Engine:** Native Web Audio API. *Reasoning:* Avoids heavy third-party libraries (like Tone.js) to keep the bundle size minimal and maintain absolute control over the audio graph and synthesis parameters.
*   **Monorepo Structure:** npm workspaces with private packages. *Reasoning:* Separating the audio engines from the UI allows the software team to test, version, and swap out DSP (Digital Signal Processing) logic without breaking the React frontend. It also prepares the codebase for potential NPM private registry publishing.
*   **Persistence:** LocalStorage. *Reasoning:* The beta requirement was "no login required." Therefore, Firebase/Cloud storage was deferred to the MVP, and local browser storage is used to save patterns and mixer states.
*   **Cloud Infrastructure:** Designed to be cloud-neutral (transferable from Google Cloud to AWS).

## 3. Monorepo Structure
The project is structured into discrete packages:

*   `@your-org/contracts`: Shared TypeScript interfaces (`Project`, `Pattern`, `MixerState`, etc.) ensuring type safety across all packages.
*   `@your-org/core`: State management, LocalStorage persistence logic, and placeholders for future AI integration.
*   `@sequencer/drum-engine`: Web Audio API synthesis for Kick, Snare, Clap, Closed Hat, Open Hat (with choke groups), and Rimshot.
*   `@sequencer/bass-engine`: Web Audio API subtractive synthesizer (Sawtooth/Square oscillators, Lowpass filter, Envelope).
*   `@sequencer/audio-utils`: Master bus logic, audio context management, and in-browser WAV export functionality.
*   `apps/studio`: The main React application that imports the above packages and renders the UI.

## 4. Features Built & Currently Working (Functional State)
As of the current stable rollback state, the following features are functional:

*   **App Shell & UI:** A mobile-responsive, dark-mode "hardware synth" aesthetic.
*   **Sequencer Grid:** A 16-step sequencer allowing users to toggle steps for multiple drum voices and select specific notes for the bassline.
*   **Playback Engine:** A robust Web Audio API scheduling clock (lookahead timer) that ensures sample-accurate playback without UI thread blocking.
*   **Audio Synthesis:** The Drum Engine and Bass Engine successfully synthesize sound and trigger on the scheduled steps.
*   **Mixer UI:** A visual mixer console with volume faders, EQ knobs, and FX sends (UI state is tracking correctly).
*   **Export:** Users can successfully bounce their current loop to a downloadable `.wav` file directly in the browser.

## 5. Known Issues & Immediate Next Steps for MVP
The primary roadblock encountered at the end of the POC phase involved **Audio Graph Routing**. 

*   **The Issue:** The UI for the Mixer (EQ, Reverb, Delay) was built and tracks state perfectly. However, the AI-generated `DrumEngine` and `BassEngine` packages were hardcoded to connect directly to the `AudioContext.destination` (the speakers). 
*   **The Attempted Fix:** We attempted to intercept the audio signal by creating `ChannelStrip` classes (with EQ and FX nodes) in the React app and passing these as the destination to the engines. This caused Vite module resolution errors due to relative pathing in the local monorepo setup.
*   **The Solution for the Software Team:** 
    1. Update the `DrumEngine` and `BassEngine` classes to accept a target `AudioNode` in their constructor or a `.connect(node)` method, rather than defaulting to `ctx.destination`.
    2. Ensure the monorepo's `tsconfig.json` paths are correctly mapped so Vite can resolve `@sequencer/*` imports to their raw `src/index.ts` files during local development without needing a build step for each package.

## 6. Roadmap for MVP (AbacusAI / Software Team Prompting)
When initiating the next phase, focus on the following implementations:

1.  **Audio Routing Fix:** Complete the connection between the synthesis engines and the Mixer channel strips.
2.  **AI Master Suggestion:** Implement the AI feature where the system analyzes the current pattern/mixer state and *suggests* mastering settings (EQ, Drive, Compression) via an LLM prompt, rather than applying them destructively.
3.  **Cloud Persistence:** Replace LocalStorage with AWS Cognito (Auth) and DynamoDB/S3 (Storage) for user accounts and project saving.
4.  **Advanced Synthesis:** Expose the internal parameters of the Drum and Bass engines (e.g., decay times, filter cutoff, resonance) to the React UI for user manipulation.
