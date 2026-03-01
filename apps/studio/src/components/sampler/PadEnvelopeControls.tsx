import React from 'react';
import { SamplerEnvelope } from '../../types';
import { RotaryKnob } from '../RotaryKnob';

interface PadEnvelopeControlsProps {
  envelope: SamplerEnvelope;
  color: string;
  onChange: (env: Partial<SamplerEnvelope>) => void;
}

function fmtTime(s: number): string {
  return s < 0.1 ? `${Math.round(s * 1000)}ms` : `${s.toFixed(2)}s`;
}

export function PadEnvelopeControls({ envelope, color, onChange }: PadEnvelopeControlsProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[9px] font-bold text-[#8A8A94] uppercase tracking-widest">Envelope</span>
      <div className="flex gap-4 justify-around">
        <RotaryKnob label="ATK"  min={0.001} max={2.0} step={0.001} value={envelope.attack}  onChange={v => onChange({ attack: v })}  color={color} />
        <RotaryKnob label="DCY"  min={0.001} max={2.0} step={0.001} value={envelope.decay}   onChange={v => onChange({ decay: v })}   color={color} />
        <RotaryKnob label="SUS"  min={0}     max={1.0} step={0.01}  value={envelope.sustain} onChange={v => onChange({ sustain: v })} color={color} />
        <RotaryKnob label="REL"  min={0.001} max={4.0} step={0.001} value={envelope.release} onChange={v => onChange({ release: v })} color={color} />
      </div>
      {/* Time readouts */}
      <div className="flex gap-4 justify-around">
        {[envelope.attack, envelope.decay, envelope.sustain, envelope.release].map((v, i) => (
          <span key={i} className="text-[8px] font-mono text-center w-12" style={{ color }}>
            {i === 2 ? `${Math.round(v * 100)}%` : fmtTime(v)}
          </span>
        ))}
      </div>
    </div>
  );
}
