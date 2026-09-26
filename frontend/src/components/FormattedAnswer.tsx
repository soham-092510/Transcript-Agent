import React, { useState } from 'react';
import { Check, Copy, Terminal, ChevronRight, Sparkles } from 'lucide-react';

interface FormattedAnswerProps {
  content: string;
  className?: string;
}

export const FormattedAnswer: React.FC<FormattedAnswerProps> = ({ content, className = '' }) => {
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const handleCopyCode = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  // Helper to render inline formatting: bold (**), italic (*), and inline code (`)
  const renderInlineFormatted = (text: string) => {
    // Split by inline code, bold, and italic tokens
    const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

    return tokens.map((part, idx) => {
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-800/90 border border-slate-700/70 text-sky-300 font-mono text-[11px] shadow-2xs inline-block"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={idx} className="font-semibold text-slate-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return (
          <em key={idx} className="italic text-slate-300">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  // Parse markdown content into structured blocks
  const parseBlocks = (raw: string) => {
    const lines = raw.split('\n');
    const blocks: Array<{
      type: 'header' | 'bullet' | 'numbered' | 'quote' | 'code' | 'paragraph';
      level?: number;
      text?: string;
      items?: string[];
      number?: string;
      language?: string;
    }> = [];

    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLanguage = '';
    let currentParagraph: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        blocks.push({
          type: 'paragraph',
          text: currentParagraph.join(' ').trim()
        });
        currentParagraph = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Code block start/end
      if (trimmed.startsWith('```')) {
        if (!inCodeBlock) {
          flushParagraph();
          inCodeBlock = true;
          codeLanguage = trimmed.slice(3).trim();
          codeBuffer = [];
        } else {
          inCodeBlock = false;
          blocks.push({
            type: 'code',
            text: codeBuffer.join('\n'),
            language: codeLanguage
          });
          codeBuffer = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // Empty line breaks paragraphs
      if (!trimmed) {
        flushParagraph();
        continue;
      }

      // Headers (#, ##, ###, ####)
      const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headerMatch) {
        flushParagraph();
        blocks.push({
          type: 'header',
          level: headerMatch[1].length,
          text: headerMatch[2]
        });
        continue;
      }

      // Blockquotes (> or 💡 or ⚠️)
      if (trimmed.startsWith('>') || trimmed.startsWith('💡') || trimmed.startsWith('⚠️') || trimmed.startsWith('📌')) {
        flushParagraph();
        blocks.push({
          type: 'quote',
          text: trimmed.replace(/^>\s*/, '')
        });
        continue;
      }

      // Numbered list (e.g. 1. or 2.)
      const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
      if (numberedMatch) {
        flushParagraph();
        blocks.push({
          type: 'numbered',
          number: numberedMatch[1],
          text: numberedMatch[2]
        });
        continue;
      }

      // Bullet points (- or * or •)
      const bulletMatch = trimmed.match(/^[-*•]\s+(.+)$/);
      if (bulletMatch) {
        flushParagraph();
        blocks.push({
          type: 'bullet',
          text: bulletMatch[1]
        });
        continue;
      }

      // Regular text belongs to paragraph
      currentParagraph.push(trimmed);
    }

    flushParagraph();

    // If code block was not closed
    if (inCodeBlock && codeBuffer.length > 0) {
      blocks.push({
        type: 'code',
        text: codeBuffer.join('\n'),
        language: codeLanguage
      });
    }

    return blocks;
  };

  const blocks = parseBlocks(content);
  let codeCounter = 0;

  return (
    <div className={`space-y-3 font-sans text-xs leading-relaxed text-slate-300 ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === 'header') {
          const levelClass =
            block.level === 1
              ? 'text-base font-bold text-slate-100 tracking-tight border-b border-slate-700/50 pb-1.5 mt-3'
              : block.level === 2
              ? 'text-sm font-bold text-slate-100 tracking-tight mt-2.5 mb-1'
              : 'text-xs font-bold text-slate-200 tracking-tight mt-2 flex items-center gap-1.5';

          return (
            <div key={idx} className={levelClass}>
              {block.level === 3 && <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
              <span>{renderInlineFormatted(block.text || '')}</span>
            </div>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <p key={idx} className="text-slate-300 leading-relaxed text-xs">
              {renderInlineFormatted(block.text || '')}
            </p>
          );
        }

        if (block.type === 'bullet') {
          return (
            <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300 pl-1.5 my-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400/80 mt-1.5 shrink-0 shadow-2xs" />
              <div className="flex-1 min-w-0">
                {renderInlineFormatted(block.text || '')}
              </div>
            </div>
          );
        }

        if (block.type === 'numbered') {
          return (
            <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-300 pl-1 my-1.5">
              <span className="w-4 h-4 rounded-md bg-slate-800 border border-slate-700/80 text-sky-400 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                {block.number}
              </span>
              <div className="flex-1 min-w-0">
                {renderInlineFormatted(block.text || '')}
              </div>
            </div>
          );
        }

        if (block.type === 'quote') {
          return (
            <div
              key={idx}
              className="p-3 my-2 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-slate-200 shadow-2xs backdrop-blur-md relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-sky-400 to-indigo-400" />
              <div className="pl-2">
                {renderInlineFormatted(block.text || '')}
              </div>
            </div>
          );
        }

        if (block.type === 'code') {
          const currentCodeIdx = codeCounter++;
          const isCopied = copiedCodeIndex === currentCodeIdx;
          return (
            <div
              key={idx}
              className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-lg my-2.5 font-mono text-xs"
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 border-b border-slate-800/80 text-[10px] text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Terminal className="w-3 h-3 text-sky-400" />
                  {block.language || 'code'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyCode(block.text || '', currentCodeIdx)}
                  className="flex items-center gap-1 hover:text-slate-100 transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-sans">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="font-sans">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-[11px] leading-relaxed text-sky-100 scrollbar-thin">
                <code>{block.text}</code>
              </pre>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};
