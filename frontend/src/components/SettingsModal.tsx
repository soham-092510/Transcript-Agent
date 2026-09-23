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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 flex items-center justify-center font-bold">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">System & AI Engine Preferences</h3>
              <p className="text-[11px] text-slate-500">Configure real-time capture and Ollama synthesis speed</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-slate-700">
          {/* Zero-Lag Fast Mode Card */}
          <div className={`p-4 rounded-xl border transition-all ${
            fastMode 
              ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/30' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Zap className="w-4 h-4 text-emerald-600 fill-emerald-500" />
                  <span>Zero-Lag Grounded Mode (Recommended)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold">
                    0.0s Lag
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed pr-4">
                  Uses instant grounded knowledge synthesis from live lecture transcripts and OCR slides. 
                  Prevents local Ollama models from pegging CPU at 100% and eliminates video freezing during live meetings.
                </p>
              </div>
              <input
                type="checkbox"
                checked={fastMode}
                onChange={(e) => setFastMode(e.target.checked)}
                className="mt-1 w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
              />
            </div>
          </div>

          {/* Model Selector Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Server className="w-4 h-4 text-indigo-600" />
              <span>Installed Ollama Model</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Select which local Ollama model to use for deep queries when Fast Mode is disabled.
            </p>

            {installedModels.length > 0 ? (
              <select
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {installedModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>No local models found on http://localhost:11434. Running in grounded mode.</span>
              </div>
            )}
          </div>

          {/* Pipeline Features */}
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <div>
                <p className="font-semibold text-slate-800">Web Speech STT</p>
                <p className="text-slate-500 text-[10px]">Native hardware-accelerated</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <div>
                <p className="font-semibold text-slate-800">dHash Deduplication</p>
                <p className="text-slate-500 text-[10px]">Perceptual slide filter (&lt;15ms)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            onClick={loadSettings}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-white text-xs font-semibold shadow-sm transition-all ${
                savedSuccess ? 'bg-emerald-600' : 'bg-brand-600 hover:bg-brand-700'
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
