
import React, { useState, useEffect, useRef } from 'react';
import { useShowrunnerStore } from '../store/showrunnerStore';
import ProjectWizard from '../components/dashboard/ProjectWizard';
import { Edit3, FilePlus, FolderOpen } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { project, closeProject, updateProjectName, importProject } = useShowrunnerStore();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(project?.metadata.name || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (project) {
        setNameInput(project.metadata.name);
    }
  }, [project]);

  useEffect(() => {
      if (isEditingName && inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
      }
  }, [isEditingName]);

  const handleNameUpdate = () => {
      if (nameInput.trim() && project && nameInput.trim() !== project.metadata.name) {
          updateProjectName(nameInput.trim());
      }
      setIsEditingName(false);
  };

  if (project) {
    return (
      <div className="text-primary-text">
        <div className="flex items-center gap-4 mb-2">
            {isEditingName ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onBlur={handleNameUpdate}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameUpdate()}
                    className="text-3xl font-black bg-panel border-subtle rounded-md p-1 -m-1"
                />
            ) : (
                <h1 className="text-3xl font-black text-primary">{project.metadata.name}</h1>
            )}
            <button onClick={() => setIsEditingName(!isEditingName)} className="text-muted hover:text-primary transition-colors">
                <Edit3 size={20} />
            </button>
        </div>

        <p className="text-muted mb-6 max-w-3xl">{project.logline}</p>
        <div className="bg-surface border border-subtle rounded-xl p-6">
          <h2 className="text-xl font-bold text-primary mb-4">Project Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
            <p><strong className="text-muted">Format:</strong> {project.format.type === 'EPISODIC' ? `${project.format.seasonCount || 1}-Season Series` : 'Single Story'}</p>
            <p><strong className="text-muted">{project.format.type === 'EPISODIC' ? 'Episodes/Season' : 'Acts'}:</strong> {project.format.episodeCount}</p>
            <p><strong className="text-muted">Duration:</strong> {project.format.duration} minutes</p>
            <p><strong className="text-muted">Style:</strong> {project.style.primary}</p>
            <p><strong className="text-muted">Audience:</strong> {project.style.audience}</p>
            <p><strong className="text-muted">Aspect Ratio:</strong> {project.format.aspectRatio}</p>
          </div>
        </div>
        <button onClick={closeProject} className="mt-8 px-4 py-2 text-sm font-medium text-primary-text bg-panel rounded-md hover:bg-subtle">
            Close Project
        </button>
      </div>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-4xl font-black text-primary mb-2">Showrunner AI</h1>
        <p className="text-muted max-w-2xl mb-12">The local-first operating system for media production. Create, manage, and produce your next big idea.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => setIsWizardOpen(true)} className="bg-surface border border-subtle rounded-xl p-6 text-left hover:border-accent transition-all duration-200 group">
            <FilePlus className="w-8 h-8 mb-4 text-muted group-hover:text-accent" />
            <h2 className="text-xl font-bold text-primary mb-2">Create New Project</h2>
            <p className="text-muted">Start from scratch with a guided setup for your film or series.</p>
          </button>
          <button onClick={importProject} className="bg-surface border border-subtle rounded-xl p-6 text-left hover:border-accent transition-all duration-200 group">
            <FolderOpen className="w-8 h-8 mb-4 text-muted group-hover:text-accent" />
            <h2 className="text-xl font-bold text-primary mb-2">Open Project File</h2>
            <p className="text-muted">Load a `.showrunner` file to continue your work.</p>
          </button>
        </div>
      </div>
      {isWizardOpen && <ProjectWizard onClose={() => setIsWizardOpen(false)} />}
    </>
  );
};

export default Dashboard;
