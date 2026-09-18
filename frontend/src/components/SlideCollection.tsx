import React, { useState } from 'react';
import { 
  Layers, 
  Search, 
  Filter, 
  Download, 
  Pin, 
  Sparkles, 
  X, 
  FileText, 
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { FrameCapture, VisualCategory } from '../types';

interface SlideCollectionProps {
  frames: FrameCapture[];
  onTogglePinFrame: (frameId: string, currentPinned: boolean) => void;
  onTeachWithSlide: (frame: FrameCapture) => void;
  selectedPreviewId: string | null;
  setSelectedPreviewId: (id: string | null) => void;
}

const CATEGORIES = ['ALL', 'DIAGRAM', 'TABLE', 'CODE', 'SLIDE', 'DEFINITION'];

export const SlideCollection: React.FC<SlideCollectionProps> = ({
  frames,
  onTogglePinFrame,
  onTeachWithSlide,
  selectedPreviewId,
  setSelectedPreviewId,
}) => {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchFilter, setSearchFilter] = useState('');

  const filteredFrames = frames.filter((f) => {
    const matchesCat = activeCategory === 'ALL' || f.category === activeCategory;
    const matchesSearch = !searchFilter || 
      f.ocr_text.toLowerCase().includes(searchFilter.toLowerCase()) ||
      f.visual_description.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activeModalFrame = frames.find((f) => f.id === selectedPreviewId);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Smart Slide & Diagram Collection ({frames.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deduplicated visual knowledge extracted through perceptual scene-change hashing and computer vision.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search OCR text or diagrams..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 shadow-sm transition-colors"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategory === cat
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Frames Grid */}
      {filteredFrames.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Layers className="w-10 h-10 mx-auto text-slate-400 stroke-1 mb-2" />
          <p className="text-sm font-medium text-slate-500">No slides match your current filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFrames.map((frame) => (
            <div
              key={frame.id}
              className="rounded-2xl bg-white border border-slate-200 hover:border-brand-400 shadow-sm hover:shadow overflow-hidden flex flex-col justify-between group transition-all"
            >
              {/* Image Preview */}
              <div
                className="relative aspect-video bg-slate-100 cursor-pointer overflow-hidden"
                onClick={() => setSelectedPreviewId(frame.id)}
              >
                <img
                  src={`http://localhost:8000/api/frames/${frame.id}/image`}
                  alt="Lecture Slide"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <span className="text-xs font-semibold text-white flex items-center gap-1">
                    <ExternalLink className="w-3.5 h-3.5" /> Inspect Visual Details
                  </span>
                </div>
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-md bg-white/95 text-[10px] font-mono font-semibold text-brand-700 border border-slate-200 shadow-sm">
                    [{frame.timestamp_formatted}]
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/95 text-[10px] font-bold text-teal-700 border border-slate-200 shadow-sm">
                    {frame.category}
                  </span>
                </div>
              </div>

              {/* Card Meta */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                    {frame.visual_description}
                  </p>
                  {frame.ocr_text && (
                    <p className="text-[11px] text-slate-600 font-mono line-clamp-2 mt-1 bg-slate-50 p-1.5 rounded border border-slate-200">
                      {frame.ocr_text}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => onTogglePinFrame(frame.id, frame.is_pinned)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      frame.is_pinned ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                    title={frame.is_pinned ? 'Unpin' : 'Pin to Study Pack'}
                  >
                    <Pin className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onTeachWithSlide(frame)}
                    className="px-3 py-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Teach This Slide
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide High-Res Inspection Modal */}
      {activeModalFrame && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-mono font-bold">
                  {activeModalFrame.timestamp_formatted}
                </span>
                <h3 className="text-base font-bold text-slate-900">{activeModalFrame.category} Inspection</h3>
              </div>
              <button
                onClick={() => setSelectedPreviewId(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* High Res Image */}
            <div className="rounded-xl overflow-hidden bg-slate-50 border border-slate-200">
              <img
                src={`http://localhost:8000/api/frames/${activeModalFrame.id}/image`}
                alt="Full preview"
                className="w-full max-h-[480px] object-contain mx-auto"
              />
            </div>

            {/* Description & Extracted OCR */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-teal-700 uppercase tracking-wider text-[10px]">Visual Analysis</p>
                <p className="text-slate-700 leading-relaxed">{activeModalFrame.visual_description}</p>
                <p className="text-slate-500 pt-2">Importance Score: {(activeModalFrame.importance_score * 100).toFixed(0)}%</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <p className="font-bold text-brand-700 uppercase tracking-wider text-[10px]">Extracted Text (OCR)</p>
                <p className="text-slate-700 font-mono leading-relaxed whitespace-pre-line">
                  {activeModalFrame.ocr_text || 'No significant printed text on this visual frame.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  onTeachWithSlide(activeModalFrame);
                  setSelectedPreviewId(null);
                }}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                Teach Me This Slide in AI Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
