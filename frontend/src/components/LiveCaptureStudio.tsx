import React, { useState } from 'react';
import { 
  Radio, 
  Eye, 
  Mic, 
  Square, 
  Play, 
  Layers, 
  Sparkles, 
  FileText,
  Clock,
  CheckCircle2,
  ExternalLink,
  Camera,
  Download,
  ShieldCheck,
  User,
  Zap,
  FastForward,
  Copy,
  Check
} from 'lucide-react';
import { FrameCapture, TranscriptSegment, LearningSession } from '../types';

interface LiveCaptureStudioProps {
  session: LearningSession;
  isCapturing: boolean;
  onStartCapture: () => void;
  onStopCapture: () => void;
  onForceCapture?: () => void;
  onInstantSlidePdf?: () => void;
  onFinishAndTeach?: () => void;
  onOpenAutoPilotModal?: () => void;
  recentFrames: FrameCapture[];
  recentSegments: TranscriptSegment[];
  onOpenSlidePreview: (frameId: string) => void;
}

export const LiveCaptureStudio: React.FC<LiveCaptureStudioProps> = ({
  session,
  isCapturing,
  onStartCapture,
  onStopCapture,
  onForceCapture,
  onInstantSlidePdf,
  onFinishAndTeach,
  onOpenAutoPilotModal,
  recentFrames,
  recentSegments,
  onOpenSlidePreview,
}) => {
  const [copiedSpeed, setCopiedSpeed] = useState<string | null>(null);
  const [capturedFlash, setCapturedFlash] = useState(false);

  const handleTriggerForceCapture = () => {
    if (onForceCapture) {
      onForceCapture();
      setCapturedFlash(true);
      setTimeout(() => setCapturedFlash(false), 1600);
    }
  };

  const handleCopySpeed = (spd: string) => {
    const script = `/* LearnLens AI Turbo Speed */ (function(){ const spd = ${spd}; document.querySelectorAll('video').forEach(v => { v.playbackRate = spd; v.play(); }); console.log('[LearnLens AI] Video playback speed set to ' + spd + 'x'); })();`;
    navigator.clipboard?.writeText(script);
    setCopiedSpeed(spd);
    setTimeout(() => setCopiedSpeed(null), 3500);
  };
  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-6">
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              <span className={`w-2 h-2 rounded-full ${isCapturing ? 'bg-red-500 animate-ping' : 'bg-slate-400'}`} />
              {isCapturing ? 'OBSERVING TAB' : 'CAPTURE IDLE'}
            </span>
            {isCapturing && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-medium">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Background Worker Active (Runs while you work in other apps)
              </span>
            )}
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Multimodal Observation Studio</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multimodal observation stream: Audio transcription, smart scene deduplication, OCR, and concept synthesis.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isCapturing && onForceCapture && (
            <button
              onClick={handleTriggerForceCapture}
              title="Manually force screenshot of current slide now"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 ${
                capturedFlash
                  ? 'bg-emerald-600 text-white border border-emerald-700'
                  : 'bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700'
              }`}
            >
              {capturedFlash ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Slide Captured!</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Capture Slide Now</span>
                </>
              )}
            </button>
          )}

          {onInstantSlidePdf && recentFrames.length > 0 && (
            <button
              onClick={onInstantSlidePdf}
              title="Generate and download 16:9 full-bleed slide PDF in 1 click"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Instant 16:9 PDF ({recentFrames.length})
            </button>
          )}

          {isCapturing ? (
            <button
              onClick={onStopCapture}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              Stop Capture
            </button>
          ) : (
            <button
              onClick={onStartCapture}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Start Chrome Observation
            </button>
          )}
        </div>
      </div>

      {/* ⚡ Autonomous Chrome Tab Auto-Pilot Controller Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 border border-indigo-800/50 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                <Zap className="w-3.5 h-3.5 fill-amber-300" />
                AUTONOMOUS TAB AUTO-PILOT
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-medium">
                Auto-Next Armed (Coursera, YouTube, Udemy)
              </span>
              {isCapturing && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 text-[11px] font-medium">
                  Background Scraping Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 max-w-xl">
              Leave this running in the background while you work in other apps. LearnLens captures every slide change, transcribes speaker audio, and auto-advances the playlist.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Speed Turbo Pills */}
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 flex items-center gap-1">
                <FastForward className="w-3 h-3 text-amber-400" />
                Turbo:
              </span>
              {['2x', '4x', '8x', '16x'].map((spd) => (
                <button
                  key={spd}
                  onClick={() => handleCopySpeed(spd.replace('x', ''))}
                  title={`Copy ${spd} speed script for Chrome Tab`}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    copiedSpeed === spd.replace('x', '')
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-700/60 hover:bg-amber-500 hover:text-slate-950 text-slate-200'
                  }`}
                >
                  {copiedSpeed === spd.replace('x', '') ? '✓' : spd}
                </button>
              ))}
            </div>

            {/* Quick Finish & Teach Me */}
            {onFinishAndTeach && (
              <button
                onClick={onFinishAndTeach}
                title="Stop capture and have AI Teacher synthesize all lecture slides and concepts"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Finish & Teach Me Now
              </button>
            )}

            {onOpenAutoPilotModal && (
              <button
                onClick={onOpenAutoPilotModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 border border-indigo-400/30 text-white text-xs font-semibold transition-all active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                Auto Menu
              </button>
            )}
          </div>
        </div>

        {copiedSpeed && (
          <div className="mt-2 text-[11px] text-amber-300 flex items-center gap-1.5 bg-amber-950/40 px-3 py-1 rounded-lg border border-amber-500/30">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            Copied {copiedSpeed}x speed script to clipboard! Paste in Chrome Tab console (F12) to accelerate video.
          </div>
        )}
      </div>

      {/* Main Grid: Stream Monitor & Live Transcripts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Capture Visual Monitor (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2">
              <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Eye className="w-4 h-4 text-brand-600" />
                Authorized Display Source Monitor
              </span>
              <span className="font-mono text-[11px] text-brand-600 font-medium">1280 × 720 • 30 FPS</span>
            </div>

            {/* Video Canvas Placeholder / Active Reel */}
            <div className="relative w-full aspect-video rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center overflow-hidden group">
              {recentFrames.length > 0 ? (
                <img
                  src={`/api/frames/${recentFrames[recentFrames.length - 1].id}/image`}
                  alt="Live Capture"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 mx-auto flex items-center justify-center text-slate-400 shadow-sm">
                    <Radio className="w-6 h-6 animate-pulse text-brand-500" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-800">Observation Stream Ready</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                      Click "Start Chrome Observation" to share an educational tab (YouTube, Coursera, Fortinet, etc.)
                    </p>
                  </div>
                </div>
              )}

              {/* Status Overlay */}
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="px-2 py-1 rounded-md bg-white/90 backdrop-blur text-[10px] font-mono text-emerald-700 border border-emerald-300 shadow-sm">
                  {recentFrames.length > 0 ? `Captured: ${recentFrames[recentFrames.length - 1].timestamp_formatted}` : '00:00'}
                </span>
                {recentFrames.length > 0 && (
                  <span className="px-2 py-1 rounded-md bg-white/90 backdrop-blur text-[10px] font-bold text-brand-700 border border-brand-300 shadow-sm">
                    {recentFrames[recentFrames.length - 1].category}
                  </span>
                )}
              </div>
            </div>

            {/* Pipeline Stage Indicators */}
            <div className="grid grid-cols-4 gap-2 pt-2 text-[11px] text-center font-mono">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-slate-500 text-[10px]">1. Audio</p>
                <p className="text-emerald-700 font-semibold">Whisper Active</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-slate-500 text-[10px]">2. Scene Diff</p>
                <p className="text-teal-700 font-semibold">dHash Filter</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-slate-500 text-[10px]">3. Vision/OCR</p>
                <p className="text-indigo-700 font-semibold">Auto Extract</p>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-slate-500 text-[10px]">4. Knowledge</p>
                <p className="text-brand-700 font-semibold">RAG Grounded</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Streaming Transcript (5 cols) */}
        <div className="lg:col-span-5 flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm p-4 h-[440px]">
          <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-2 mb-3">
            <span className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Mic className="w-4 h-4 text-emerald-600" />
              Live Speech Transcription
            </span>
            <span className="text-[11px] font-mono text-slate-500">{recentSegments.length} Segments</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {recentSegments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs space-y-2">
                <Clock className="w-8 h-8 stroke-1 text-slate-400" />
                <p className="font-medium text-slate-700">Awaiting speech audio stream...</p>
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600 max-w-xs text-left space-y-1">
                  <p className="font-semibold text-slate-800">💡 Audio Setup Tips:</p>
                  <p>• In the Chrome share dialog, select <strong>"Chrome Tab"</strong> and make sure <strong>"Also share tab audio"</strong> is checked.</p>
                  <p>• Both the meeting speaker and your microphone will be transcribed with speaker identification!</p>
                </div>
              </div>
            ) : (
              recentSegments.map((seg) => {
                const isStudent = seg.speaker?.toLowerCase().includes('you') || seg.speaker?.toLowerCase().includes('student');
                return (
                  <div key={seg.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold ${
                        isStudent 
                          ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        <User className="w-2.5 h-2.5" />
                        {seg.speaker || 'Instructor'}
                      </span>
                      <span className="font-mono text-slate-400">[{seg.timestamp_formatted}]</span>
                    </div>
                    <p className="text-slate-800 leading-relaxed font-normal pt-0.5">{seg.text}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Smart Deduplicated Frames Strip */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Layers className="w-4 h-4 text-indigo-600" />
            Smart Deduplicated Visual Evidence Reel ({recentFrames.length} Slides)
          </span>
          <span className="text-[11px] text-slate-500">Perceptual similarity filtered (Zero redundant frames)</span>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto py-2 scrollbar-thin">
          {recentFrames.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 italic">No slides captured yet</p>
          ) : (
            recentFrames.map((f) => (
              <div
                key={f.id}
                onClick={() => onOpenSlidePreview(f.id)}
                className="w-52 shrink-0 rounded-xl bg-slate-50 border border-slate-200 hover:border-brand-500 p-2 cursor-pointer transition-all group shadow-sm hover:shadow"
              >
                <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-200 mb-2">
                  <img
                    src={`/api/frames/${f.id}/thumbnail`}
                    alt="Slide"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-white/90 text-[10px] font-mono font-semibold text-brand-700 shadow-sm border border-slate-200">
                    {f.timestamp_formatted}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold text-teal-700">{f.category}</span>
                    <span className="text-slate-400 font-mono">{(f.importance_score * 100).toFixed(0)}% imp</span>
                  </div>
                  <p className="text-[11px] text-slate-700 truncate">{f.visual_description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
