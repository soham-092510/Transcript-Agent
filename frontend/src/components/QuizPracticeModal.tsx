import React, { useState } from 'react';
import { 
  HelpCircle, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ArrowRight, 
  Zap, 
  Loader2, 
  PlusCircle, 
  Wand2, 
  Sliders, 
  X, 
  BookOpen, 
  Layers 
} from 'lucide-react';
import { QuizQuestion, LearningSession, Concept } from '../types';

interface QuizPracticeModalProps {
  session: LearningSession;
  questions: QuizQuestion[];
  concepts?: Concept[];
  onSubmitAnswer: (questionId: string, selectedIdx: number) => Promise<any>;
  onImportPdf: (file: File) => Promise<any>;
  onTeachConcept: (conceptName: string) => void;
  onGenerateOngoingQuiz?: () => Promise<void>;
  onCreateCustomQuiz?: (conceptName: string, numQuestions: number, difficulty: string) => Promise<void>;
}

export const QuizPracticeModal: React.FC<QuizPracticeModalProps> = ({
  session,
  questions,
  concepts = [],
  onSubmitAnswer,
  onImportPdf,
  onTeachConcept,
  onGenerateOngoingQuiz,
  onCreateCustomQuiz,
}) => {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submittedResult, setSubmittedResult] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Custom Quiz Dialog state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [customConcept, setCustomConcept] = useState('');
  const [customCount, setCustomCount] = useState(5);
  const [customDifficulty, setCustomDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  const curQ = questions[currentQIndex];

  const handleOptionSelect = (idx: number) => {
    if (submittedResult) return;
    setSelectedOption(idx);
  };

  const handleSubmit = async () => {
    if (selectedOption === null || !curQ) return;
    const res = await onSubmitAnswer(curQ.id, selectedOption);
    setSubmittedResult(res);
  };

  const handleNext = () => {
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
      setSelectedOption(null);
      setSubmittedResult(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      try {
        await onImportPdf(e.target.files[0]);
        setCurrentQIndex(0);
        setSelectedOption(null);
        setSubmittedResult(null);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleGenerate = async () => {
    if (!onGenerateOngoingQuiz) return;
    setIsGenerating(true);
    try {
      await onGenerateOngoingQuiz();
      setCurrentQIndex(0);
      setSelectedOption(null);
      setSubmittedResult(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenCreateModal = () => {
    // Pre-populate with first concept or session title if empty
    if (!customConcept) {
      if (concepts.length > 0) {
        setCustomConcept(concepts[0].name);
      } else {
        setCustomConcept(session.title);
      }
    }
    setIsCreateModalOpen(true);
  };

  const handleConfirmCustomQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateCustomQuiz || !customConcept.trim()) return;
    setIsSubmittingCustom(true);
    try {
      await onCreateCustomQuiz(customConcept.trim(), customCount, customDifficulty);
      setIsCreateModalOpen(false);
      setCurrentQIndex(0);
      setSelectedOption(null);
      setSubmittedResult(null);
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0B0F17] p-6 lg:p-8 space-y-6 relative">
      {/* Custom Quiz Dialog Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
          <div className="glass-panel border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 sm:p-7 space-y-6 shadow-2xl relative text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-metallic-glow">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-base">Create Custom Practice Quiz</h3>
                  <p className="text-xs text-slate-400">Generate targeted questions with Ollama AI</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCustomQuiz} className="space-y-5">
              {/* Concept / Topic Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Concept or Topic Name</span>
                  <span className="text-[11px] text-sky-400 font-normal">Provided to Ollama</span>
                </label>
                <input
                  type="text"
                  required
                  value={customConcept}
                  onChange={(e) => setCustomConcept(e.target.value)}
                  placeholder="e.g., Recursion in Python, TCP 3-Way Handshake, Splicing..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-sky-500 transition-all"
                />

                {/* Quick Select Chips from Lecture Concepts */}
                {concepts.length > 0 && (
                  <div className="pt-1">
                    <p className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-1 font-medium">
                      <Sparkles className="w-3 h-3 text-sky-400" />
                      Detected in this Lecture (click to fill):
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pr-1">
                      {concepts.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCustomConcept(c.name)}
                          className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                            customConcept.toLowerCase() === c.name.toLowerCase()
                              ? 'bg-sky-500/20 border-sky-500 text-sky-200 font-medium'
                              : 'bg-slate-850 hover:bg-slate-800 border-slate-750 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Number of Questions (Quiz Size) */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Number of Questions (Quiz Size)</span>
                  <span className="text-[11px] text-slate-400 font-mono">{customCount} Questions</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 10, 15].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setCustomCount(cnt)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        customCount === cnt
                          ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-metallic-subtle'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {cnt} Questions
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
                  <span>Or custom count (1-20):</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={customCount}
                    onChange={(e) => setCustomCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                    className="w-16 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 text-center text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Difficulty Level */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Target Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['EASY', 'MEDIUM', 'HARD'] as const).map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => setCustomDifficulty(diff)}
                      className={`py-1.5 rounded-xl text-xs font-semibold border capitalize transition-all ${
                        customDifficulty === diff
                          ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-metallic-subtle'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {diff.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmittingCustom}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCustom || !customConcept.trim()}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-2 shadow-metallic-glow transition-all disabled:opacity-50"
                >
                  {isSubmittingCustom ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Ollama Generating {customCount} Questions...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      Create {customCount} Questions with Ollama
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main View: Empty State */}
      {(!questions || questions.length === 0) ? (
        <div className="flex-1 overflow-y-auto bg-[#0B0F17] p-8 flex flex-col items-center justify-center text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 flex items-center justify-center text-sky-400 shadow-metallic-subtle">
            <HelpCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-xl font-bold text-slate-100 tracking-tight">No Practice Questions Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Create a custom quiz with Ollama by giving your concept and size, or generate questions from <span className="text-sky-300 font-medium">{session.title}</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-metallic-glow transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Create Custom Quiz in Quiz
            </button>

            {onGenerateOngoingQuiz && (
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-400 hover:text-sky-300 font-semibold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {isGenerating ? 'Synthesizing...' : 'Generate Ongoing Concept Quiz'}
              </button>
            )}

            <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-semibold text-xs flex items-center gap-2 transition-all">
              <Upload className="w-4 h-4 text-sky-400" />
              {isUploading ? 'Extracting...' : 'Import Quiz PDF'}
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-md bg-sky-950/80 border border-sky-800/60 text-sky-300 text-[11px] font-semibold uppercase tracking-wider">
                  Practice Mode
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Question {currentQIndex + 1} of {questions.length}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-100 tracking-tight mt-1.5 flex items-center gap-2">
                Exam Readiness & Concept Check
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Active Concept: <span className="text-sky-300 font-medium">{curQ.concept_tested}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={handleOpenCreateModal}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-metallic-glow transition-all"
                title="Create a new quiz with custom size and concept name using Ollama"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Create Quiz
              </button>

              {onGenerateOngoingQuiz && (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-400 hover:text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
                  title="Regenerate questions from current lecture transcript"
                >
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  {isGenerating ? 'Generating...' : 'Refresh Concept'}
                </button>
              )}

              <label className="cursor-pointer px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm">
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                {isUploading ? 'Importing...' : 'PDF'}
                <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Main Question Card */}
          <div className="max-w-3xl mx-auto rounded-2xl bg-gradient-to-b from-[#131B2B] to-[#0F1624] border border-slate-800/90 p-6 sm:p-7 space-y-6 shadow-metallic-panel">
            {/* Concept Tested Tag */}
            <div className="flex items-center justify-between text-xs border-b border-slate-800/60 pb-3">
              <span className="text-slate-400">
                Concept Tested: <span className="font-semibold text-sky-300 ml-1">{curQ.concept_tested}</span>
              </span>
              {curQ.relevant_timestamp && (
                <span className="text-slate-400 font-mono text-[11px] bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                  {curQ.relevant_timestamp}
                </span>
              )}
            </div>

            {/* Question Text */}
            <h3 className="text-base sm:text-lg font-semibold text-slate-100 leading-relaxed">
              {curQ.question}
            </h3>

            {/* Options */}
            <div className="space-y-3">
              {curQ.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const isSubmitted = submittedResult !== null;
                const isCorrect = isSubmitted && idx === submittedResult.correct_option_index;
                const isWrong = isSubmitted && isSelected && !submittedResult.is_correct;

                let cardClass = 'border-slate-800/80 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900/90';
                if (isSelected && !isSubmitted) cardClass = 'border-sky-500 bg-sky-950/40 text-sky-100 shadow-metallic-subtle';
                if (isCorrect) cardClass = 'border-emerald-500/80 bg-emerald-950/40 text-emerald-100 shadow-metallic-glow';
                if (isWrong) cardClass = 'border-red-500/80 bg-red-950/40 text-red-100';

                return (
                  <div
                    key={idx}
                    onClick={() => handleOptionSelect(idx)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs sm:text-sm ${cardClass}`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
                        isCorrect
                          ? 'bg-emerald-500 text-white'
                          : isWrong
                          ? 'bg-red-500 text-white'
                          : isSelected
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="leading-snug">{opt}</span>
                    </div>

                    {isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />}
                    {isWrong && <XCircle className="w-5 h-5 text-red-400 shrink-0 ml-2" />}
                  </div>
                );
              })}
            </div>

            {/* Submitted Feedback Box */}
            {submittedResult && (
              <div
                className={`p-4 sm:p-5 rounded-xl border text-xs sm:text-sm space-y-2.5 animate-in fade-in ${
                  submittedResult.is_correct
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {submittedResult.is_correct ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Correct Answer
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-amber-400" />
                      Review Concept Pitfall
                    </>
                  )}
                </div>
                <p className="leading-relaxed text-slate-300 text-xs sm:text-sm">{submittedResult.explanation}</p>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    onClick={() => onTeachConcept(curQ.concept_tested)}
                    className="px-3.5 py-1.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-sky-300 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    Review "{curQ.concept_tested}" in AI Teacher
                  </button>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800/80">
              <button
                onClick={() => {
                  if (currentQIndex > 0) {
                    setCurrentQIndex(currentQIndex - 1);
                    setSelectedOption(null);
                    setSubmittedResult(null);
                  }
                }}
                disabled={currentQIndex === 0}
                className="px-4 py-2 rounded-xl bg-slate-900 disabled:opacity-30 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold transition-colors"
              >
                Previous
              </button>

              {!submittedResult ? (
                <button
                  onClick={handleSubmit}
                  disabled={selectedOption === null}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-40 text-white text-xs font-semibold shadow-metallic-glow transition-all"
                >
                  Verify Answer
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={currentQIndex === questions.length - 1}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 shadow-metallic-glow transition-all"
                >
                  Next Question
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
