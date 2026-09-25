import React from 'react';
import { 
  Home, 
  Radio, 
  GraduationCap, 
  FileText, 
  Layers, 
  Lightbulb, 
  Target, 
  Package, 
  Plus, 
  Sparkles, 
  Trash2, 
  ChevronRight, 
  Settings,
  Search,
  CheckCircle2
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
  onOpenSettings?: () => void;
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
  onOpenSettings,
}) => {
  // Recent sessions fallback items if empty for pixel-perfect initial preview
  const displayRecent = sessions.length > 0 ? sessions : [
    { id: 'demo1', title: 'TLS 1.3', source_platform: 'YouTube' } as any,
    { id: 'demo2', title: 'Neural Networks', source_platform: 'Coursera' } as any,
    { id: 'demo3', title: 'Python Basics', source_platform: 'Udemy' } as any,
    { id: 'demo4', title: 'Machine Learning', source_platform: 'YouTube' } as any,
    { id: 'demo5', title: 'Cyber Security', source_platform: 'Chrome Tab' } as any
  ];

  return (
    <aside className="w-56 bg-white border-r border-slate-200/80 flex flex-col h-screen select-none shrink-0 z-30 shadow-xs">
      
      {/* Top "+ New Workspace" Action Button */}
      <div className="p-3.5 pb-2">
        <button
          onClick={onStartLearning}
          className="w-full py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/20 transition-all transform active:scale-95 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Main Navigation Workspace Items */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 scrollbar-none">
        
        {/* WORKSPACE SECTION */}
        <div className="space-y-1">
          <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            WORKSPACE
          </p>
          
          <SidebarNavItem
            icon={<Home className="w-3.5 h-3.5" />}
            label="Overview"
            active={currentTab === 'dashboard'}
            onClick={() => setCurrentTab('dashboard')}
          />
          <SidebarNavItem
            icon={<Radio className="w-3.5 h-3.5" />}
            label="Live"
            active={currentTab === 'live'}
            onClick={() => setCurrentTab('live')}
            isLiveDot={true}
          />
          <SidebarNavItem
            icon={<GraduationCap className="w-3.5 h-3.5" />}
            label="Teacher"
            active={currentTab === 'chat'}
            onClick={() => setCurrentTab('chat')}
          />
          <SidebarNavItem
            icon={<FileText className="w-3.5 h-3.5" />}
            label="Transcript"
            active={currentTab === 'transcript'}
            onClick={() => setCurrentTab('transcript')}
          />
          <SidebarNavItem
            icon={<Layers className="w-3.5 h-3.5" />}
            label="Slides"
            active={currentTab === 'slides'}
            onClick={() => setCurrentTab('slides')}
          />
          <SidebarNavItem
            icon={<Lightbulb className="w-3.5 h-3.5" />}
            label="Knowledge"
            active={currentTab === 'learner'}
            onClick={() => setCurrentTab('learner')}
          />
          <SidebarNavItem
            icon={<Target className="w-3.5 h-3.5" />}
            label="Practice"
            active={currentTab === 'quiz'}
            onClick={() => setCurrentTab('quiz')}
          />
          <SidebarNavItem
            icon={<Package className="w-3.5 h-3.5" />}
            label="Artifacts"
            active={currentTab === 'artifacts'}
            onClick={() => setCurrentTab('artifacts')}
          />
        </div>

        {/* RECENT SECTION */}
        <div className="space-y-1 pt-2 border-t border-slate-100">
          <p className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            RECENT
          </p>

          <div className="space-y-0.5">
            {displayRecent.slice(0, 5).map((sess, idx) => {
              const isSelected = activeSession?.id === sess.id || (idx === 0 && !activeSession);
              return (
                <div
                  key={sess.id || idx}
                  onClick={() => onSelectSession(sess)}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50/70 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-1">
                    <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="truncate text-[11px]">{sess.title}</span>
                  </div>
                  {sess.id !== 'demo1' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(sess.id);
                      }}
                      title="Delete"
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-300 hover:text-red-500 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Information Cards Matching Reference Image */}
      <div className="p-3 border-t border-slate-100 space-y-2.5 bg-white shrink-0">
        {/* Today's Learning Card */}
        <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
            <span>Today's Learning</span>
            <span className="text-slate-800 font-mono">3h 42m</span>
          </div>
          {/* Soft Blue Progress Bar */}
          <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-600 h-full w-[65%] rounded-full" />
          </div>
        </div>

        {/* Upgrade / Better Learning with AI Card */}
        <button
          onClick={onLoadDemo}
          className="w-full p-2.5 rounded-xl bg-gradient-to-r from-blue-50/60 to-indigo-50/60 border border-blue-200/60 hover:border-blue-300 flex items-center justify-between text-left transition-all group cursor-pointer shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
              Better learning with AI
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </aside>
  );
};

const SidebarNavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  isLiveDot?: boolean;
}> = ({ icon, label, active, onClick, isLiveDot }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
      active
        ? 'bg-blue-50 text-blue-600 font-bold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium'
    }`}
  >
    <div className={`shrink-0 ${active ? 'text-blue-600' : 'text-slate-500'}`}>
      {icon}
    </div>
    <span className="truncate text-[11px]">{label}</span>
    {isLiveDot && active && (
      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 ml-auto shrink-0 animate-pulse" />
    )}
  </button>
);
