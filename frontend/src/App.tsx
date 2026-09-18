import React, { useState, useEffect, useRef } from 'react';
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
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const wsClientRef = useRef<SessionWebSocketClient | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const quizInputRef = useRef<HTMLInputElement>(null);

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const status = await api.getSystemStatus();
      setSystemStatus(status);

      const sessList = await api.listSessions();
      setSessions(sessList);

      if (sessList.length > 0) {
        selectSession(sessList[0]);
      } else {
        // Auto-seed demo on first launch
        await handleLoadDemo();
      }
    } catch (e) {
      console.error('Failed to load initial data:', e);
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
  const handleConfirmStart = async (title: string, platform: string) => {
    setStartModalOpen(false);
    try {
      const newSession = await api.createSession(title, platform);
      setSessions(prev => [newSession, ...prev]);
      await selectSession(newSession);

      // Trigger native browser displayMedia picker
      const ok = await mediaCaptureManager.startCapture({
        onFrameCaptured: (b64, sec) => {
          if (visualEnabled && wsClientRef.current) {
            wsClientRef.current.sendFrameCapture(b64, sec);
          }
        },
        onTranscriptChunk: (text, sec) => {
          if (audioEnabled && wsClientRef.current) {
            wsClientRef.current.sendTranscriptChunk(text, sec);
          }
        },
        onStopped: () => {
          setIsCapturing(false);
        }
      });

      if (ok) {
        setIsCapturing(true);
        setCurrentTab('live');
      }
    } catch (e) {
      console.error('Could not start learning session:', e);
    }
  };

  const handleStopCapture = () => {
    mediaCaptureManager.stopCapture();
    setIsCapturing(false);
    if (activeSession) {
      api.stopAgent(activeSession.id);
    }
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
                onStartCapture={() => setStartModalOpen(true)}
                onStopCapture={handleStopCapture}
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
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <p className="text-sm font-medium text-slate-400">No session selected</p>
            <button
              onClick={() => setStartModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-brand-500 text-white text-xs font-semibold"
            >
              Start Learning Now
            </button>
          </div>
        )}
      </div>

      {/* Start Learning Modal */}
      <StartLearningModal
        isOpen={startModalOpen}
        onClose={() => setStartModalOpen(false)}
        onConfirmStart={handleConfirmStart}
      />
    </div>
  );
}
export default App;
