import React from 'react';
import { Pattern, DrumInstrument } from '../types';
import { BASS_PRESETS, SYNTH_PRESETS } from '../constants';

interface PatternEditorProps {
  pattern: Pattern;
  currentStep: number;
  onToggleDrumStep: (inst: DrumInstrument, step: number) => void;
  onToggleBassStep: (step: number, note: string) => void;
  onToggleSynthStep: (step: number, note: string) => void;
  drumKit?: '808' | '909';
  onDrumKitChange?: (kit: '808' | '909') => void;
  drumParams?: Record<string, { tune: number; decay: number; mute?: boolean; solo?: boolean }>;
  onUpdateDrumParam: (inst: string, param: string, value: any) => void;
  bassParams?: { waveform: string; octave?: number; cutoff: number; resonance: number; envMod: number; decay: number };
  bassPreset?: string;
  onUpdateBassParam: (param: string, value: any) => void;
  onApplyBassPreset?: (preset: typeof BASS_PRESETS[string], name: string) => void;
  synthParams?: { octave?: number; attack: number; release: number; cutoff: number; detune: number };
  synthPreset?: string;
  onUpdateSynthParam: (param: string, value: any) => void;
  onApplySynthPreset?: (preset: typeof SYNTH_PRESETS[string], name: string) => void;
}

const BASS_NOTES  = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'];
const SYNTH_NOTES = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'];

// Minimum width to keep all 16 steps legible
const GRID_MIN_W = 'min-w-[520px]';

