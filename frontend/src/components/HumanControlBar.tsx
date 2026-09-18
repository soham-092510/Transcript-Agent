import React, { useState } from 'react';
import { 
  Pause, 
  Play, 
  Square, 
  Terminal, 
  Eye, 
  Mic, 
  Sparkles,
} from 'lucide-react';
import { LearningSession } from '../types';

interface HumanControlBarProps {
  activeSession: LearningSession | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSendCommand: (cmd: string) => void;
  visualEnabled: boolean;
  setVisualEnabled: (val: boolean) => void;
  audioEnabled: boolean;
  setAudioEnabled: (val: boolean) => void;
}

export const HumanControlBar: React.FC<HumanControlBarProps> = ({
  activeSession,
  onPause,
  onResume,
  onStop,
  onSendCommand,
  visualEnabled,
  setVisualEnabled,
  audioEnabled,
  setAudioEnabled,
}) => {
  const [showCommandInput, setShowCommandInput] = useState(false);
  const [commandText, setCommandText] = useState('');

  if (!activeSession) {
    return (
      <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between text-xs text-slate-500 shadow-sm">
        <span>No active learning session selected. Click "Start Learning" or load the "Demo" to begin.</span>
      </header>
    );
  }

  const isPaused = activeSession.status === 'PAUSED';

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commandText.trim()) {
      onSendCommand(commandText.trim());
      setCommandText('');
      setShowCommandInput(false);
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white/95 backdrop-blur px-6 flex items-center justify-between z-20 shadow-sm">
      {/* Session Title & Platform Pill */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm text-slate-900 truncate max-w-md">
              {activeSession.title}
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
              {activeSession.source_platform}
            </span>
          </div>

          {/* Multimodal Pipeline Status Dots */}
          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
            <span className="flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${audioEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              Listening
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${visualEnabled ? 'bg-accent-cyan' : 'bg-slate-300'}`} />
              Visual Analysis
            </span>
            <span className="flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              Knowledge Live
            </span>
          </div>
        </div>
      </div>

      {/* Prominent Human Control Buttons */}
      <div className="flex items-center gap-2.5">
        {/* Toggle Visual & Audio Processing */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 mr-2 text-xs">
          <button
            onClick={() => setVisualEnabled(!visualEnabled)}
            title={visualEnabled ? 'Disable Visual Analysis' : 'Enable Visual Analysis'}
            className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-semibold transition-colors ${
              visualEnabled ? 'bg-white text-accent-cyan shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Vision
          </button>
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            title={audioEnabled ? 'Disable Audio Processing' : 'Enable Audio Processing'}
            className={`px-2 py-1 rounded flex items-center gap-1 text-[11px] font-semibold transition-colors ${
              audioEnabled ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            Audio
          </button>
        </div>

        {/* PAUSE / RESUME */}
        {isPaused ? (
          <button
            onClick={onResume}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            RESUME AGENT
          </button>
        ) : (
          <button
            onClick={onPause}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold transition-all active:scale-95 shadow-sm"
          >
            <Pause className="w-3.5 h-3.5" />
            PAUSE AGENT
          </button>
        )}

        {/* STOP */}
        <button
          onClick={onStop}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 text-xs font-bold transition-all active:scale-95 shadow-sm"
        >
          <Square className="w-3 h-3 fill-red-600" />
          STOP
        </button>

        {/* NEW COMMAND */}
        <button
          onClick={() => setShowCommandInput(!showCommandInput)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all active:scale-95"
        >
          <Terminal className="w-3.5 h-3.5" />
          COMMAND
        </button>
      </div>

      {/* Inline Command Floating Input Modal */}
      {showCommandInput && (
        <div className="absolute right-6 top-16 w-96 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl z-30 animate-in fade-in zoom-in-95 duration-150">
          <p className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            Natural Language Agent Command
          </p>
          <p className="text-[11px] text-slate-500 mb-3">
            Examples: "Generate PPT", "Explain what I just learned", "Make notes", "Create flashcards"
          </p>
          <form onSubmit={handleCommandSubmit} className="flex gap-2">
            <input
              type="text"
              autoFocus
              placeholder="Type your command..."
              value={commandText}
              onChange={(e) => setCommandText(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-500"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-sm"
            >
              Execute
            </button>
          </form>
        </div>
      )}
    </header>
  );
};
