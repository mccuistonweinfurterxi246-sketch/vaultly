'use client';
import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import LetterGlitch from '../ui/LetterGlitch';

interface MainLayoutProps {
  children: React.ReactNode;
  onAddClick: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, onAddClick }) => {
  
  // Vibrant pleasant green colors for high visibility
  const glitchColors = ['#2f5d50', '#4ade80', '#10b981', '#14b8a6'];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-text-main font-sans antialiased transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <Header onAddClick={onAddClick} />

        {/* Content View */}
        <main className="flex-1 overflow-y-auto bg-surface-muted/30 relative">
          {/* Subtle LetterGlitch Background Animation with higher opacity for visibility */}
          <div className="fixed inset-0 pointer-events-none opacity-[0.15] dark:opacity-[0.2] z-0">
            <LetterGlitch
              glitchSpeed={60}
              centerVignette={true}
              outerVignette={false}
              smooth={true}
              glitchColors={glitchColors}
              characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$*+-_"
            />
          </div>

          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};


