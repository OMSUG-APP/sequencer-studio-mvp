import React from 'react';
import { SamplerFilter } from '../../types';
import { RotaryKnob } from '../RotaryKnob';

interface PadFilterControlsProps {
  filter: SamplerFilter;
  color: string;
  onChange: (filter: Partial<SamplerFilter>) => void;
}

function fmtHz(hz: number): string {
  return hz >= 1000 ? `${(hz / 1000).toFixed(1)}kHz` : `${Math.round(hz)}Hz`;
}

export function PadFilterControls({ filter, color, onChange }: PadFilterControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[9px] font-bold text-[#8A8A94] uppercase tracking-widest">Filter (LP)</span>
      <div className="flex gap-6 justify-around">
        <RotaryKnob
          label="CUTOFF"
          min={20} max={20000} step={1}
          value={filter.cutoff}
          onChange={v => onChange({ cutoff: v })}
          color={color}
        />
        <RotaryKnob
          label="RESO"
          min={0} max={20} step={0.01}
          value={filter.resonance}
          onChange={v => onChange({ resonance: v })}
          color={color}
        />
      </div>
      <div className="flex gap-6 justify-around">
        <span className="text-[8px] font-mono text-center w-12" style={{ color }}>{fmtHz(filter.cutoff)}</span>
        <span className="text-[8px] font-mono text-center w-12" style={{ color }}>Q {filter.resonance.toFixed(1)}</span>
      </div>
    </div>
  );
}
