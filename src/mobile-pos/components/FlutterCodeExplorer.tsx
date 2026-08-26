import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  FolderTree, 
  Layers, 
  FileCode, 
  Smartphone, 
  Database, 
  ExternalLink,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { flutterCleanArchitectureFiles, FlutterFile } from '../flutter-code/flutterCodebaseData';

interface FlutterCodeExplorerProps {
  isArabic: boolean;
}

export const FlutterCodeExplorer: React.FC<FlutterCodeExplorerProps> = ({ isArabic }) => {
  const [selectedFile, setSelectedFile] = useState<FlutterFile>(flutterCleanArchitectureFiles[0]);
  const [activeLayerFilter, setActiveLayerFilter] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  const filteredFiles = flutterCleanArchitectureFiles.filter(f => {
    if (activeLayerFilter === 'all') return true;
    return f.layer.toLowerCase() === activeLayerFilter.toLowerCase();
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const layersList = [
    { id: 'all', label: 'All Files' },
    { id: 'Domain', label: 'Domain Layer (Entities & Repos)' },
    { id: 'Application', label: 'Application (BLoC State)' },
    { id: 'Infrastructure', label: 'Infrastructure (SQLite & Outbox)' },
    { id: 'Presentation', label: 'Presentation (Material 3 UI)' },
    { id: 'Hardware', label: 'Hardware (ESC/POS & Scanner)' },
    { id: 'Root', label: 'Config (pubspec & main)' },
  ];

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-emerald-400" />
            <span>{isArabic ? 'مستكشف كود فلاتر ومستودع Clean Architecture' : 'Flutter Mobile POS Source Codebase (Dart Clean Architecture)'}</span>
          </h2>
          <p className="text-xs text-slate-400">
            {isArabic ? 'هيكل المشروع الكامل بنمط Clean Architecture + BLoC + SQLite Offline Outbox' : 'Complete production-grade Flutter implementation with BLoC, SQLite, ESC/POS, and Outbox Sync.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied File!' : 'Copy Code'}</span>
          </button>
        </div>
      </div>

      {/* Layer Filter Pills */}
      <div className="p-2 bg-slate-900/60 border-b border-slate-800 flex gap-1.5 overflow-x-auto text-xs scrollbar-none">
        {layersList.map((layer) => (
          <button
            key={layer.id}
            onClick={() => setActiveLayerFilter(layer.id)}
            className={`px-3 py-1 rounded-lg whitespace-nowrap font-medium transition ${
              activeLayerFilter === layer.id
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {layer.label}
          </button>
        ))}
      </div>

      {/* Split Pane: File Tree & Code Viewer */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left File List */}
        <div className="w-full md:w-80 lg:w-96 bg-slate-900/90 border-r border-slate-800 flex flex-col overflow-hidden">
          <div className="p-2.5 font-bold text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
            Project Files ({filteredFiles.length})
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full p-2.5 rounded-xl text-left text-xs transition flex flex-col gap-0.5 ${
                    isSelected
                      ? 'bg-emerald-950/60 border border-emerald-700/80 text-emerald-200'
                      : 'hover:bg-slate-800 text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-semibold truncate pr-2 text-slate-100">{file.path}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {file.layer}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{file.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Code Display */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span className="font-mono font-bold text-slate-200">{selectedFile.path}</span>
            </div>
            <span className="text-slate-400 font-mono text-[11px]">{selectedFile.path.endsWith('.yaml') ? 'YAML' : 'DART'}</span>
          </div>

          <div className="flex-1 overflow-auto p-4 font-mono text-xs text-slate-300 leading-relaxed bg-[#0b0f19]">
            <pre tabIndex={0} className="focus:outline-none">
              {selectedFile.code}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
