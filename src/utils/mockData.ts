export type ContentType = 
  | 'website' 
  | 'video' 
  | 'article' 
  | 'tool' 
  | 'course' 
  | 'document' 
  | 'image' 
  | 'repository' 
  | 'other';

export interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  iconName: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color?: string; // Pastel background color for sticky note style
  createdAt: string;
}

export interface Credential {
  id: string;
  title: string;
  websiteUrl?: string;
  usernameEmail: string;
  passwordEncrypted: string; // Stored in plain text for localStorage simplicity, but variable named to indicate intent
  notes?: string;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  collectionId: string;
  url: string;
  title: string;
  description: string;
  imageUrl: string;
  faviconUrl: string;
  tags: string[];
  type: ContentType;
  isFavorite: boolean;
  isArchived: boolean;
  readLater: boolean;
  clicksCount: number;
  createdAt: string;
}

export const mockCollections: Collection[] = [
  {
    id: "col_1",
    name: "Design Inspiration",
    description: "UI/UX ideas, palettes, and components",
    color: "#2f5d50", // Brand forest green
    iconName: "Palette"
  },
  {
    id: "col_2",
    name: "React Libraries",
    description: "Awesome React tools, hooks, and stores",
    color: "#4f46e5", // Indigo
    iconName: "Code"
  },
  {
    id: "col_3",
    name: "Production Tools",
    description: "Deployment, monitoring, and databases",
    color: "#0d9488", // Teal
    iconName: "Cpu"
  },
  {
    id: "col_4",
    name: "Articles & Reading",
    description: "Tech newsletters, blogs, and deep dives",
    color: "#ca8a04", // Amber
    iconName: "BookOpen"
  }
];

export const mockBookmarks: Bookmark[] = [
  {
    id: "bm_1",
    collectionId: "col_1",
    url: "https://dribbble.com",
    title: "Dribbble - Discover the World's Top Designers",
    description: "Find and showcase creative work. Dribbble is the go-to resource for discovering and connecting with designers and creative talent globally.",
    imageUrl: "https://images.unsplash.com/photo-1561070791-26c113006238?w=600&auto=format&fit=crop&q=60",
    faviconUrl: "https://cdn.dribbble.com/assets/favicon-b385e1a2cae066a3371cf12d8a43f87c807eb18d7f76ca09689fa59ff280e5b7.ico",
    tags: ["design", "ui", "inspiration"],
    type: "image",
    isFavorite: true,
    isArchived: false,
    readLater: false,
    clicksCount: 24,
    createdAt: "2026-06-25T12:00:00Z"
  },
  {
    id: "bm_2",
    collectionId: "col_2",
    url: "https://zustand.docs.pmnd.rs",
    title: "Zustand - Simple state management",
    description: "A small, fast and scaleable bearbones state-management solution using simplified flux principles. Has a comfy api based on hooks.",
    imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=60",
    faviconUrl: "https://zustand.docs.pmnd.rs/favicon.ico",
    tags: ["react", "state", "library"],
    type: "tool",
    isFavorite: true,
    isArchived: false,
    readLater: false,
    clicksCount: 42,
    createdAt: "2026-06-26T08:30:00Z"
  },
  {
    id: "bm_3",
    collectionId: "col_2",
    url: "https://react-use.js.org",
    title: "react-use - Essential React Hooks Library",
    description: "A comprehensive collection of awesome React hooks, covering sensors, UI elements, animations, side effects, and state helpers.",
    imageUrl: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&auto=format&fit=crop&q=60",
    faviconUrl: "https://react-use.js.org/favicon.ico",
    tags: ["react", "hooks", "library"],
    type: "repository",
    isFavorite: false,
    isArchived: false,
    readLater: true,
    clicksCount: 15,
    createdAt: "2026-06-24T15:45:00Z"
  },
  {
    id: "bm_4",
    collectionId: "col_3",
    url: "https://supabase.com",
    title: "Supabase - The Open Source Firebase Alternative",
    description: "Supabase is an open source Firebase alternative. Start your project with a Postgres database, Authentication, instant APIs, Edge Functions, Realtime subscriptions, and Storage.",
    imageUrl: "https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=600&auto=format&fit=crop&q=60",
    faviconUrl: "https://supabase.com/favicon.ico",
    tags: ["database", "auth", "backend"],
    type: "tool",
    isFavorite: true,
    isArchived: false,
    readLater: false,
    clicksCount: 8,
    createdAt: "2026-06-26T10:00:00Z"
  },
  {
    id: "bm_5",
    collectionId: "col_4",
    url: "https://overreacted.io",
    title: "Overreacted - Dan Abramov's Personal Blog",
    description: "Personal blog by Dan Abramov. Explaining React concepts, JavaScript internals, and the philosophy of software engineering.",
    imageUrl: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&auto=format&fit=crop&q=60",
    faviconUrl: "https://overreacted.io/favicon.ico",
    tags: ["blog", "react", "javascript"],
    type: "article",
    isFavorite: false,
    isArchived: false,
    readLater: false,
    clicksCount: 19,
    createdAt: "2026-06-23T11:00:00Z"
  }
];
