export const createDrumEngine = (ctx: BaseAudioContext, dest: AudioNode, drumKit: '808' | '909' = '808') => {
  // Import profiles - using inline to avoid circular dependency
  const profiles = {
    '808': {
      BD: { freqMult: 1.0, decayMult: 1.2 },
      SD: { freqMult: 1.0, decayMult: 1.15 },
      HC: { freqMult: 0.8, decayMult: 1.1 },
      OH: { freqMult: 0.9, decayMult: 1.3 },
      LT: { freqMult: 0.75, decayMult: 1.4 },
      HT: { freqMult: 0.65, decayMult: 1.2 },
    },
    '909': {
      BD: { freqMult: 0.85, decayMult: 0.7 },
      SD: { freqMult: 1.2, decayMult: 0.8 },
      HC: { freqMult: 1.25, decayMult: 0.5 },
      OH: { freqMult: 1.1, decayMult: 0.7 },
      LT: { freqMult: 1.3, decayMult: 0.6 },
      HT: { freqMult: 1.2, decayMult: 0.6 },
    }
  };

  const kit = profiles[drumKit];

  const playBD = (time: number, velocity: number, p = {tune: 0.5, decay: 0.5}) => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(dest);
    const baseFreq = (50 + (p.tune * 200)) * kit.BD.freqMult; const decayTime = (0.1 + (p.decay * 0.8)) * kit.BD.decayMult;
    osc.frequency.setValueAtTime(baseFreq, time); osc.frequency.exponentialRampToValueAtTime(0.01, time + decayTime);
    gain.gain.setValueAtTime(velocity, time); gain.gain.exponentialRampToValueAtTime(0.01, time + decayTime);
    osc.start(time); osc.stop(time + decayTime);
  };

  const playSD = (time: number, velocity: number, p = {tune: 0.5, decay: 0.5}) => {
    const noise = ctx.createBufferSource(); const noiseDecay = (0.1 + (p.decay * 0.3)) * kit.SD.decayMult;
    const bufferSize = ctx.sampleRate * noiseDecay; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter(); noiseFilter.type = 'highpass'; noiseFilter.frequency.setValueAtTime((500 + (p.tune * 1000)) * kit.SD.freqMult, time);
    const noiseGain = ctx.createGain(); noiseGain.gain.setValueAtTime(velocity * 0.5, time); noiseGain.gain.exponentialRampToValueAtTime(0.01, time + noiseDecay);
    const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.setValueAtTime(100 + (p.tune * 150), time);
    const oscGain = ctx.createGain(); oscGain.gain.setValueAtTime(velocity * 0.5, time); oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(dest);
    osc.connect(oscGain); oscGain.connect(dest);
    noise.start(time); osc.start(time); osc.stop(time + Math.max(noiseDecay, 0.1));
  };

  const playHC = (time: number, velocity: number, p = {tune: 0.5, decay: 0.5}) => {
    const noise = ctx.createBufferSource(); const decayTime = (0.02 + (p.decay * 0.1)) * kit.HC.decayMult;
    const bufferSize = ctx.sampleRate * decayTime; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.setValueAtTime((5000 + (p.tune * 4000)) * kit.HC.freqMult, time);
    const gain = ctx.createGain(); gain.gain.setValueAtTime(velocity * 0.3, time); gain.gain.exponentialRampToValueAtTime(0.01, time + decayTime);
    noise.connect(filter); filter.connect(gain); gain.connect(dest); noise.start(time);
  };

  const playOH = (time: number, velocity: number, p = {tune: 0.5, decay: 0.5}) => {
    const noise = ctx.createBufferSource(); const decayTime = (0.1 + (p.decay * 0.4)) * kit.OH.decayMult;
    const bufferSize = ctx.sampleRate * decayTime; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.setValueAtTime((5000 + (p.tune * 4000)) * kit.OH.freqMult, time);
    const gain = ctx.createGain(); gain.gain.setValueAtTime(velocity * 0.3, time); gain.gain.exponentialRampToValueAtTime(0.01, time + decayTime);
    noise.connect(filter); filter.connect(gain); gain.connect(dest); noise.start(time);
  };

  const playLT = (time: number, velocity: number, p = {tune: 0.5, decay: 0.5}) => {
    const noise = ctx.createBufferSource(); const decayTime = (0.3 + (p.decay * 0.8)) * kit.LT.decayMult;
    const bufferSize = ctx.sampleRate * decayTime; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0); for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.setValueAtTime((4000 + (p.tune * 4000)) * kit.LT.freqMult, time);
    const gain = ctx.createGain(); gain.gain.setValueAtTime(velocity * 0.3, time); gain.gain.exponentialRampToValueAtTime(0.01, time + decayTime);
    noise.connect(filter); filter.connect(gain); gain.connect(dest); noise.start(time);
  };

  const playHT = (time: number, velocity: number, p = {tune: 0.5, decay: 0.5}) => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(dest);
    const baseFreq = (300 + (p.tune * 400)) * kit.HT.freqMult; const decayTime = (0.05 + (p.decay * 0.2)) * kit.HT.decayMult;
    osc.frequency.setValueAtTime(baseFreq, time); osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, time + decayTime);
    gain.gain.setValueAtTime(velocity * 0.6, time); gain.gain.exponentialRampToValueAtTime(0.01, time + decayTime);
    osc.start(time); osc.stop(time + decayTime);
  };

  return { playBD, playSD, playHC, playOH, playLT, playHT };
};

