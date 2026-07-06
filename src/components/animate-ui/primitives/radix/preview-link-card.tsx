'use client';

import * as React from 'react';
import * as HoverCard from '@radix-ui/react-hover-card';
import { motion, AnimatePresence } from 'framer-motion';

export const PreviewLinkCard = HoverCard.Root;
export const PreviewLinkCardTrigger = HoverCard.Trigger;
export const PreviewLinkCardPortal = HoverCard.Portal;

export interface PreviewLinkCardProps extends React.ComponentPropsWithoutRef<typeof HoverCard.Root> {}
export interface PreviewLinkCardTriggerProps extends React.ComponentPropsWithoutRef<typeof HoverCard.Trigger> {}
export interface PreviewLinkCardContentProps extends React.ComponentPropsWithoutRef<typeof HoverCard.Content> {
  children?: React.ReactNode;
}
export interface PreviewLinkCardImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

export const PreviewLinkCardContent = React.forwardRef<
  React.ElementRef<typeof HoverCard.Content>,
  PreviewLinkCardContentProps
>(({ children, className, ...props }, ref) => {
  return (
    <HoverCard.Content
      ref={ref}
      className={className}
      {...props}
      asChild
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      >
        {children}
      </motion.div>
    </HoverCard.Content>
  );
});
PreviewLinkCardContent.displayName = 'PreviewLinkCardContent';

export const PreviewLinkCardImage = React.forwardRef<
  HTMLImageElement,
  PreviewLinkCardImageProps
>(({ className, ...props }, ref) => {
  return (
    <img
      ref={ref}
      className={className}
      {...props}
    />
  );
});
PreviewLinkCardImage.displayName = 'PreviewLinkCardImage';