export function PatternEditor({
  pattern, currentStep, onToggleDrumStep, onToggleBassStep, onToggleSynthStep,
  drumKit, onDrumKitChange, drumParams = {}, onUpdateDrumParam,
  bassParams, bassPreset, onUpdateBassParam, onApplyBassPreset,
  synthParams, synthPreset, onUpdateSynthParam, onApplySynthPreset,
}: PatternEditorProps) {

  const bp = bassParams  || { waveform: 'sawtooth', cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 };
  const sp = synthParams || { attack: 0.5, release: 0.5, cutoff: 0.5, detune: 0.5 };

  return (
    <div className="flex flex-col h-full">

      {/* DRUM KIT SELECTOR */}
      <div className="mb-4 flex items-center gap-3 px-3 py-2 bg-[#0A0A0B] border-b border-[#242428]">
        <span className="text-[9px] font-bold text-[#8A8A94] uppercase tracking-widest">Drum Kit</span>
        {(['808', '909'] as const).map(kit => (
          <button
            key={kit}
            onClick={() => onDrumKitChange?.(kit)}
            className="px-3 py-1 text-[9px] font-bold rounded transition-colors uppercase tracking-widest"
            style={
              drumKit === kit
                ? { background: '#FF5F00', color: '#000', boxShadow: '0 0 8px rgba(255,95,0,0.4)' }
                : { background: '#1a1a1e', color: '#8A8A94', border: '1px solid #242428' }
            }
          >
            {kit}
          </button>
        ))}
      </div>

      {/* DRUMS SECTION — horizontally scrollable on narrow screens */}
      <div className="overflow-x-auto">
        <div className={`flex flex-col gap-2 ${GRID_MIN_W}`}>
          {Object.entries(pattern.drums).map(([inst, steps]) => {
            const p = drumParams[inst] || { tune: 0.5, decay: 0.5, mute: false, solo: false };
            const isMuted  = p.mute  ?? false;
            const isSoloed = p.solo  ?? false;

            return (
              <div key={inst} className="flex items-center gap-2">
                {/* Label */}
                <div className="w-7 flex-shrink-0 text-[10px] font-bold text-[#8A8A94] tracking-wider">{inst}</div>

                {/* Mute / Solo */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onUpdateDrumParam(inst, 'mute', !isMuted)}
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors"
                    style={isMuted
                      ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' }
                      : { background: 'transparent', borderColor: '#333338', color: '#666' }}
                  >M</button>
                  <button
                    onClick={() => onUpdateDrumParam(inst, 'solo', !isSoloed)}
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors"
                    style={isSoloed
                      ? { background: '#FF5F00', borderColor: '#FF5F00', color: '#000' }
                      : { background: 'transparent', borderColor: '#333338', color: '#666' }}
                  >S</button>
                </div>

                {/* 16-step grid */}
                <div className="flex-1 grid grid-cols-16 gap-1">
                  {steps.map((step: any, i: number) => {
                    const isActive  = step.active;
                    const isCurrent = currentStep === i;
                    return (
                      <button
                        key={i}
                        onClick={() => onToggleDrumStep(inst as DrumInstrument, i)}
                        className="h-9 rounded-sm border transition-all duration-75"
                        style={
                          isActive
                            ? { background: '#FF5F00', borderColor: '#E05500', boxShadow: isCurrent ? '0 0 10px rgba(255,95,0,0.7)' : '0 0 6px rgba(255,95,0,0.3)' }
                            : isCurrent
                            ? { background: '#1e1e22', borderColor: '#FF5F00', outline: '1px solid #FF5F00' }
                            : { background: '#151518', borderColor: '#242428' }
                        }
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DRUM PARAMS */}
      <div className="mt-5 mb-2 flex gap-3 overflow-x-auto items-center pb-2">
        {(['BD', 'SD', 'HC', 'OH', 'LT', 'HT'] as const).map(inst => {
          const p = drumParams[inst] || { tune: 0.5, decay: 0.5 };
          return (
            <div key={inst} className="flex flex-col bg-[#0A0A0B] p-3 rounded border border-[#242428] min-w-[110px] flex-shrink-0">
              <div className="text-[9px] font-bold text-[#FF5F00] mb-3 text-center tracking-widest">{inst}</div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-[#8A8A94] uppercase w-8 tracking-widest">Tune</span>
                  <input type="range" min="0" max="1" step="0.01" value={p.tune} onChange={e => onUpdateDrumParam(inst, 'tune', parseFloat(e.target.value))} className="flex-1 h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#FF5F00' }} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-[#8A8A94] uppercase w-8 tracking-widest">Dcy</span>
                  <input type="range" min="0" max="1" step="0.01" value={p.decay} onChange={e => onUpdateDrumParam(inst, 'decay', parseFloat(e.target.value))} className="flex-1 h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#FF5F00' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BASS SECTION */}
      <div className="mt-4 border-t border-[#242428] pt-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-xs font-bold text-[#FF5F00] tracking-widest uppercase">Bass Synthesizer</div>
          <div className="flex items-center gap-3 bg-[#0A0A0B] p-2 rounded border border-[#242428] flex-wrap">
            {/* Presets */}
            <div className="flex items-center gap-1 border-r border-[#242428] pr-3">
              {Object.keys(BASS_PRESETS).map(name => (
                <button key={name} onClick={() => onApplyBassPreset?.(BASS_PRESETS[name], name)}
                  className="px-2 py-1 text-[9px] font-bold rounded transition-colors uppercase tracking-widest"
                  style={bassPreset === name
                    ? { background: '#FF5F00', color: '#000' }
                    : { background: '#1a1a1e', color: '#8A8A94', border: '1px solid #242428' }}>
                  {name}
                </button>
              ))}
            </div>
            <button
              onClick={() => onUpdateBassParam('waveform', bp.waveform === 'sawtooth' ? 'square' : 'sawtooth')}
              className="px-3 py-1 bg-[#1a1a1e] border border-[#242428] hover:border-[#FF5F00] rounded text-[10px] font-bold text-[#FF5F00] transition-colors tracking-widest">
              {bp.waveform === 'sawtooth' ? 'SAW' : 'SQR'}
            </button>
            <div className="flex gap-3">
              {[{ label: 'Cutoff', key: 'cutoff' }, { label: 'Res', key: 'resonance' }, { label: 'Env', key: 'envMod' }, { label: 'Dcy', key: 'decay' }].map(({ label, key }) => (
                <div key={key} className="flex flex-col items-center gap-1 w-10">
                  <span className="text-[9px] text-[#8A8A94] uppercase tracking-widest">{label}</span>
                  <input type="range" min="0" max="1" step="0.01" value={(bp as any)[key]} onChange={e => onUpdateBassParam(key, parseFloat(e.target.value))} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#FF5F00' }} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 ml-2 pl-3 border-l border-[#242428]">
              <button onClick={() => onUpdateBassParam('octave', Math.max(0, (bp.octave || 2) - 1))} className="w-6 h-6 flex items-center justify-center bg-[#1a1a1e] border border-[#242428] hover:border-[#FF5F00] rounded text-xs font-bold text-[#8A8A94] transition-colors">−</button>
              <span className="text-[9px] font-bold text-[#FF5F00] min-w-4 text-center">{bp.octave || 2}</span>
              <button onClick={() => onUpdateBassParam('octave', Math.min(8, (bp.octave || 2) + 1))} className="w-6 h-6 flex items-center justify-center bg-[#1a1a1e] border border-[#242428] hover:border-[#FF5F00] rounded text-xs font-bold text-[#8A8A94] transition-colors">+</button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className={`flex flex-col gap-0.5 ${GRID_MIN_W}`}>
            {BASS_NOTES.map((note) => (
              <div key={note} className="flex items-center gap-2">
                <div className="w-7 flex-shrink-0 text-[9px] font-bold text-[#8A8A94] text-right pr-1">{note}</div>
                <div className="flex-1 grid grid-cols-16 gap-1">
                  {pattern.bass.map((step: any, i: number) => {
                    const fullNote = `${note}${bp.octave || 2}`;
                    const isActive  = step.active && step.note === fullNote;
                    const isCurrent = currentStep === i;
                    return (
                      <button key={i} onClick={() => onToggleBassStep(i, fullNote)}
                        className="h-5 rounded-sm border transition-all duration-75"
                        style={
                          isActive
                            ? { background: '#FF5F00', borderColor: '#E05500', boxShadow: '0 0 6px rgba(255,95,0,0.35)' }
                            : isCurrent
                            ? { background: '#1e1e22', borderColor: '#FF5F00' }
                            : { background: '#151518', borderColor: '#242428' }
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SYNTH SECTION */}
      <div className="mt-7 border-t border-[#242428] pt-5 pb-8">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-xs font-bold text-[#8b5cf6] tracking-widest uppercase">Atmospheric Pad</div>
          <div className="flex items-center gap-3 bg-[#0A0A0B] p-2 rounded border border-[#242428] flex-wrap">
            <div className="flex items-center gap-1 border-r border-[#242428] pr-3">
              {Object.keys(SYNTH_PRESETS).map(name => (
                <button key={name} onClick={() => onApplySynthPreset?.(SYNTH_PRESETS[name], name)}
                  className="px-2 py-1 text-[9px] font-bold rounded transition-colors uppercase tracking-widest"
                  style={synthPreset === name
                    ? { background: '#8b5cf6', color: '#fff' }
                    : { background: '#1a1a1e', color: '#8A8A94', border: '1px solid #242428' }}>
                  {name}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              {[{ label: 'Atk', key: 'attack' }, { label: 'Rel', key: 'release' }, { label: 'Cutoff', key: 'cutoff' }, { label: 'Detune', key: 'detune' }].map(({ label, key }) => (
                <div key={key} className="flex flex-col items-center gap-1 w-10">
                  <span className="text-[9px] text-[#8A8A94] uppercase tracking-widest">{label}</span>
                  <input type="range" min="0" max="1" step="0.01" value={(sp as any)[key]} onChange={e => onUpdateSynthParam(key, parseFloat(e.target.value))} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#8b5cf6' }} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 ml-2 pl-3 border-l border-[#242428]">
              <button onClick={() => onUpdateSynthParam('octave', Math.max(0, (sp.octave || 4) - 1))} className="w-6 h-6 flex items-center justify-center bg-[#1a1a1e] border border-[#242428] hover:border-[#8b5cf6] rounded text-xs font-bold text-[#8A8A94] transition-colors">−</button>
              <span className="text-[9px] font-bold text-[#8b5cf6] min-w-4 text-center">{sp.octave || 4}</span>
              <button onClick={() => onUpdateSynthParam('octave', Math.min(8, (sp.octave || 4) + 1))} className="w-6 h-6 flex items-center justify-center bg-[#1a1a1e] border border-[#242428] hover:border-[#8b5cf6] rounded text-xs font-bold text-[#8A8A94] transition-colors">+</button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className={`flex flex-col gap-0.5 ${GRID_MIN_W}`}>
            {SYNTH_NOTES.map((note) => (
              <div key={note} className="flex items-center gap-2">
                <div className="w-7 flex-shrink-0 text-[9px] font-bold text-[#8A8A94] text-right pr-1">{note}</div>
                <div className="flex-1 grid grid-cols-16 gap-1">
                  {(pattern.synth || Array(16).fill({ active: false, note: '' })).map((step: any, i: number) => {
                    const fullNote  = `${note}${sp.octave || 4}`;
                    const isActive  = step.active && step.note === fullNote;
                    const isCurrent = currentStep === i;
                    return (
                      <button key={i} onClick={() => onToggleSynthStep(i, fullNote)}
                        className="h-5 rounded-sm border transition-all duration-75"
                        style={
                          isActive
                            ? { background: '#8b5cf6', borderColor: '#7c3aed', boxShadow: '0 0 6px rgba(139,92,246,0.4)' }
                            : isCurrent
                            ? { background: '#1e1e22', borderColor: '#8b5cf6' }
                            : { background: '#151518', borderColor: '#242428' }
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
