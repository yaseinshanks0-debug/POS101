import React, { useState } from 'react';
import { SpecSection } from '../types';
import { 
  Check, 
  Copy, 
  AlertTriangle, 
  Info, 
  AlertOctagon, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight,
  Code,
  FileCode
} from 'lucide-react';

interface SectionViewerProps {
  section: SpecSection;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  prevTitle?: string;
  nextTitle?: string;
}

export const SectionViewer: React.FC<SectionViewerProps> = ({
  section,
  onNavigatePrev,
  onNavigateNext,
  prevTitle,
  nextTitle
}) => {
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 md:p-8 overflow-y-auto max-w-5xl">
      {/* Section Header */}
      <div className="border-b border-slate-800 pb-6 mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {section.badge}
          </span>
          <span className="text-xs text-slate-500">Deliverable #{section.number} of 12</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          {section.title}
        </h1>
        <p className="text-sm text-slate-300 mt-2 leading-relaxed">
          {section.summary}
        </p>
      </div>

      {/* Subsections */}
      <div className="space-y-10">
        {section.subsections.map((sub, sIdx) => (
          <section key={sub.id} className="space-y-4">
            <h2 className="text-lg md:text-xl font-bold text-indigo-200 border-l-2 border-indigo-500 pl-3">
              {sub.title}
            </h2>

            {/* Callouts */}
            {sub.callouts?.map((callout, cIdx) => (
              <div 
                key={cIdx} 
                className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${
                  callout.type === 'critical' 
                    ? 'bg-rose-950/40 border-rose-800/60 text-rose-200' 
                    : callout.type === 'warning'
                    ? 'bg-amber-950/40 border-amber-800/60 text-amber-200'
                    : callout.type === 'success'
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                    : 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {callout.type === 'critical' && <AlertOctagon className="w-4 h-4 text-rose-400" />}
                  {callout.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                  {callout.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {callout.type === 'info' && <Info className="w-4 h-4 text-indigo-400" />}
                </div>
                <div>
                  <strong className="block font-semibold mb-0.5">{callout.title}</strong>
                  <span>{callout.message}</span>
                </div>
              </div>
            ))}

            {/* Markdown / Text Content */}
            <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-line leading-relaxed text-xs sm:text-sm">
              {sub.content}
            </div>

            {/* Tables */}
            {sub.tables?.map((table, tIdx) => (
              <div key={tIdx} className="overflow-x-auto rounded-xl border border-slate-800 my-4 shadow-md bg-slate-900/50">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800 text-slate-200 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-700">
                    <tr>
                      {table.headers.map((h, hIdx) => (
                        <th key={hIdx} className="px-4 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {table.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-800/40 transition">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-4 py-3 leading-relaxed align-top">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            {/* Code Snippets */}
            {sub.codeSnippets?.map((snippet, snIdx) => {
              const snippetId = `${sub.id}-${snIdx}`;
              const isCopied = copiedIndex === snippetId;

              return (
                <div key={snIdx} className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden my-4 shadow-lg">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700/60 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-mono text-slate-300 text-[11px]">
                        {snippet.filename || `${snippet.language} snippet`}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(snippet.code, snippetId)}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-[10px] transition"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed scrollbar-thin scrollbar-thumb-slate-700">
                    <code>{snippet.code}</code>
                  </pre>
                </div>
              );
            })}
          </section>
        ))}
      </div>

      {/* Pagination Footer */}
      <div className="mt-12 pt-6 border-t border-slate-800 flex items-center justify-between gap-4">
        {onNavigatePrev ? (
          <button
            onClick={onNavigatePrev}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 transition"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400" />
            <div className="text-left">
              <span className="block text-[10px] text-slate-500 uppercase">Previous</span>
              <span className="truncate max-w-[140px] sm:max-w-[200px] block font-semibold">{prevTitle}</span>
            </div>
          </button>
        ) : <div />}

        {onNavigateNext ? (
          <button
            onClick={onNavigateNext}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-medium text-slate-300 transition ml-auto"
          >
            <div className="text-right">
              <span className="block text-[10px] text-slate-500 uppercase">Next</span>
              <span className="truncate max-w-[140px] sm:max-w-[200px] block font-semibold">{nextTitle}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-indigo-400" />
          </button>
        ) : <div />}
      </div>
    </div>
  );
};
