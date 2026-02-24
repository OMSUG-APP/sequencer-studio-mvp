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

const BASS_NOTES = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'];
const SYNTH_NOTES = ['B', 'A#', 'A', 'G#', 'G', 'F#', 'F', 'E', 'D#', 'D', 'C#', 'C'];

export function PatternEditor({
  pattern, currentStep, onToggleDrumStep, onToggleBassStep, onToggleSynthStep,
  drumKit, onDrumKitChange, drumParams = {}, onUpdateDrumParam, bassParams, bassPreset, onUpdateBassParam, onApplyBassPreset, synthParams, synthPreset, onUpdateSynthParam, onApplySynthPreset
}: PatternEditorProps) {
  
  const formatDrumName = (name: string) => {
    const map: Record<string, string> = { kick: 'BD', snare: 'SD', clap: 'HC', hat: 'OH', openhat: 'LT', rim: 'HT' };
    return map[name.toLowerCase()] || name.substring(0, 2).toUpperCase();
  };

  // ADDED 'LT' and 'HT' HERE!
  const instruments = ['BD', 'SD', 'HC', 'OH', 'LT', 'HT'];
  const bp = bassParams || { waveform: 'sawtooth', cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 };
  const sp = synthParams || { attack: 0.5, release: 0.5, cutoff: 0.5, detune: 0.5 };

  return (
    <div className="flex flex-col h-full">

      {/* DRUM KIT SELECTOR */}
      <div className="mb-4 flex items-center gap-3 px-3 py-2 bg-[#0a0a0a] border-b border-[#27272a]">
        <span className="text-[9px] font-bold text-[#a1a1aa] uppercase">Drum Kit</span>
        <button
          onClick={() => onDrumKitChange?.('808')}
          className={`px-3 py-1 text-[9px] font-bold rounded transition-colors ${
            drumKit === '808'
              ? 'bg-[#f97316] text-black'
              : 'bg-[#27272a] text-[#a1a1aa] hover:bg-[#3f3f46]'
          }`}
        >
          808
        </button>
        <button
          onClick={() => onDrumKitChange?.('909')}
          className={`px-3 py-1 text-[9px] font-bold rounded transition-colors ${
            drumKit === '909'
              ? 'bg-[#f97316] text-black'
              : 'bg-[#27272a] text-[#a1a1aa] hover:bg-[#3f3f46]'
          }`}
        >
          909
        </button>
      </div>

      {/* DRUMS SECTION */}
      <div className="flex flex-col gap-2">
        {Object.entries(pattern.drums).map(([inst, steps]) => {
          const p = drumParams[inst] || { tune: 0.5, decay: 0.5, mute: false, solo: false };
          const isMuted = p.mute ?? false;
          const isSoloed = p.solo ?? false;

          return (
            <div key={inst} className="flex items-center gap-4">
              <div className="w-8 text-xs font-bold text-[#a1a1aa] tracking-wider">{formatDrumName(inst)}</div>
              
              {/* Mute / Solo Buttons */}
              <div className="flex items-center gap-1 mr-2">
                <button
                  onClick={() => onUpdateDrumParam(inst, 'mute', !isMuted)}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                    isMuted
                      ? 'bg-[#ef4444] border-[#ef4444] text-white'
                      : 'bg-transparent border-[#3f3f46] text-[#71717a] hover:border-[#ef4444] hover:text-[#ef4444]'
                  }`}
                >
                  M
                </button>
                <button
                  onClick={() => onUpdateDrumParam(inst, 'solo', !isSoloed)}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                    isSoloed
                      ? 'bg-[#f59e0b] border-[#f59e0b] text-black'
                      : 'bg-transparent border-[#3f3f46] text-[#71717a] hover:border-[#f59e0b] hover:text-[#f59e0b]'
                  }`}
                >
                  S
                </button>
              </div>

              <div className="flex-1 grid grid-cols-16 gap-1">
                {steps.map((step: any, i: number) => (
                  <button key={i} onClick={() => onToggleDrumStep(inst as DrumInstrument, i)}
                    className={`h-10 rounded-sm border transition-all duration-75 ${step.active ? 'bg-[#10b981] border-[#059669] shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-[#1a1a1a] border-[#27272a] hover:bg-[#27272a]'} ${currentStep === i ? 'ring-2 ring-white z-10' : ''}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* DRUM PARAMS SECTION */}
      <div className="mt-6 mb-2 flex gap-4 overflow-x-auto items-center pb-2 custom-scrollbar">
        {instruments.map(inst => {
          const p = drumParams[inst] || { tune: 0.5, decay: 0.5 };
          return (
            <div key={inst} className="flex flex-col bg-[#0a0a0a] p-3 rounded border border-[#27272a] min-w-[120px]">
              <div className="text-xs font-bold text-[#10b981] mb-3 text-center">{inst}</div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2"><span className="text-[9px] text-[#a1a1aa] uppercase w-8">Tune</span><input type="range" min="0" max="1" step="0.01" value={p.tune} onChange={e => onUpdateDrumParam(inst, 'tune', parseFloat(e.target.value))} className="flex-1 h-1 bg-[#1a1a1a] rounded-lg cursor-pointer accent-[#10b981]" /></div>
                <div className="flex items-center gap-2"><span className="text-[9px] text-[#a1a1aa] uppercase w-8">Decay</span><input type="range" min="0" max="1" step="0.01" value={p.decay} onChange={e => onUpdateDrumParam(inst, 'decay', parseFloat(e.target.value))} className="flex-1 h-1 bg-[#1a1a1a] rounded-lg cursor-pointer accent-[#10b981]" /></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BASS SECTION */}
      <div className="mt-4 border-t border-[#27272a] pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-bold text-[#f97316] tracking-widest uppercase">Bass Synthesizer</div>
          <div className="flex items-center gap-4 bg-[#0a0a0a] p-2 rounded border border-[#27272a]">
            {/* Bass Presets */}
            <div className="flex items-center gap-1 border-r border-[#27272a] pr-4">
              {Object.keys(BASS_PRESETS).map(name => (
                <button key={name} onClick={() => onApplyBassPreset?.(BASS_PRESETS[name], name)}
                  className={`px-2 py-1 text-[9px] font-bold rounded transition-colors ${bassPreset === name ? 'bg-[#f97316] text-black' : 'bg-[#27272a] text-[#a1a1aa] hover:bg-[#3f3f46]'}`}>
                  {name}
                </button>
              ))}
            </div>
            <button onClick={() => onUpdateBassParam('waveform', bp.waveform === 'sawtooth' ? 'square' : 'sawtooth')} className="px-3 py-1 bg-[#1a1a1a] border border-[#3f3f46] hover:bg-[#27272a] rounded text-[10px] font-bold text-[#f97316] transition-colors">{bp.waveform === 'sawtooth' ? 'SAW' : 'SQR'}</button>
            <div className="flex gap-4">
              {[{ label: 'Cutoff', key: 'cutoff' }, { label: 'Res', key: 'resonance' }, { label: 'Env', key: 'envMod' }, { label: 'Decay', key: 'decay' }].map(({ label, key }) => (
                <div key={key} className="flex flex-col items-center gap-1 w-12"><span className="text-[9px] text-[#a1a1aa] uppercase">{label}</span><input type="range" min="0" max="1" step="0.01" value={(bp as any)[key]} onChange={e => onUpdateBassParam(key, parseFloat(e.target.value))} className="w-full h-1 bg-[#1a1a1a] rounded-lg cursor-pointer accent-[#f97316]" /></div>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-[#27272a]">
              <button onClick={() => onUpdateBassParam('octave', Math.max(0, (bp.octave || 2) - 1))} className="px-2 py-1 bg-[#1a1a1a] border border-[#3f3f46] hover:bg-[#27272a] rounded text-[10px] font-bold text-[#a1a1aa] transition-colors">−</button>
              <span className="text-[9px] font-bold text-[#a1a1aa] min-w-4 text-center">{bp.octave || 2}</span>
              <button onClick={() => onUpdateBassParam('octave', Math.min(8, (bp.octave || 2) + 1))} className="px-2 py-1 bg-[#1a1a1a] border border-[#3f3f46] hover:bg-[#27272a] rounded text-[10px] font-bold text-[#a1a1aa] transition-colors">+</button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {BASS_NOTES.map((note) => (
            <div key={note} className="flex items-center gap-4">
              <div className="w-8 text-[10px] font-bold text-[#a1a1aa] tracking-wider text-right pr-1">{note}</div>
              <div className="flex-1 grid grid-cols-16 gap-1">
                {pattern.bass.map((step: any, i: number) => {
                  const fullNote = `${note}${bp.octave || 2}`; const isActive = step.active && step.note === fullNote;
                  return <button key={i} onClick={() => onToggleBassStep(i, fullNote)} className={`h-6 rounded-sm border transition-all duration-75 ${isActive ? 'bg-[#f97316] border-[#ea580c] shadow-[0_0_8px_rgba(249,115,22,0.4)]' : 'bg-[#1a1a1a] border-[#27272a] hover:bg-[#27272a]'} ${currentStep === i ? 'ring-1 ring-white z-10' : ''}`} />
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SYNTH SECTION */}
      <div className="mt-8 border-t border-[#27272a] pt-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-bold text-[#8b5cf6] tracking-widest uppercase">Atmospheric Pad</div>
          <div className="flex items-center gap-4 bg-[#0a0a0a] p-2 rounded border border-[#27272a]">
            {/* Synth Presets */}
            <div className="flex items-center gap-1 border-r border-[#27272a] pr-4">
              {Object.keys(SYNTH_PRESETS).map(name => (
                <button key={name} onClick={() => onApplySynthPreset?.(SYNTH_PRESETS[name], name)}
                  className={`px-2 py-1 text-[9px] font-bold rounded transition-colors ${synthPreset === name ? 'bg-[#8b5cf6] text-white' : 'bg-[#27272a] text-[#a1a1aa] hover:bg-[#3f3f46]'}`}>
                  {name}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              {[{ label: 'Attack', key: 'attack' }, { label: 'Release', key: 'release' }, { label: 'Cutoff', key: 'cutoff' }, { label: 'Detune', key: 'detune' }].map(({ label, key }) => (
                <div key={key} className="flex flex-col items-center gap-1 w-12"><span className="text-[9px] text-[#a1a1aa] uppercase">{label}</span><input type="range" min="0" max="1" step="0.01" value={(sp as any)[key]} onChange={e => onUpdateSynthParam(key, parseFloat(e.target.value))} className="w-full h-1 bg-[#1a1a1a] rounded-lg cursor-pointer accent-[#8b5cf6]" /></div>
              ))}
            </div>
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-[#27272a]">
              <button onClick={() => onUpdateSynthParam('octave', Math.max(0, (sp.octave || 4) - 1))} className="px-2 py-1 bg-[#1a1a1a] border border-[#3f3f46] hover:bg-[#27272a] rounded text-[10px] font-bold text-[#a1a1aa] transition-colors">−</button>
              <span className="text-[9px] font-bold text-[#a1a1aa] min-w-4 text-center">{sp.octave || 4}</span>
              <button onClick={() => onUpdateSynthParam('octave', Math.min(8, (sp.octave || 4) + 1))} className="px-2 py-1 bg-[#1a1a1a] border border-[#3f3f46] hover:bg-[#27272a] rounded text-[10px] font-bold text-[#a1a1aa] transition-colors">+</button>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {SYNTH_NOTES.map((note) => (
            <div key={note} className="flex items-center gap-4">
              <div className="w-8 text-[10px] font-bold text-[#a1a1aa] tracking-wider text-right pr-1">{note}</div>
              <div className="flex-1 grid grid-cols-16 gap-1">
                {(pattern.synth || Array(16).fill({ active: false, note: '' })).map((step: any, i: number) => {
                  const fullNote = `${note}${sp.octave || 4}`;
                  const isActive = step.active && step.note === fullNote;
                  return <button key={i} onClick={() => onToggleSynthStep(i, fullNote)} className={`h-6 rounded-sm border transition-all duration-75 ${isActive ? 'bg-[#8b5cf6] border-[#7c3aed] shadow-[0_0_8px_rgba(139,92,246,0.4)]' : 'bg-[#1a1a1a] border-[#27272a] hover:bg-[#27272a]'} ${currentStep === i ? 'ring-1 ring-white z-10' : ''}`} />
                })}
              </div>
            </div>
          ))}
        </div>
      </div> 

    </div>
  );
}