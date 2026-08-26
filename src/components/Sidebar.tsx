import React from 'react';
import { SpecSection } from '../types';
import { 
  FileText, 
  Layers, 
  Component, 
  Database, 
  Network, 
  Smartphone, 
  RefreshCw, 
  ShieldCheck, 
  TestTube2, 
  Server, 
  FolderTree, 
  Milestone 
} from 'lucide-react';

interface SidebarProps {
  sections: SpecSection[];
  activeSectionId: string;
  onSelectSection: (id: string) => void;
  searchQuery: string;
}

const sectionIcons: Record<string, React.ReactNode> = {
  'prd': <FileText className="w-4 h-4" />,
  'system-arch': <Layers className="w-4 h-4" />,
  'domain-model': <Component className="w-4 h-4" />,
  'database-schema': <Database className="w-4 h-4" />,
  'api-spec': <Network className="w-4 h-4" />,
  'mobile-arch': <Smartphone className="w-4 h-4" />,
  'sync-spec': <RefreshCw className="w-4 h-4" />,
  'security-spec': <ShieldCheck className="w-4 h-4" />,
  'testing-strategy': <TestTube2 className="w-4 h-4" />,
  'deployment-arch': <Server className="w-4 h-4" />,
  'folder-structure': <FolderTree className="w-4 h-4" />,
  'roadmap': <Milestone className="w-4 h-4" />
};

export const Sidebar: React.FC<SidebarProps> = ({
  sections,
  activeSectionId,
  onSelectSection,
  searchQuery
}) => {
  const filteredSections = sections.filter(sec => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      sec.title.toLowerCase().includes(q) ||
      sec.summary.toLowerCase().includes(q) ||
      sec.subsections.some(sub => 
        sub.title.toLowerCase().includes(q) || 
        sub.content.toLowerCase().includes(q)
      )
    );
  });

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-[calc(100vh-7rem)] sticky top-28 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
      <div className="p-3 border-b border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
          <span>Deliverables</span>
          <span className="bg-slate-800 text-indigo-400 px-2 py-0.5 rounded text-[10px]">
            {filteredSections.length} / {sections.length}
          </span>
        </div>
      </div>

      <nav className="p-2 space-y-1">
        {filteredSections.map((section) => {
          const isActive = section.id === activeSectionId;
          const icon = sectionIcons[section.id] || <FileText className="w-4 h-4" />;

          return (
            <button
              key={section.id}
              onClick={() => onSelectSection(section.id)}
              className={`w-full text-left rounded-lg p-2.5 transition flex items-start gap-2.5 text-xs ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <div className={`mt-0.5 p-1 rounded ${isActive ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500'}`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-slate-200 truncate">
                    {section.shortTitle}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                    {section.badge}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                  {section.summary}
                </p>
              </div>
            </button>
          );
        })}

        {filteredSections.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-500">
            No sections match "{searchQuery}"
          </div>
        )}
      </nav>
    </aside>
  );
};
