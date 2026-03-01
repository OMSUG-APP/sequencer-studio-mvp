import React from 'react';
import { SamplerPad, PadLoadStatus } from '../../types';
import { SamplerPadTile } from './SamplerPadTile';

interface PadGridProps {
  pads: SamplerPad[];
  padLoadStatus: PadLoadStatus[];
  activePadId: number;
  onTrigger: (padId: number) => void;
  onSelect: (padId: number) => void;
  onLoadFile: (padId: number, file: File) => void;
}

export function PadGrid({
  pads, padLoadStatus, activePadId, onTrigger, onSelect, onLoadFile,
}: PadGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {pads.map(pad => (
        <SamplerPadTile
          key={pad.id}
          pad={pad}
          status={padLoadStatus[pad.id]}
          isActive={pad.id === activePadId}
          onTrigger={() => onTrigger(pad.id)}
          onSelect={() => onSelect(pad.id)}
          onLoadFile={file => onLoadFile(pad.id, file)}
        />
      ))}
    </div>
  );
}
