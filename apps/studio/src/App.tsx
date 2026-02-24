import { useState, useEffect, useCallback } from 'react';
import { TransportBar } from './components/TransportBar';
import { PatternEditor } from './components/PatternEditor';
import { MixerView } from './components/MixerView';
import { useAudioEngine } from './hooks/useAudioEngine';
import { INITIAL_PROJECT, INITIAL_PATTERN, BASS_PRESETS, SYNTH_PRESETS } from './constants';
import { Project, DrumInstrument } from './types';
import { Download } from 'lucide-react';
import { renderToWav } from './utils/export';

export default function App() {
  const [project, setProject] = useState<Project>(() => {
    const saved = localStorage.getItem('sequencer-project');
    return saved ? JSON.parse(saved) : INITIAL_PROJECT;
  });
  const [activePatternId, setActivePatternId] = useState(project.patterns[0].id);
  const [isExporting, setIsExporting] = useState(false);

  const { isPlaying, currentStep, togglePlay } = useAudioEngine(project);

  // Persistence
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('sequencer-project', JSON.stringify(project));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [project]);

  // Spacebar Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  const activePattern = project.patterns.find(p => p.id === activePatternId)!;

  const updateActivePattern = useCallback((updater: (p: typeof activePattern) => typeof activePattern) => {
    setProject(prev => ({
      ...prev,
      patterns: prev.patterns.map(p => p.id === activePatternId ? updater(p) : p)
    }));
  }, [activePatternId]);

  const handleToggleDrumStep = (inst: DrumInstrument, step: number) => {
    updateActivePattern(p => ({
      ...p,
      drums: {
        ...p.drums,
        [inst]: p.drums[inst].map((s, i) => i === step ? { ...s, active: !s.active } : s)
      }
    }));
  };
  
  const handleToggleBassStep = (step: number, note: string) => {
    updateActivePattern(p => ({
      ...p,
      bass: p.bass.map((s, i) => {
        if (i === step) {
          const isSameNote = s.note === note;
          return { ...s, active: isSameNote ? !s.active : true, note };
        }
        return s;
      })
    }));
  };

  const handleToggleSynthStep = (step: number, note: string) => {
    updateActivePattern(p => ({
      ...p,
      synth: (p.synth || Array(16).fill({ active: false, note: '', velocity: 0.6, length: 4 })).map((s, i) => {
        if (i === step) {
          const isSameNote = s.note === note;
          return { ...s, active: isSameNote ? !s.active : true, note };
        }
        return s;
      })
    }));
  };

  const handleAddPattern = () => {
    const id = `p${project.patterns.length + 1}`;
    const newPattern = INITIAL_PATTERN(id, `Pattern ${project.patterns.length + 1}`);
    setProject(prev => ({
      ...prev,
      patterns: [...prev.patterns, newPattern]
    }));
    setActivePatternId(id);
  };

  const handleUpdateDrumParam = (inst: string, param: string, value: any) => {
    setProject(prev => ({
      ...prev,
      drumParams: {
        ...prev.drumParams,
        [inst]: {
          ...(prev.drumParams?.[inst] || { tune: 0.5, decay: 0.5, mute: false, solo: false }),
          [param]: value
        }
      }
    }));
  };

  const handleDrumKitChange = (kit: '808' | '909') => {
    setProject(prev => ({
      ...prev,
      drumKit: kit
    }));
  };

  const handleApplyBassPreset = (preset: typeof BASS_PRESETS[string], name: string) => {
    setProject(prev => ({ ...prev, bassPreset: name, bassParams: { ...preset } }));
  };

  const handleUpdateBassParam = (param: string, value: any) => {
    setProject(prev => ({
      ...prev,
      bassParams: {
        ...(prev.bassParams || { waveform: 'sawtooth', cutoff: 0.5, resonance: 0.2, envMod: 0.5, decay: 0.5 }),
        [param]: value
      }
    }));
  };

  const handleApplySynthPreset = (preset: typeof SYNTH_PRESETS[string], name: string) => {
    setProject(prev => ({ ...prev, synthPreset: name, synthParams: { ...preset } }));
  };

  const handleUpdateSynthParam = (param: string, value: any) => {
    setProject(prev => ({
      ...prev,
      synthParams: {
        ...(prev.synthParams || { attack: 0.5, release: 0.5, cutoff: 0.5, detune: 0.5 }),
        [param]: value
      }
    }));
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMaster = async () => {
    setIsExporting(true);
    try {
      const wavBlob = await renderToWav(project, activePattern, 'master');
      downloadBlob(wavBlob, `${project.name.toLowerCase().replace(/\s+/g, '-')}-master.wav`);
    } catch (error) {
      console.error('Export failed:', error);
    }
    setIsExporting(false);
  };

  const handleExportStems = async () => {
    setIsExporting(true);
    try {
      const projectName = project.name.toLowerCase().replace(/\s+/g, '-');
      
      // Render and download Drums
      const drumsBlob = await renderToWav(project, activePattern, 'drums');
      downloadBlob(drumsBlob, `${projectName}-stem-drums.wav`);
      
      // Small delay to prevent the browser from blocking multiple rapid downloads
      await new Promise(r => setTimeout(r, 500)); 
      
      // Render and download Bass
      const bassBlob = await renderToWav(project, activePattern, 'bass');
      downloadBlob(bassBlob, `${projectName}-stem-bass.wav`);
      
      await new Promise(r => setTimeout(r, 500));
      
      // Render and download Synth
      const synthBlob = await renderToWav(project, activePattern, 'synth');
      downloadBlob(synthBlob, `${projectName}-stem-synth.wav`);
      
    } catch (error) {
      console.error('Stem export failed:', error);
    }
    setIsExporting(false);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] text-[#a1a1aa] overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#121212] border-b border-[#27272a] shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#f97316] rounded-sm flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.3)]">
            <div className="w-4 h-4 bg-black rounded-sm rotate-45" />
          </div>
          <input
            value={project.name}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
            className="bg-transparent font-bold text-sm text-[#f4f4f5] focus:outline-none hover:bg-[#27272a] px-2 py-1 rounded transition-colors uppercase tracking-wider"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportStems}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#3f3f46] hover:bg-[#27272a] hover:text-[#f4f4f5] rounded text-xs font-bold transition-colors uppercase tracking-widest disabled:opacity-50"
          >
            <Download size={14} />
            {isExporting ? 'Rendering...' : 'Export Stems'}
          </button>
          <button
            onClick={handleExportMaster}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-[#f97316] text-black hover:bg-[#ea580c] rounded text-xs font-bold transition-colors uppercase tracking-widest disabled:opacity-50"
          >
            <Download size={14} />
            {isExporting ? 'Rendering...' : 'Export Master'}
          </button>
        </div>
      </div>

      <TransportBar
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        bpm={project.bpm}
        onBpmChange={(bpm) => setProject({ ...project, bpm })}
        swing={project.swing}
        onSwingChange={(swing) => setProject({ ...project, swing })}
      />

      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        <div className="flex-4 flex flex-col overflow-hidden">

          {/* Pattern Editor */}
          <div className="flex-1 bg-[#121212] border border-[#27272a] rounded-lg p-4 shadow-lg overflow-y-auto">
            <PatternEditor
              pattern={activePattern}
              currentStep={currentStep}
              onToggleDrumStep={handleToggleDrumStep}
              onToggleBassStep={handleToggleBassStep}
              onToggleSynthStep={handleToggleSynthStep}
              drumKit={project.drumKit}
              onDrumKitChange={handleDrumKitChange}
              drumParams={project.drumParams}
              onUpdateDrumParam={handleUpdateDrumParam}
              bassParams={project.bassParams}
              bassPreset={project.bassPreset}
              onUpdateBassParam={handleUpdateBassParam}
              onApplyBassPreset={handleApplyBassPreset}
              synthParams={project.synthParams}
              synthPreset={project.synthPreset}
              onUpdateSynthParam={handleUpdateSynthParam}
              onApplySynthPreset={handleApplySynthPreset}
            />
          </div>

        </div>

        {/* Mixer */}
        <div className="flex-1 bg-[#121212] border border-[#27272a] rounded-lg p-4 shadow-lg overflow-y-auto">
          <MixerView
            mixer={project.mixer}
            onMixerChange={(mixer) => setProject({ ...project, mixer })}
          />
        </div>
      </div>
    </div>
  );
}