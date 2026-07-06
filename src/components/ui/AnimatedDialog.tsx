'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/utils';

interface AnimatedDialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  backdropClassName?: string;
}

export const AnimatedDialog: React.FC<AnimatedDialogProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
  backdropClassName = ''
}) => {
  // Listen for Escape key to close the dialog
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Lock scroll when open to prevent background scrolling (performance & usability)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            onClick={onClose}
            className={cn(
              'absolute inset-0 bg-background/50 backdrop-blur-md',
              backdropClassName
            )}
          />

          {/* Dialog Content Wrapper */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{
              type: 'spring',
              stiffness: 380,
              damping: 30
            }}
            className={cn(
              'relative w-full max-w-lg bg-surface border border-border-custom/80 rounded-3xl shadow-2xl overflow-hidden z-10',
              className
            )}
          >
            {/* Ambient Top Glow Line */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand to-transparent opacity-80" />
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
