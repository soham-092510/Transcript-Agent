import React, { useState } from 'react';
import { 
  GraduationCap, 
  ShieldCheck, 
  Check, 
  X, 
  Layers, 
  Monitor, 
  AppWindow, 
  Play,
  Lock
} from 'lucide-react';

interface StartLearningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmStart: (title: string, platform: string) => void;
}

const PLATFORMS = [
  'Chrome Tab',
  'YouTube',
  'Coursera',
  'Fortinet Training Institute',
  'Forage',
  'Udemy',
  'DeepLearning.AI',
  'Documentation / Lecture'
];

export const StartLearningModal: React.FC<StartLearningModalProps> = ({
  isOpen,
  onClose,
  onConfirmStart,
}) => {
  const [sessionTitle, setSessionTitle] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('Chrome Tab');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = sessionTitle.trim() || `${selectedPlatform} Learning Session`;
    onConfirmStart(title, selectedPlatform);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
      <div className="glass-panel border border-white/10 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative text-slate-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-slate-700 flex items-center justify-center text-white shadow-metallic-subtle border border-slate-600">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Start New Learning Session</h3>
              <p className="text-xs text-slate-400">Show your AI what you are learning</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Session Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Session Name / Course Module:</label>
            <input
              type="text"
              required
              placeholder="e.g. Fortinet NSE 2 - Module 2: Firewalls"
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-sky-400 shadow-xs border border-slate-700"
            />
          </div>

          {/* Educational Platform Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Source Platform / Environment:</label>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setSelectedPlatform(p)}
                  className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                    selectedPlatform === p
                      ? 'bg-slate-800 border-sky-400/50 text-sky-400 font-semibold shadow-metallic-subtle'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Explicit Screen Sharing Notice (Prompt Section 1) */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-sky-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              Native Browser Authorization Picker
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              When you click authorize below, Chrome will display the native picker (just like Google Meet).
              Choose <b>Chrome Tab</b> with <b>Share tab audio</b> enabled.
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1 border-t border-slate-800">
              <Lock className="w-3 h-3 text-sky-400" />
              Local-first privacy: Never silently captures screen. No passwords or tokens accessed.
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl metallic-accent-btn text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-metallic-subtle transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              Authorize & Start
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
