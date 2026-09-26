import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings as SettingsIcon, 
  Zap, 
  Cpu, 
  Sliders, 
  Check, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle,
  Server
} from 'lucide-react';
import { api } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [fastMode, setFastMode] = useState(true);
  const [defaultModel, setDefaultModel] = useState('qwen2.5:latest');
  const [installedModels, setInstalledModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSystemSettings();
      setFastMode(data.fast_mode);
      setDefaultModel(data.default_llm_model);
      setInstalledModels(data.installed_models || []);
    } catch (e) {
      console.warn('Could not load settings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await api.updateSystemSettings({
        fast_mode: fastMode,
        default_model: defaultModel
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="w-full max-w-lg rounded-2xl glass-panel border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-sky-400 flex items-center justify-center font-bold shadow-metallic-subtle">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">System & AI Engine Preferences</h3>
              <p className="text-[11px] text-slate-400">Configure real-time capture and Ollama synthesis speed</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-300">
          {/* Zero-Lag Fast Mode Card */}
          <div className={`p-4 rounded-xl border transition-all ${
            fastMode 
              ? 'bg-slate-800/80 border-sky-400/40 ring-1 ring-sky-500/30' 
              : 'bg-slate-900/60 border-slate-800'
          }`}>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-100">
                  <Zap className="w-4 h-4 text-sky-400 fill-sky-400" />
                  <span>Zero-Lag Grounded Mode (Recommended)</span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/30 text-[10px] font-mono font-bold">
                    0.0s Lag
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed pr-4">
                  Uses instant grounded knowledge synthesis from live lecture transcripts and OCR slides. 
                  Prevents local Ollama models from pegging CPU at 100% and eliminates video freezing during live meetings.
                </p>
              </div>
              <input
                type="checkbox"
                checked={fastMode}
                onChange={(e) => setFastMode(e.target.checked)}
                className="mt-1 w-5 h-5 rounded text-sky-400 focus:ring-sky-500 cursor-pointer accent-sky-500"
              />
            </div>
          </div>

          {/* Model Selector Card */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-100">
              <Server className="w-4 h-4 text-slate-300" />
              <span>Installed Ollama Model</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Select which local Ollama model to use for deep queries when Fast Mode is disabled.
            </p>

            {installedModels.length > 0 ? (
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className="w-full glass-input rounded-lg px-3 py-2 text-xs font-mono font-semibold text-slate-100 focus:outline-none focus:border-sky-400 border border-slate-700 bg-slate-900"
              >
                {installedModels.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-slate-200">{m}</option>
                ))}
              </select>
            ) : (
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>No local models found on http://localhost:11434. Running in grounded mode.</span>
              </div>
            )}
          </div>

          {/* Pipeline Features */}
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <div>
                <p className="font-semibold text-slate-200">Web Speech STT</p>
                <p className="text-slate-400 text-[10px]">Native hardware-accelerated</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-300" />
              <div>
                <p className="font-semibold text-slate-200">dHash Deduplication</p>
                <p className="text-slate-400 text-[10px]">Perceptual slide filter (&lt;15ms)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-transparent flex items-center justify-between">
          <button
            onClick={loadSettings}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-xs font-semibold shadow-metallic-subtle transition-all cursor-pointer ${
                savedSuccess ? 'bg-emerald-600' : 'metallic-accent-btn'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Saved!
                </>
              ) : (
                'Save Preferences'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
