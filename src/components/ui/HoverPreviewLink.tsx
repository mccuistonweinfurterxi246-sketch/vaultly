'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface HoverPreviewLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  popupClassName?: string;
  fallbackTitle?: string;
}

/**
 * Tier states:
 *  'direct'     — Tier 1: native iframe embed
 *  'screenshot' — Tier 2: thum.io screenshot image
 *  'card'       — Tier 3: glassmorphic fallback micro-card
 */
type PreviewTier = 'direct' | 'screenshot' | 'card';

// ─────────────────────────────────────────────────────────────────────────────
// Module-level session cache — survives re-mounts, shared across all instances
// ─────────────────────────────────────────────────────────────────────────────
const domainCache = new Map<string, PreviewTier>();

// Domains known to block iframes — skip Tier 1 entirely
const KNOWN_BLOCKED = new Set([
  'google.com', 'github.com', 'youtube.com', 'facebook.com',
  'twitter.com', 'x.com', 'linkedin.com', 'instagram.com',
  'stackoverflow.com', 'reddit.com', 'amazon.com', 'netflix.com',
  'yahoo.com', 'microsoft.com', 'apple.com', 'zoom.us', 'dropbox.com',
  'tiktok.com', 'twitch.tv', 'discord.com', 'slack.com', 'notion.so',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getHostname(href: string): string {
  try { return new URL(href).hostname; } catch { return ''; }
}

function getDisplayDomain(href: string): string {
  try { return new URL(href).hostname.replace(/^www\./, ''); } catch { return href; }
}

function isKnownBlocked(hostname: string): boolean {
  return KNOWN_BLOCKED.has(hostname) ||
    [...KNOWN_BLOCKED].some(d => hostname.endsWith('.' + d));
}

function buildScreenshotUrl(href: string): string {
  return `https://image.thum.io/get/width/1280/crop/800/maxAge/12/${href}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const INTENT_DELAY_MS   = 150;   // hover-intent debounce
const CLOSE_DELAY_MS    = 300;   // hover-bridge close buffer
const TIER1_TIMEOUT_MS  = 1200;  // hard timeout before escalating to screenshot
const POINTER_DELAY_MS  = 380;   // wait for CSS transition before enabling clicks

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export const HoverPreviewLink: React.FC<HoverPreviewLinkProps> = ({
  href,
  children,
  className = '',
  popupClassName = '',
  fallbackTitle,
}) => {
  // ── State ───────────────────────────────────────────────────────────────
  const [isOpen, setIsOpen]                   = useState(false);
  const [tier, setTier]                       = useState<PreviewTier>('direct');
  const [isLoading, setIsLoading]             = useState(false);
  const [allowPointerEvents, setAllowPointer] = useState(false);
  const [position, setPosition]               = useState({ top: 0, left: 0 });
  const [isMounted, setIsMounted]             = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────────
  const anchorRef     = useRef<HTMLAnchorElement>(null);
  const popoverRef    = useRef<HTMLDivElement>(null);
  const iframeRef     = useRef<HTMLIFrameElement>(null);
  const openTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tier1TimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ptrTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popoverShown  = useRef(false);

  // ── Derived ─────────────────────────────────────────────────────────────
  const domainName = getDisplayDomain(href);
  const hostname   = getHostname(href);

  // ── Hydration gate ──────────────────────────────────────────────────────
  useEffect(() => { setIsMounted(true); }, []);

  // ── Timer cleanup on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      [openTimerRef, closeTimerRef, tier1TimerRef, ptrTimerRef].forEach(r => {
        if (r.current) clearTimeout(r.current);
      });
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Popover DOM lifecycle — show/hide via native API
  // The element ALWAYS lives in the DOM; visibility is popover-API-controlled.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;

    if (isOpen) {
      if (!popoverShown.current) {
        try { el.showPopover(); popoverShown.current = true; }
        catch { /* element not yet reflected — safe to ignore */ }
      }
      // Enable pointer-events after CSS transition finishes
      if (ptrTimerRef.current) clearTimeout(ptrTimerRef.current);
      ptrTimerRef.current = setTimeout(() => setAllowPointer(true), POINTER_DELAY_MS);
    } else {
      if (popoverShown.current) {
        try { el.hidePopover(); popoverShown.current = false; }
        catch { /* already hidden */ }
      }
      setAllowPointer(false);
    }
  }, [isOpen]);

  // ── Position engine ─────────────────────────────────────────────────────
  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const sy = window.scrollY, sx = window.scrollX;
    const PW = 480, PH = 320, GAP = 14, EDGE = 10;

    let left = rect.left + sx + rect.width / 2 - PW / 2;
    left = Math.max(EDGE, Math.min(left, window.innerWidth + sx - PW - EDGE));

    const top = rect.top >= PH + GAP + EDGE
      ? rect.top + sy - PH - GAP
      : rect.bottom + sy + GAP;

    setPosition({ top, left });
  }, []);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!isOpen) return;
    const h = () => updatePosition();
    window.addEventListener('resize', h);
    window.addEventListener('scroll', h, { passive: true });
    return () => { window.removeEventListener('resize', h); window.removeEventListener('scroll', h); };
  }, [isOpen, updatePosition]);

  // ── Escape key ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsOpen(false); anchorRef.current?.focus(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen]);

  // ─────────────────────────────────────────────────────────────────────────
  // Tier resolver — decides which tier to start with when popover opens
  // ─────────────────────────────────────────────────────────────────────────
  const openPopover = useCallback(() => {
    const cached = domainCache.get(hostname);

    if (cached) {
      // Cache hit → instant render at resolved tier
      setTier(cached);
      setIsLoading(false);
    } else if (isKnownBlocked(hostname)) {
      // Pre-empt: skip Tier 1 → go straight to screenshot
      domainCache.set(hostname, 'screenshot');
      setTier('screenshot');
      setIsLoading(false);
    } else {
      // Unknown domain → try Tier 1 (direct iframe)
      setTier('direct');
      setIsLoading(true);

      // Hard 1.2s timeout → auto-escalate to Tier 2 (screenshot)
      if (tier1TimerRef.current) clearTimeout(tier1TimerRef.current);
      tier1TimerRef.current = setTimeout(() => {
        setTier(prev => {
          if (prev === 'direct') {
            setIsLoading(false);
            domainCache.set(hostname, 'screenshot');
            return 'screenshot';
          }
          return prev;
        });
      }, TIER1_TIMEOUT_MS);
    }

    updatePosition();
    setIsOpen(true);
  }, [hostname, updatePosition]);

  // ─────────────────────────────────────────────────────────────────────────
  // Hover Bridge timer helpers
  // ─────────────────────────────────────────────────────────────────────────
  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null; }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsLoading(false);
      if (tier1TimerRef.current) { clearTimeout(tier1TimerRef.current); tier1TimerRef.current = null; }
    }, CLOSE_DELAY_MS);
  }, [cancelClose]);

  // ── Mouse handlers ──────────────────────────────────────────────────────
  const handleEnterLink = useCallback(() => {
    cancelClose();
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    openTimerRef.current = setTimeout(openPopover, INTENT_DELAY_MS);
  }, [cancelClose, openPopover]);

  const handleLeaveLink = useCallback(() => {
    if (openTimerRef.current) { clearTimeout(openTimerRef.current); openTimerRef.current = null; }
    scheduleClose();
  }, [scheduleClose]);

  const handleEnterPopover = useCallback(() => { cancelClose(); }, [cancelClose]);
  const handleLeavePopover = useCallback(() => { scheduleClose(); }, [scheduleClose]);

  // ─────────────────────────────────────────────────────────────────────────
  // Iframe onLoad — cross-origin block detection
  // ─────────────────────────────────────────────────────────────────────────
  const handleIframeLoad = useCallback(() => {
    if (tier1TimerRef.current) { clearTimeout(tier1TimerRef.current); tier1TimerRef.current = null; }

    const iframe = iframeRef.current;
    if (!iframe) return;

    let isBlocked = false;
    try {
      const cw = iframe.contentWindow;
      if (!cw) { isBlocked = true; }
      else {
        const len = cw.length;
        let loc = '';
        try { loc = cw.location.href; } catch { /* cross-origin — expected */ }
        if (len === 0 && (loc === 'about:blank' || loc === '')) isBlocked = true;
      }
    } catch {
      // DOMException → blocked by X-Frame-Options / CSP
      isBlocked = true;
    }

    if (isBlocked) {
      domainCache.set(hostname, 'screenshot');
      setTier('screenshot');
    } else {
      domainCache.set(hostname, 'direct');
    }
    setIsLoading(false);
  }, [hostname]);

  // ── Screenshot error (Tier 2 → Tier 3) ─────────────────────────────────
  const handleScreenshotError = useCallback(() => {
    domainCache.set(hostname, 'card');
    setTier('card');
  }, [hostname]);

  // ─────────────────────────────────────────────────────────────────────────
  // Compute screenshot URL
  // ─────────────────────────────────────────────────────────────────────────
  const screenshotUrl = buildScreenshotUrl(href);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hardware-accelerated popover animations via @starting-style */}
      <style dangerouslySetInnerHTML={{ __html: `
        .hvr-popover {
          position: absolute;
          margin: 0; padding: 0;
          border: none; background: none;
          inset: unset;
          opacity: 0;
          transform: scale(0.94) translateY(10px);
          transition:
            opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
            display 0.28s allow-discrete,
            overlay 0.28s allow-discrete;
        }
        .hvr-popover:popover-open {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
        @starting-style {
          .hvr-popover:popover-open {
            opacity: 0;
            transform: scale(0.94) translateY(10px);
          }
        }
      `}} />

      {/* ── Anchor link ──────────────────────────────────────────────── */}
      <a
        ref={anchorRef}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'underline decoration-brand/40 hover:decoration-brand',
          'text-text-main hover:text-brand',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 rounded-sm',
          className
        )}
        onMouseEnter={handleEnterLink}
        onMouseLeave={handleLeaveLink}
        onFocus={handleEnterLink}
        onBlur={handleLeaveLink}
      >
        {children}
      </a>

      {/* ── Popover (always in DOM after hydration) ──────────────────── */}
      {isMounted && createPortal(
        <div
          ref={popoverRef}
          popover="manual"
          onMouseEnter={handleEnterPopover}
          onMouseLeave={handleLeavePopover}
          style={{ top: position.top, left: position.left, width: 480, height: 320 }}
          className={cn(
            'hvr-popover',
            'rounded-xl shadow-2xl overflow-hidden flex flex-col',
            'border border-white/10 bg-[hsl(var(--surface))]',
            allowPointerEvents ? 'pointer-events-auto' : 'pointer-events-none',
            popupClassName
          )}
        >
          {/* ── Header ───────────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center justify-between px-4 h-8
                          bg-white/5 border-b border-white/10
                          text-[10px] font-mono text-text-muted select-none">
            <div className="flex items-center gap-2 min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://www.google.com/s2/favicons?domain=${domainName}&sz=16`}
                alt="" width={12} height={12}
                className="rounded-[2px] shrink-0" loading="lazy"
              />
              <span className="truncate">{domainName}</span>
            </div>
            <span className="flex items-center gap-1.5 shrink-0 ml-3">
              <span className={cn(
                'w-1.5 h-1.5 rounded-full',
                tier === 'direct'     ? 'bg-emerald-400 animate-pulse' :
                tier === 'screenshot' ? 'bg-amber-400 animate-pulse' :
                                        'bg-red-400'
              )} />
              {tier === 'direct' ? 'Live' : tier === 'screenshot' ? 'Preview' : 'Blocked'}
            </span>
          </div>

          {/* ── Content area ─────────────────────────────────────────── */}
          <div className="relative flex-grow w-full overflow-hidden bg-[hsl(var(--background))]">

            {/* Invisible hover-bridge pad (16px above popover) */}
            <div className="absolute -top-4 left-0 right-0 h-4 pointer-events-auto" aria-hidden="true" />

            {/* ── Tier 1: Direct iframe ──────────────────────────────── */}
            {tier === 'direct' && (
              <div
                className="w-[1280px] h-[800px] origin-top-left"
                style={{ transform: 'scale(0.375)' }}
              >
                <iframe
                  ref={iframeRef}
                  src={href}
                  title={`Preview — ${domainName}`}
                  className="w-full h-full border-none bg-white"
                  sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                  loading="eager"
                  onLoad={handleIframeLoad}
                />
              </div>
            )}

            {/* ── Tier 2: Screenshot via thum.io ─────────────────────── */}
            {tier === 'screenshot' && (
              <img
                key={href}
                src={screenshotUrl}
                alt={`Screenshot — ${domainName}`}
                className="absolute inset-0 w-full h-full object-cover object-top"
                onError={handleScreenshotError}
                loading="eager"
              />
            )}

            {/* ── Loading overlay (Tier 1 only) ──────────────────────── */}
            {isLoading && tier === 'direct' && (
              <div className="absolute inset-0 z-20 flex flex-col gap-3 items-center justify-center
                              bg-[hsl(var(--surface))]">
                <div className="relative w-9 h-9">
                  <div className="absolute inset-0 rounded-full border-2 border-brand/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand animate-spin" />
                </div>
                <span className="text-[10px] tracking-widest uppercase font-mono text-text-muted animate-pulse">
                  Loading preview…
                </span>
              </div>
            )}

            {/* ── Tier 3: Glassmorphic fallback card ──────────────────── */}
            {tier === 'card' && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6
                              bg-[hsl(var(--surface))]/90 backdrop-blur-xl text-center">
                <div className="w-14 h-14 rounded-2xl mb-4 grid place-items-center
                                bg-brand/10 border border-brand/20 text-brand shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    strokeWidth={1.4} stroke="currentColor" className="w-7 h-7">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.6 9h16.8M3.6 15h16.8
                         M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18" />
                  </svg>
                </div>
                <p className="text-[11px] font-semibold text-text-main mb-1 truncate max-w-full">
                  {fallbackTitle || domainName}
                </p>
                <p className="text-[10px] text-text-muted leading-relaxed mb-5 max-w-[260px]">
                  Превью недоступно. Откройте сайт напрямую в новой вкладке.
                </p>
                <a
                  href={href} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg
                             bg-brand text-white text-[10px] font-semibold tracking-wide
                             shadow-md hover:bg-brand/90 hover:scale-105
                             transition-all duration-150 outline-none
                             focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5
                         A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  Открыть сайт
                </a>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
