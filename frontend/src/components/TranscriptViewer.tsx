import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Sparkles, 
  Copy, 
  Check, 
  Download, 
  ExternalLink,
  Clock,
  User
} from 'lucide-react';
import { TranscriptSegment } from '../types';

interface TranscriptViewerProps {
  segments: TranscriptSegment[];
  onTeachSegment: (segment: TranscriptSegment) => void;
  onSelectTimestamp: (timestamp: string) => void;
}

export const TranscriptViewer: React.FC<TranscriptViewerProps> = ({
  segments,
  onTeachSegment,
  onSelectTimestamp,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = segments.filter(s => 
    !searchTerm || s.text.toLowerCase().includes(searchTerm.toLowerCase()) || (s.topic && s.topic.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportTxt = () => {
    const fullContent = segments.map(s => `[${s.timestamp_formatted}] ${s.speaker || 'Instructor'}: ${s.text}`).join('\n\n');
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LearnLens_Transcript_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-500" />
            Timestamped Speech Transcript ({segments.length} Chunks)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronized audio transcription processed locally with faster-whisper.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search speech..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 shadow-sm"
            />
          </div>

          <button
            onClick={handleExportTxt}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export TXT
          </button>
        </div>
      </div>

      {/* Segments Feed */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs bg-white rounded-2xl border border-slate-200 shadow-sm">
            No transcript segments found matching your query.
          </div>
        ) : (
          filtered.map((seg) => (
            <div
              key={seg.id}
              className="p-4 rounded-xl bg-white border border-slate-200 hover:border-brand-300 transition-all flex items-start justify-between gap-4 group shadow-sm"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <button
                  onClick={() => onSelectTimestamp(seg.timestamp_formatted)}
                  className="px-2.5 py-1 rounded-md bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 font-mono text-xs font-semibold shrink-0 transition-colors flex items-center gap-1"
                >
                  <Clock className="w-3 h-3" />
                  {seg.timestamp_formatted}
                </button>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <User className="w-3 h-3 text-slate-400" />
                      {seg.speaker || 'Instructor'}
                    </span>
                    {seg.topic && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        {seg.topic}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-sans">
                    {seg.text}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleCopy(seg.id, seg.text)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Copy segment"
                >
                  {copiedId === seg.id ? <Check className="w-3.5 h-3.5 text-brand-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => onTeachSegment(seg)}
                  className="px-2.5 py-1 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  Teach This
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
