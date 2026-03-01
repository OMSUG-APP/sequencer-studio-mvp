import React from 'react';
import { UseSamplerReturn } from '../../hooks/useSampler';
import { PadGrid } from './PadGrid';
import { PadDetailPanel } from './PadDetailPanel';

type SamplerViewProps = UseSamplerReturn;

export function SamplerView({
  pads, padLoadStatus, activePadId, masterVolume,
  loadPadFile, clearPad, triggerPad, setActivePad,
  updatePadLabel, updatePadVolume, updatePadPitch,
  updatePadEnvelope, updatePadFilter, updatePadMute, updatePadSolo,
  updateMasterVolume,
}: SamplerViewProps) {
  const activePad = pads[activePadId];

  return (
    <div className="flex gap-4 h-full">

      {/* ── Left: pad grid + master volume ──────────────────────────────── */}
      <div className="flex flex-col gap-3 w-[288px] flex-shrink-0">
        <PadGrid
          pads={pads}
          padLoadStatus={padLoadStatus}
          activePadId={activePadId}
          onTrigger={triggerPad}
          onSelect={setActivePad}
          onLoadFile={loadPadFile}
        />

        {/* Master volume strip */}
        <div className="bg-[#111113] border border-[#242428] rounded-lg p-3 flex flex-col gap-2">
          <span className="text-[9px] font-bold text-[#8A8A94] uppercase tracking-widest">
            Master Output
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-[#8A8A94] uppercase tracking-widest w-12 flex-shrink-0">
              Vol
            </span>
            <input
              type="range"
              min={0} max={1.5} step={0.01}
              value={masterVolume}
              onChange={e => updateMasterVolume(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-[#1a1a1e] rounded-lg cursor-pointer"
              style={{ accentColor: '#FF5F00' }}
            />
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
