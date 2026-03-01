import React, { useRef, useState } from 'react';
import { SamplerPad, PadLoadStatus } from '../../types';

interface SamplerPadTileProps {
  pad: SamplerPad;
  status: PadLoadStatus;
  isActive: boolean;
  onTrigger: () => void;
  onSelect: () => void;
  onLoadFile: (file: File) => void;
}

const ACCEPTED_AUDIO = 'audio/*';

export function SamplerPadTile({
  pad, status, isActive, onTrigger, onSelect, onLoadFile,
}: SamplerPadTileProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(wav|mp3|ogg|flac|aiff|aif|m4a)$/i)) return;
    onLoadFile(file);
  };

  // Background & border based on status + selection
  let bg = '#111113';
  let borderColor = '#242428';
  let shadow = 'none';

  if (status === 'loading') {
    bg = '#1a1a1e'; borderColor = '#3a3a44';
  } else if (status === 'error') {
    bg = 'rgba(239,68,68,0.12)'; borderColor = '#ef4444';
  } else if (status === 'loaded') {
    bg = isDragOver
      ? `${pad.color}40`
      : isActive
      ? `${pad.color}28`
      : `${pad.color}14`;
    borderColor = isActive ? pad.color : isDragOver ? pad.color : `${pad.color}55`;
    shadow = isActive ? `0 0 12px ${pad.color}50` : 'none';
  } else {
    // idle
    borderColor = isDragOver ? '#FF5F00' : isActive ? '#333' : '#242428';
    bg = isDragOver ? 'rgba(255,95,0,0.06)' : '#111113';
  }

  return (
    <div
      className="relative aspect-square"
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) { onSelect(); handleFile(file); }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_AUDIO}
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />

      {/* Main pad button */}
      <button
        className="w-full h-full rounded flex flex-col items-center justify-center gap-1 border transition-all duration-75 select-none relative"
        style={{ background: bg, borderColor, boxShadow: shadow }}
        onMouseDown={() => { onSelect(); onTrigger(); }}
        onContextMenu={e => { e.preventDefault(); onSelect(); }}
      >
        {/* Pad number badge */}
        <span
          className="text-[8px] font-bold tracking-widest absolute top-1.5 left-2"
          style={{ color: status === 'loaded' ? pad.color : '#444' }}
        >
          {String(pad.id + 1).padStart(2, '0')}
        </span>

        {/* Label */}
        <span
          className="text-[9px] font-bold tracking-wider uppercase leading-tight text-center px-1"
          style={{
            color: status === 'loaded' ? pad.color : status === 'error' ? '#ef4444' : '#555',
          }}
        >
          {status === 'loading' ? '···' : status === 'error' ? 'ERR' : pad.label}
        </span>

        {status === 'idle' && (
          <span className="text-[8px] text-[#333]">empty</span>
        )}
      </button>

      {/* File-picker button — appears on hover in top-right corner */}
      <button
        className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center text-[10px] text-[#555] hover:text-[#FF5F00] hover:bg-[#1a1a1e] transition-colors opacity-0 hover:opacity-100 group-hover:opacity-100"
        style={{ opacity: isActive ? 1 : undefined }}
        title="Load sample"
        onMouseDown={e => {
          e.stopPropagation();
          fileInputRef.current?.click();
        }}
      >
        ↑
      </button>
    </div>
  );
}
