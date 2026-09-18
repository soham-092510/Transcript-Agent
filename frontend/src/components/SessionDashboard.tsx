import React from 'react';
import { 
  Play, 
  MessageSquare, 
  RotateCcw, 
  Presentation, 
  FileText, 
  Image as ImageIcon, 
  FileCheck, 
  HelpCircle,
  Pin,
  Clock,
  BookOpen,
  CheckCircle,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { LearningSession, Concept, LearnerProfile } from '../types';

interface SessionDashboardProps {
  session: LearningSession;
  concepts: Concept[];
  learnerProfile: LearnerProfile | null;
  onNavigateTab: (tab: string) => void;
  onQuickTeachConcept: (conceptName: string) => void;
  onGeneratePPT: () => void;
  onGeneratePDF: (type: 'teaching_report' | 'visual_pack') => void;
  onTogglePinConcept: (conceptId: string, currentPinned: boolean) => void;
}

export const SessionDashboard: React.FC<SessionDashboardProps> = ({
  session,
  concepts,
  learnerProfile,
  onNavigateTab,
  onQuickTeachConcept,
  onGeneratePPT,
  onGeneratePDF,
  onTogglePinConcept,
}) => {
  const durationMins = Math.floor(session.duration_sec / 60);
  const durationSecs = Math.floor(session.duration_sec % 60);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 space-y-8">
      {/* Hero Session Banner */}
      <div className="relative rounded-2xl bg-white border border-slate-200 shadow-sm p-6 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-semibold uppercase tracking-wider">
                {session.source_platform}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                ID: {session.id.slice(0, 16)}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{session.title}</h1>
            <p className="text-xs text-slate-600 max-w-xl">
              Knowledge base automatically compiled from your authorized Chrome observation. Grounded in multimodal video, speech, and OCR.
            </p>
          </div>

          {/* Quick Metrics Badge Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Processed" value={`${durationMins}m ${durationSecs}s`} sub="Captured Audio/Video" />
            <MetricCard label="Concepts" value={concepts.length.toString()} sub="Verified Knowledge" />
            <MetricCard label="Visual Slides" value={session.screenshot_count.toString()} sub="Deduplicated" />
            <MetricCard label="Weak Areas" value={(learnerProfile?.weak_areas.length || 0).toString()} sub="To Reinforce" highlight />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-600 font-medium">Session Learning Progress</span>
            <span className="text-brand-600 font-bold font-mono">{session.progress_pct}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${session.progress_pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Primary Action Buttons Grid (Prompt Section 14) */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Quick Actions & Tools
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ActionButton
            icon={<Play className="w-4 h-4 text-emerald-600" />}
            title="Continue Learning"
            desc="Resume capture & observation"
            onClick={() => onNavigateTab('live')}
          />
          <ActionButton
            icon={<MessageSquare className="w-4 h-4 text-brand-600" />}
            title="Ask AI Teacher"
            desc="Interactive doubt solving"
            onClick={() => onNavigateTab('chat')}
          />
          <ActionButton
            icon={<RotateCcw className="w-4 h-4 text-amber-600" />}
            title="Revise Session"
            desc="Targeted exam recap"
            onClick={() => onQuickTeachConcept("Revise the entire module")}
          />
          <ActionButton
            icon={<Presentation className="w-4 h-4 text-teal-600" />}
            title="Generate PPT"
            desc="Structured presentation"
            onClick={onGeneratePPT}
          />
          <ActionButton
            icon={<FileText className="w-4 h-4 text-blue-600" />}
            title="Teaching Report PDF"
            desc="Complete study guide"
            onClick={() => onGeneratePDF('teaching_report')}
          />
          <ActionButton
            icon={<ImageIcon className="w-4 h-4 text-indigo-600" />}
            title="Visual Study Pack"
            desc="Diagrams & screenshots"
            onClick={() => onGeneratePDF('visual_pack')}
          />
          <ActionButton
            icon={<FileCheck className="w-4 h-4 text-emerald-700" />}
            title="View Transcript"
            desc="Searchable timestamped text"
            onClick={() => onNavigateTab('transcript')}
          />
          <ActionButton
            icon={<HelpCircle className="w-4 h-4 text-purple-600" />}
            title="Practice Quiz"
            desc="Test your understanding"
            onClick={() => onNavigateTab('quiz')}
          />
        </div>
      </div>

      {/* Grounded Concepts List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Important Grounded Concepts ({concepts.length})
          </h3>
          <span className="text-xs text-brand-600 font-medium hover:underline cursor-pointer" onClick={() => onNavigateTab('chat')}>
            Teach All Concepts →
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {concepts.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-brand-300 shadow-sm transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-slate-900 text-sm">{c.name}</h4>
                  <button
                    onClick={() => onTogglePinConcept(c.id, c.is_pinned)}
                    title={c.is_pinned ? 'Unpin' : 'Pin concept'}
                    className={`p-1 rounded transition-colors ${c.is_pinned ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-3">
                  {c.definition}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-mono">
                  {c.evidence_timestamp ? `[${c.evidence_timestamp}]` : 'Lesson'}
                </span>
                <button
                  onClick={() => onQuickTeachConcept(`Teach me about ${c.name}`)}
                  className="px-2.5 py-1 rounded bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 font-semibold transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Teach Me
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; sub: string; highlight?: boolean }> = ({
  label, value, sub, highlight
}) => (
  <div className={`p-3 rounded-xl border ${highlight ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
    <p className="text-[10px] uppercase font-bold text-slate-500">{label}</p>
    <p className={`text-xl font-bold font-mono my-0.5 ${highlight ? 'text-amber-700' : 'text-slate-900'}`}>{value}</p>
    <p className="text-[10px] text-slate-500 truncate">{sub}</p>
  </div>
);

const ActionButton: React.FC<{ icon: React.ReactNode; title: string; desc: string; onClick: () => void }> = ({
  icon, title, desc, onClick
}) => (
  <button
    onClick={onClick}
    className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-brand-500 hover:shadow-md text-left transition-all group shadow-sm"
  >
    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
      {icon}
    </div>
    <p className="text-xs font-semibold text-slate-900 group-hover:text-brand-600">{title}</p>
    <p className="text-[10px] text-slate-500 truncate mt-0.5">{desc}</p>
  </button>
);
