'use client';
import React from 'react';
import { useBookmarkStore } from '../../store/useBookmarkStore';
import { Search, Plus, Sun, Moon, LayoutGrid, Grid, List, Bookmark } from 'lucide-react';

interface HeaderProps {
  onAddClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onAddClick }) => {
  const { 
    searchQuery, 
    setSearchQuery, 
    bookmarks, 
    viewMode, 
    setViewMode, 
    theme, 
    toggleTheme 
  } = useBookmarkStore();

  // Handle setting the HTML class for dark mode
  React.useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Count only active links
  const activeCount = bookmarks.filter((b) => !b.isArchived).length;

  return (
    <header className="h-16 border-b border-border-custom bg-surface flex items-center justify-between px-6 sticky top-0 z-10 transition-colors duration-200">
      {/* Search Bar */}
      <div className="relative w-80 max-w-full">
        <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-text-muted">
          <Search size={16} />
        </span>
        <input
          type="text"
          placeholder="Search on Vaultly..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-1.5 bg-surface-muted border border-border-custom rounded-lg text-xs text-text-main placeholder-text-muted/70 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all duration-200"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* View Mode Segment Controls */}
        <div className="flex items-center bg-surface-muted border border-border-custom p-0.5 rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-all duration-150 ${
              viewMode === 'grid'
                ? 'bg-surface text-brand shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
            title="Rich Grid View"
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewMode('compact')}
            className={`p-1.5 rounded-md transition-all duration-150 ${
              viewMode === 'compact'
                ? 'bg-surface text-brand shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
            title="Compact Grid View"
          >
            <Grid size={14} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-all duration-150 ${
              viewMode === 'list'
                ? 'bg-surface text-brand shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
            title="List View"
          >
            <List size={14} />
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 border border-border-custom rounded-lg text-text-muted hover:text-text-main hover:bg-surface-muted transition-all duration-150"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        </button>

        {/* Active Stats */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-muted border border-border-custom rounded-lg text-[11px] text-text-muted">
          <Bookmark size={12} className="text-brand" fill="currentColor" />
          <span>{activeCount} active</span>
        </div>

        {/* Add Link Button */}
        <button
          onClick={onAddClick}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand hover:bg-brand/90 text-white rounded-lg text-xs font-medium transition-all duration-150 hover:shadow-sm active:scale-95 cursor-pointer"
        >
          <Plus size={14} />
          <span>Save Link</span>
        </button>
      </div>
    </header>
  );
};
