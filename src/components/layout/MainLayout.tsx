'use client';
import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BackgroundCanvas } from '../ui/BackgroundCanvas';

interface MainLayoutProps {
  children: React.ReactNode;
  onAddClick: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children, onAddClick }) => {

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
          <BackgroundCanvas />

          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};


