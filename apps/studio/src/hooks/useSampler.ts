import { useState, useRef, useCallback, useEffect } from 'react';
import {
  SamplerPad, SamplerEnvelope, SamplerFilter, PadLoadStatus,
} from '../types';
import {
  createDefaultPad, loadAudioFile, triggerSamplerPad, resolveGain,
} from '../utils/sampler';

// ─── Public interface ─────────────────────────────────────────────────────────

export interface UseSamplerReturn {
  // State
  pads: SamplerPad[];
  padLoadStatus: PadLoadStatus[];
  activePadId: number;
  masterVolume: number;

  // File management
  loadPadFile: (padId: number, file: File) => Promise<void>;
  clearPad: (padId: number) => void;

  // Playback
  triggerPad: (padId: number) => void;
  // Called by the sequencer scheduler — seqTime is the target time in the
  // sequencer's AudioContext; seqNow is that context's currentTime right now.
  schedulePadAtTime: (padId: number, seqTime: number, seqNow: number) => void;

  // Selection
  setActivePad: (padId: number) => void;

  // Per-pad param updates
  updatePadLabel: (padId: number, label: string) => void;
  updatePadVolume: (padId: number, volume: number) => void;
  updatePadPitch: (padId: number, pitch: number) => void;
  updatePadEnvelope: (padId: number, env: Partial<SamplerEnvelope>) => void;
  updatePadFilter: (padId: number, filter: Partial<SamplerFilter>) => void;
  updatePadMute: (padId: number, mute: boolean) => void;
  updatePadSolo: (padId: number, solo: boolean) => void;

  // Master
  updateMasterVolume: (volume: number) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSampler(): UseSamplerReturn {
  // ── Serialisable state ──────────────────────────────────────────────────
  const [pads, setPads] = useState<SamplerPad[]>(
    () => Array.from({ length: 16 }, (_, i) => createDefaultPad(i)),
  );
  const [padLoadStatus, setPadLoadStatus] = useState<PadLoadStatus[]>(
    () => Array(16).fill('idle'),
  );
  const [activePadId, setActivePadId] = useState<number>(0);
  const [masterVolume, setMasterVolume] = useState<number>(1.0);

  // ── Non-serialisable refs ───────────────────────────────────────────────
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const masterGainRef  = useRef<GainNode | null>(null);
  const buffersRef     = useRef<(AudioBuffer | null)[]>(Array(16).fill(null));
  const activeSourcesRef = useRef<Map<number, AudioBufferSourceNode>>(new Map());

  // Keep a ref to pads so triggerPad never reads stale closure state
  const padsRef = useRef<SamplerPad[]>(pads);
  useEffect(() => { padsRef.current = pads; }, [pads]);

  // ── AudioContext — lazy init on first user gesture ──────────────────────
  const ensureCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current) {
      const ctx = new AudioContext();
      const master = ctx.createGain();
      master.gain.value = masterVolume;
      master.connect(ctx.destination);
      audioCtxRef.current = ctx;
      masterGainRef.current = master;
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  // masterVolume intentionally omitted — only used at creation time
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Generic pad state updater ───────────────────────────────────────────
  const updatePad = useCallback((padId: number, changes: Partial<SamplerPad>) => {
    setPads(prev => prev.map(p => p.id === padId ? { ...p, ...changes } : p));
  }, []);

  // ── File loading ────────────────────────────────────────────────────────
  const loadPadFile = useCallback(async (padId: number, file: File) => {
    const ctx = ensureCtx();

    setPadLoadStatus(prev => {
      const next = [...prev];
      next[padId] = 'loading';
      return next;
    });

    const buffer = await loadAudioFile(ctx, file);

    if (!buffer) {
      setPadLoadStatus(prev => {
        const next = [...prev]; next[padId] = 'error'; return next;
      });
      return;
    }

    buffersRef.current[padId] = buffer;

    // Trim extension and uppercase for label (max 14 chars)
    const name = file.name.replace(/\.[^/.]+$/, '').slice(0, 14).toUpperCase();
    updatePad(padId, { fileName: file.name, label: name });

    setPadLoadStatus(prev => {
      const next = [...prev]; next[padId] = 'loaded'; return next;
    });
  }, [ensureCtx, updatePad]);

  const clearPad = useCallback((padId: number) => {
    const existing = activeSourcesRef.current.get(padId);
    if (existing) { try { existing.stop(); } catch { /* already ended */ } }

    buffersRef.current[padId] = null;
    setPads(prev =>
      prev.map(p => p.id === padId ? createDefaultPad(padId) : p),
    );
    setPadLoadStatus(prev => {
      const next = [...prev]; next[padId] = 'idle'; return next;
    });
  }, []);

  // ── Playback ────────────────────────────────────────────────────────────
  const triggerPad = useCallback((padId: number) => {
    const buffer = buffersRef.current[padId];
    if (!buffer) return;

    const ctx = ensureCtx();
    const pad = padsRef.current[padId];
    if (resolveGain(pad, padsRef.current) === 0) return;

    // Retrigger: stop previous playback on this pad
    const prev = activeSourcesRef.current.get(padId);
    if (prev) { try { prev.stop(); } catch { /* already ended */ } }

    const src = triggerSamplerPad(
      ctx,
      buffer,
      pad,
      masterGainRef.current ?? ctx.destination,
    );

    activeSourcesRef.current.set(padId, src);
    src.addEventListener('ended', () => {
      activeSourcesRef.current.delete(padId);
    });
  }, [ensureCtx]);

  // ── Sequencer-driven scheduling ────────────────────────────────────────
  // Converts the sequencer's scheduled time to the sampler's AudioContext
  // time so hits stay sample-accurate even with two separate AudioContexts.
  const schedulePadAtTime = useCallback((padId: number, seqTime: number, seqNow: number) => {
    const buffer = buffersRef.current[padId];
    if (!buffer) return;

    const ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'closed') return;

    const pad = padsRef.current[padId];
    if (resolveGain(pad, padsRef.current) === 0) return;

    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    // How far in the future is seqTime relative to seqNow?
    const offsetSeconds = Math.max(0, seqTime - seqNow);
    const triggerTime = ctx.currentTime + offsetSeconds;

    triggerSamplerPad(ctx, buffer, pad, masterGainRef.current ?? ctx.destination, triggerTime);
  }, []);

