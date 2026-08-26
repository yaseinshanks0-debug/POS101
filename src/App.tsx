import React, { useState } from 'react';
import { Header, NavigationTab } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SectionViewer } from './components/SectionViewer';
import { PostgresSchemaCatalog } from './components/PostgresSchemaCatalog';
import { PostgresMigrationsViewer } from './components/PostgresMigrationsViewer';
import { ConsistencyReviewViewer } from './components/ConsistencyReviewViewer';
import { InteractiveSchemaExplorer } from './components/InteractiveSchemaExplorer';
import { SyncSimulator } from './components/SyncSimulator';
import { PricingPipelineSimulator } from './components/PricingPipelineSimulator';
import { ArchitectureDiagramViewer } from './components/ArchitectureDiagramViewer';
import { BackendModulesViewer } from './components/BackendModulesViewer';
import { MobilePosApp } from './mobile-pos/components/MobilePosApp';
import { allSections } from './data/specData';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('flutter-pos');
  const [activeSectionId, setActiveSectionId] = useState<string>('prd');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentSectionIndex = allSections.findIndex(s => s.id === activeSectionId);
  const currentSection = allSections[currentSectionIndex] || allSections[0];

  const prevSection = currentSectionIndex > 0 ? allSections[currentSectionIndex - 1] : undefined;
  const nextSection = currentSectionIndex < allSections.length - 1 ? allSections[currentSectionIndex + 1] : undefined;

  const handleExportMarkdown = () => {
    let fullMarkdown = `# Mobile Point of Sale (POS) & Inventory Management System\n`;
    fullMarkdown += `## Master Technical Specification & Architecture Blueprint\n\n`;
    fullMarkdown += `> Generated on: ${new Date().toISOString()}\n\n`;

    allSections.forEach(section => {
      fullMarkdown += `\n---\n\n# ${section.number}. ${section.title}\n\n`;
      fullMarkdown += `**Summary**: ${section.summary}\n\n`;

      section.subsections.forEach(sub => {
        fullMarkdown += `\n## ${sub.title}\n\n`;
        fullMarkdown += `${sub.content}\n\n`;

        if (sub.tables) {
          sub.tables.forEach(table => {
            fullMarkdown += `| ${table.headers.join(' | ')} |\n`;
            fullMarkdown += `| ${table.headers.map(() => '---').join(' | ')} |\n`;
            table.rows.forEach(row => {
              fullMarkdown += `| ${row.join(' | ')} |\n`;
            });
            fullMarkdown += `\n`;
          });
        }

        if (sub.codeSnippets) {
          sub.codeSnippets.forEach(snippet => {
            fullMarkdown += `\`\`\`${snippet.language}\n// File: ${snippet.filename || 'snippet'}\n${snippet.code}\n\`\`\`\n\n`;
          });
        }
      });
    });

    const blob = new Blob([fullMarkdown], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'POS_Inventory_Master_Technical_Specification.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onExportMarkdown={handleExportMarkdown}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'flutter-pos' && <MobilePosApp />}

        {activeTab === 'spec' && (
          <>
            <Sidebar
              sections={allSections}
              activeSectionId={activeSectionId}
              onSelectSection={setActiveSectionId}
              searchQuery={searchQuery}
            />
            <SectionViewer
              section={currentSection}
              onNavigatePrev={prevSection ? () => setActiveSectionId(prevSection.id) : undefined}
              onNavigateNext={nextSection ? () => setActiveSectionId(nextSection.id) : undefined}
              prevTitle={prevSection?.shortTitle}
              nextTitle={nextSection?.shortTitle}
            />
          </>
        )}

        {activeTab === 'backend-modules' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <BackendModulesViewer />
          </div>
        )}
        {activeTab === 'pg-catalog' && <PostgresSchemaCatalog />}
        {activeTab === 'pg-migrations' && <PostgresMigrationsViewer />}
        {activeTab === 'pg-review' && <ConsistencyReviewViewer />}
        {activeTab === 'schema' && <InteractiveSchemaExplorer />}
        {activeTab === 'sync-sim' && <SyncSimulator />}
        {activeTab === 'pricing-sim' && <PricingPipelineSimulator />}
        {activeTab === 'diagrams' && <ArchitectureDiagramViewer />}
      </div>
    </div>
  );
}
