import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  Maximize2, 
  Settings as SettingsIcon, 
  Subtitles, 
  Mic, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Paperclip, 
  Send, 
  Bot, 
  FileText, 
  CheckCircle2, 
  Layers, 
  Clock, 
  HelpCircle, 
  BookOpen, 
  BrainCircuit, 
  Eye, 
  Presentation, 
  Flame, 
  Share2, 
  Lightbulb, 
  Target, 
  GraduationCap,
  Calendar,
  X,
  Radio
} from 'lucide-react';
import { 
  LearningSession, 
  FrameCapture, 
  TranscriptSegment, 
  Concept, 
  ChatMessage 
} from '../types';
import { mediaCaptureManager } from '../services/mediaCapture';

interface ModernStudioLayoutProps {
  session: LearningSession | null;
  isCapturing: boolean;
  onStartCapture: () => void | Promise<any>;
  onStopCapture: () => void;
  onForceCapture?: () => void;
  recentFrames: FrameCapture[];
  recentSegments: TranscriptSegment[];
  /** Full text accumulated so far in the current 60-second window (not yet committed) */
  interimTranscript: string;
  /** Single word/phrase being spoken right now (Web Speech API interim result) */
  interimWordTicker?: string;
  concepts: Concept[];
  chatMessages: ChatMessage[];
  isChatLoading: boolean;
  onSendMessage: (msg: string, mode?: any) => Promise<void>;
  onOpenSlidePreview: (frameId: string) => void;
  onNavigateTab: (tab: string) => void;
  onGeneratePPT: (style?: any, slideCount?: any) => void | Promise<any>;
  onGeneratePDF: (type: any) => void | Promise<any>;
  onTakeQuiz: () => void;
}

