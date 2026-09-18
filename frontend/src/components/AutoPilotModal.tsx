import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  X, 
  FolderPlus, 
  FileVideo, 
  CheckCircle2, 
  Loader2, 
  Play, 
  FileText, 
  Presentation, 
  Sparkles, 
  ExternalLink,
  ChevronRight,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';

interface AutoPilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreatedAndLoaded: (sessionId: string) => void;
  onQuickTeachPrompt: (promptText: string) => void;
}

export const AutoPilotModal: React.FC<AutoPilotModalProps> = ({
  isOpen,
  onClose,
  onSessionCreatedAndLoaded,
  onQuickTeachPrompt,
}) => {
  const [activeTab, setActiveTab] = useState<'batch' | 'autonext' | 'teach'>('batch');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressData, setProgressData] = useState<{
    is_running: boolean;
    current_video_idx: number;
    total_videos: number;
    current_video_name: string;
    progress_pct: number;
    total_slides_captured: number;
    speed_multiplier: string;
    status_message: string;
    session_id: string | null;
  }>({
    is_running: false,
    current_video_idx: 0,
    total_videos: 0,
    current_video_name: '',
    progress_pct: 0,
    total_slides_captured: 0,
    speed_multiplier: '65x Realtime',
    status_message: 'Idle',
    session_id: null
  });

  const [lastPdfUrl, setLastPdfUrl] = useState<string | null>(null);
  const [lastPptxUrl, setLastPptxUrl] = useState<string | null>(null);
  const [completedSessionId, setCompletedSessionId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<number | null>(null);

  // Poll status while running
  useEffect(() => {
    if (isProcessing) {
      pollIntervalRef.current = window.setInterval(async () => {
        try {
          const st = await api.getHyperIngestStatus();
          setProgressData(st);
          if (!st.is_running && st.progress_pct >= 100 && st.session_id) {
            setIsProcessing(false);
            setCompletedSessionId(st.session_id);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            // Auto generate slide PDF & PPTX
            handleGenerateExports(st.session_id);
          }
        } catch (e) {
          console.warn('Status poll error:', e);
        }
      }, 1000);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isProcessing]);

  if (!isOpen) return null;

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files).sort((a, b) => a.name.localeCompare(b.name));
      setSelectedFiles(filesArr);
      if (!courseTitle && filesArr.length > 0) {
        setCourseTitle(filesArr[0].name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ") + " Course");
      }
    }
  };

  const handleStartHyperIngest = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setLastPdfUrl(null);
    setLastPptxUrl(null);

    try {
      const res = await api.hyperIngestVideos(selectedFiles, courseTitle || undefined);
      if (res.session_id) {
        setCompletedSessionId(res.session_id);
        setIsProcessing(false);
        await handleGenerateExports(res.session_id);
      }
    } catch (e: any) {
      console.error('HyperIngest error:', e);
      setIsProcessing(false);
    }
  };

  const handleGenerateExports = async (sessId: string) => {
    try {
      const [pdfRes, pptxRes] = await Promise.all([
        api.exportSlideOnlyPdf(sessId),
        api.exportSlideOnlyPptx(sessId)
      ]);
      if (pdfRes && pdfRes.download_url) setLastPdfUrl(pdfRes.download_url);
      if (pptxRes && pptxRes.download_url) setLastPptxUrl(pptxRes.download_url);
    } catch (err) {
      console.warn('Auto export note:', err);
    }
  };

  const handleOpenMasterCourse = () => {
    if (completedSessionId) {
      onSessionCreatedAndLoaded(completedSessionId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-brand-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 tracking-tight">Auto Feature • HyperIngest Studio</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                  10-15 MIN MODE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Complete 11-hour / 100-video courses autonomously, capture video-size slide changes, and generate instant slide decks.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-6 pt-2 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('batch')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'batch'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            10-15 Min HyperIngest (Multi-Video / Folder)
          </button>

          <button
            onClick={() => setActiveTab('autonext')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'autonext'
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            Hands-Free Auto-Next (Coursera / YouTube)
          </button>

          <button
            onClick={() => setActiveTab('teach')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'teach'
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Master Course Briefing
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: 10-15 MIN HYPERINGEST */}
          {activeTab === 'batch' && (
            <div className="space-y-5">
              {/* Hidden multi-file input */}
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="video/mp4,video/webm,video/mkv,video/quicktime"
                onChange={handleFilesSelected}
                className="hidden"
              />

              {/* Upload Dropzone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-amber-500 mx-auto flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform mb-3">
                  <FolderPlus className="w-6 h-6" />
                </div>
                <h4 className="text-xs font-bold text-slate-800">
                  Select Multiple Video Files or Course Folder
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                  Hold Ctrl/Shift to select 10 to 100+ videos at once (.mp4, .mkv, .webm). The engine will process all lectures at 50x-100x accelerated hardware speed.
                </p>

                {selectedFiles.length > 0 && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{selectedFiles.length} video lectures queued for accelerated ingest</span>
                  </div>
                )}
              </div>

              {/* Course Title Optional */}
              {selectedFiles.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Master Course Title
                  </label>
                  <input
                    type="text"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="e.g., Coursera Machine Learning - Full 11-Hour Specialization"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                  />
                </div>
              )}

              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left">
                  <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    10–15 Min Speed
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug">
                    Non-linear keyframe seeking scans 11 hours in minutes, skipping dead video.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs mb-1">
                    <Layers className="w-3.5 h-3.5" />
                    Slide Changes Only
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug">
                    Perceptual dHash captures only true slide & diagram transitions at native 16:9.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-left">
                  <div className="flex items-center gap-1.5 text-brand-700 font-bold text-xs mb-1">
                    <Presentation className="w-3.5 h-3.5" />
                    Video-Size Deck
                  </div>
                  <p className="text-[10px] text-slate-500 leading-snug">
                    Full-bleed 16:9 PDF and PPTX slide presentation matching exact video resolution.
                  </p>
                </div>
              </div>

              {/* Live Processing Card */}
              {isProcessing && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                      <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                      <span>{progressData.status_message}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-800">
                      {progressData.progress_pct}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-amber-200/60 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${progressData.progress_pct}%` }}
                    />
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="bg-white/80 p-2 rounded-lg border border-amber-200/50">
                      <span className="text-slate-400 block text-[10px]">Processing Video</span>
                      <span className="font-bold text-slate-800 font-mono">
                        {progressData.current_video_idx} / {progressData.total_videos || selectedFiles.length}
                      </span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-amber-200/50">
                      <span className="text-slate-400 block text-[10px]">Slide Changes</span>
                      <span className="font-bold text-emerald-600 font-mono">
                        {progressData.total_slides_captured} Captured
                      </span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-lg border border-amber-200/50">
                      <span className="text-slate-400 block text-[10px]">Ingest Speed</span>
                      <span className="font-bold text-brand-600 font-mono">
                        {progressData.speed_multiplier}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Completed Outputs & Actions */}
              {completedSessionId && !isProcessing && (
                <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-5 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>HyperIngest Complete! 100% Course Synthesized & Ready</span>
                  </div>

                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {lastPdfUrl && (
                      <a
                        href={lastPdfUrl}
                        download
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-bold shadow-xs transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Download 16:9 Slide PDF (Video Size Only)
                      </a>
                    )}

                    {lastPptxUrl && (
                      <a
                        href={lastPptxUrl}
                        download
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-bold shadow-xs transition-colors"
                      >
                        <Presentation className="w-3.5 h-3.5" />
                        Download 16:9 Slide PPTX
                      </a>
                    )}

                    <button
                      onClick={handleOpenMasterCourse}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer ml-auto"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Open Master Course & Teach Me
                    </button>
                  </div>
                </div>
              )}

              {/* Action Button */}
              {!isProcessing && !completedSessionId && (
                <button
                  onClick={handleStartHyperIngest}
                  disabled={selectedFiles.length === 0}
                  className={`w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all ${
                    selectedFiles.length > 0
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/25 cursor-pointer active:scale-98'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Zap className="w-4 h-4 fill-current" />
                  <span>Start Accelerated Course HyperIngest (10-15 Min)</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 2: BROWSER AUTO-NEXT */}
          {activeTab === 'autonext' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-brand-900">
                  <Play className="w-4 h-4 text-brand-600" />
                  <span>Hands-Free Auto-Next for Web Players</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Watching Coursera, YouTube Playlists, or Udemy online? LearnLens AI can automatically advance to the next lecture as soon as a video finishes, allowing you to walk away while the AI records and learns the entire curriculum.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  How to Enable Hands-Free Continuous Play:
                </h4>
                
                <div className="space-y-2 text-xs text-slate-700">
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">Start Chrome Observation</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Click "Start Learning" and select the Chrome tab where your playlist is playing.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">Turn On Platform Autoplay</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Ensure the platform's native Autoplay toggle is turned ON (or use the LearnLens Chrome Extension in <code>/extension</code> to bypass "Are you still watching?" prompts).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="w-5 h-5 rounded-full bg-brand-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <p className="font-bold text-slate-800">Automatic Slide Capture & Completion</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        LearnLens AI takes screenshots automatically whenever a slide changes, continuously indexing knowledge across video after video without requiring you to click "Next".
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI MASTER COURSE TEACHER */}
          {activeTab === 'teach' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Interactive Teaching in Text & High-Res Screenshots</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Once your course is ingested, you don't need to spend 11 hours watching. Ask the AI teacher to break down the course with text definitions and exact slide screenshots.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  One-Click Instant Master Course Prompts:
                </h4>

                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => {
                      onQuickTeachPrompt("Give me a comprehensive 10-minute executive briefing of this entire course. Explain key concepts in text and embed the exact slide screenshots.");
                      onClose();
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/30 text-left transition-all group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-800">
                        "10-Minute Executive Course Briefing (with Screenshots)"
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Summarizes all modules into core principles, definitions, and high-yield slides.
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      onQuickTeachPrompt("Walk me through every major visual slide change in chronological order, explaining the architectural diagram and meaning of each slide.");
                      onClose();
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/30 text-left transition-all group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-amber-800">
                        "Slide-by-Slide Visual Walkthrough"
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Reviews each unique slide transition and teaches the underlying diagram or table.
                    </p>
                  </button>

                  <button
                    onClick={() => {
                      onQuickTeachPrompt("Test me with a 10-question high-yield practice quiz covering all topics from this course, with explanations and slide evidence for every question.");
                      onClose();
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-brand-500 bg-white hover:bg-brand-50/30 text-left transition-all group cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 group-hover:text-brand-800">
                        "Comprehensive Course Practice Exam"
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Tests your knowledge retention across all 100 lectures with instant grading.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-400">
          <span>Non-linear Keyframe Extraction • 100% Local Processing</span>
          <span>16:9 Full-Bleed Video Resolution</span>
        </div>

      </div>
    </div>
  );
};
