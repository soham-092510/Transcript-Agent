import React from 'react';
import { 
  UserCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Award,
  Pin,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { LearnerProfile, LearningSession } from '../types';

interface LearnerProfileViewProps {
  session: LearningSession;
  profile: LearnerProfile | null;
  onTeachAgain: (conceptName: string) => void;
}

export const LearnerProfileView: React.FC<LearnerProfileViewProps> = ({
  session,
  profile,
  onTeachAgain,
}) => {
  if (!profile) {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 p-8 text-center text-slate-500 text-xs">
        Loading learner profile...
      </div>
    );
  }

  const accuracyPct = Math.round(profile.practice_accuracy * 100);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-blue-600" />
          Learner Profile & Knowledge Mastery
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Personalized educational model tracking your grasped concepts, questions asked, and targeted weak areas.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase">Questions Asked</p>
          <p className="text-2xl font-bold text-slate-900 font-mono mt-1">{profile.questions_asked_count}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Interactive Doubts</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-emerald-700 uppercase">Concepts Grasped</p>
          <p className="text-2xl font-bold text-emerald-700 font-mono mt-1">{profile.concepts_grasped.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Verified Through Practice</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-amber-700 uppercase">Weak Areas</p>
          <p className="text-2xl font-bold text-amber-700 font-mono mt-1">{profile.weak_areas.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Needs Quick Revision</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-teal-700 uppercase">Practice Accuracy</p>
          <p className="text-2xl font-bold text-teal-700 font-mono mt-1">{accuracyPct}%</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Assessment Preparedness</p>
        </div>
      </div>

      {/* Weak Areas & Revision Coaching */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold text-slate-900 text-base">Knowledge Gap Remediation</h3>
        </div>
        <p className="text-xs text-slate-500">
          Based on your interactive questions and practice answers, LearnLens AI identified these specific topics for reinforcement:
        </p>

        {profile.weak_areas.length === 0 ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            No significant knowledge gaps identified yet! You have answered all practice checks with confidence.
          </div>
        ) : (
          <div className="space-y-2.5">
            {profile.weak_areas.map((w, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-xs text-slate-900">{w}</p>
                  <p className="text-[11px] text-slate-500">
                    Recommended remediation: Re-explain mechanism and review corresponding slide diagrams.
                  </p>
                </div>
                <button
                  onClick={() => onTeachAgain(w)}
                  className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-semibold text-xs flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Teach Again
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Viewed Concepts Matrix */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">Observed Curriculum Progress</h3>
          <span className="text-xs text-slate-500 font-mono">{profile.concepts_viewed.length} Concepts Tracked</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.concepts_viewed.map((c, i) => (
            <span
              key={i}
              className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3 h-3 text-brand-600" />
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
