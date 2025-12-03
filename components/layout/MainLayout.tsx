
import React, { useState } from 'react';
import { Page } from '../../types';
import Sidebar from './Sidebar';
import { useShowrunnerStore } from '../../store/showrunnerStore';
import { saveProject } from '../../services/storageService';
import { Save, Loader2 } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, currentPage, setCurrentPage }) => {
  const project = useShowrunnerStore((state) => state.project);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const handleSave = async () => {
    if (project && !saveStatus) {
      setSaveStatus("Initializing...");
      // Add a slight delay to allow UI to update before main thread gets busy
      await new Promise(resolve => setTimeout(resolve, 50));
      
      try {
        await saveProject(project, (status) => setSaveStatus(status));
      } catch (e) {
          console.error("Save failed", e);
      } finally {
        setSaveStatus(null);
      }
    }
  };

  return (
    <div className="flex h-screen w-full bg-base">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-surface border-b border-subtle flex items-center justify-between p-2 h-14 shrink-0">
          <div className="flex-1">
            {/* Breadcrumbs or other header content can go here */}
          </div>
          <button 
            onClick={handleSave}
            disabled={!project || !!saveStatus}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-50 text-neutral-900 rounded-md hover:bg-slate-200 disabled:bg-neutral-600 disabled:text-neutral-400 disabled:cursor-not-allowed transition-colors min-w-[150px] justify-center"
            title="Save Project"
          >
            {saveStatus ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="truncate max-w-[200px]">{saveStatus}</span>
                </>
            ) : (
                <>
                    <Save className="w-4 h-4" />
                    <span>Save Project</span>
                </>
            )}
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
            {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
