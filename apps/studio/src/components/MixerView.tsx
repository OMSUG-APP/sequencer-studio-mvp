import React from 'react';
import { RotaryKnob } from './RotaryKnob';

const ChannelRack = ({ title, color, section, data, updateMixer }: any) => (
  <div className="bg-[#0A0A0B] p-3 rounded border border-[#242428] flex flex-col">
    <div className="text-[10px] font-bold mb-3 uppercase tracking-widest" style={{ color }}>{title}</div>
    <div className="flex items-stretch gap-4">

      {/* Volume Fader */}
      <div className="flex flex-col items-center w-8 border-r border-[#242428] pr-4 flex-shrink-0 h-48" style={{ contain: 'layout' }}>
        <input type="range" min="0" max="1.5" step="0.01" value={data.volume} onChange={e => updateMixer(section, 'volume', parseFloat(e.target.value))} className="w-1 h-full bg-[#1a1a1e] rounded-lg cursor-pointer flex-shrink-0" style={{ writingMode: 'vertical-lr', direction: 'rtl', accentColor: color }} />
        <span className="text-[9px] text-[#8A8A94] mt-2 uppercase tracking-widest">Vol</span>
      </div>

      {/* Parameters Column */}
      <div className="flex-1 flex flex-col gap-3 justify-center">

        {/* EQ Section */}
        <div className="flex flex-col gap-2">
          <span className="text-[9px] text-[#8A8A94] font-bold tracking-widest">EQ</span>
          <div className="flex gap-3 justify-center items-end">
            <RotaryKnob label="HI"  min={-12} max={12} step={0.1} value={data.eq.high} onChange={(val) => updateMixer(section, 'eq', val, 'high')} color={color} />
            <RotaryKnob label="MID" min={-12} max={12} step={0.1} value={data.eq.mid}  onChange={(val) => updateMixer(section, 'eq', val, 'mid')}  color={color} />
            <RotaryKnob label="LOW" min={-12} max={12} step={0.1} value={data.eq.low}  onChange={(val) => updateMixer(section, 'eq', val, 'low')}  color={color} />
          </div>
        </div>

        <div className="border-t border-[#242428] my-1" />

        {/* FX Section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[#8A8A94] w-12 font-bold tracking-widest">REVERB</span>
            <div className="flex-1 max-w-xs"><input type="range" min="0" max="1" step="0.01" value={data.reverb} onChange={e => updateMixer(section, 'reverb', parseFloat(e.target.value))} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: color }} /></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[#8A8A94] w-12 font-bold tracking-widest">D.TIME</span>
            <div className="flex-1 max-w-xs"><input type="range" min="0.1" max="1.0" step="0.01" value={data.delay.time} onChange={e => updateMixer(section, 'delay', parseFloat(e.target.value), 'time')} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: color }} /></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[#8A8A94] w-12 font-bold tracking-widest">D.FDBK</span>
            <div className="flex-1 max-w-xs"><input type="range" min="0" max="0.9" step="0.01" value={data.delay.feedback} onChange={e => updateMixer(section, 'delay', parseFloat(e.target.value), 'feedback')} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: color }} /></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[#8A8A94] w-12 font-bold tracking-widest">D.MIX</span>
            <div className="flex-1 max-w-xs"><input type="range" min="0" max="1" step="0.01" value={data.delay.mix} onChange={e => updateMixer(section, 'delay', parseFloat(e.target.value), 'mix')} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: color }} /></div>
          </div>
        </div>

      </div>
    </div>
  </div>
);

export function MixerView({ mixer, onMixerChange }: any) {
  const updateMixer = (section: string, param: string, value: number, subParam?: string) => {
    const newMixer = JSON.parse(JSON.stringify(mixer));

    ['drums', 'bass', 'synth'].forEach(ch => {
      if (!newMixer[ch]) newMixer[ch] = { volume: 0.8, eq: { low: 0, mid: 0, high: 0 } };
      if (newMixer[ch].reverb === undefined) newMixer[ch].reverb = 0;
      if (!newMixer[ch].delay) newMixer[ch].delay = { time: 0.3, feedback: 0.3, mix: 0 };
    });
    if (!newMixer.master) newMixer.master = { volume: 1.0, drive: 0, compressor: { threshold: -12, knee: 6, ratio: 4, attack: 0.003, release: 0.25 } };
    if (!newMixer.master.compressor) newMixer.master.compressor = { threshold: -12, knee: 6, ratio: 4, attack: 0.003, release: 0.25 };

    if (subParam) newMixer[section][param][subParam] = value;
    else newMixer[section][param] = value;
    onMixerChange(newMixer);
  };

  const m = mixer || {};

  const getChannel = (name: string, defaultVol: number) => {
    const ch = m[name] || { volume: defaultVol, eq: { low: 0, mid: 0, high: 0 } };
    return {
      ...ch,
      reverb: ch.reverb || 0,
      delay: ch.delay || { time: 0.3, feedback: 0.3, mix: 0 },
    };
  };

  const drums  = getChannel('drums', 0.8);
  const bass   = getChannel('bass', 0.8);
  const synth  = getChannel('synth', 0.7);
  const master = m.master || { volume: 1.0, drive: 0, compressor: { threshold: -12, knee: 6, ratio: 4, attack: 0.003, release: 0.25 } };
  const comp   = master.compressor || { threshold: -12, knee: 6, ratio: 4, attack: 0.003, release: 0.25 };

  return (
    <div className="flex flex-col h-full">
      <div className="text-xs font-bold text-[#FF5F00] tracking-widest uppercase mb-4 border-b border-[#242428] pb-2">
        Mixer Console
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto pr-2 pb-4">

        <ChannelRack title="Drums" color="#10b981" section="drums" data={drums} updateMixer={updateMixer} />
        <ChannelRack title="Bass"  color="#FF5F00" section="bass"  data={bass}  updateMixer={updateMixer} />
        <ChannelRack title="Synth" color="#8b5cf6" section="synth" data={synth} updateMixer={updateMixer} />

        {/* MASTER RACK */}
        <div
          className="bg-[#0A0A0B] p-3 rounded border flex flex-col mt-2"
          style={{ borderColor: 'rgba(255, 95, 0, 0.3)', boxShadow: '0 0 12px rgba(255, 95, 0, 0.08)' }}
        >
          <div className="text-[10px] font-bold text-[#FF5F00] mb-3 uppercase tracking-widest">Master Bus</div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center w-8 border-r border-[#242428] pr-4 flex-shrink-0" style={{ contain: 'layout' }}>
              <div className="h-16">
                <input type="range" min="0" max="1.5" step="0.01" value={master.volume} onChange={e => updateMixer('master', 'volume', parseFloat(e.target.value))} className="w-1 h-full bg-[#1a1a1e] rounded-lg cursor-pointer flex-shrink-0" style={{ writingMode: 'vertical-lr', direction: 'rtl', accentColor: '#FF5F00' }} />
              </div>
              <span className="text-[9px] text-[#FF5F00] mt-2 uppercase font-bold tracking-widest">Vol</span>
            </div>
            <div className="flex-1 flex flex-col gap-3 justify-center">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#ef4444] font-bold w-12 tracking-widest">DRIVE</span>
                <div className="flex-1 max-w-xs"><input type="range" min="0" max="1" step="0.01" value={master.drive} onChange={e => updateMixer('master', 'drive', parseFloat(e.target.value))} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#ef4444' }} /></div>
              </div>
              <div className="border-t border-[#242428] my-1" />
              <span className="text-[9px] text-[#8A8A94] font-bold tracking-widest">COMP</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#8A8A94] w-12 tracking-widest">THRESH</span>
                <div className="flex-1 max-w-xs"><input type="range" min="-60" max="0" step="0.5" value={comp.threshold} onChange={e => updateMixer('master', 'compressor', parseFloat(e.target.value), 'threshold')} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#FF5F00' }} /></div>
                <span className="text-[9px] text-[#8A8A94] w-10 text-right">{comp.threshold}dB</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#8A8A94] w-12 tracking-widest">RATIO</span>
                <div className="flex-1 max-w-xs"><input type="range" min="1" max="20" step="0.5" value={comp.ratio} onChange={e => updateMixer('master', 'compressor', parseFloat(e.target.value), 'ratio')} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#FF5F00' }} /></div>
                <span className="text-[9px] text-[#8A8A94] w-10 text-right">{comp.ratio}:1</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#8A8A94] w-12 tracking-widest">ATTACK</span>
                <div className="flex-1 max-w-xs"><input type="range" min="0" max="0.5" step="0.001" value={comp.attack} onChange={e => updateMixer('master', 'compressor', parseFloat(e.target.value), 'attack')} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#FF5F00' }} /></div>
                <span className="text-[9px] text-[#8A8A94] w-10 text-right">{Math.round(comp.attack * 1000)}ms</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#8A8A94] w-12 tracking-widest">RELEASE</span>
                <div className="flex-1 max-w-xs"><input type="range" min="0.01" max="1" step="0.01" value={comp.release} onChange={e => updateMixer('master', 'compressor', parseFloat(e.target.value), 'release')} className="w-full h-1 bg-[#1a1a1e] rounded-lg cursor-pointer" style={{ accentColor: '#FF5F00' }} /></div>
                <span className="text-[9px] text-[#8A8A94] w-10 text-right">{Math.round(comp.release * 1000)}ms</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
