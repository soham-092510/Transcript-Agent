import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Sparkles, Radio, RefreshCw, AlertCircle, GraduationCap, Zap } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { HumanControlBar } from './components/HumanControlBar';
import { ChatInterface } from './components/ChatInterface';
import { SessionDashboard } from './components/SessionDashboard';
import { LiveCaptureStudio } from './components/LiveCaptureStudio';
import { SlideCollection } from './components/SlideCollection';
import { TranscriptViewer } from './components/TranscriptViewer';
import { StudyArtifacts } from './components/StudyArtifacts';
import { QuizPracticeModal } from './components/QuizPracticeModal';
import { LearnerProfileView } from './components/LearnerProfileView';
import { StartLearningModal } from './components/StartLearningModal';
import { AutoPilotModal } from './components/AutoPilotModal';

import { api } from './services/api';
import { SessionWebSocketClient } from './services/websocket';
import { mediaCaptureManager } from './services/mediaCapture';
import { 
  LearningSession, 
  ChatMessage, 
  Concept, 
  FrameCapture, 
  TranscriptSegment, 
  QuizQuestion, 
  LearnerProfile, 
  SystemStatus, 
  TeacherMode 
} from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState('chat');
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [activeSession, setActiveSession] = useState<LearningSession | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [frames, setFrames] = useState<FrameCapture[]>([]);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfile | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  const [isCapturing, setIsCapturing] = useState(false);
  const [visualEnabled, setVisualEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [startModalOpen, setStartModalOpen] = useState(false);
  const [autoModalOpen, setAutoModalOpen] = useState(false);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const wsClientRef = useRef<SessionWebSocketClient | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const quizInputRef = useRef<HTMLInputElement>(null);

  // Initial load with retry loop
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async (retries = 6, delayMs = 1000) => {
    setIsLoadingInitial(true);
    setConnectionError(null);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const status = await api.getSystemStatus();
        setSystemStatus(status);

        let sessList = await api.listSessions();
        if (!sessList || sessList.length === 0) {
          try {
            await api.seedDemo();
            sessList = await api.listSessions();
          } catch (seedErr) {
            console.warn('Auto-seed demo note:', seedErr);
          }
        }

        setSessions(sessList || []);

        if (sessList && sessList.length > 0) {
          const preferredSession =
            sessList.find(s => s.id === 'demo_cybersecurity_module_2') ||
            sessList.find(s => s.is_pinned) ||
            sessList.find(s => (s.concept_count || 0) > 0) ||
            sessList[0];
          await selectSession(preferredSession);
        }
        setIsLoadingInitial(false);
        return;
      } catch (e: any) {
        console.warn(`Connection attempt ${attempt}/${retries} failed:`, e);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, delayMs));
        } else {
          setConnectionError("Could not connect to LearnLens AI backend on port 8000. Please ensure 'python run.py' or uvicorn is running.");
          setIsLoadingInitial(false);
        }
      }
    }
  };

  const selectSession = async (s: LearningSession) => {
    setActiveSession(s);
    try {
      const [cList, fList, tList, qList, pObj, mList] = await Promise.all([
        api.getConcepts(s.id),
        api.getFrames(s.id),
        api.getTranscript(s.id),
        api.getQuizQuestions(s.id),
        api.getLearnerProfile(s.id),
        api.getChatHistory(s.id)
      ]);

      setConcepts(cList);
      setFrames(fList);
      setSegments(tList);
      setQuizQuestions(qList);
      setLearnerProfile(pObj);
      setChatMessages(mList);

      // Connect WebSocket
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
      }

      wsClientRef.current = new SessionWebSocketClient(s.id, {
        onTranscriptReceived: (newSeg, newConcepts) => {
          setSegments(prev => [...prev, newSeg]);
          if (newConcepts && newConcepts.length > 0) {
            setConcepts(prev => [...prev, ...newConcepts]);
          }
        },
        onFrameAnalyzed: (newFrame) => {
          setFrames(prev => [...prev, newFrame]);
        }
      });
      wsClientRef.current.connect();

    } catch (e) {
      console.error('Failed to load session details:', e);
    }
  };

  // Start Learning via Native Screen/Tab Sharing
  const startMediaObservation = async () => {
    return await mediaCaptureManager.startCapture({
      onFrameCaptured: (b64, sec, force) => {
        if (visualEnabled && wsClientRef.current) {
          wsClientRef.current.sendFrameCapture(b64, sec, force);
        }
      },
      onTranscriptChunk: (text, sec, speaker) => {
        if (audioEnabled && wsClientRef.current) {
          wsClientRef.current.sendTranscriptChunk(text, sec, speaker || 'Speaker');
        }
      },
      onAudioChunk: (b64Audio, sec, speaker) => {
        if (audioEnabled && wsClientRef.current) {
          wsClientRef.current.sendAudioChunk(b64Audio, sec, speaker || 'Speaker');
        }
      },
      onStopped: () => {
        setIsCapturing(false);
      }
    });
  };

  const handleConfirmStart = async (title: string, platform: string) => {
    setStartModalOpen(false);
    try {
      const newSession = await api.createSession(title, platform);
      setSessions(prev => [newSession, ...prev]);
      await selectSession(newSession);

      const ok = await startMediaObservation();
      if (ok) {
        setIsCapturing(true);
        setCurrentTab('live');
      }
    } catch (e) {
      console.error('Could not start learning session:', e);
    }
  };

  const handleStartObservationForActive = async () => {
    if (!activeSession) {
      setStartModalOpen(true);
      return;
    }
    const ok = await startMediaObservation();
    if (ok) {
      setIsCapturing(true);
      setCurrentTab('live');
    }
  };

  const handleForceCapture = () => {
    mediaCaptureManager.forceCapture();
  };

  const handleInstantSlidePdf = async () => {
    if (!activeSession) return;
    try {
      const res = await api.exportSlideOnlyPdf(activeSession.id);
      if (res && res.download_url) {
        window.open(res.download_url, '_blank');
      }
    } catch (err) {
      console.error('Instant slide PDF export failed:', err);
    }
  };

  const handleStopCapture = () => {
    mediaCaptureManager.stopCapture();
    setIsCapturing(false);
    if (activeSession) {
      api.stopAgent(activeSession.id);
    }
  };

  const handleFinishAndTeach = async () => {
    if (isCapturing) {
      handleStopCapture();
    }
    setCurrentTab('chat');
    handleSendMessage(
      "Please teach me everything covered in this lecture session. Break it down into clear concepts, explain the key slides captured, highlight important takeaways, and give me 3 practice review questions.",
      'simple'
    );
  };

  // Demo session seeding
  const handleLoadDemo = async () => {
    const res = await api.seedDemo();
    const updatedSessions = await api.listSessions();
    setSessions(updatedSessions);
    const demo = updatedSessions.find(s => s.id === res.session_id);
    if (demo) {
      selectSession(demo);
    }
  };

  // AI Teacher Chat
  const handleSendMessage = async (text: string, mode: TeacherMode) => {
    if (!activeSession) return;
    const tempUserMsg: ChatMessage = {
      id: Date.now().toString(),
      session_id: activeSession.id,
      sender: 'user',
      text,
      mode,
      timestamp: Date.now() / 1000,
      evidence: []
    };
    setChatMessages(prev => [...prev, tempUserMsg]);
    setIsChatLoading(true);

    try {
      const reply = await api.sendMessage(activeSession.id, text, mode);
      setChatMessages(prev => [...prev, reply]);
      // Refresh learner profile
      const prof = await api.getLearnerProfile(activeSession.id);
      setLearnerProfile(prof);
    } catch (e) {
      console.error('Chat error:', e);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Human Control Commands
  const handleSendCommand = async (command: string) => {
    if (!activeSession) return;
    try {
      const res = await api.sendCommand(activeSession.id, command);
      if (res.response) {
        setChatMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            session_id: activeSession.id,
            sender: 'user',
            text: command,
            timestamp: Date.now() / 1000,
            evidence: []
          },
          {
            id: (Date.now() + 1).toString(),
            session_id: activeSession.id,
            sender: 'assistant',
            text: res.response,
            timestamp: (Date.now() + 1) / 1000,
            evidence: res.evidence || []
          }
        ]);
        setCurrentTab('chat');
      } else if (res.status === 'PAUSED' || res.status === 'OBSERVING') {
        setActiveSession({ ...activeSession, status: res.status });
      }
    } catch (e) {
      console.error('Command failed:', e);
    }
  };

  const handlePause = async () => {
    if (!activeSession) return;
    await api.pauseAgent(activeSession.id);
    setActiveSession({ ...activeSession, status: 'PAUSED' });
  };

  const handleResume = async () => {
    if (!activeSession) return;
    await api.resumeAgent(activeSession.id);
    setActiveSession({ ...activeSession, status: 'OBSERVING' });
  };

  const handleStop = async () => {
    if (!activeSession) return;
    handleStopCapture();
    await api.stopAgent(activeSession.id);
    setActiveSession({ ...activeSession, status: 'COMPLETED' });
  };

  const handleDeleteSession = async (id: string) => {
    await api.deleteSession(id);
    const remaining = sessions.filter(s => s.id !== id);
    setSessions(remaining);
    if (activeSession?.id === id) {
      if (remaining.length > 0) selectSession(remaining[0]);
      else setActiveSession(null);
    }
  };

  // Pinning
  const handleTogglePinConcept = async (conceptId: string, currentPinned: boolean) => {
    await api.togglePin('concept', conceptId, !currentPinned);
    setConcepts(prev => prev.map(c => c.id === conceptId ? { ...c, is_pinned: !currentPinned } : c));
  };

  const handleTogglePinFrame = async (frameId: string, currentPinned: boolean) => {
    await api.togglePin('frame', frameId, !currentPinned);
    setFrames(prev => prev.map(f => f.id === frameId ? { ...f, is_pinned: !currentPinned } : f));
  };

  // Artifact generation
  const handleGeneratePPT = async (style: string, count: number) => {
    if (!activeSession) return null;
    return await api.generatePPT(activeSession.id, style, count);
  };

  const handleGeneratePDF = async (type: 'teaching_report' | 'visual_pack') => {
    if (!activeSession) return null;
    return await api.generatePDF(activeSession.id, type);
  };

  // Quiz
  const handleSubmitQuizAnswer = async (qId: string, selIdx: number) => {
    const res = await api.submitQuizAnswer(qId, selIdx);
    if (activeSession) {
      const prof = await api.getLearnerProfile(activeSession.id);
      setLearnerProfile(prof);
    }
    return res;
  };

  const handleImportQuizPdf = async (file: File) => {
    if (!activeSession) return;
    const res = await api.importQuizPdf(activeSession.id, file);
    if (res.questions) {
      setQuizQuestions(res.questions);
    }
  };

  // Offline video import
  const handleVideoFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const res = await api.importOfflineVideo(file);
      const updated = await api.listSessions();
      setSessions(updated);
      const newSess = updated.find(s => s.id === res.session_id);
      if (newSess) selectSession(newSess);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={videoInputRef}
        accept="video/mp4,video/webm,video/mkv,video/quicktime"
        onChange={handleVideoFileSelected}
        className="hidden"
      />
      <input
        type="file"
        ref={quizInputRef}
        accept=".pdf"
        onChange={(e) => e.target.files && handleImportQuizPdf(e.target.files[0])}
        className="hidden"
      />

      {/* Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        sessions={sessions}
        activeSession={activeSession}
        onSelectSession={selectSession}
        onDeleteSession={handleDeleteSession}
        onStartLearning={() => setStartModalOpen(true)}
        onLoadDemo={handleLoadDemo}
        onOpenVideoImport={() => videoInputRef.current?.click()}
        onOpenQuizImport={() => quizInputRef.current?.click()}
        systemStatus={systemStatus}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Human Control Bar */}
        <HumanControlBar
          activeSession={activeSession}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onSendCommand={handleSendCommand}
          onOpenAutoPilot={() => setAutoModalOpen(true)}
          visualEnabled={visualEnabled}
          setVisualEnabled={setVisualEnabled}
          audioEnabled={audioEnabled}
          setAudioEnabled={setAudioEnabled}
        />

        {/* View Switcher */}
        {activeSession ? (
          <>
            {currentTab === 'chat' && (
              <ChatInterface
                session={activeSession}
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                onSelectEvidenceTimestamp={(ts) => {
                  setCurrentTab('transcript');
                }}
                onOpenSlidePreview={(fId) => {
                  setSelectedPreviewId(fId);
                  setCurrentTab('slides');
                }}
                isLoading={isChatLoading}
              />
            )}

            {currentTab === 'dashboard' && (
              <SessionDashboard
                session={activeSession}
                concepts={concepts}
                learnerProfile={learnerProfile}
                onNavigateTab={setCurrentTab}
                onQuickTeachConcept={(concept) => {
                  handleSendMessage(`Teach me about ${concept} with examples and exam highlights`, 'simple');
                  setCurrentTab('chat');
                }}
                onGeneratePPT={() => {
                  handleGeneratePPT('teaching', 8);
                  setCurrentTab('artifacts');
                }}
                onGeneratePDF={(type) => {
                  handleGeneratePDF(type);
                  setCurrentTab('artifacts');
                }}
                onTogglePinConcept={handleTogglePinConcept}
              />
            )}

            {currentTab === 'live' && (
              <LiveCaptureStudio
                session={activeSession}
                isCapturing={isCapturing}
                onStartCapture={handleStartObservationForActive}
                onStopCapture={handleStopCapture}
                onForceCapture={handleForceCapture}
                onInstantSlidePdf={handleInstantSlidePdf}
                onFinishAndTeach={handleFinishAndTeach}
                onOpenAutoPilotModal={() => setAutoModalOpen(true)}
                recentFrames={frames}
                recentSegments={segments}
                onOpenSlidePreview={(fId) => {
                  setSelectedPreviewId(fId);
                  setCurrentTab('slides');
                }}
              />
            )}

            {currentTab === 'slides' && (
              <SlideCollection
                frames={frames}
                onTogglePinFrame={handleTogglePinFrame}
                onTeachWithSlide={(frame) => {
                  handleSendMessage(`Explain this lecture visual from timestamp [${frame.timestamp_formatted}]: ${frame.visual_description}`, 'simple');
                  setCurrentTab('chat');
                }}
                selectedPreviewId={selectedPreviewId}
                setSelectedPreviewId={setSelectedPreviewId}
              />
            )}

            {currentTab === 'transcript' && (
              <TranscriptViewer
                segments={segments}
                onTeachSegment={(seg) => {
                  handleSendMessage(`Explain this segment from [${seg.timestamp_formatted}]: "${seg.text}"`, 'simple');
                  setCurrentTab('chat');
                }}
                onSelectTimestamp={(ts) => {
                  setCurrentTab('slides');
                }}
              />
            )}

            {currentTab === 'artifacts' && (
              <StudyArtifacts
                session={activeSession}
                onGeneratePPT={handleGeneratePPT}
                onGeneratePDF={handleGeneratePDF}
              />
            )}

            {currentTab === 'quiz' && (
              <QuizPracticeModal
                session={activeSession}
                questions={quizQuestions}
                onSubmitAnswer={handleSubmitQuizAnswer}
                onImportPdf={handleImportQuizPdf}
                onTeachConcept={(cName) => {
                  handleSendMessage(`Teach me the concept of ${cName} tested in the practice quiz`, 'simple');
                  setCurrentTab('chat');
                }}
              />
            )}

            {currentTab === 'learner' && (
              <LearnerProfileView
                session={activeSession}
                profile={learnerProfile}
                onTeachAgain={(cName) => {
                  handleSendMessage(`Teach me again about ${cName}, focusing on why it matters and common exam pitfalls`, 'teach_from_scratch');
                  setCurrentTab('chat');
                }}
              />
            )}
          </>
        ) : isLoadingInitial ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600 shadow-sm animate-pulse">
                <GraduationCap className="w-8 h-8 text-brand-600" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-brand-200 flex items-center justify-center shadow-xs">
                <Loader2 className="w-3.5 h-3.5 text-brand-600 animate-spin" />
              </div>
            </div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight">Connecting to LearnLens AI Engine</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Initializing local multimodal observation pipeline, SQLite knowledge base, and AI teacher studio...
            </p>
            <div className="mt-5 flex items-center gap-2 text-[11px] text-slate-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Local-first • Zero cloud telemetry • 100% Private</span>
            </div>
          </div>
        ) : connectionError ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Cannot Connect to LearnLens Backend</h2>
            <p className="text-xs text-slate-500 mt-1.5 max-w-md">
              {connectionError}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => loadInitialData(5, 1000)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Connection
              </button>
              <button
                onClick={handleLoadDemo}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Load Demo Session
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-slate-50 p-8 flex flex-col items-center justify-center">
            <div className="max-w-xl w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 mx-auto flex items-center justify-center shadow-xs">
                <GraduationCap className="w-7 h-7 text-brand-600" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Welcome to LearnLens AI Studio
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                  Your local-first multimodal learning companion. Authorize any Chrome tab or video source to extract slides, transcribe speech, build grounded knowledge, and teach interactively.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
                <button
                  onClick={() => setAutoModalOpen(true)}
                  className="p-4 rounded-xl border border-amber-300 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-500 transition-all cursor-pointer group text-left shadow-xs"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Zap className="w-4 h-4 text-amber-600 fill-current" />
                    <span className="text-xs font-bold text-amber-950">⚡ Auto Feature (10-15m)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Ingest 11-hour / 100-video courses at 50x-100x speed, extract 16:9 slide changes, and auto-complete.
                  </p>
                </button>

                <button
                  onClick={handleLoadDemo}
                  className="p-4 rounded-xl border border-brand-200 bg-brand-50/50 hover:bg-brand-50 hover:border-brand-400 transition-all cursor-pointer group text-left shadow-xs"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Sparkles className="w-4 h-4 text-brand-600" />
                    <span className="text-xs font-bold text-brand-900">Explore Demo Course</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Pre-loaded with 7-concept MIT lecture, slide captures, and interactive exam quiz.
                  </p>
                </button>

                <button
                  onClick={() => setStartModalOpen(true)}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-brand-300 transition-all cursor-pointer group text-left shadow-xs"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Radio className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800">Start Chrome Observation</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Authorize any browser tab (YouTube, Coursera, Udemy, etc.) for live AI capture.
                  </p>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Local SQLite Knowledge Base</span>
                <span>12 Interactive Teacher Modes</span>
                <span>Export 16:9 Slide PPTX & PDF</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Start Learning Modal */}
      <StartLearningModal
        isOpen={startModalOpen}
        onClose={() => setStartModalOpen(false)}
        onConfirmStart={handleConfirmStart}
      />

      {/* ⚡ Auto Feature HyperIngest & AutoPilot Modal */}
      <AutoPilotModal
        isOpen={autoModalOpen}
        onClose={() => setAutoModalOpen(false)}
        isCapturing={isCapturing}
        onStartChromeTabAutoPilot={async (title) => {
          setAutoModalOpen(false);
          await handleConfirmStart(title || "Autonomous Chrome Tab Course", "Chrome Tab Auto-Pilot");
        }}
        onSessionCreatedAndLoaded={async (sId) => {
          const updated = await api.listSessions();
          setSessions(updated);
          const s = updated.find(x => x.id === sId);
          if (s) selectSession(s);
        }}
        onQuickTeachPrompt={(promptText) => {
          handleSendMessage(promptText, 'simple');
          setCurrentTab('chat');
        }}
      />
    </div>
  );
}
export default App;
