import React from 'react';
import { Page } from '../../types';
import { useShowrunnerStore } from '../../store/showrunnerStore';
import {
  LayoutDashboard, BookOpen, FileText, GalleryHorizontal, Clapperboard, Settings, Music, Shirt, Megaphone
} from 'lucide-react';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const navItems = [
  { name: 'Dashboard' as Page, icon: LayoutDashboard },
  { name: 'Scriptwriter' as Page, icon: FileText },
  { name: 'Story Bible' as Page, icon: BookOpen },
  { name: 'Art Dept' as Page, icon: GalleryHorizontal },
  { name: 'The Studio' as Page, icon: Clapperboard },
  { name: 'Sound Stage' as Page, icon: Music },
  { name: 'Merch & Print' as Page, icon: Shirt },
  { name: 'Marketing' as Page, icon: Megaphone },
];

const settingsNav = { name: 'Settings' as Page, icon: Settings };

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const project = useShowrunnerStore((state) => state.project);

  return (
    <aside className="w-60 bg-surface border-r border-subtle flex flex-col p-4">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-8 h-8 bg-primary rounded-md"></div>
        <h1 className="text-xl font-bold text-primary">Showrunner</h1>
      </div>
      <nav className="flex-grow">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isEnabled = project || item.name === 'Dashboard';
            const isActive = currentPage === item.name;
            return (
              <li key={item.name}>
                <button
                  onClick={() => isEnabled && setCurrentPage(item.name)}
                  disabled={!isEnabled}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? 'bg-panel text-primary'
                      : 'text-muted hover:bg-panel hover:text-primary-text'
                  } ${!isEnabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div>
        <ul>
          <li>
            <button
              onClick={() => setCurrentPage(settingsNav.name)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-200 ${
                currentPage === 'Settings'
                  ? 'bg-panel text-primary'
                  : 'text-muted hover:bg-panel hover:text-primary-text'
              }`}
            >
              <settingsNav.icon className="w-5 h-5" />
              <span>{settingsNav.name}</span>
            </button>
          </li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;