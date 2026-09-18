import React, { useState } from 'react';
import { 
  HelpCircle, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Sparkles, 
  ArrowRight, 
  RotateCcw,
  BookOpen,
  Award
} from 'lucide-react';
import { QuizQuestion, LearningSession } from '../types';

interface QuizPracticeModalProps {
  session: LearningSession;
  questions: QuizQuestion[];
  onSubmitAnswer: (questionId: string, selectedIdx: number) => Promise<any>;
  onImportPdf: (file: File) => Promise<any>;
  onTeachConcept: (conceptName: string) => void;
}

export const QuizPracticeModal: React.FC<QuizPracticeModalProps> = ({
  session,
  questions,
  onSubmitAnswer,
  onImportPdf,
  onTeachConcept,
}) => {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submittedResult, setSubmittedResult] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const curQ = questions[currentQIndex];

  const handleOptionSelect = (idx: number) => {
    if (submittedResult) return; // already answered this question
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
      } finally {
        setIsUploading(false);
      }
    }
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-slate-50 p-8 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shadow-sm">
          <HelpCircle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">No Practice Questions Yet</h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Upload an assessment quiz PDF or wait for LearnLens to synthesize practice questions from your captured concepts.
        </p>
        <label className="cursor-pointer px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-sm">
          <Upload className="w-4 h-4" />
          {isUploading ? 'Extracting Questions...' : 'Import Quiz PDF'}
          <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold uppercase tracking-wider">
              Practice Mode
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Question {currentQIndex + 1} of {questions.length}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Exam Readiness & Self-Assessment
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            AI prepares the human learner. Graded assessment attempts remain in your complete human control.
          </p>
        </div>

        <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm">
          <Upload className="w-3.5 h-3.5 text-purple-600" />
          {isUploading ? 'Importing...' : 'Upload New Quiz PDF'}
          <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {/* Main Question Card */}
      <div className="max-w-3xl mx-auto rounded-2xl bg-white border border-slate-200 p-6 space-y-6 shadow-sm">
        {/* Concept Tested Tag */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Concept Tested: <span className="font-semibold text-brand-700">{curQ.concept_tested}</span>
          </span>
          {curQ.relevant_timestamp && (
            <span className="text-slate-500 font-mono">
              Source Timestamp: [{curQ.relevant_timestamp}]
            </span>
          )}
        </div>

        {/* Question Text */}
        <h3 className="text-base font-semibold text-slate-900 leading-relaxed">
          {curQ.question}
        </h3>

        {/* Options */}
        <div className="space-y-2.5">
          {curQ.options.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            const isSubmitted = submittedResult !== null;
            const isCorrect = isSubmitted && idx === submittedResult.correct_option_index;
            const isWrong = isSubmitted && isSelected && !submittedResult.is_correct;

            let borderClass = 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100/80';
            if (isSelected && !isSubmitted) borderClass = 'border-brand-500 bg-brand-50 text-brand-900 font-medium';
            if (isCorrect) borderClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
            if (isWrong) borderClass = 'border-red-500 bg-red-50 text-red-900';

            return (
              <div
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${borderClass}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center font-mono font-bold text-[11px] text-slate-700 shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt}</span>
                </div>

                {isCorrect && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                {isWrong && <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
              </div>
            );
          })}
        </div>

        {/* Submitted Feedback Box */}
        {submittedResult && (
          <div
            className={`p-4 rounded-xl border text-xs space-y-2 animate-in fade-in ${
              submittedResult.is_correct
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {submittedResult.is_correct ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Correct! Well done!
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-amber-600" />
                  Knowledge Gap Detected
                </>
              )}
            </div>
            <p className="leading-relaxed text-slate-700">{submittedResult.explanation}</p>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => onTeachConcept(curQ.concept_tested)}
                className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Teach This Concept in AI Tutor
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            onClick={() => {
              if (currentQIndex > 0) {
                setCurrentQIndex(currentQIndex - 1);
                setSelectedOption(null);
                setSubmittedResult(null);
              }
            }}
            disabled={currentQIndex === 0}
            className="px-4 py-2 rounded-xl bg-slate-100 disabled:opacity-40 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
          >
            Previous
          </button>

          {!submittedResult ? (
            <button
              onClick={handleSubmit}
              disabled={selectedOption === null}
              className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              Verify Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={currentQIndex === questions.length - 1}
              className="px-5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              Next Question
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
