import React from 'react';
import { 
  Pause, 
  Play, 
  Square, 
  Check, 
  Video, 
  User, 
  Radio
} from 'lucide-react';
import { LearningSession } from '../types';

interface HumanControlBarProps {
  activeSession: LearningSession | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onSendCommand?: (cmd: string) => void;
  onOpenAutoPilot?: () => void;
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
  visualEnabled,
  audioEnabled,
}) => {
  const isPaused = activeSession?.status === 'PAUSED';

  return (
    <header className="h-16 bg-slate-900/60 backdrop-blur-xl border-b border-white/10 px-5 flex items-center justify-between z-20 shrink-0 shadow-2xl select-none">
      
      {/* LEFT: BRAND LOGO & TAGLINE MATCHING REFERENCE */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#00D9FF] to-[#8B5CF6] flex items-center justify-center shadow-neon-blue text-white">
            <Video className="w-4 h-4 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-sm text-[#F0F9FF] tracking-tight">
                LearnLens AI
              </h1>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Watch • Listen • Learn • Grow
            </p>
          </div>
        </div>

        {/* Vertical divider */}
        <div className="h-7 w-[1px] bg-white/10 hidden md:block" />

        {/* CENTER-LEFT: ACTIVE SESSION TITLE & SOURCE PILL */}
        <div className="hidden md:flex flex-col">
          <h2 className="text-xs font-bold text-[#F0F9FF] truncate max-w-sm">
            {activeSession ? activeSession.title : 'Advanced Network Security (TLS 1.3)'}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <svg className="w-3.5 h-3.5 fill-red-500" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span>YouTube • Chrome Tab</span>
            </span>
          </div>
        </div>
      </div>

      {/* CENTER-RIGHT & RIGHT CONTROLS */}
      <div className="flex items-center gap-5">
        
        {/* Observational Status Indicator & Telemetry Checks */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-[#00D9FF]'} animate-pulse shadow-neon-blue`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isPaused ? 'text-amber-400' : 'text-[#00D9FF]'}`}>
              {isPaused ? 'PAUSED' : 'OBSERVING'}
            </span>
            <span className="text-[11px] font-mono text-slate-400 ml-0.5">
              04:18
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              <span>Audio</span>
              <Check className="w-3 h-3 text-[#00D9FF] stroke-[2.5]" />
            </span>
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              <span>Vision</span>
              <Check className="w-3 h-3 text-[#00D9FF] stroke-[2.5]" />
            </span>
            <span className="flex items-center gap-1 text-slate-300 font-medium">
              <span>RAG</span>
              <Check className="w-3 h-3 text-[#00D9FF] stroke-[2.5]" />
            </span>
          </div>
        </div>

        {/* Action Buttons: Pause & Stop */}
        <div className="flex items-center gap-2">
          {isPaused ? (
            <button
              onClick={onResume}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-400/40 text-slate-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Play className="w-3 h-3 fill-current text-[#00D9FF]" />
              <span>Resume</span>
            </button>
          ) : (
            <button
              onClick={onPause}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-400/40 text-slate-200 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Pause className="w-3 h-3 text-slate-300" />
              <span>Pause</span>
            </button>
          )}

          <button
            onClick={onStop}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-500/80 hover:bg-rose-500 border border-rose-400/40 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Stop</span>
          </button>
        </div>

        {/* User Profile Avatar matching reference image */}
        <div className="flex items-center pl-1 border-l border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00D9FF] to-[#8B5CF6] text-white flex items-center justify-center font-bold text-xs shadow-neon-purple border border-white/20 overflow-hidden">
            <span className="text-sm">🧔</span>
          </div>
        </div>
      </div>
    </header>
  );
};
