'use client';

import { useState, useEffect, useMemo } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { BookmarkCard } from '../components/ui/BookmarkCard';
import { AddBookmarkModal } from '../components/ui/AddBookmarkModal';
import { useBookmarkStore } from '../store/useBookmarkStore';
import { Sparkles, FolderOpen, Heart, Inbox, Clock, Archive } from 'lucide-react';

export default function Home() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Hydration protection for Zustand persist + LocalStorage
  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    bookmarks,
    collections,
    selectedCollectionId,
    selectedTag,
    searchQuery,
    viewMode
  } = useBookmarkStore();

  const activeCollection = collections.find((c) => c.id === selectedCollectionId);

  // Optimized Filter logic using useMemo
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((bookmark) => {
      // 1. Archive & Read Later & Collection Filter
      if (selectedCollectionId === 'archive') {
        if (!bookmark.isArchived) return false;
      } else if (selectedCollectionId === 'read-later') {
        if (!bookmark.readLater || bookmark.isArchived) return false;
      } else if (selectedCollectionId === 'favorites') {
        if (!bookmark.isFavorite || bookmark.isArchived) return false;
      } else if (selectedCollectionId === 'all') {
        if (bookmark.isArchived) return false;
      } else {
        if (bookmark.collectionId !== selectedCollectionId || bookmark.isArchived) return false;
      }

      // 2. Tag Filter
      if (selectedTag && !bookmark.tags.includes(selectedTag)) {
        return false;
      }

      // 3. Search Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitle = bookmark.title.toLowerCase().includes(query);
        const matchDesc = bookmark.description.toLowerCase().includes(query);
        const matchUrl = bookmark.url.toLowerCase().includes(query);
        const matchTags = bookmark.tags.some((t) => t.toLowerCase().includes(query));
        
        if (!matchTitle && !matchDesc && !matchUrl && matchTags) {
          return false;
        }
      }

      return true;
    });
  }, [bookmarks, selectedCollectionId, selectedTag, searchQuery]);

  // Header Title & Description
  const getHeaderInfo = () => {
    if (selectedTag) {
      return {
        title: `Tagged: #${selectedTag}`,
        description: `Showing all saved resources categorized under tag "${selectedTag}"`,
        icon: <Sparkles className="text-brand" size={18} />
      };
    }
    if (selectedCollectionId === 'all') {
      return {
        title: 'All Bookmarks',
        description: 'Your central library of saved links, reference materials, and digital tools.',
        icon: <Inbox className="text-brand" size={18} fill="currentColor" />
      };
    }
    if (selectedCollectionId === 'favorites') {
      return {
        title: 'Favorites',
        description: 'Quick access to your most frequently used and highly valued resources.',
        icon: <Heart className="text-rose-500" fill="currentColor" size={18} />
      };
    }
    if (selectedCollectionId === 'read-later') {
      return {
        title: 'Read Later',
        description: 'Your digital reading shelf. Links saved to review or digest at a later time.',
        icon: <Clock className="text-brand" size={18} fill="currentColor" />
      };
    }
    if (selectedCollectionId === 'archive') {
      return {
        title: 'Archive',
        description: 'Historical archive of bookmarks you want to keep but hide from the active view.',
        icon: <Archive className="text-amber-600" size={18} />
      };
    }
    if (activeCollection) {
      return {
        title: activeCollection.name,
        description: activeCollection.description || 'Collection of saved resources.',
        icon: <FolderOpen style={{ color: activeCollection.color }} size={18} />
      };
    }
    return {
      title: 'Vaultly Shelf',
      description: 'Your personal digital shelf.',
      icon: <Inbox className="text-brand" size={18} />
    };
  };

  const headerInfo = getHeaderInfo();

  // Grid layout class based on view mode (list vs grid/compact)
  const gridClass = viewMode === 'list'
    ? 'grid grid-cols-1 gap-3 w-full'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5';

  // Prevent rendering on server to avoid hydration mismatches with LocalStorage
  if (!mounted) {
    return (
      <div className="flex h-screen w-screen bg-surface-muted/10 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-text-muted font-mono">Vaultly is loading...</span>
        </div>
      </div>
    );
  }

  return (
    <MainLayout onAddClick={() => setIsAddModalOpen(true)}>
      <div className="p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Dashboard Header */}
        <div className="flex items-start gap-3.5 pb-5 border-b border-border-custom transition-colors duration-200">
          <div className="p-2 bg-surface border border-border-custom rounded-xl mt-0.5 shadow-xs">
            {headerInfo.icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-text-main">{headerInfo.title}</h2>
            <p className="text-xs text-text-muted mt-0.5 max-w-xl leading-relaxed">
              {headerInfo.description}
            </p>
          </div>
        </div>

        {/* Bookmarks Grid */}
        {filteredBookmarks.length > 0 ? (
          <div className={gridClass}>
            {filteredBookmarks.map((bookmark) => (
              <BookmarkCard key={bookmark.id} bookmark={bookmark} />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-3.5">
            <div className="p-4 bg-surface border border-border-custom rounded-full text-text-muted/60 shadow-xs">
              <Inbox size={32} />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-text-main">Digital shelf is empty</h3>
              <p className="text-xs text-text-muted max-w-[280px]">
                No links found matching your active filter. Save your first link or reset tag filter.
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-1.5 bg-brand hover:bg-brand/90 text-white rounded-lg text-xs font-medium transition-all duration-150 active:scale-95 cursor-pointer"
            >
              Save Your First Link
            </button>
          </div>
        )}
      </div>

      {/* Add Bookmark Modal */}
      <AddBookmarkModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </MainLayout>
  );
}