export const createBassEngine = (ctx: BaseAudioContext, dest: AudioNode) => {
  const playNote = (time: number, freq: number, duration: number, velocity: number, p = { waveform: 'sawtooth', cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 }) => {
    const osc = ctx.createOscillator(); const gain = ctx.createGain(); const filter = ctx.createBiquadFilter();
    osc.type = p.waveform as OscillatorType; osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    const baseCutoff = 50 + (p.cutoff * 4950); filter.Q.setValueAtTime(p.resonance * 25, time);
    const peakCutoff = Math.min(baseCutoff + (p.envMod * 8000), 20000); const decayTime = 0.1 + (p.decay * 1.4);
    filter.frequency.setValueAtTime(peakCutoff, time); filter.frequency.exponentialRampToValueAtTime(Math.max(baseCutoff, 50), time + decayTime);
    gain.gain.setValueAtTime(velocity * 0.4, time); gain.gain.setTargetAtTime(0, time, decayTime / 3);
    osc.connect(filter); filter.connect(gain); gain.connect(dest);
    osc.start(time); osc.stop(time + decayTime + 0.1);
  };
  return { playNote };
};

export const createSynthEngine = (ctx: BaseAudioContext, dest: AudioNode) => {
  const playNote = (time: number, freq: number, duration: number, velocity: number, p = { attack: 0.5, release: 0.5, cutoff: 0.5, detune: 0.5 }) => {
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();

    osc1.type = 'sawtooth'; osc2.type = 'sawtooth'; osc3.type = 'square';
    
    const detuneAmount = p.detune * 50;
    osc1.frequency.setValueAtTime(freq, time);
    osc2.frequency.setValueAtTime(freq, time); osc2.detune.setValueAtTime(detuneAmount, time);
    osc3.frequency.setValueAtTime(freq / 2, time); osc3.detune.setValueAtTime(-detuneAmount, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200 + (p.cutoff * 6000), time);
    
    const attackTime = 0.05 + (p.attack * 2.0);
    const releaseTime = 0.1 + (p.release * 3.0);
    const totalDuration = duration + releaseTime;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(velocity * 0.15, time + attackTime);
    gain.gain.setValueAtTime(velocity * 0.15, time + duration);
    gain.gain.linearRampToValueAtTime(0, time + duration + releaseTime);

    osc1.connect(filter); osc2.connect(filter); osc3.connect(filter);
    filter.connect(gain); gain.connect(dest);

    osc1.start(time); osc2.start(time); osc3.start(time);
    osc1.stop(time + totalDuration); osc2.stop(time + totalDuration); osc3.stop(time + totalDuration);
  };
  return { playNote };
};

export const noteToFreq = (note: string, octaveShift: number = 0) => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const name = note.slice(0, -1); const octave = parseInt(note.slice(-1)) + octaveShift;
  const semitones = notes.indexOf(name) + (octave + 1) * 12;
  return 440 * Math.pow(2, (semitones - 69) / 12);
};