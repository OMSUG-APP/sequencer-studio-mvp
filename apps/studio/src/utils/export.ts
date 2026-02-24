import { Project, Pattern } from '../types';
import { createDrumEngine, createBassEngine, createSynthEngine, noteToFreq } from './audio';

// Helper to create a quick impulse response for the offline reverb
const createImpulseResponse = (ctx: BaseAudioContext, duration: number, decay: number) => {
  const length = ctx.sampleRate * duration;
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);
  for (let i = 0; i < length; i++) {
    const n = i === 0 ? 1 : Math.random() * 2 - 1;
    left[i] = n * Math.pow(1 - i / length, decay);
    right[i] = n * Math.pow(1 - i / length, decay);
  }
  return impulse;
};

export const renderToWav = async (
  project: Project, 
  pattern: Pattern, 
  mode: 'master' | 'drums' | 'bass' | 'synth' = 'master'
): Promise<Blob> => {
  const bpm = project.bpm || 120;
  const stepTime = 60 / bpm / 4; // 16th note duration
  const numLoops = 4; // EXPORT 4 LOOPS
  const stepsPerLoop = 16;
  const totalSteps = stepsPerLoop * numLoops;
  const tailLength = 3.0; // Add 3 seconds at the end so Reverb/Delay tails don't cut off
  const duration = (totalSteps * stepTime) + tailLength;
  const sampleRate = 44100;

  const ctx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

  // --- 1. RECREATE THE MASTER BUS ---
  const masterGain = ctx.createGain();
  masterGain.gain.value = project.mixer?.master?.volume ?? 1.0;

  const compressor = ctx.createDynamicsCompressor();
  const masterComp = (project.mixer?.master as any)?.compressor;
  if (masterComp) {
    compressor.threshold.value = masterComp.threshold ?? -12;
    compressor.knee.value = masterComp.knee ?? 6;
    compressor.ratio.value = masterComp.ratio ?? 4;
    compressor.attack.value = masterComp.attack ?? 0.003;
    compressor.release.value = masterComp.release ?? 0.25;
  }

  const driveAmount = project.mixer?.master?.drive ?? 0;
  const driveNode = ctx.createWaveShaper();
  if (driveAmount > 0) {
    const curve = new Float32Array(44100);
    const k = driveAmount * 100;
    for (let i = 0; i < 44100; i++) {
      const x = (i * 2) / 44100 - 1;
      curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
    }
    driveNode.curve = curve;
  }
  driveNode.connect(masterGain);
  masterGain.connect(compressor);
  compressor.connect(ctx.destination);

  // --- 2. RECREATE THE FX BUSES ---
  const reverbNode = ctx.createConvolver();
  reverbNode.buffer = createImpulseResponse(ctx, 2.0, 2.0);
  reverbNode.connect(driveNode);

  const delayNode = ctx.createDelay();
  delayNode.delayTime.value = project.mixer?.drums?.delay?.time ?? 0.3;
  const delayFeedback = ctx.createGain();
  delayFeedback.gain.value = project.mixer?.drums?.delay?.feedback ?? 0.3;
  delayNode.connect(delayFeedback);
  delayFeedback.connect(delayNode);
  delayNode.connect(driveNode);

  // --- 3. RECREATE CHANNEL STRIPS ---
  const setupChannel = (name: 'drums' | 'bass' | 'synth') => {
    const chMixer = project.mixer?.[name] || { volume: 0.8, eq: { low: 0, mid: 0, high: 0 }, reverb: 0, delay: { mix: 0 } };
    const gain = ctx.createGain();
    
    // STEM EXPORT LOGIC: Mute the channel if we are exporting a different stem
    if (mode !== 'master' && mode !== name) {
      gain.gain.value = 0;
    } else {
      gain.gain.value = chMixer.volume;
    }

    const lowEQ = ctx.createBiquadFilter(); lowEQ.type = 'lowshelf'; lowEQ.frequency.value = 100; lowEQ.gain.value = chMixer.eq?.low ?? 0;
    const midEQ = ctx.createBiquadFilter(); midEQ.type = 'peaking'; midEQ.frequency.value = 1000; midEQ.gain.value = chMixer.eq?.mid ?? 0;
    const highEQ = ctx.createBiquadFilter(); highEQ.type = 'highshelf'; highEQ.frequency.value = 10000; highEQ.gain.value = chMixer.eq?.high ?? 0;

    lowEQ.connect(midEQ); midEQ.connect(highEQ); highEQ.connect(gain);
    gain.connect(driveNode);

    const revSend = ctx.createGain(); revSend.gain.value = chMixer.reverb ?? 0;
    gain.connect(revSend); revSend.connect(reverbNode);

    const delSend = ctx.createGain(); delSend.gain.value = chMixer.delay?.mix ?? 0;
    gain.connect(delSend); delSend.connect(delayNode);

    return lowEQ; 
  };

  const drumInput = setupChannel('drums');
  const bassInput = setupChannel('bass');
  const synthInput = setupChannel('synth');

  // --- 4. SCHEDULE 4 LOOPS OF AUDIO ---
  for (let loop = 0; loop < numLoops; loop++) {
    for (let step = 0; step < stepsPerLoop; step++) {
      const time = (loop * stepsPerLoop + step) * stepTime;

      // Drums
      Object.entries(pattern.drums).forEach(([inst, steps]) => {
        if (steps[step]?.active) {
          const p = project.drumParams?.[inst] || { tune: 0.5, decay: 0.5, mute: false, solo: false };
          const anySolo = Object.values(project.drumParams || {}).some(dp => dp.solo);
          if (p.mute || (anySolo && !p.solo)) return;

          const layerGain = ctx.createGain();
          layerGain.gain.value = 1.0;
          layerGain.connect(drumInput);
          
          const engine = createDrumEngine(ctx, layerGain, project.drumKit || '808');
          const vel = steps[step].velocity ?? 0.8;
          
          if (inst === 'BD') engine.playBD(time, vel, p);
          if (inst === 'SD') engine.playSD(time, vel, p);
          if (inst === 'HC') engine.playHC(time, vel, p);
          if (inst === 'OH') engine.playOH(time, vel, p);
          if (inst === 'LT') engine.playLT(time, vel, p);
          if (inst === 'HT') engine.playHT(time, vel, p);
        }
      });

      // Bass
      if (pattern.bass[step]?.active) {
        const engine = createBassEngine(ctx, bassInput);
        const bp = project.bassParams || { waveform: 'sawtooth', octave: 2, cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 };
        const bassOctaveShift = (bp.octave || 2) - 2;
        const freq = noteToFreq(pattern.bass[step].note!, bassOctaveShift);
        engine.playNote(time, freq, stepTime, 0.8, bp);
      }

      // Synth
      if (pattern.synth?.[step]?.active) {
        const engine = createSynthEngine(ctx, synthInput);
        const sp = project.synthParams || { octave: 4, attack: 0.5, release: 0.5, cutoff: 0.5, detune: 0.5 };
        const synthOctaveShift = (sp.octave || 4) - 4;
        const freq = noteToFreq(pattern.synth[step].note!, synthOctaveShift);
        engine.playNote(time, freq, stepTime * 4, 0.6, sp);
      }
    }
  }

  // --- 5. RENDER AND CONVERT TO WAV ---
  const renderedBuffer = await ctx.startRendering();
  return audioBufferToWav(renderedBuffer);
};

// Standard AudioBuffer to WAV conversion
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);
  const channels = [];
  let sample = 0, offset = 0, pos = 0;

  const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
  const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };

  setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157); setUint32(0x20746d66);
  setUint32(16); setUint16(1); setUint16(numOfChan); setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); setUint16(numOfChan * 2); setUint16(16);
  setUint32(0x61746164); setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) channels.push(buffer.getChannelData(i));

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true); pos += 2;
    }
    offset++;
  }
  return new Blob([out], { type: 'audio/wav' });
}