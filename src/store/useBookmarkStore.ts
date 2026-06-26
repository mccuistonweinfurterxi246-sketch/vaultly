import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Bookmark, Collection, Credential } from '../utils/mockData';
import { mockBookmarks, mockCollections } from '../utils/mockData';

interface BookmarkState {
  bookmarks: Bookmark[];
  collections: Collection[];
  credentials: Credential[];
  selectedCollectionId: string; // 'all', 'favorites', 'read-later', 'archive', 'credentials', or col_id
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

  // Credential Actions
  addCredential: (credential: Omit<Credential, 'id' | 'createdAt'>) => void;
  deleteCredential: (id: string) => void;
  updateCredential: (id: string, updates: Partial<Credential>) => void;
  
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
      credentials: [
        {
          id: "cred_1",
          title: "GitHub Account",
          websiteUrl: "https://github.com",
          usernameEmail: "mccuistonweinfurterxi246-sketch",
          passwordEncrypted: "GitSecurePass2026!",
          notes: "Personal developer account for Vaultly hosting",
          createdAt: new Date().toISOString()
        },
        {
          id: "cred_2",
          title: "Google Workspace",
          websiteUrl: "https://gmail.com",
          usernameEmail: "matar.dev@gmail.com",
          passwordEncrypted: "GooWorkSpace#88",
          notes: "Primary email address",
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

      addCredential: (credentialData) => set((state) => {
        const newCredential: Credential = {
          ...credentialData,
          id: `cred_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        return { credentials: [newCredential, ...state.credentials] };
      }),

      deleteCredential: (id) => set((state) => ({
        credentials: state.credentials.filter((c) => c.id !== id),
      })),

      updateCredential: (id, updates) => set((state) => ({
        credentials: state.credentials.map((c) => c.id === id ? { ...c, ...updates } : c),
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
        credentials: state.credentials,
        viewMode: state.viewMode,
        theme: state.theme,
      }), // Save only essential data, skip temporary search queries & active filters
    }
  )
);
