import React from 'react';
import { Play, Square } from 'lucide-react';

interface TransportBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  swing: number;
  onSwingChange: (swing: number) => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  isPlaying,
  onTogglePlay,
  bpm,
  onBpmChange,
  swing,
  onSwingChange,
}) => {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-[#111113] border-b border-[#242428] text-[#F0F0F2]">
      <div className="flex items-center gap-4">
        <button
          onClick={onTogglePlay}
          className="p-3 rounded-full transition-all"
          style={
            isPlaying
              ? {
                  background: '#FF5F00',
                  color: '#000',
                  boxShadow: '0 0 16px rgba(255, 95, 0, 0.5)',
                }
              : {
                  background: '#1a1a1e',
                  color: '#8A8A94',
                }
          }
        >
          {isPlaying ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>

        <div className="flex flex-col">
          <span className="text-[9px] uppercase tracking-[0.2em] text-[#8A8A94] font-bold">Tempo</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={bpm}
              onChange={(e) => onBpmChange(Number(e.target.value))}
              className="bg-transparent text-xl font-mono w-16 focus:outline-none text-[#F0F0F2]"
            />
            <span className="text-[9px] uppercase tracking-widest text-[#8A8A94]">BPM</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex flex-col items-end">
          <span className="text-[9px] uppercase tracking-[0.2em] text-[#8A8A94] font-bold">Swing</span>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="100"
              value={swing}
              onChange={(e) => onSwingChange(Number(e.target.value))}
              className="w-24"
              style={{ accentColor: '#FF5F00' }}
            />
            <span className="text-xs font-mono w-8 text-right text-[#F0F0F2]">{swing}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
