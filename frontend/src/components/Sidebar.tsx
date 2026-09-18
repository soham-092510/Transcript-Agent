import React from 'react';
import { 
  GraduationCap, 
  Play, 
  MessageSquare, 
  LayoutDashboard, 
  Radio, 
  FileText, 
  Layers, 
  Presentation, 
  HelpCircle, 
  UserCheck, 
  Upload, 
  Sparkles, 
  Pin, 
  Trash2, 
  Search,
} from 'lucide-react';
import { LearningSession, SystemStatus } from '../types';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  sessions: LearningSession[];
  activeSession: LearningSession | null;
  onSelectSession: (s: LearningSession) => void;
  onDeleteSession: (id: string) => void;
  onStartLearning: () => void;
  onLoadDemo: () => void;
  onOpenVideoImport: () => void;
  onOpenQuizImport: () => void;
  systemStatus: SystemStatus | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  sessions,
  activeSession,
  onSelectSession,
  onDeleteSession,
  onStartLearning,
  onLoadDemo,
  onOpenVideoImport,
  onOpenQuizImport,
  systemStatus,
  searchQuery,
  setSearchQuery,
}) => {
  const pinnedSessions = sessions.filter(s => s.is_pinned);
  const recentSessions = sessions.filter(s => !s.is_pinned);

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col h-screen select-none shadow-sm">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-500 flex items-center justify-center shadow-md shadow-brand-500/20">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
              LearnLens <span className="text-xs px-1.5 py-0.5 rounded bg-brand-100 text-brand-700 font-mono font-bold">AI</span>
            </h1>
            <p className="text-[11px] text-slate-500">Show your AI what you learn</p>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onStartLearning}
          className="mt-4 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-emerald-600 hover:from-brand-700 hover:to-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-600/25 transition-all transform active:scale-[0.98]"
        >
          <Play className="w-4 h-4 fill-white" />
          Start Learning
        </button>

        {/* Quick Tools Row */}
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          <button
            onClick={onLoadDemo}
            title="Load Pre-configured Demo Lesson"
            className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium flex items-center justify-center gap-1 border border-slate-200 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            Demo
          </button>
          <button
            onClick={onOpenVideoImport}
            title="Upload local video (MP4, MKV, WebM)"
            className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium flex items-center justify-center gap-1 border border-slate-200 transition-colors"
          >
            <Upload className="w-3 h-3 text-accent-cyan" />
            Video
          </button>
          <button
            onClick={onOpenQuizImport}
            title="Import Quiz PDF"
            className="py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-[11px] font-medium flex items-center justify-center gap-1 border border-slate-200 transition-colors"
          >
            <HelpCircle className="w-3 h-3 text-accent-violet" />
            Quiz PDF
          </button>
        </div>
      </div>

      {/* Global Search Box */}
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search learning history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="px-3 py-2 space-y-0.5 border-b border-slate-100">
        <NavItem
          icon={<MessageSquare className="w-4 h-4 text-emerald-600" />}
          label="AI Teacher Chat"
          active={currentTab === 'chat'}
          onClick={() => setCurrentTab('chat')}
        />
        <NavItem
          icon={<LayoutDashboard className="w-4 h-4 text-accent-cyan" />}
          label="Session Dashboard"
          active={currentTab === 'dashboard'}
          onClick={() => setCurrentTab('dashboard')}
        />
        <NavItem
          icon={<Radio className="w-4 h-4 text-red-500" />}
          label="Live Capture Studio"
          active={currentTab === 'live'}
          onClick={() => setCurrentTab('live')}
        />
        <NavItem
          icon={<FileText className="w-4 h-4 text-amber-600" />}
          label="Transcript & Visuals"
          active={currentTab === 'transcript'}
          onClick={() => setCurrentTab('transcript')}
        />
        <NavItem
          icon={<Layers className="w-4 h-4 text-indigo-600" />}
          label="Smart Slide Collection"
          active={currentTab === 'slides'}
          onClick={() => setCurrentTab('slides')}
        />
        <NavItem
          icon={<Presentation className="w-4 h-4 text-brand-600" />}
          label="Study Pack & PPT"
          active={currentTab === 'artifacts'}
          onClick={() => setCurrentTab('artifacts')}
        />
        <NavItem
          icon={<HelpCircle className="w-4 h-4 text-accent-violet" />}
          label="Practice & Quiz"
          active={currentTab === 'quiz'}
          onClick={() => setCurrentTab('quiz')}
        />
        <NavItem
          icon={<UserCheck className="w-4 h-4 text-blue-600" />}
          label="Learner Profile & Gaps"
          active={currentTab === 'learner'}
          onClick={() => setCurrentTab('learner')}
        />
      </div>

      {/* Session History Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Pinned Sessions */}
        {pinnedSessions.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <Pin className="w-3 h-3 text-amber-500" />
              Pinned Sessions
            </div>
            <div className="space-y-1">
              {pinnedSessions.map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  isActive={activeSession?.id === s.id}
                  onSelect={() => onSelectSession(s)}
                  onDelete={() => onDeleteSession(s.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        <div>
          <div className="px-2 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Recent Sessions ({recentSessions.length})
          </div>
          <div className="space-y-1">
            {recentSessions.length === 0 ? (
              <p className="text-xs text-slate-400 px-2 py-1 italic">No recent sessions</p>
            ) : (
              recentSessions.map((s) => (
                <SessionItem
                  key={s.id}
                  session={s}
                  isActive={activeSession?.id === s.id}
                  onSelect={() => onSelectSession(s)}
                  onDelete={() => onDeleteSession(s.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Status Panel */}
      <div className="p-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-600">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <span className={`w-2 h-2 rounded-full ${systemStatus?.ollama_connected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            Ollama AI: {systemStatus?.ollama_connected ? 'Connected' : 'Local Fallback'}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono font-semibold">
            v1.0.0
          </span>
        </div>
      </div>
    </aside>
  );
};

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
      active
        ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200 shadow-sm'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`}
  >
    {icon}
    <span className="truncate">{label}</span>
  </button>
);

const SessionItem: React.FC<{
  session: LearningSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}> = ({ session, isActive, onSelect, onDelete }) => (
  <div
    className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
      isActive
        ? 'bg-brand-50/80 border border-brand-300 text-brand-800'
        : 'hover:bg-slate-50 text-slate-700 border border-transparent'
    }`}
    onClick={onSelect}
  >
    <div className="flex-1 min-w-0 pr-2">
      <p className="font-semibold truncate text-slate-800 group-hover:text-slate-900">{session.title}</p>
      <p className="text-[10px] text-slate-500 truncate">{session.source_platform}</p>
    </div>
    <button
      onClick={(e) => {
        e.stopPropagation();
        onDelete();
      }}
      title="Delete session"
      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-opacity"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
);
