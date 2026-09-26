import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink, 
  Mic, 
  MicOff, 
  Image as ImageIcon, 
  GraduationCap,
  Clock,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ChatMessage, TeacherMode, LearningSession } from '../types';
import { FormattedAnswer } from './FormattedAnswer';

interface ChatInterfaceProps {
  session: LearningSession;
  messages: ChatMessage[];
  onSendMessage: (text: string, mode: TeacherMode) => void;
  onSelectEvidenceTimestamp?: (timestamp: string) => void;
  onOpenSlidePreview?: (frameId: string) => void;
  isLoading: boolean;
}

const MODES: { id: TeacherMode; label: string; desc: string; icon: string }[] = [
  { id: 'simple', label: 'Simple Mode', desc: 'Everyday language & clear analogies', icon: '🌱' },
  { id: 'detailed', label: 'Detailed Mode', desc: 'In-depth architecture & mechanics', icon: '🔬' },
  { id: 'exam', label: 'Exam Focus', desc: 'High-yield points, definitions & traps', icon: '🎯' },
  { id: 'quick_revision', label: 'Quick Revision', desc: 'Rapid 60-second summary', icon: '⚡' },
  { id: 'example', label: 'Explain With Example', desc: 'Step-by-step practical scenario', icon: '💡' },
  { id: 'teach_from_scratch', label: 'Teach From Scratch', desc: 'Ground zero foundational lesson', icon: '📖' },
  { id: 'active_recall', label: 'Active Recall', desc: 'Tests you with a question', icon: '🧠' },
  { id: 'flashcards', label: 'Flashcards', desc: 'Front/Back Q&A study cards', icon: '🃏' },
  { id: 'practice_quiz', label: 'Practice Quiz', desc: 'Multiple-choice knowledge check', icon: '📝' },
  { id: 'weak_areas', label: 'Weak Areas', desc: 'Targets your knowledge gaps', icon: '🔍' },
  { id: 'compare', label: 'Compare Concepts', desc: 'Side-by-side trade-offs', icon: '⚖️' },
  { id: 'ask_anything', label: 'Ask Anything', desc: 'Open tutor conversation', icon: '💬' },
];