export const ModernStudioLayout: React.FC<ModernStudioLayoutProps> = ({
  session,
  isCapturing,
  onStartCapture,
  onStopCapture,
  onForceCapture,
  recentFrames,
  recentSegments,
  interimTranscript,
  interimWordTicker = '',
  concepts,
  chatMessages,
  isChatLoading,
  onSendMessage,
  onOpenSlidePreview,
  onNavigateTab,
  onGeneratePPT,
  onGeneratePDF,
  onTakeQuiz,
}) => {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [carouselOffset, setCarouselOffset] = useState(0);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Hook live video preview when capturing
  useEffect(() => {
    if (isCapturing && videoPreviewRef.current) {
      const stream = mediaCaptureManager.getMediaStream();
      if (stream) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(e => console.warn('Video preview play note:', e));
      }
    }
  }, [isCapturing]);

  // Keep active slide index pointing to newest captured frame if user hasn't overridden
  useEffect(() => {
    if (recentFrames.length > 0) {
      setActiveSlideIndex(recentFrames.length - 1);
    }
  }, [recentFrames.length]);

  // Auto scroll transcript to bottom
  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [recentSegments, interimTranscript]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  const activeFrame = recentFrames[activeSlideIndex] || (recentFrames.length > 0 ? recentFrames[recentFrames.length - 1] : null);

  const handleSendPrompt = (promptText?: string) => {
    const textToSend = promptText || inputQuestion;
    if (!textToSend.trim() || isChatLoading) return;
    onSendMessage(textToSend.trim(), 'simple');
    setInputQuestion('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  // Quick Action Prompt Cards for AI Teacher
  const quickActions = [
    {
      title: 'Explain this concept',
      desc: 'Break down complex topics',
      icon: Lightbulb,
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      prompt: 'Explain the core concept shown on the current lecture slide in simple terms with a clear real-world analogy.'
    },
    {
      title: 'Create a quiz',
      desc: 'Test your understanding',
      icon: Target,
      iconBg: 'bg-cyan-500/10 text-[#00D9FF] border-cyan-500/20',
      prompt: 'Generate a 3-question multiple-choice practice quiz testing the key principles of this topic.'
    },
    {
      title: 'Generate flashcards',
      desc: 'Key concepts in seconds',
      icon: Layers,
      iconBg: 'bg-purple-500/10 text-[#C084FC] border-purple-500/20',
      prompt: 'Create 5 active-recall flashcards with question and answer pairs covering this lecture.'
    },
    {
      title: 'Summarize this lecture',
      desc: 'Quick and clear summary',
      icon: FileText,
      iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      prompt: 'Summarize all the key takeaways and architectural principles covered in this lecture so far.'
    },
    {
      title: 'Create a study plan',
      desc: 'Personalized learning path',
      icon: Calendar,
      iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      prompt: 'Design a structured 3-day study plan with revision exercises to master this material.'
    }
  ];

  // Dummy fallback frames if session has no frames yet (for pixel-perfect initial rendering)
  const displayFrames = recentFrames.length > 0 ? recentFrames : [
    { id: 'f1', session_id: '1', timestamp_sec: 80, timestamp_formatted: '01:20', image_path: '', visual_description: 'What is TLS 1.3?', category: 'SLIDE' as any, importance_score: 0.9, ocr_text: 'TLS 1.3 Protocol Basics', is_pinned: false, concepts: ['TLS 1.3'] },
    { id: 'f2', session_id: '1', timestamp_sec: 134, timestamp_formatted: '02:14', image_path: '', visual_description: 'Handshake Flow', category: 'SLIDE' as any, importance_score: 0.92, ocr_text: 'Handshake Message Sequence', is_pinned: false, concepts: ['Handshake'] },
    { id: 'f3', session_id: '1', timestamp_sec: 188, timestamp_formatted: '03:08', image_path: '', visual_description: 'Key Exchange', category: 'SLIDE' as any, importance_score: 0.95, ocr_text: 'Diffie-Hellman Key Exchange', is_pinned: false, concepts: ['Key Exchange'] },
    { id: 'f4', session_id: '1', timestamp_sec: 258, timestamp_formatted: '04:18', image_path: '', visual_description: 'TLS 1.3 Architecture', category: 'DIAGRAM' as any, importance_score: 0.98, ocr_text: 'TLS 1.3 Architecture & Handshake', is_pinned: true, concepts: ['Architecture', '0-RTT'] },
    { id: 'f5', session_id: '1', timestamp_sec: 332, timestamp_formatted: '05:32', image_path: '', visual_description: 'Security Benefits', category: 'SLIDE' as any, importance_score: 0.88, ocr_text: 'Cipher Suites & Latency Elimination', is_pinned: false, concepts: ['Security'] }
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-transparent p-5 space-y-5">
      {/* ========================================================================= */}
      {/* 3-COLUMN UPPER STUDIO GRID                                                */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ======================================================================= */}
        {/* COLUMN 1: MAIN VIDEO / SCREEN OBSERVATION STUDIO (6 COLS / ~50%)        */}
        {/* ======================================================================= */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Main 16:9 Video Player Card */}
          <div className="relative w-full aspect-video rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden group flex flex-col justify-between">
            {/* Live Video Canvas Stream */}
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
              {isCapturing ? (
                <video
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-contain"
                />
              ) : activeFrame && activeFrame.image_path ? (
                <img
                  src={`/api/frames/${activeFrame.id}/image`}
                  alt="Captured Slide"
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={() => onOpenSlidePreview(activeFrame.id)}
                />
              ) : (
                /* Fallback Educational Graphic matching the reference mockup */
                <div className="relative w-full h-full bg-gradient-to-br from-[#0A0A1F] via-[#12122B] to-[#1A1A3A] p-6 flex flex-col justify-between text-white select-none">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/20 text-[#00D9FF] border border-cyan-400/30">
                        TLS 1.3
                      </span>
                      <span className="text-xs text-slate-400">Architecture & Handshake Flow</span>
                    </div>
                    <h2 className="text-xl font-bold text-[#F0F9FF] tracking-tight mt-2">
                      TLS 1.3 Architecture
                    </h2>
                  </div>

                  {/* Diagram Graphics Simulation */}
                  <div className="grid grid-cols-3 gap-4 items-center my-auto py-2">
                    {/* Client Box */}
                    <div className="p-3 rounded-xl bg-white/5 border border-cyan-400/20 text-center space-y-1 backdrop-blur-md">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/20 text-[#00D9FF] flex items-center justify-center mx-auto">
                        💻
                      </div>
                      <p className="text-xs font-bold text-slate-200">Client</p>
                      <span className="text-[10px] text-slate-400 font-mono">1. ClientHello</span>
                    </div>

                    {/* Handshake Arrows */}
                    <div className="space-y-2 text-center text-[10px] font-mono text-[#00D9FF]">
                      <div className="border-b border-cyan-400/50 pb-0.5">ClientHello & KeyShare →</div>
                      <div className="border-b border-purple-400/50 pb-0.5 text-[#C084FC]">← ServerHello & Parameters</div>
                      <div className="text-slate-400">════ Encrypted Session ════</div>
                    </div>

                    {/* Server Box */}
                    <div className="p-3 rounded-xl bg-white/5 border border-purple-400/20 text-center space-y-1 backdrop-blur-md">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-[#C084FC] flex items-center justify-center mx-auto">
                        🗄️
                      </div>
                      <p className="text-xs font-bold text-slate-200">Server</p>
                      <span className="text-[10px] text-slate-400 font-mono">2. Finished</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>1-RTT Standard • 0-RTT Pre-Shared Key Resumption</span>
                    <span>Ready for observation</span>
                  </div>
                </div>
              )}
            </div>

            {/* Presenter Video Inset (Picture-in-Picture in Top Right) */}
            <div className="absolute top-3 right-3 w-28 h-20 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/20 shadow-neon-purple overflow-hidden z-10 hidden sm:flex items-center justify-center">
              <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-950">
                <span className="text-2xl">👨‍🏫</span>
                <span className="text-[9px] font-semibold text-slate-300 mt-0.5">Instructor</span>
                <span className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-neon-blue" />
              </div>
            </div>

            {/* Observation / Start Indicator when not active */}
            {!isCapturing && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-10 transition-opacity">
                <button
                  onClick={onStartCapture}
                  className="neon-glow-btn flex items-center gap-2.5 px-6 py-3 rounded-xl text-white font-semibold text-xs shadow-neon-blue transition-all transform active:scale-95 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Chrome Observation</span>
                </button>
              </div>
            )}

            {/* Video Controls Bar Overlay (Bottom of Video Player) */}
            <div className="relative z-20 bg-gradient-to-t from-[#0A0A1F]/95 via-[#0A0A1F]/60 to-transparent p-3 pt-6 flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="hover:text-[#00D9FF] transition-colors cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                </button>
                <button className="hover:text-[#00D9FF] transition-colors cursor-pointer">
                  <Volume2 className="w-4 h-4" />
                </button>
                <span className="font-mono text-[11px] text-slate-300">
                  {activeFrame ? activeFrame.timestamp_formatted : '04:18'} / 42:15
                </span>
              </div>

              {/* Center Scrubber Bar */}
              <div className="flex-1 mx-4">
                <div className="w-full bg-white/10 hover:bg-white/20 h-1.5 rounded-full overflow-hidden cursor-pointer relative">
                  <div className="bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] h-full w-[38%] rounded-full relative shadow-neon-blue">
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#F0F9FF] rounded-full shadow-neon-blue" />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-slate-300">
                <button className="hover:text-[#00D9FF] transition-colors cursor-pointer" title="Closed Captions">
                  <Subtitles className="w-4 h-4" />
                </button>
                <button className="hover:text-[#00D9FF] transition-colors cursor-pointer" title="Video Quality">
                  <SettingsIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => activeFrame && onOpenSlidePreview(activeFrame.id)} 
                  className="hover:text-[#00D9FF] transition-colors cursor-pointer" 
                  title="Expand Slide"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 4 Pipeline Status Cards in a Horizontal Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-panel p-3 rounded-2xl flex items-center gap-3 hover:border-cyan-400/40 hover:shadow-neon-blue">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/30 text-[#00D9FF] flex items-center justify-center shrink-0 shadow-xs">
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AUDIO</p>
                <p className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                  <span>✓</span> Captured
                </p>
              </div>
            </div>

            <div className="glass-panel p-3 rounded-2xl flex items-center gap-3 hover:border-purple-400/40 hover:shadow-neon-purple">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-400/30 text-[#C084FC] flex items-center justify-center shrink-0 shadow-xs">
                <Eye className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">VISION</p>
                <p className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                  <span>✓</span> Captured
                </p>
              </div>
            </div>

            <div className="glass-panel p-3 rounded-2xl flex items-center gap-3 hover:border-cyan-400/40 hover:shadow-neon-blue">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0 shadow-xs">
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OCR</p>
                <p className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                  <span>✓</span> Captured
                </p>
              </div>
            </div>

            <div className="glass-panel p-3 rounded-2xl flex items-center gap-3 hover:border-purple-400/40 hover:shadow-neon-purple">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-400/30 text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">KNOWLEDGE</p>
                <p className="text-xs font-bold text-[#00D9FF] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-ping inline-block" />
                  Processing
                </p>
              </div>
            </div>
          </div>

          {/* Captured Moments Carousel Strip */}
          <div className="glass-panel p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-[#F0F9FF] tracking-tight">Captured Moments</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono font-bold border border-white/10">
                  {displayFrames.length} Slides
                </span>
              </div>
              <button 
                onClick={() => onNavigateTab('slides')}
                className="text-[11px] font-semibold text-[#00D9FF] hover:text-cyan-300 flex items-center gap-0.5 cursor-pointer"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Horizontal Slide Cards Carousel */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
              {displayFrames.slice(0, 5).map((frame, idx) => {
                const isSelected = idx === activeSlideIndex;
                return (
                  <div
                    key={frame.id || idx}
                    onClick={() => {
                      setActiveSlideIndex(idx);
                      if (frame.id) onOpenSlidePreview(frame.id);
                    }}
                    className={`w-32 shrink-0 p-1.5 rounded-xl border transition-all cursor-pointer group bg-white/5 hover:bg-white/10 ${
                      isSelected 
                        ? 'border-2 border-[#00D9FF] shadow-neon-blue bg-white/10 ring-2 ring-cyan-500/20' 
                        : 'border-white/10 hover:border-cyan-400/40'
                    }`}
                  >
                    <div className="aspect-video rounded-lg bg-black/40 overflow-hidden mb-1.5 flex items-center justify-center relative border border-white/5">
                      {frame.image_path ? (
                        <img 
                          src={`/api/frames/${frame.id}/thumbnail`} 
                          alt="Moment" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-900 to-indigo-950 flex items-center justify-center p-1 text-center">
                          <span className="text-[9px] font-bold text-slate-300 leading-tight line-clamp-2">
                            {frame.visual_description || `Slide ${idx + 1}`}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-0.5 px-0.5">
                      <p className="text-[10px] font-mono font-bold text-[#F0F9FF]">
                        {frame.timestamp_formatted || `0${idx}:20`}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate">
                        Slide {idx + 1}
                      </p>
                    </div>
                  </div>
                );
              })}

              <button 
                onClick={() => onNavigateTab('slides')}
                className="w-8 h-20 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-[#00D9FF] shrink-0 cursor-pointer"
                title="Browse all slides"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Bottom Scrubber Pill Controls */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <button className="text-slate-300 hover:text-[#00D9FF] cursor-pointer">
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
                <span className="font-mono text-[11px] text-slate-300">04:18</span>
              </div>
              <div className="flex-1 mx-3">
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] h-full w-[45%] rounded-full shadow-neon-blue" />
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                <span>42:15</span>
                <span className="text-slate-600">•</span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 font-bold text-slate-300 text-[10px]">1x</span>
                <button 
                  onClick={() => activeFrame && onOpenSlidePreview(activeFrame.id)}
                  className="hover:text-white cursor-pointer ml-1"
                >
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* COLUMN 2: LIVE SPEECH TRANSCRIPT PANEL (3 COLS / ~25%)                  */}
        {/* ======================================================================= */}
        <div className="lg:col-span-3 glass-panel rounded-2xl p-4 flex flex-col h-[585px]">
          {/* Header with Live Badge */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-[#F0F9FF] tracking-tight">Live Transcript</h3>
            </div>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-[10px] tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              Live
            </span>
          </div>

          {/* Transcript Feed Items */}
          <div
            ref={transcriptScrollRef}
            className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1 text-xs scrollbar-thin"
          >
            {recentSegments.length === 0 && !interimWordTicker ? (
              <div className="space-y-3 pt-2 text-slate-300">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                    <span>03:00</span>
                    <span className="font-semibold text-slate-300">Instructor</span>
                  </div>
                  <p className="leading-relaxed text-slate-300 text-[11px]">
                    Today we will discuss the TLS 1.3 protocol and how it improves security and performance compared to previous versions. The ClientHello contains the supported cipher suites, key share, and parameters.
                  </p>
                </div>

                <div className="space-y-1 bg-gradient-to-r from-cyan-950/50 to-purple-950/50 -mx-2 p-2.5 rounded-xl border border-cyan-400/30 shadow-neon-blue">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] shadow-neon-blue" />
                    <span className="font-bold text-[#00D9FF]">04:00</span>
                    <span className="font-bold text-[#F0F9FF]">Instructor</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 ml-auto font-sans font-semibold">● Active Minute</span>
                  </div>
                  <p className="leading-relaxed text-slate-100 font-medium text-[11px]">
                    The server responds with its own parameters and the key exchange process begins immediately without round-trip delays. Once both sides agree, encrypted communication begins across the channel.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* 1-Minute blocks — words flow live into the active minute card */}
                {recentSegments.map((seg, idx) => {
                  const isLatest = idx === recentSegments.length - 1;
                  return (
                    <div
                      key={seg.id || idx}
                      className={`space-y-1 transition-all ${
                        isLatest && isCapturing
                          ? 'bg-gradient-to-r from-cyan-950/50 to-purple-950/50 -mx-2 p-2.5 rounded-xl border border-cyan-400/30 shadow-neon-blue'
                          : 'p-1'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                        {isLatest && isCapturing ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-pulse shadow-neon-blue" />
                            <span className="font-bold text-[#00D9FF]">[{seg.timestamp_formatted}]</span>
                            <span className="font-bold text-[#F0F9FF]">{seg.speaker || 'Instructor'}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 ml-auto font-sans font-semibold">● Active Minute</span>
                          </>
                        ) : (
                          <>
                            <span className="text-slate-400 font-mono">[{seg.timestamp_formatted}]</span>
                            <span className="font-semibold text-slate-300">{seg.speaker || 'Instructor'}</span>
                          </>
                        )}
                      </div>
                      <p className={`leading-relaxed text-[11px] ${isLatest && isCapturing ? 'text-slate-100 font-medium' : 'text-slate-300'}`}>
                        {seg.text}
                        {isLatest && isCapturing && interimWordTicker && (
                          <span className="text-[#00D9FF] font-semibold opacity-90 animate-pulse"> {interimWordTicker}</span>
                        )}
                      </p>
                    </div>
                  );
                })}

                {/* If capturing but no segments committed yet, show the live 00:00 block */}
                {recentSegments.length === 0 && (interimWordTicker || interimTranscript) && (
                  <div className="space-y-1 bg-gradient-to-r from-cyan-950/50 to-purple-950/50 -mx-2 p-2.5 rounded-xl border border-cyan-400/30 shadow-neon-blue">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-pulse shadow-neon-blue" />
                      <span className="font-bold text-[#00D9FF]">[00:00]</span>
                      <span className="font-bold text-[#F0F9FF]">Instructor</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 ml-auto font-sans font-semibold">● Active Minute</span>
                    </div>
                    <p className="leading-relaxed text-[11px] text-slate-100 font-medium">
                      {interimTranscript || ''}
                      {interimWordTicker && (
                        <span className="text-[#00D9FF] font-semibold opacity-90 animate-pulse"> {interimWordTicker}</span>
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sound Wave Visualizer & Speaking Now Ticker (Pinned at Bottom of Transcript) */}
          <div className="pt-3 border-t border-white/10 shrink-0 space-y-2.5">
            {/* Animated Audio Waveform */}
            <div className="flex items-center justify-center gap-1 py-1 px-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-[10px] text-slate-400 font-mono mr-1">🎙️</span>
              {[12, 24, 32, 16, 28, 40, 20, 36, 18, 28, 38, 14, 26, 32, 20, 16, 28, 36, 18, 10].map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h}px` }}
                  className={`w-1 rounded-full transition-all duration-300 ${
                    isCapturing 
                      ? 'bg-gradient-to-t from-cyan-400 to-purple-400 animate-pulse shadow-neon-blue' 
                      : 'bg-white/20'
                  }`}
                />
              ))}
            </div>

            {/* Speaking Now Real-time Ticker */}
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-cyan-950/50 to-purple-950/50 border border-cyan-400/30 text-xs shadow-neon-blue backdrop-blur-md">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#00D9FF] mb-0.5">
                <Mic className="w-3 h-3 text-[#00D9FF] animate-pulse" />
                <span>Speaking now</span>
              </div>
              <p className="text-[11px] text-slate-200 font-medium leading-snug line-clamp-2">
                {interimWordTicker || interimTranscript || '...the client sends its key share and negotiates cipher parameters...'}
              </p>
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* COLUMN 3: AI TEACHER ASSISTANT PANEL (3 COLS / ~25%)                    */}
        {/* ======================================================================= */}
        <div className="lg:col-span-3 glass-panel rounded-2xl p-4 flex flex-col h-[585px]">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
            <div>
              <h3 className="text-xs font-bold text-[#F0F9FF] tracking-tight">AI Teacher</h3>
              <p className="text-[10px] text-slate-400">Ask anything about this lecture</p>
            </div>
            <button className="text-slate-400 hover:text-slate-200 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages / Welcome Area */}
          <div 
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs scrollbar-thin"
          >
            {/* Friendly Greeting Card */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-950/30 to-purple-950/30 border border-purple-500/30 text-slate-200 space-y-2 shadow-neon-purple">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#00D9FF] to-[#8B5CF6] text-white flex items-center justify-center shadow-neon-blue">
                  <Bot className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-[#F0F9FF]">Hello! I'm your AI Teacher.</h4>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                I can explain concepts, answer questions, create quizzes, flashcards, and more — with exact timestamps and slide references.
              </p>
            </div>

            {/* If there are chat messages, render conversation thread */}
            {chatMessages.map((msg, i) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id || i}
                  className={`p-3 rounded-2xl text-xs space-y-1.5 ${
                    isUser
                      ? 'bg-gradient-to-r from-[#00D9FF] to-[#8B5CF6] text-white ml-4 shadow-neon-blue'
                      : 'bg-white/5 border border-white/10 text-slate-200 mr-2 shadow-xs backdrop-blur-md'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] opacity-75 font-semibold">
                    <span>{isUser ? 'You' : 'AI Teacher'}</span>
                  </div>
                  <div className="leading-relaxed whitespace-pre-wrap text-[11px]">
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {isChatLoading && (
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-xs flex items-center gap-2 text-slate-300 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-[#00D9FF] animate-spin" />
                <span className="text-[11px]">AI Teacher is preparing answer...</span>
              </div>
            )}

            {/* Quick Action Prompt Cards (Stacked Vertically when starting out) */}
            {chatMessages.length === 0 && (
              <div className="space-y-2 pt-1">
                {quickActions.map((qa, i) => {
                  const IconComp = qa.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSendPrompt(qa.prompt)}
                      className="w-full p-2.5 rounded-xl border border-white/10 hover:border-cyan-400/40 bg-white/5 hover:bg-white/10 hover:shadow-neon-blue flex items-center gap-2.5 transition-all text-left group shadow-xs cursor-pointer backdrop-blur-md"
                    >
                      <div className={`w-7 h-7 rounded-lg ${qa.iconBg} border flex items-center justify-center shrink-0`}>
                        <IconComp className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-200 group-hover:text-[#00D9FF] transition-colors">
                          {qa.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {qa.desc}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#00D9FF] group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Chat Input Dock */}
          <div className="pt-2 border-t border-white/10 shrink-0">
            <div className="relative flex items-center bg-white/5 rounded-xl border border-white/10 focus-within:border-cyan-400 focus-within:shadow-neon-blue transition-all backdrop-blur-md">
              <input
                type="text"
                placeholder="Ask a question about this lecture..."
                value={inputQuestion}
                onChange={(e) => setInputQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent pl-3 pr-16 py-2.5 text-xs text-[#F0F9FF] placeholder-slate-400 focus:outline-none"
              />
              <div className="absolute right-2 flex items-center gap-1.5">
                <button 
                  type="button"
                  title="Attach resource"
                  className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSendPrompt()}
                  disabled={!inputQuestion.trim() || isChatLoading}
                  className="p-1.5 rounded-lg neon-glow-btn text-white transition-all shadow-neon-blue cursor-pointer disabled:opacity-40"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LOWER SECTION: 3 INFORMATION & INTELLIGENCE CARDS                         */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* CARD 1: CURRENT SLIDE (3 COLS / ~25%) */}
        <div className="lg:col-span-3 glass-panel p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#F0F9FF] tracking-tight">Current Slide</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono font-bold border border-cyan-400/30">
              {activeSlideIndex + 1} / {displayFrames.length}
            </span>
          </div>

          <div 
            onClick={() => activeFrame && onOpenSlidePreview(activeFrame.id)}
            className="aspect-video rounded-xl bg-slate-950 border border-white/10 overflow-hidden relative group cursor-pointer shadow-neon-purple flex items-center justify-center"
          >
            {activeFrame && activeFrame.image_path ? (
              <img
                src={`/api/frames/${activeFrame.id}/image`}
                alt="Current Slide"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="p-3 text-center text-white space-y-1 select-none">
                <span className="text-xs font-bold text-[#00D9FF]">TLS 1.3 Architecture</span>
                <p className="text-[10px] text-slate-400 font-mono">04:18 • Diagram</p>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="px-2.5 py-1 rounded-lg bg-white/90 text-slate-900 text-[10px] font-bold shadow-md flex items-center gap-1">
                <Maximize2 className="w-3 h-3" /> Zoom Slide
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: KEY CONCEPTS & TRANSCRIPT HIGHLIGHTS (6 COLS / ~50%) */}
        <div className="lg:col-span-6 glass-panel p-4 rounded-2xl space-y-3">
          <div>
            <h3 className="text-xs font-bold text-[#F0F9FF] tracking-tight mb-2">Key Concepts</h3>
            {/* Concepts Tag Cloud matching reference */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(concepts.length > 0 ? concepts : [
                { id: '1', name: 'TLS 1.3' },
                { id: '2', name: 'ClientHello' },
                { id: '3', name: 'ServerHello' },
                { id: '4', name: 'Key Exchange' },
                { id: '5', name: 'Encryption' },
                { id: '6', name: 'Security' },
                { id: '7', name: 'Protocol' },
                { id: '8', name: 'Handshake' }
              ]).map((c, i) => (
                <span
                  key={c.id || i}
                  onClick={() => handleSendPrompt(`Teach me everything about ${c.name}`)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all border ${
                    i === 0 
                      ? 'bg-cyan-500/20 text-[#00D9FF] border-cyan-400/40 font-bold shadow-neon-blue' 
                      : i === 2 
                      ? 'bg-purple-500/20 text-[#C084FC] border-purple-400/40 font-bold shadow-neon-purple'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:border-cyan-400/40 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {i === 0 || i === 7 ? `✦ ${c.name}` : c.name}
                </span>
              ))}
            </div>
          </div>

          {/* Transcript Highlights */}
          <div className="pt-2 border-t border-white/10 space-y-1">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="text-[#00D9FF]">❖</span>
              Transcript Highlights
            </h4>
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2 text-xs">
              <span className="text-[#00D9FF] mt-0.5 shrink-0">◇</span>
              <div className="space-y-1 min-w-0">
                <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                  This section explains how TLS 1.3 improves security and reduces latency compared to TLS 1.2 by removing obsolete cipher suites and establishing 0-RTT resumption.
                </p>
                <p className="text-[10px] font-mono text-slate-400">
                  04:18 • Slide 4
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: ADDITIONAL RESOURCES (3 COLS / ~25%) */}
        <div className="lg:col-span-3 glass-panel p-4 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[#F0F9FF] tracking-tight">Additional Resources</h3>
          </div>

          <div className="space-y-1.5">
            <button
              onClick={() => onGeneratePDF('summary')}
              className="w-full p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 flex items-center justify-between text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-[#00D9FF] flex items-center justify-center shrink-0 shadow-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200 group-hover:text-[#00D9FF] transition-colors">Lecture Notes</p>
                  <p className="text-[10px] text-slate-400">AI generated summary and notes</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#00D9FF] transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={() => handleSendPrompt('Create 5 study flashcards for this lecture')}
              className="w-full p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 flex items-center justify-between text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-400/30 text-[#C084FC] flex items-center justify-center shrink-0 shadow-xs">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200 group-hover:text-[#C084FC] transition-colors">Flashcards</p>
                  <p className="text-[10px] text-slate-400">Key concepts for quick review</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#C084FC] transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={onTakeQuiz}
              className="w-full p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 flex items-center justify-between text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/15 border border-teal-400/30 text-teal-400 flex items-center justify-center shrink-0 shadow-xs">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200 group-hover:text-teal-400 transition-colors">Practice Quiz</p>
                  <p className="text-[10px] text-slate-400">Test your knowledge</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-transform group-hover:translate-x-0.5" />
            </button>

            <button
              onClick={() => onGeneratePPT('teaching', 8)}
              className="w-full p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 flex items-center justify-between text-left transition-all group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-400/30 text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                  <Presentation className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">Presentation</p>
                  <p className="text-[10px] text-slate-400">Slides and visual summary</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
