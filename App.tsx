
import React, { useState, useEffect } from 'react';
import { useShowrunnerStore } from './store/showrunnerStore';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import PlaceholderPage from './pages/PlaceholderPage';
import StoryBible from './pages/StoryBible';
import Scriptwriter from './pages/Scriptwriter';
import ArtDept from './pages/ArtDept';
import TheStudio from './pages/TheStudio';
import SoundStage from './pages/SoundStage';
import Settings from './pages/Settings';
import { Page } from './types';
import { BrainCircuit } from 'lucide-react';

export default function App() {
  const { project, loadAutosave, isLoaded } = useShowrunnerStore();
  const [currentPage, setCurrentPage] = useState<Page>('Dashboard');

  useEffect(() => {
    loadAutosave();
  }, []);

  useEffect(() => {
    if (!project) {
      setCurrentPage('Dashboard');
    }
  }, [project]);

  const renderPage = () => {
    if (!project) {
        if (currentPage === 'Settings') return <Settings />;
        return <Dashboard />;
    }
    switch (currentPage) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Story Bible':
        return <StoryBible />;
      case 'Scriptwriter':
        return <Scriptwriter />;
      case 'Art Dept':
        return <ArtDept />;
      case 'The Studio':
        return <TheStudio />;
      case 'Sound Stage':
        return <SoundStage />;
      case 'Merch & Print':
        return <PlaceholderPage title="Merch & Print" />;
      case 'Marketing':
        return <PlaceholderPage title="Marketing" />;
      case 'Settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  if (!isLoaded) {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-base text-primary">
              <BrainCircuit className="w-12 h-12 animate-spin mb-4 text-accent" />
              <p className="text-muted text-sm font-medium">Initializing Showrunner AI...</p>
          </div>
      );
  }

  return (
    <MainLayout currentPage={currentPage} setCurrentPage={setCurrentPage}>
      {renderPage()}
    </MainLayout>
  );
}
