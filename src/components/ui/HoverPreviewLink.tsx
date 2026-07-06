'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/utils/utils';

interface HoverPreviewLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  popupClassName?: string;
  fallbackTitle?: string;
}

type PreviewTier = 'direct' | 'proxy' | 'card';

const BASE_PATH = '/vaultly';
const PREVIEW_WIDTH = 480;
const PREVIEW_HEIGHT = 320;
const PREVIEW_SCALE = 0.375;
const SOURCE_WIDTH = Math.round(PREVIEW_WIDTH / PREVIEW_SCALE);
const SOURCE_HEIGHT = Math.round((PREVIEW_HEIGHT - 32) / PREVIEW_SCALE);
const INTENT_DELAY_MS = 140;
const CLOSE_DELAY_MS = 220;
const POINTER_DELAY_MS = 250;

const blockedDomainCache = new Map<string, PreviewTier>();

function getUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function getHostname(value: string): string {
  return getUrl(value)?.hostname.toLowerCase() ?? '';
}

function getDisplayDomain(value: string): string {
  return getHostname(value).replace(/^www\./, '') || value;
}

function getProxyUrl(href: string): string {
  return `${BASE_PATH}/api/proxy?url=${encodeURIComponent(href)}`;
}

function getFaviconUrl(hostname: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`;
}

export const HoverPreviewLink: React.FC<HoverPreviewLinkProps> = ({
  href,
  children,
  className,
  popupClassName,
  fallbackTitle,
}) => {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverVisibleRef = useRef(false);

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<PreviewTier>('direct');
  const [loading, setLoading] = useState(false);
  const [pointerEnabled, setPointerEnabled] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  const hostname = useMemo(() => getHostname(href), [href]);
  const displayDomain = useMemo(() => getDisplayDomain(href), [href]);
  const iframeSrc = tier === 'direct' ? href : tier === 'proxy' ? getProxyUrl(href) : '';

  const clearTimer = useCallback((timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const gap = 14;
    const edge = 10;
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;

    let left = rect.left + rect.width / 2 - PREVIEW_WIDTH / 2;
    left = Math.max(edge, Math.min(left, viewportWidth - PREVIEW_WIDTH - edge));

    const hasRoomAbove = rect.top >= PREVIEW_HEIGHT + gap + edge;
    const hasRoomBelow = viewportHeight - rect.bottom >= PREVIEW_HEIGHT + gap + edge;
    let top = hasRoomAbove && !hasRoomBelow ? rect.top - PREVIEW_HEIGHT - gap : rect.bottom + gap;
    top = Math.max(edge, Math.min(top, viewportHeight - PREVIEW_HEIGHT - edge));

    setPosition({ left, top });
  }, []);

  const closePreview = useCallback(() => {
    clearTimer(closeTimerRef);
    closeTimerRef.current = setTimeout(() => {
      setOpen(false);
      setLoading(false);
      setPointerEnabled(false);
      clearTimer(pointerTimerRef);
    }, CLOSE_DELAY_MS);
  }, [clearTimer]);

  const cancelClose = useCallback(() => {
    clearTimer(closeTimerRef);
  }, [clearTimer]);

  const openPreview = useCallback(() => {
    cancelClose();
    updatePosition();

    const cachedTier = blockedDomainCache.get(hostname);

    if (cachedTier) {
      setTier(cachedTier);
      setLoading(cachedTier === 'proxy');
    } else {
      blockedDomainCache.set(hostname, 'proxy');
      setTier('proxy');
      setLoading(true);
    }

    setOpen(true);
  }, [cancelClose, hostname, updatePosition]);

  const scheduleOpen = useCallback(() => {
    cancelClose();
    clearTimer(openTimerRef);
    openTimerRef.current = setTimeout(openPreview, INTENT_DELAY_MS);
  }, [cancelClose, clearTimer, openPreview]);

  const cancelOpenAndClose = useCallback(() => {
    clearTimer(openTimerRef);
    closePreview();
  }, [clearTimer, closePreview]);

  const handleProxyLoad = useCallback(() => {
    blockedDomainCache.set(hostname, 'proxy');
    setLoading(false);
  }, [hostname]);

  const handleProxyError = useCallback(() => {
    blockedDomainCache.set(hostname, 'card');
    setTier('card');
    setLoading(false);
  }, [hostname]);

  useEffect(() => {
    setMounted(true);

    return () => {
      clearTimer(openTimerRef);
      clearTimer(closeTimerRef);
      clearTimer(pointerTimerRef);
    };
  }, [clearTimer]);

  useEffect(() => {
    if (!open) return;

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setLoading(false);
        anchorRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    const popover = popoverRef.current;
    if (!popover) return;

    if (open) {
      if (!popoverVisibleRef.current) {
        try {
          popover.showPopover();
          popoverVisibleRef.current = true;
        } catch {
          popoverVisibleRef.current = false;
        }
      }

      clearTimer(pointerTimerRef);
      pointerTimerRef.current = setTimeout(() => setPointerEnabled(true), POINTER_DELAY_MS);
      return;
    }

    clearTimer(pointerTimerRef);
    setPointerEnabled(false);

    if (popoverVisibleRef.current) {
      try {
        popover.hidePopover();
      } catch {
      } finally {
        popoverVisibleRef.current = false;
      }
    }
  }, [clearTimer, open]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .vaultly-preview-popover {
              position: fixed;
              inset: unset;
              z-index: 2147483647;
              width: ${PREVIEW_WIDTH}px;
              height: ${PREVIEW_HEIGHT}px;
              margin: 0;
              padding: 0;
              border: 0;
              background: transparent;
              overflow: visible;
              opacity: 0;
              transform: translateY(8px) scale(0.97);
              transition: opacity 160ms ease, transform 160ms ease, display 160ms allow-discrete, overlay 160ms allow-discrete;
            }

            .vaultly-preview-popover:popover-open {
              opacity: 1;
              transform: translateY(0) scale(1);
            }

            @starting-style {
              .vaultly-preview-popover:popover-open {
                opacity: 0;
                transform: translateY(8px) scale(0.97);
              }
            }
          `,
        }}
      />

      <a
        ref={anchorRef}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'rounded-sm underline decoration-brand/40 transition-colors duration-150',
          'text-text-main hover:text-brand hover:decoration-brand',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
          className,
        )}
        onFocus={scheduleOpen}
        onBlur={cancelOpenAndClose}
        onMouseEnter={scheduleOpen}
        onMouseLeave={cancelOpenAndClose}
      >
        {children}
      </a>

      {mounted &&
        createPortal(
          <div
            ref={popoverRef}
            popover="manual"
            className={cn(
              'vaultly-preview-popover rounded-xl border border-white/10 shadow-2xl',
              'bg-[hsl(var(--surface))] text-text-main',
              pointerEnabled ? 'pointer-events-auto' : 'pointer-events-none',
              popupClassName,
            )}
            style={{ left: position.left, top: position.top }}
            onMouseEnter={cancelClose}
            onMouseLeave={closePreview}
          >
            <div className="flex h-full w-full flex-col overflow-hidden rounded-xl">
              <div className="flex h-8 shrink-0 items-center justify-between border-b border-white/10 bg-white/5 px-3 text-[10px] font-medium text-text-muted">
                <div className="flex min-w-0 items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getFaviconUrl(hostname)}
                    alt=""
                    width={14}
                    height={14}
                    loading="lazy"
                    className="size-3.5 shrink-0 rounded-[3px]"
                  />
                  <span className="truncate">{displayDomain}</span>
                </div>
                <span className="ml-3 flex shrink-0 items-center gap-1.5">
                  <span
                    className={cn(
                      'size-1.5 rounded-full',
                      tier === 'direct' && 'bg-emerald-400',
                      tier === 'proxy' && 'bg-amber-400',
                      tier === 'card' && 'bg-red-400',
                    )}
                  />
                  {tier === 'direct' ? 'Live' : tier === 'proxy' ? 'Proxy' : 'Open'}
                </span>
              </div>

              <div className="relative flex-1 overflow-hidden bg-white">
                <div className="absolute -top-4 left-0 right-0 h-4 pointer-events-auto" aria-hidden="true" />

                {(tier === 'direct' || tier === 'proxy') && (
                  <div
                    className="origin-top-left bg-white"
                    style={{
                      width: SOURCE_WIDTH,
                      height: SOURCE_HEIGHT,
                      transform: `scale(${PREVIEW_SCALE})`,
                    }}
                  >
                    <iframe
                      ref={iframeRef}
                      src={iframeSrc}
                      title={`Preview of ${displayDomain}`}
                      className="h-full w-full border-0 bg-white"
                      sandbox="allow-downloads allow-forms allow-modals allow-popups allow-scripts"
                      referrerPolicy="no-referrer"
                      loading="eager"
                      onLoad={tier === 'direct' ? undefined : handleProxyLoad}
                      onError={tier === 'proxy' ? handleProxyError : undefined}
                    />
                  </div>
                )}

                {loading && (
                  <div className="absolute inset-0 z-20 grid place-items-center bg-[hsl(var(--surface))]">
                    <div className="flex flex-col items-center gap-3">
                      <span className="size-8 rounded-full border-2 border-brand/20 border-t-brand animate-spin" />
                      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-text-muted">
                        Loading preview
                      </span>
                    </div>
                  </div>
                )}

                {tier === 'card' && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[hsl(var(--surface))] p-6 text-center">
                    <div className="mb-4 grid size-14 place-items-center rounded-xl border border-brand/20 bg-brand/10 text-brand">
                      <ExternalLink size={24} strokeWidth={1.8} />
                    </div>
                    <p className="mb-1 max-w-full truncate text-sm font-semibold text-text-main">
                      {fallbackTitle || displayDomain}
                    </p>
                    <p className="mb-5 max-w-[280px] text-xs leading-relaxed text-text-muted">
                      This site blocks embedded previews. Open it in a new tab to view the page.
                    </p>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                    >
                      <ExternalLink size={14} strokeWidth={2} />
                      Open site
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};
