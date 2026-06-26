import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Bookmark, Collection, Note } from '../utils/mockData';
import { mockBookmarks, mockCollections } from '../utils/mockData';

interface BookmarkState {
  bookmarks: Bookmark[];
  collections: Collection[];
  notes: Note[];
  selectedCollectionId: string; // 'all', 'favorites', 'read-later', 'archive', 'notes', or col_id
  selectedTag: string | null;
  searchQuery: string;
  viewMode: 'grid' | 'compact' | 'list';
  theme: 'light' | 'dark';
  
  // Bookmark Actions
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'clicksCount' | 'isArchived'>) => void;
  deleteBookmark: (id: string) => void;
  updateBookmark: (id: string, updates: Partial<Bookmark>) => void;
  toggleFavoriteBookmark: (id: string) => void;
  toggleArchiveBookmark: (id: string) => void;
  toggleReadLaterBookmark: (id: string) => void;
  incrementClickCount: (id: string) => void;
  
  // Collection Actions
  addCollection: (collection: Omit<Collection, 'id'>) => void;
  deleteCollection: (id: string) => void;

  // Note Actions
  addNote: (note: Omit<Note, 'id' | 'createdAt'>) => void;
  deleteNote: (id: string) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  
  // Filter Actions
  setSelectedCollectionId: (id: string) => void;
  setSelectedTag: (tag: string | null) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'grid' | 'compact' | 'list') => void;
  toggleTheme: () => void;
}

export const useBookmarkStore = create<BookmarkState>()(
  persist(
    (set) => ({
      bookmarks: mockBookmarks,
      collections: mockCollections,
      notes: [
        {
          id: "note_1",
          title: "Vaultly Ideas",
          content: "Add a quick search filter, improve oklch forest green color values, and optimize card hover states.",
          color: "oklch(0.95 0.02 150)", // Pastel green
          createdAt: new Date().toISOString()
        },
        {
          id: "note_2",
          title: "Useful resources",
          content: "Check out reactbits.dev for smooth text animations, and overreacted.io for clean design patterns.",
          color: "oklch(0.95 0.02 70)", // Pastel yellow
          createdAt: new Date().toISOString()
        }
      ],
      selectedCollectionId: 'all',
      selectedTag: null,
      searchQuery: '',
      viewMode: 'grid',
      theme: 'light',

      addBookmark: (bookmarkData) => set((state) => {
        const newBookmark: Bookmark = {
          ...bookmarkData,
          id: `bm_${Date.now()}`,
          isArchived: false,
          clicksCount: 0,
          createdAt: new Date().toISOString(),
        };
        return { bookmarks: [newBookmark, ...state.bookmarks] };
      }),

      deleteBookmark: (id) => set((state) => ({
        bookmarks: state.bookmarks.filter((b) => b.id !== id),
      })),

      updateBookmark: (id, updates) => set((state) => ({
        bookmarks: state.bookmarks.map((b) => b.id === id ? { ...b, ...updates } : b),
      })),

      toggleFavoriteBookmark: (id) => set((state) => ({
        bookmarks: state.bookmarks.map((b) => 
          b.id === id ? { ...b, isFavorite: !b.isFavorite } : b
        ),
      })),

      toggleArchiveBookmark: (id) => set((state) => ({
        bookmarks: state.bookmarks.map((b) => 
          b.id === id ? { ...b, isArchived: !b.isArchived, readLater: false } : b
        ),
      })),

      toggleReadLaterBookmark: (id) => set((state) => ({
        bookmarks: state.bookmarks.map((b) => 
          b.id === id ? { ...b, readLater: !b.readLater, isArchived: false } : b
        ),
      })),

      incrementClickCount: (id) => set((state) => ({
        bookmarks: state.bookmarks.map((b) => 
          b.id === id 
            ? { ...b, clicksCount: b.clicksCount + 1 } 
            : b
        ),
      })),

      addCollection: (collectionData) => set((state) => {
        const newCollection: Collection = {
          ...collectionData,
          id: `col_${Date.now()}`,
        };
        return { collections: [...state.collections, newCollection] };
      }),

      deleteCollection: (id) => set((state) => ({
        collections: state.collections.filter((c) => c.id !== id),
        bookmarks: state.bookmarks.map((b) => 
          b.collectionId === id ? { ...b, collectionId: '' } : b
        ),
        selectedCollectionId: state.selectedCollectionId === id ? 'all' : state.selectedCollectionId,
      })),

      addNote: (noteData) => set((state) => {
        const newNote: Note = {
          ...noteData,
          id: `note_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        return { notes: [newNote, ...state.notes] };
      }),

      deleteNote: (id) => set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
      })),

      updateNote: (id, updates) => set((state) => ({
        notes: state.notes.map((n) => n.id === id ? { ...n, ...updates } : n),
      })),

      setSelectedCollectionId: (id) => set({ selectedCollectionId: id, selectedTag: null }),
      setSelectedTag: (tag) => set({ selectedTag: tag }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setViewMode: (mode) => set({ viewMode: mode }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'vaultly-storage', // LocalStorage key
      partialize: (state) => ({
        bookmarks: state.bookmarks,
        collections: state.collections,
        notes: state.notes,
        viewMode: state.viewMode,
        theme: state.theme,
      }), // Save only essential data, skip temporary search queries & active filters
    }
  )
);
