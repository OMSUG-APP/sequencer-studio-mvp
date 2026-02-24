import { useCallback, useEffect, useRef, useState } from 'react';
import { Project, ChannelMixer } from '../types';
import { createDrumEngine, createBassEngine, createSynthEngine, noteToFreq } from '../utils/audio';

function makeDistortionCurve(amount: number) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100; const curve = new Float32Array(n_samples); const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) { const x = (i * 2) / n_samples - 1; curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x)); }
  return curve;
}

function createReverbIR(ctx: AudioContext, duration: number, decay: number) {
  const length = ctx.sampleRate * duration; const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  const left = impulse.getChannelData(0); const right = impulse.getChannelData(1);
  for (let i = 0; i < length; i++) {
    left[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    right[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return impulse;
}

export const useAudioEngine = (project: Project) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);
  const stepRef = useRef(0);
  
  const projectRef = useRef(project);
  useEffect(() => { projectRef.current = project; }, [project]);
  
  const drumGainRef = useRef<GainNode | null>(null);
  const bassGainRef = useRef<GainNode | null>(null);
  const synthGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const drumLowRef = useRef<BiquadFilterNode | null>(null); const drumMidRef = useRef<BiquadFilterNode | null>(null); const drumHighRef = useRef<BiquadFilterNode | null>(null);
  const bassLowRef = useRef<BiquadFilterNode | null>(null); const bassMidRef = useRef<BiquadFilterNode | null>(null); const bassHighRef = useRef<BiquadFilterNode | null>(null);
  const synthLowRef = useRef<BiquadFilterNode | null>(null); const synthMidRef = useRef<BiquadFilterNode | null>(null); const synthHighRef = useRef<BiquadFilterNode | null>(null);

  // Per-channel FX sends
  const drumReverbSendRef = useRef<GainNode | null>(null);
  const bassReverbSendRef = useRef<GainNode | null>(null);
  const synthReverbSendRef = useRef<GainNode | null>(null);

  const drumDelaySendRef = useRef<GainNode | null>(null);
  const bassDelaySendRef = useRef<GainNode | null>(null);
  const synthDelaySendRef = useRef<GainNode | null>(null);

  // Shared FX buses
  const sharedReverbRef = useRef<ConvolverNode | null>(null);
  const sharedReverbReturnRef = useRef<GainNode | null>(null);
  const sharedDelayRef = useRef<DelayNode | null>(null);
  const sharedDelayFeedbackRef = useRef<GainNode | null>(null);
  const sharedDelayReturnRef = useRef<GainNode | null>(null);

  const masterDriveRef = useRef<WaveShaperNode | null>(null);

  // Per-drum-layer gains for mute/solo
  const drumLayerGainsRef = useRef<Record<string, GainNode>>({});

  const scheduleNote = useCallback((step: number, time: number) => {
    if (!audioCtxRef.current || !drumGainRef.current || !bassGainRef.current || !synthGainRef.current) return;

    const currentProject = projectRef.current;
    const pattern = currentProject?.patterns?.[0]; 
    if (!pattern) return;

    const bpm = currentProject?.bpm || 120;
    const swing = currentProject?.swing || 0;
    const secondsPerStep = 60 / bpm / 4;
    
    let adjustedTime = time;
    if (step % 2 === 1) adjustedTime += secondsPerStep * (swing / 100);

    const bassEngine = createBassEngine(audioCtxRef.current, bassGainRef.current);
    const synthEngine = createSynthEngine(audioCtxRef.current, synthGainRef.current);

    // DRUMS SCHEDULING (with Mute/Solo logic)
    const drumsPattern = pattern.drums || {};
    const drumParams = currentProject.drumParams || {};
    const drumInstruments = Object.keys(drumsPattern);
    const anySoloed = drumInstruments.some(inst => drumParams[inst]?.solo);

    Object.entries(drumsPattern).forEach(([inst, steps]) => {
      const s = steps[step];
      if (!s?.active) return;

      // Ensure per-layer gain node exists
      if (!drumLayerGainsRef.current[inst]) {
        const layerGain = audioCtxRef.current!.createGain();
        layerGain.connect(drumGainRef.current!);
        drumLayerGainsRef.current[inst] = layerGain;
      }
      
      const layerGain = drumLayerGainsRef.current[inst];
      const p = drumParams[inst] || { tune: 0.5, decay: 0.5 };
      
      // Apply mute/solo logic
      const isMuted = p.mute;
      const isSoloed = p.solo;
      const effectiveMuted = isMuted || (anySoloed && !isSoloed);
      
      // Set gain to 0 if muted, 1 if playing
      layerGain.gain.setValueAtTime(effectiveMuted ? 0 : 1, adjustedTime);

      const layerEngine = createDrumEngine(audioCtxRef.current!, layerGain, currentProject.drumKit || '808');
      
      if (inst === 'BD') layerEngine.playBD(adjustedTime, s.velocity, p);
      if (inst === 'SD') layerEngine.playSD(adjustedTime, s.velocity, p);
      if (inst === 'HC') layerEngine.playHC(adjustedTime, s.velocity, p);
      if (inst === 'OH') layerEngine.playOH(adjustedTime, s.velocity, p);
      if (inst === 'LT') layerEngine.playLT(adjustedTime, s.velocity, p);
      if (inst === 'HT') layerEngine.playHT(adjustedTime, s.velocity, p);
    });

    // BASS SCHEDULING
    const bassStep = pattern.bass?.[step];
    if (bassStep?.active && bassStep?.note) {
      const bp = currentProject.bassParams || { waveform: 'sawtooth', octave: 2, cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 };
      const bassOctaveShift = (bp.octave || 2) - 2;
      const freq = noteToFreq(bassStep.note, bassOctaveShift);
      bassEngine.playNote(adjustedTime, freq, secondsPerStep * (bassStep.length || 1), bassStep.velocity || 0.8, bp);
    }

    // SYNTH SCHEDULING
    const synthStep = pattern.synth?.[step];
    if (synthStep?.active && synthStep?.note) {
      const sp = currentProject.synthParams || { octave: 4, attack: 0.5, release: 0.5, cutoff: 0.5, detune: 0.5 };
      const synthOctaveShift = (sp.octave || 4) - 4;
      const freq = noteToFreq(synthStep.note, synthOctaveShift);
      synthEngine.playNote(adjustedTime, freq, secondsPerStep * (synthStep.length || 4), synthStep.velocity || 0.6, sp);
    }
  }, []);

  const scheduler = useCallback(() => {
    if (!audioCtxRef.current) return;
    while (nextNoteTimeRef.current < audioCtxRef.current.currentTime + 0.1) {
      scheduleNote(stepRef.current, nextNoteTimeRef.current);
      const bpm = projectRef.current?.bpm || 120;
      const secondsPerStep = 60 / bpm / 4;
      nextNoteTimeRef.current += secondsPerStep;
      stepRef.current = (stepRef.current + 1) % 16;
      setCurrentStep(stepRef.current);
    }
    timerIDRef.current = window.setTimeout(scheduler, 25);
  }, [scheduleNote]);

  const applyMixerToAudio = useCallback(() => {
    const m = projectRef.current?.mixer || {};
    const drums = m.drums || {}; const bass = m.bass || {}; const synth = m.synth || {}; const master = m.master || {};

    if (drumGainRef.current) drumGainRef.current.gain.value = drums.volume ?? 0.8;
    if (bassGainRef.current) bassGainRef.current.gain.value = bass.volume ?? 0.8;
    if (synthGainRef.current) synthGainRef.current.gain.value = synth.volume ?? 0.7;
    if (masterGainRef.current) masterGainRef.current.gain.value = master.volume ?? 1.0;

    if (drumLowRef.current) drumLowRef.current.gain.value = drums.eq?.low ?? 0;
    if (drumMidRef.current) drumMidRef.current.gain.value = drums.eq?.mid ?? 0;
    if (drumHighRef.current) drumHighRef.current.gain.value = drums.eq?.high ?? 0;

    if (bassLowRef.current) bassLowRef.current.gain.value = bass.eq?.low ?? 0;
    if (bassMidRef.current) bassMidRef.current.gain.value = bass.eq?.mid ?? 0;
    if (bassHighRef.current) bassHighRef.current.gain.value = bass.eq?.high ?? 0;

    if (synthLowRef.current) synthLowRef.current.gain.value = synth.eq?.low ?? 0;
    if (synthMidRef.current) synthMidRef.current.gain.value = synth.eq?.mid ?? 0;
    if (synthHighRef.current) synthHighRef.current.gain.value = synth.eq?.high ?? 0;

    // Per-channel reverb sends
    if (drumReverbSendRef.current) drumReverbSendRef.current.gain.value = drums.reverb ?? 0;
    if (bassReverbSendRef.current) bassReverbSendRef.current.gain.value = bass.reverb ?? 0;
    if (synthReverbSendRef.current) synthReverbSendRef.current.gain.value = synth.reverb ?? 0;

    // Per-channel delay sends (mix = send amount)
    const emptyDelay = { time: 0.3, feedback: 0.3, mix: 0 };
    const drumDelay = drums.delay || emptyDelay;
    const bassDelay = bass.delay || emptyDelay;
    const synthDelay = synth.delay || emptyDelay;

    if (drumDelaySendRef.current) drumDelaySendRef.current.gain.value = drumDelay.mix ?? 0;
    if (bassDelaySendRef.current) bassDelaySendRef.current.gain.value = bassDelay.mix ?? 0;
    if (synthDelaySendRef.current) synthDelaySendRef.current.gain.value = synthDelay.mix ?? 0;

    // Shared delay time / feedback (driven by drums delay settings for now)
    if (sharedDelayRef.current) {
      sharedDelayRef.current.delayTime.setTargetAtTime(
        drumDelay.time ?? 0.3,
        audioCtxRef.current?.currentTime || 0,
        0.1
      );
    }
    if (sharedDelayFeedbackRef.current) {
      sharedDelayFeedbackRef.current.gain.value = drumDelay.feedback ?? 0.3;
    }

    // Master drive
    if (masterDriveRef.current) {
      masterDriveRef.current.curve = makeDistortionCurve((master.drive ?? 0) * 400);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      // ── Master bus ───────────────────────────────────────────
      masterGainRef.current = ctx.createGain();
      masterDriveRef.current = ctx.createWaveShaper();
      masterDriveRef.current.oversample = '4x';

      masterGainRef.current.connect(masterDriveRef.current);
      masterDriveRef.current.connect(ctx.destination);

      // ── Shared Reverb bus ───────────────────────────────────
      sharedReverbRef.current = ctx.createConvolver();
      sharedReverbRef.current.buffer = createReverbIR(ctx, 2.5, 2.0);
      sharedReverbReturnRef.current = ctx.createGain();
      sharedReverbReturnRef.current.gain.value = 0.8;
      sharedReverbRef.current.connect(sharedReverbReturnRef.current);
      sharedReverbReturnRef.current.connect(masterGainRef.current);

      // ── Shared Delay bus ────────────────────────────────────
      sharedDelayRef.current = ctx.createDelay(2.0);
      sharedDelayFeedbackRef.current = ctx.createGain();
      sharedDelayFeedbackRef.current.gain.value = 0.3;
      sharedDelayReturnRef.current = ctx.createGain();
      sharedDelayReturnRef.current.gain.value = 0.8;

      sharedDelayRef.current.connect(sharedDelayFeedbackRef.current);
      sharedDelayFeedbackRef.current.connect(sharedDelayRef.current); // feedback loop
      sharedDelayRef.current.connect(sharedDelayReturnRef.current);
      sharedDelayReturnRef.current.connect(masterGainRef.current);

      // ── DRUMS channel ───────────────────────────────────────
      drumGainRef.current = ctx.createGain();
      drumLowRef.current = ctx.createBiquadFilter(); drumLowRef.current.type = 'lowshelf'; drumLowRef.current.frequency.value = 250;
      drumMidRef.current = ctx.createBiquadFilter(); drumMidRef.current.type = 'peaking'; drumMidRef.current.frequency.value = 1000;
      drumHighRef.current = ctx.createBiquadFilter(); drumHighRef.current.type = 'highshelf'; drumHighRef.current.frequency.value = 4000;
      drumGainRef.current.connect(drumLowRef.current);
      drumLowRef.current.connect(drumMidRef.current);
      drumMidRef.current.connect(drumHighRef.current);
      drumHighRef.current.connect(masterGainRef.current); // dry

      drumReverbSendRef.current = ctx.createGain(); drumReverbSendRef.current.gain.value = 0;
      drumDelaySendRef.current = ctx.createGain(); drumDelaySendRef.current.gain.value = 0;
      drumHighRef.current.connect(drumReverbSendRef.current);
      drumHighRef.current.connect(drumDelaySendRef.current);
      drumReverbSendRef.current.connect(sharedReverbRef.current);
      drumDelaySendRef.current.connect(sharedDelayRef.current);

      // ── BASS channel ────────────────────────────────────────
      bassGainRef.current = ctx.createGain();
      bassLowRef.current = ctx.createBiquadFilter(); bassLowRef.current.type = 'lowshelf'; bassLowRef.current.frequency.value = 250;
      bassMidRef.current = ctx.createBiquadFilter(); bassMidRef.current.type = 'peaking'; bassMidRef.current.frequency.value = 1000;
      bassHighRef.current = ctx.createBiquadFilter(); bassHighRef.current.type = 'highshelf'; bassHighRef.current.frequency.value = 4000;
      bassGainRef.current.connect(bassLowRef.current);
      bassLowRef.current.connect(bassMidRef.current);
      bassMidRef.current.connect(bassHighRef.current);
      bassHighRef.current.connect(masterGainRef.current);

      bassReverbSendRef.current = ctx.createGain(); bassReverbSendRef.current.gain.value = 0;
      bassDelaySendRef.current = ctx.createGain(); bassDelaySendRef.current.gain.value = 0;
      bassHighRef.current.connect(bassReverbSendRef.current);
      bassHighRef.current.connect(bassDelaySendRef.current);
      bassReverbSendRef.current.connect(sharedReverbRef.current);
      bassDelaySendRef.current.connect(sharedDelayRef.current);

      // ── SYNTH channel ───────────────────────────────────────
      synthGainRef.current = ctx.createGain();
      synthLowRef.current = ctx.createBiquadFilter(); synthLowRef.current.type = 'lowshelf'; synthLowRef.current.frequency.value = 250;
      synthMidRef.current = ctx.createBiquadFilter(); synthMidRef.current.type = 'peaking'; synthMidRef.current.frequency.value = 1000;
      synthHighRef.current = ctx.createBiquadFilter(); synthHighRef.current.type = 'highshelf'; synthHighRef.current.frequency.value = 4000;
      synthGainRef.current.connect(synthLowRef.current);
      synthLowRef.current.connect(synthMidRef.current);
      synthMidRef.current.connect(synthHighRef.current);
      synthHighRef.current.connect(masterGainRef.current);

      synthReverbSendRef.current = ctx.createGain(); synthReverbSendRef.current.gain.value = 0;
      synthDelaySendRef.current = ctx.createGain(); synthDelaySendRef.current.gain.value = 0;
      synthHighRef.current.connect(synthReverbSendRef.current);
      synthHighRef.current.connect(synthDelaySendRef.current);
      synthReverbSendRef.current.connect(sharedReverbRef.current);
      synthDelaySendRef.current.connect(sharedDelayRef.current);

      // Apply initial mixer values to the newly created audio nodes
      applyMixerToAudio();
    }

    if (isPlaying) {
      setIsPlaying(false);
      if (timerIDRef.current) clearTimeout(timerIDRef.current);
    } else {
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      setIsPlaying(true);
      nextNoteTimeRef.current = audioCtxRef.current.currentTime;
      stepRef.current = 0;
      scheduler();
    }
  }, [isPlaying, scheduler, applyMixerToAudio]);

  useEffect(() => {
    const m = project?.mixer;
    const emptyChannel: ChannelMixer = { volume: 0, eq: { low: 0, mid: 0, high: 0 } };
    const drums = m?.drums || emptyChannel; const bass = m?.bass || emptyChannel; const synth = m?.synth || emptyChannel; const master = m?.master || { volume: 1.0, drive: 0, reverb: 0, delay: { time: 0.3, feedback: 0.3, mix: 0 } };
    
    if (drumGainRef.current) drumGainRef.current.gain.value = drums.volume ?? 0.8;
    if (bassGainRef.current) bassGainRef.current.gain.value = bass.volume ?? 0.8;
    if (synthGainRef.current) synthGainRef.current.gain.value = synth.volume ?? 0.7;
    if (masterGainRef.current) masterGainRef.current.gain.value = master.volume ?? 1.0;

    if (drumLowRef.current) drumLowRef.current.gain.value = drums.eq?.low ?? 0;
    if (drumMidRef.current) drumMidRef.current.gain.value = drums.eq?.mid ?? 0;
    if (drumHighRef.current) drumHighRef.current.gain.value = drums.eq?.high ?? 0;

    if (bassLowRef.current) bassLowRef.current.gain.value = bass.eq?.low ?? 0;
    if (bassMidRef.current) bassMidRef.current.gain.value = bass.eq?.mid ?? 0;
    if (bassHighRef.current) bassHighRef.current.gain.value = bass.eq?.high ?? 0;

    if (synthLowRef.current) synthLowRef.current.gain.value = synth.eq?.low ?? 0;
    if (synthMidRef.current) synthMidRef.current.gain.value = synth.eq?.mid ?? 0;
    if (synthHighRef.current) synthHighRef.current.gain.value = synth.eq?.high ?? 0;

    // Per-channel reverb sends
    if (drumReverbSendRef.current) drumReverbSendRef.current.gain.value = drums.reverb ?? 0;
    if (bassReverbSendRef.current) bassReverbSendRef.current.gain.value = bass.reverb ?? 0;
    if (synthReverbSendRef.current) synthReverbSendRef.current.gain.value = synth.reverb ?? 0;

    // Per-channel delay sends (mix = send amount)
    const emptyDelay = { time: 0.3, feedback: 0.3, mix: 0 };
    const drumDelay = drums.delay || emptyDelay;
    const bassDelay = bass.delay || emptyDelay;
    const synthDelay = synth.delay || emptyDelay;

    if (drumDelaySendRef.current) drumDelaySendRef.current.gain.value = drumDelay.mix ?? 0;
    if (bassDelaySendRef.current) bassDelaySendRef.current.gain.value = bassDelay.mix ?? 0;
    if (synthDelaySendRef.current) synthDelaySendRef.current.gain.value = synthDelay.mix ?? 0;

    // Shared delay time / feedback (driven by drums delay settings for now)
    if (sharedDelayRef.current) {
      sharedDelayRef.current.delayTime.setTargetAtTime(
        drumDelay.time ?? 0.3,
        audioCtxRef.current?.currentTime || 0,
        0.1
      );
    }
    if (sharedDelayFeedbackRef.current) {
      sharedDelayFeedbackRef.current.gain.value = drumDelay.feedback ?? 0.3;
    }

    // Master drive
    if (masterDriveRef.current) {
      masterDriveRef.current.curve = makeDistortionCurve((master.drive ?? 0) * 400);
    }
  }, [project?.mixer]);

  return { isPlaying, currentStep, togglePlay };
};