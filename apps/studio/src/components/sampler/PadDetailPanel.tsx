import React, { useRef } from 'react';
import { SamplerPad, SamplerEnvelope, SamplerFilter, PadLoadStatus } from '../../types';
import { PadEnvelopeControls } from './PadEnvelopeControls';
import { PadFilterControls } from './PadFilterControls';

interface PadDetailPanelProps {
  pad: SamplerPad;
  status: PadLoadStatus;
  onUpdateLabel: (label: string) => void;
  onUpdateVolume: (v: number) => void;
  onUpdatePitch: (v: number) => void;
  onUpdateEnvelope: (env: Partial<SamplerEnvelope>) => void;
  onUpdateFilter: (filter: Partial<SamplerFilter>) => void;
  onUpdateMute: (v: boolean) => void;
  onUpdateSolo: (v: boolean) => void;
  onClear: () => void;
  onTrigger: () => void;
  onLoadFile: (file: File) => void;
}

export function PadDetailPanel({
  pad, status,
  onUpdateLabel, onUpdateVolume, onUpdatePitch,
  onUpdateEnvelope, onUpdateFilter,
  onUpdateMute, onUpdateSolo,
  onClear, onTrigger, onLoadFile,
}: PadDetailPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loaded = status === 'loaded';

  return (
    <div className="flex flex-col gap-5 h-full">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pb-3 border-b border-[#242428]">
        <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: pad.color }} />

        <input
          value={pad.label}
          maxLength={14}
          onChange={e => onUpdateLabel(e.target.value.toUpperCase())}
          className="bg-transparent text-sm font-bold text-[#F0F0F2] uppercase tracking-widest focus:outline-none flex-1 min-w-0"
        />

        <span className="text-[9px] tracking-widest flex-shrink-0" style={{ color: loaded ? pad.color : '#555' }}>
          {loaded ? '● loaded' : status === 'loading' ? '⟳ loading' : status === 'error' ? '✕ error' : '○ empty'}
        </span>

        {loaded && pad.fileName && (
          <span className="text-[8px] text-[#555] truncate max-w-[120px]" title={pad.fileName}>
            {pad.fileName}
          </span>
        )}
      </div>

      {/* ── Sample load / replace ───────────────────────────────────────── */}
      <div
        className="flex items-center justify-between rounded border border-dashed px-4 py-3 cursor-pointer transition-colors"
        style={{ borderColor: loaded ? '#333' : '#2a2a30', background: '#0A0A0B' }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) onLoadFile(f);
            e.target.value = '';
          }}
        />
        <span className="text-[9px] text-[#8A8A94] tracking-widest">
          {loaded ? 'click to replace sample' : 'click or drag a file onto a pad to load'}
        </span>
        {loaded && (
          <button
            className="text-[9px] text-[#ef4444] hover:text-red-300 ml-4 flex-shrink-0"
            onClick={e => { e.stopPropagation(); onClear(); }}
          >
            × clear
          </button>
        )}
      </div>

      {/* ── Envelope ───────────────────────────────────────────────────── */}
      <PadEnvelopeControls
        envelope={pad.envelope}
        color={pad.color}
        onChange={onUpdateEnvelope}
      />

      <div className="border-t border-[#242428]" />

      {/* ── Filter ─────────────────────────────────────────────────────── */}
      <PadFilterControls
        filter={pad.filter}
        color={pad.color}
        onChange={onUpdateFilter}
      />

      <div className="border-t border-[#242428]" />

      {/* ── Volume & Pitch ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <span className="text-[9px] font-bold text-[#8A8A94] uppercase tracking-widest">Output</span>

        <div className="flex items-center gap-3">
          <span className="text-[9px] text-[#8A8A94] uppercase tracking-widest w-14 flex-shrink-0">Volume</span>
          <input
            type="range" min={0} max={1.5} step={0.01} value={pad.volume}
            onChange={e => onUpdateVolume(parseFloat(e.target.value))}
            className="flex-1 h-1 bg-[#1a1a1e] rounded-lg cursor-pointer"
            style={{ accentColor: pad.color }}
          />
          <span className="text-[9px] font-mono w-10 text-right flex-shrink-0" style={{ color: pad.color }}>
            {Math.round(pad.volume * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[9px] text-[#8A8A94] uppercase tracking-widest w-14 flex-shrink-0">Pitch</span>
          <input
            type="range" min={-24} max={24} step={1} value={pad.pitch}
            onChange={e => onUpdatePitch(parseInt(e.target.value))}
            className="flex-1 h-1 bg-[#1a1a1e] rounded-lg cursor-pointer"
            style={{ accentColor: pad.color }}
          />
          <span className="text-[9px] font-mono w-10 text-right flex-shrink-0" style={{ color: pad.color }}>
            {pad.pitch > 0 ? `+${pad.pitch}` : pad.pitch}st
          </span>
        </div>
      </div>

      <div className="border-t border-[#242428]" />

      {/* ── Mute / Solo / Preview ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 mt-auto">
        <button
          onClick={() => onUpdateMute(!pad.mute)}
          className="px-3 py-1.5 rounded text-[9px] font-bold border transition-colors uppercase tracking-widest"
          style={pad.mute
            ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' }
            : { background: 'transparent', borderColor: '#333', color: '#666' }}
        >
          Mute
        </button>
        <button
          onClick={() => onUpdateSolo(!pad.solo)}
          className="px-3 py-1.5 rounded text-[9px] font-bold border transition-colors uppercase tracking-widest"
          style={pad.solo
            ? { background: pad.color, borderColor: pad.color, color: '#000' }
            : { background: 'transparent', borderColor: '#333', color: '#666' }}
        >
          Solo
        </button>

        <div className="flex-1" />

        <button
          onClick={onTrigger}
          disabled={!loaded}
          className="px-4 py-1.5 rounded text-[9px] font-bold uppercase tracking-widest transition-colors disabled:opacity-30"
          style={{ background: pad.color, color: '#000' }}
        >
          ▶ Preview
        </button>
      </div>

    </div>
  );
}