const SUGGESTIONS = [
  "What did I just learn?",
  "Explain what the instructor emphasized",
  "Show me the slide where this was explained",
  "Give me an analogy for this concept",
  "What are the high-yield exam points?",
  "Generate a 10-slide PPT presentation"
];

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  session,
  messages,
  onSendMessage,
  onSelectEvidenceTimestamp,
  onOpenSlidePreview,
  isLoading
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedMode, setSelectedMode] = useState<TeacherMode>('simple');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText.trim(), selectedMode);
      setInputText('');
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSpeak = (id: string, text: string) => {
    if (speakingId === id) {
      window.speechSynthesis?.cancel();
      setSpeakingId(null);
      return;
    }
    window.speechSynthesis?.cancel();
    const clean = text.replace(/[*#_`>•]/g, '');
    const ut = new SpeechSynthesisUtterance(clean);
    ut.rate = 1.05;
    ut.onend = () => setSpeakingId(null);
    ut.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis?.speak(ut);
  };

  const handleVoiceInput = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'en-US';
      rec.onstart = () => setIsRecording(true);
      rec.onend = () => setIsRecording(false);
      rec.onresult = (evt: any) => {
        const transcript = evt.results[0][0].transcript;
        setInputText(prev => prev ? `${prev} ${transcript}` : transcript);
      };
      rec.start();
    } catch (e) {
      console.warn("Voice error", e);
      setIsRecording(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B0F17] overflow-hidden relative text-slate-200">
      {/* Mode Selector Header Bar */}
      <div className="px-6 py-2.5 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between gap-4 overflow-x-auto shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {MODES.slice(0, 7).map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMode(m.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedMode === m.id
                  ? 'bg-slate-800 text-sky-400 border border-sky-400/40 shadow-metallic-subtle font-bold'
                  : 'bg-slate-850/60 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
          {/* More modes dropdown */}
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value as TeacherMode)}
            className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-semibold text-xs rounded-full px-3 py-1 border border-slate-700/80 focus:border-sky-400 outline-none cursor-pointer"
          >
            {MODES.slice(7).map((m) => (
              <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                {m.icon} {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
          Grounded in: <span className="text-sky-400 font-bold">{session.title.slice(0, 24)}...</span>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 text-sky-400 flex items-center justify-center shadow-metallic-subtle">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-100 tracking-tight">Your AI Teacher is Ready</h3>
              <p className="text-sm text-slate-400 mt-1">
                Ask anything about your captured lesson. Answers are grounded in the lecture audio and slide diagrams.
              </p>
            </div>

            {/* Quick Suggestions */}
            <div className="grid grid-cols-2 gap-2.5 w-full pt-4">
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(s, selectedMode)}
                  className="text-left p-3.5 rounded-2xl metallic-card border border-slate-700/70 hover:border-slate-500 hover:bg-slate-850 text-xs text-slate-300 hover:text-slate-100 transition-all group cursor-pointer shadow-metallic-subtle"
                >
                  <span className="text-sky-400 font-bold block mb-1">Prompt #{idx + 1}</span>
                  "{s}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${msg.sender === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-sky-400 flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`rounded-2xl px-5 py-4 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-sky-600 to-slate-700 text-white rounded-tr-none shadow-md border border-sky-400/30'
                    : 'metallic-card border border-slate-700/80 text-slate-200 rounded-tl-none shadow-metallic-subtle'
                }`}
              >
                {/* Mode Tag */}
                {msg.sender === 'assistant' && msg.mode && (
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-mono uppercase tracking-wider text-sky-400 font-bold">
                      Mode: {msg.mode.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleSpeak(msg.id, msg.text)}
                        className={`p-1 rounded transition-colors cursor-pointer ${speakingId === msg.id ? 'text-rose-400 bg-rose-500/10' : 'hover:text-slate-200 text-slate-400'}`}
                        title={speakingId === msg.id ? "Stop voice" : "Read aloud (Text-to-Speech)"}
                      >
                        {speakingId === msg.id ? <VolumeX className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleCopy(msg.id, msg.text)}
                        className="hover:text-slate-200 p-1 rounded transition-colors text-slate-400 cursor-pointer"
                        title="Copy response"
                      >
                        {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Message Content */}
                {msg.sender === 'user' ? (
                  <div className="whitespace-pre-line font-sans text-slate-100 text-sm">
                    {msg.text}
                  </div>
                ) : (
                  <FormattedAnswer content={msg.text} />
                )}

                {/* Grounded Evidence Citations */}
                {msg.evidence && msg.evidence.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <p className="text-[11px] font-bold text-sky-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Grounded Source Evidence:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.evidence.map((ev, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            if (ev.frame_id && onOpenSlidePreview) onOpenSlidePreview(ev.frame_id);
                            else if (ev.timestamp && onSelectEvidenceTimestamp) onSelectEvidenceTimestamp(ev.timestamp);
                          }}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-850/80 border border-slate-700/80 hover:border-slate-500 hover:bg-slate-800 cursor-pointer transition-all group shadow-2xs"
                        >
                          {ev.thumbnail_url ? (
                            <img
                              src={ev.thumbnail_url}
                              alt="Slide"
                              className="w-12 h-8 rounded object-cover border border-slate-700 group-hover:border-sky-400"
                            />
                          ) : (
                            <div className="w-12 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-400">
                              <ImageIcon className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-slate-200 group-hover:text-sky-300 truncate">
                              {ev.concept_name || 'Lesson Segment'}
                            </p>
                            <p className="text-[10px] text-sky-400 font-mono font-semibold">
                              Timestamp: [{ev.timestamp}]
                            </p>
                          </div>
                          <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-200" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3 max-w-xl mr-auto">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-sky-400 flex items-center justify-center shrink-0 animate-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="rounded-2xl rounded-tl-none px-4 py-3 metallic-card border border-slate-700/80 text-xs text-slate-300 flex items-center gap-2 shadow-metallic-subtle">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              AI Teacher is synthesizing structured explanation...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur-md shadow-sm">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <textarea
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={`Ask your AI Teacher (${MODES.find(m => m.id === selectedMode)?.label})...`}
            className="w-full bg-slate-850 border border-slate-700/80 focus:bg-slate-800 focus:border-sky-400/60 rounded-2xl pl-4 pr-28 py-3 text-sm text-slate-100 placeholder-slate-400 focus:outline-none resize-none transition-all shadow-inner"
          />

          <div className="absolute right-2 flex items-center gap-1">
            <button
              type="button"
              onClick={handleVoiceInput}
              title={isRecording ? 'Stop Recording' : 'Voice Input'}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isRecording ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-2 rounded-xl metallic-accent-btn disabled:opacity-40 text-white transition-all shadow-sm cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
