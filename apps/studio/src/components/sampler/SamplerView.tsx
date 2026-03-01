import React from 'react';
import { UseSamplerReturn } from '../../hooks/useSampler';
import { ChannelMixer } from '../../types';
import { PadGrid } from './PadGrid';
import { PadDetailPanel } from './PadDetailPanel';

type SamplerViewProps = UseSamplerReturn & {
  mixerChannel?: ChannelMixer;
  onMixerChannelChange?: (ch: ChannelMixer) => void;
};

const FxRow = ({ label, value, min = 0, max = 1, step = 0.01, color, unit = '%', onChange }: {
  label: string; value: number; min?: number; max?: number; step?: number;
  color: string; unit?: string; onChange: (v: number) => void;
}) => (
  <div className="flex items-center gap-2 min-w-0">
    <span className="text-[9px] text-[#8A8A94] font-bold tracking-widest w-10 flex-shrink-0">{label}</span>
    <div className="flex-1 min-w-0 overflow-hidden">
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer block"
        style={{ accentColor: color }}
      />
    </div>
    <span className="text-[9px] font-mono text-right w-10 flex-shrink-0" style={{ color }}>
      {unit === 's' ? `${value.toFixed(2)}s` : `${Math.round(value * 100)}%`}
    </span>
  </div>
);

export function SamplerView({
  pads, padLoadStatus, activePadId, masterVolume, padWaveforms,
  loadPadFile, clearPad, triggerPad, setActivePad,
  updatePadLabel, updatePadVolume, updatePadPitch,
  updatePadEnvelope, updatePadFilter, updatePadMute, updatePadSolo,
  updateMasterVolume,
  mixerChannel,
  onMixerChannelChange,
}: SamplerViewProps) {
  const activePad = pads[activePadId];

  const delay = mixerChannel?.delay || { time: 0.3, feedback: 0.3, mix: 0 };

  const setDelay = (patch: Partial<typeof delay>) => {
    if (!mixerChannel || !onMixerChannelChange) return;
    onMixerChannelChange({ ...mixerChannel, delay: { ...delay, ...patch } });
  };

  return (
    <div className="flex gap-4 h-full">

      {/* ── Left: pad grid + fx + master volume ──────────────────────────── */}
      <div className="flex flex-col gap-3 w-[288px] flex-shrink-0">
        <PadGrid
          pads={pads}
          padLoadStatus={padLoadStatus}
          activePadId={activePadId}
          onTrigger={triggerPad}
          onSelect={setActivePad}
          onLoadFile={loadPadFile}
        />

        {/* FX panel */}
        {mixerChannel && onMixerChannelChange && (
          <div className="bg-[#111113] border border-[#242428] rounded-lg p-3 flex flex-col gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#22d3ee' }}>
              FX
            </span>

            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] text-[#8A8A94] tracking-widest uppercase font-bold">REVERB</span>
              <FxRow
                label="SEND" value={mixerChannel.reverb ?? 0}
                color="#60a5fa"
                onChange={v => onMixerChannelChange({ ...mixerChannel, reverb: v })}
              />
            </div>

            <div className="border-t border-[#242428]" />

            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] text-[#8A8A94] tracking-widest uppercase font-bold">DELAY</span>
              <FxRow
                label="SEND" value={delay.mix}
                color="#a78bfa"
                onChange={v => setDelay({ mix: v })}
              />
              <FxRow
                label="TIME" value={delay.time}
                min={0.05} max={1.0} step={0.01}
                color="#a78bfa" unit="s"
                onChange={v => setDelay({ time: v })}
              />
              <FxRow
                label="FDBK" value={delay.feedback}
                min={0} max={0.95} step={0.01}
                color="#a78bfa"
                onChange={v => setDelay({ feedback: v })}
              />
            </div>
          </div>
        )}

        {/* Master volume strip */}
        <div className="bg-[#111113] border border-[#242428] rounded-lg p-3 flex flex-col gap-2">
          <span className="text-[9px] font-bold text-[#8A8A94] uppercase tracking-widest">
            Master Output
          </span>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[9px] text-[#8A8A94] uppercase tracking-widest w-10 flex-shrink-0">
              Vol
            </span>
            <div className="flex-1 min-w-0 overflow-hidden">
              <input
                type="range"
                min={0} max={1.5} step={0.01}
                value={masterVolume}
                onChange={e => updateMasterVolume(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer block"
                style={{ accentColor: '#FF5F00' }}
              />
            </div>
            <span className="text-[9px] font-mono w-10 text-right flex-shrink-0 text-[#FF5F00]">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>
        </div>

        {/* Pad count info */}
        <p className="text-[8px] text-[#444] text-center tracking-widest px-2">
          {padLoadStatus.filter(s => s === 'loaded').length} / 16 pads loaded
          &nbsp;·&nbsp;drag audio files onto pads
        </p>
      </div>

      {/* ── Right: active pad detail ─────────────────────────────────────── */}
      <div className="flex-1 bg-[#111113] border border-[#242428] rounded-lg p-5 overflow-y-auto min-w-0">
        <PadDetailPanel
          pad={activePad}
          status={padLoadStatus[activePadId]}
          waveformPeaks={padWaveforms[activePadId]}
          onUpdateLabel={label  => updatePadLabel(activePadId, label)}
          onUpdateVolume={v     => updatePadVolume(activePadId, v)}
          onUpdatePitch={v      => updatePadPitch(activePadId, v)}
          onUpdateEnvelope={env => updatePadEnvelope(activePadId, env)}
          onUpdateFilter={f     => updatePadFilter(activePadId, f)}
          onUpdateMute={v       => updatePadMute(activePadId, v)}
          onUpdateSolo={v       => updatePadSolo(activePadId, v)}
          onClear={()  => clearPad(activePadId)}
          onTrigger={() => triggerPad(activePadId)}
          onLoadFile={file => loadPadFile(activePadId, file)}
        />
      </div>

    </div>
  );
}
