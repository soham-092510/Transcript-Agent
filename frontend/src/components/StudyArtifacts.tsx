import React, { useState } from 'react';
import { 
  Presentation, 
  FileText, 
  Download, 
  Sparkles, 
  Layers, 
  Check, 
  Copy, 
  CheckCircle2,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { LearningSession } from '../types';

interface StudyArtifactsProps {
  session: LearningSession;
  onGeneratePPT: (style: string, count: number) => Promise<{ filename: string; download_url: string } | null>;
  onGeneratePDF: (type: 'teaching_report' | 'visual_pack') => Promise<{ filename: string; download_url: string } | null>;
}

const PPT_STYLES = [
  { id: 'teaching', name: 'Teaching PPT', desc: 'Structured pedagogy, concepts, analogies, diagrams' },
  { id: 'exam', name: 'Exam Revision PPT', desc: 'High-yield definitions, rule sets, common exam traps' },
  { id: 'quick', name: 'Quick Summary PPT', desc: 'Concise 5-slide executive overview' },
  { id: 'detailed', name: 'Detailed Course PPT', desc: 'In-depth 12-15 slide comprehensive deck' },
  { id: 'visual', name: 'Visual / Diagram PPT', desc: 'Heavy visual focus on captured lecture screenshots' },
];

export const StudyArtifacts: React.FC<StudyArtifactsProps> = ({
  session,
  onGeneratePPT,
  onGeneratePDF,
}) => {
  const [selectedPptStyle, setSelectedPptStyle] = useState('teaching');
  const [slideCount, setSlideCount] = useState(8);
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);
  const [lastPPTUrl, setLastPPTUrl] = useState<string | null>(null);

  const [isGeneratingPDFReport, setIsGeneratingPDFReport] = useState(false);
  const [lastPDFReportUrl, setLastPDFReportUrl] = useState<string | null>(null);

  const [isGeneratingVisualPack, setIsGeneratingVisualPack] = useState(false);
  const [lastVisualPackUrl, setLastVisualPackUrl] = useState<string | null>(null);

  const handleCreatePPT = async () => {
    setIsGeneratingPPT(true);
    try {
      const res = await onGeneratePPT(selectedPptStyle, slideCount);
      if (res) {
        setLastPPTUrl(`http://localhost:8000${res.download_url}`);
      }
    } finally {
      setIsGeneratingPPT(false);
    }
  };

  const handleCreatePDF = async (type: 'teaching_report' | 'visual_pack') => {
    if (type === 'teaching_report') {
      setIsGeneratingPDFReport(true);
      try {
        const res = await onGeneratePDF('teaching_report');
        if (res) setLastPDFReportUrl(`http://localhost:8000${res.download_url}`);
      } finally {
        setIsGeneratingPDFReport(false);
      }
    } else {
      setIsGeneratingVisualPack(true);
      try {
        const res = await onGeneratePDF('visual_pack');
        if (res) setLastVisualPackUrl(`http://localhost:8000${res.download_url}`);
      } finally {
        setIsGeneratingVisualPack(false);
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Presentation className="w-5 h-5 text-brand-600" />
          Study Artifacts & Presentation Generator
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate structured PowerPoint presentations and professional PDF study packs directly from captured session intelligence.
        </p>
      </div>

      {/* Artifacts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Card 1: PowerPoint Generation */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-500 flex items-center justify-center text-white shadow-sm">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">PowerPoint Presentation (PPT)</h3>
              <p className="text-xs text-slate-500">Never raw transcript dumps. Generates clean, designed slides with visuals.</p>
            </div>
          </div>

          {/* Style Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Choose Presentation Style:</label>
            <div className="grid grid-cols-1 gap-2">
              {PPT_STYLES.map((st) => (
                <div
                  key={st.id}
                  onClick={() => setSelectedPptStyle(st.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedPptStyle === st.id
                      ? 'bg-brand-50 border-brand-500 text-slate-900 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-900">{st.name}</span>
                    {selectedPptStyle === st.id && <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{st.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Slide Count Range */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between text-xs text-slate-700">
              <span>Target Slide Count</span>
              <span className="font-mono font-bold text-brand-600">{slideCount} Slides</span>
            </div>
            <input
              type="range"
              min={5}
              max={15}
              value={slideCount}
              onChange={(e) => setSlideCount(parseInt(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={handleCreatePPT}
              disabled={isGeneratingPPT}
              className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              {isGeneratingPPT ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Synthesizing Presentation...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Presentation (.PPTX)
                </>
              )}
            </button>

            {lastPPTUrl && (
              <a
                href={lastPPTUrl}
                download
                className="px-4 py-2.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs flex items-center gap-1.5 border border-brand-200 transition-all"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            )}
          </div>
        </div>

        {/* Card 2: PDF Study Packs */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center text-white shadow-sm">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">PDF Study Reports & Packs</h3>
                <p className="text-xs text-slate-500">Publication-grade documents formatted with ReportLab.</p>
              </div>
            </div>

            {/* Sub-item: AI Teaching Report */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-xs text-slate-900">PDF B: AI Teaching Report</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Complete lecture notes, grounded concepts table, step-by-step mechanisms, exam highlights, and practice questions.
                  </p>
                </div>
              </div>
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => handleCreatePDF('teaching_report')}
                  disabled={isGeneratingPDFReport}
                  className="py-1.5 px-3 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  {isGeneratingPDFReport ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Generate Teaching PDF
                </button>
                {lastPDFReportUrl && (
                  <a
                    href={lastPDFReportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1 border border-slate-200 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Report
                  </a>
                )}
              </div>
            </div>

            {/* Sub-item: Visual Study Pack */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-xs text-slate-900">PDF A: Visual Study Pack</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Curated visual deck of all verified lecture slides, architecture diagrams, timestamps, and extracted OCR text.
                  </p>
                </div>
              </div>
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => handleCreatePDF('visual_pack')}
                  disabled={isGeneratingVisualPack}
                  className="py-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  {isGeneratingVisualPack ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Generate Visual Pack PDF
                </button>
                {lastVisualPackUrl && (
                  <a
                    href={lastVisualPackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1 border border-slate-200 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Pack
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