  // ── Master volume ───────────────────────────────────────────────────────
  const updateMasterVolume = useCallback((volume: number) => {
    setMasterVolume(volume);
    if (masterGainRef.current && audioCtxRef.current) {
      masterGainRef.current.gain.setTargetAtTime(
        volume, audioCtxRef.current.currentTime, 0.01,
      );
    }
  }, []);

  // ── Per-pad param updates ───────────────────────────────────────────────
  const updatePadLabel    = useCallback((id: number, label: string) =>
    updatePad(id, { label }), [updatePad]);

  const updatePadVolume   = useCallback((id: number, volume: number) =>
    updatePad(id, { volume }), [updatePad]);

  const updatePadPitch    = useCallback((id: number, pitch: number) =>
    updatePad(id, { pitch }), [updatePad]);

  const updatePadMute     = useCallback((id: number, mute: boolean) =>
    updatePad(id, { mute }), [updatePad]);

  const updatePadSolo     = useCallback((id: number, solo: boolean) =>
    updatePad(id, { solo }), [updatePad]);

  const updatePadEnvelope = useCallback((id: number, env: Partial<SamplerEnvelope>) =>
    setPads(prev => prev.map(p =>
      p.id === id ? { ...p, envelope: { ...p.envelope, ...env } } : p,
    )), []);

  const updatePadFilter   = useCallback((id: number, filter: Partial<SamplerFilter>) =>
    setPads(prev => prev.map(p =>
      p.id === id ? { ...p, filter: { ...p.filter, ...filter } } : p,
    )), []);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => { audioCtxRef.current?.close(); };
  }, []);

  return {
    pads, padLoadStatus, activePadId, masterVolume,
    loadPadFile, clearPad, triggerPad, schedulePadAtTime,
    setActivePad: setActivePadId,
    updatePadLabel, updatePadVolume, updatePadPitch,
    updatePadEnvelope, updatePadFilter, updatePadMute, updatePadSolo,
    updateMasterVolume,
  };
}
