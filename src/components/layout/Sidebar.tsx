'use client';
import React, { useState } from 'react';
import { useBookmarkStore } from '../../store/useBookmarkStore';
import * as Icons from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    collections,
    bookmarks,
    selectedCollectionId,
    selectedTag,
    setSelectedCollectionId,
    setSelectedTag,
    addCollection
  } = useBookmarkStore();

  const [newColName, setNewColName] = useState('');
  const [showAddCol, setShowAddCol] = useState(false);

  // Filter bookmarks so that tags only count active non-archived ones
  const activeBookmarks = bookmarks.filter((b) => !b.isArchived);

  // Get all unique tags from active bookmarks
  const allTags = Array.from(
    new Set(activeBookmarks.flatMap((b) => b.tags))
  ).filter(Boolean);

  // Count stats
  const totalCount = bookmarks.filter((b) => !b.isArchived).length;
  const favoriteCount = bookmarks.filter((b) => b.isFavorite && !b.isArchived).length;
  const readLaterCount = bookmarks.filter((b) => b.readLater && !b.isArchived).length;
  const archivedCount = bookmarks.filter((b) => b.isArchived).length;

  const handleAddCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    
    // Minimalist pastel colors
    const colors = ['#2F5D50', '#4f46e5', '#0d9488', '#ca8a04', '#0284c7', '#7c3aed'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    addCollection({
      name: newColName,
      description: 'Custom collection',
      color: randomColor,
      iconName: 'Folder'
    });
    setNewColName('');
    setShowAddCol(false);
  };

  const renderIcon = (name: string, color: string) => {
    const IconComponent = (Icons as any)[name];
    if (IconComponent) {
      return <IconComponent size={16} style={{ color }} />;
    }
    return <Icons.Folder size={16} style={{ color }} />;
  };

  return (
    <aside className="w-64 bg-surface border-r border-border-custom text-text-main flex flex-col h-screen sticky top-0 transition-colors duration-200">
      {/* Brand */}
      <div className="p-6 border-b border-border-custom flex items-center gap-2.5">
        <div className="p-1.5 bg-brand-soft text-brand rounded-lg">
          <Icons.Bookmark size={18} fill="currentColor" />
        </div>
        <h1 className="text-lg font-semibold tracking-tight font-sans text-text-main">
          Vaultly
        </h1>
      </div>

      {/* Navigation */}
      <div className="p-4 flex-grow overflow-y-auto space-y-6">
        <div className="space-y-0.5">
          {/* All Bookmarks */}
          <button
            onClick={() => setSelectedCollectionId('all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-200 ${
              selectedCollectionId === 'all' && !selectedTag
                ? 'bg-brand-soft text-brand font-semibold'
                : 'text-text-muted hover:bg-surface-muted hover:text-text-main'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icons.Inbox size={16} />
              <span>All Bookmarks</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-text-muted">
              {totalCount}
            </span>
          </button>

          {/* Favorites */}
          <button
            onClick={() => setSelectedCollectionId('favorites')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-200 ${
              selectedCollectionId === 'favorites' && !selectedTag
                ? 'bg-brand-soft text-brand font-semibold'
                : 'text-text-muted hover:bg-surface-muted hover:text-text-main'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icons.Heart size={16} />
              <span>Favorites</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-text-muted">
              {favoriteCount}
            </span>
          </button>

          {/* Read Later */}
          <button
            onClick={() => setSelectedCollectionId('read-later')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-200 ${
              selectedCollectionId === 'read-later' && !selectedTag
                ? 'bg-brand-soft text-brand font-semibold'
                : 'text-text-muted hover:bg-surface-muted hover:text-text-main'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icons.Clock size={16} />
              <span>Read Later</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-text-muted">
              {readLaterCount}
            </span>
          </button>

          {/* Archive */}
          <button
            onClick={() => setSelectedCollectionId('archive')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-200 ${
              selectedCollectionId === 'archive' && !selectedTag
                ? 'bg-brand-soft text-brand font-semibold'
                : 'text-text-muted hover:bg-surface-muted hover:text-text-main'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Icons.Archive size={16} />
              <span>Archive</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted text-text-muted">
              {archivedCount}
            </span>
          </button>
        </div>

        {/* Collections */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            <span>Collections</span>
            <button 
              onClick={() => setShowAddCol(!showAddCol)}
              className="hover:text-brand transition-colors"
              title="Add Collection"
            >
              <Icons.Plus size={12} />
            </button>
          </div>

          {showAddCol && (
            <form onSubmit={handleAddCollection} className="px-3 mb-3">
              <input
                type="text"
                placeholder="Collection name..."
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-surface border border-border-custom rounded-lg text-xs text-text-main focus:outline-none focus:border-brand transition-colors"
                autoFocus
              />
            </form>
          )}

          <div className="space-y-0.5">
            {collections.map((col) => {
              const count = bookmarks.filter((b) => b.collectionId === col.id && !b.isArchived).length;
              return (
                <button
                  key={col.id}
                  onClick={() => setSelectedCollectionId(col.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-200 ${
                    selectedCollectionId === col.id && !selectedTag
                      ? 'bg-surface-muted text-text-main font-semibold border border-border-custom'
                      : 'text-text-muted hover:bg-surface-muted/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {renderIcon(col.iconName, col.color)}
                    <span className="truncate">{col.name}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-muted/50 text-text-muted/80">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tags */}
        <div>
          <div className="px-3 mb-2.5 text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Icons.Tag size={12} />
            <span>Tags</span>
          </div>
          <div className="flex flex-wrap gap-1.5 px-3">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-all duration-150 ${
                  selectedTag === tag
                    ? 'bg-brand border-brand text-white font-medium'
                    : 'bg-surface border-border-custom hover:border-text-muted/40 text-text-muted'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
