'use client';

import React, { useEffect, useRef } from 'react';

export const BackgroundCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);

  // Fallback animation state in case OffscreenCanvas is not supported
  const fallbackLoopId = useRef<number | null>(null);
  const fallbackLastTime = useRef<number>(0);
  const fallbackParticles = useRef<any[]>([]);
  const fallbackMouse = useRef({ x: -9999, y: -9999, targetX: -9999, targetY: -9999, active: false });
  const isLoopRunning = useRef<boolean>(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.parentElement?.getBoundingClientRect() || {
      width: window.innerWidth,
      height: window.innerHeight,
    };
    const dpr = window.devicePixelRatio || 1;

    // 1. Detect OffscreenCanvas support
    const supportsOffscreen = typeof (canvas as any).transferControlToOffscreen === 'function';

    if (supportsOffscreen) {
      // Define the Web Worker source code inline
      const workerCode = `
        let canvas, ctx;
        let particles = [];
        let width = 0, height = 0, dpr = 1;
        let lastTime = 0;
        let isLoopRunning = true;
        let mouse = { x: -9999, y: -9999, targetX: -9999, targetY: -9999, active: false };
        let currentTheme = 'dark';

        self.onmessage = function(e) {
          const { type, payload } = e.data;
          
          if (type === 'init') {
            canvas = payload.canvas;
            ctx = canvas.getContext('2d');
            width = payload.width;
            height = payload.height;
            dpr = payload.dpr;
            currentTheme = payload.theme;
            
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);
            
            initParticles();
            lastTime = performance.now();
            requestAnimationFrame(renderLoop);
          } else if (type === 'resize') {
            width = payload.width;
            height = payload.height;
            dpr = payload.dpr;
            if (canvas) {
              canvas.width = width * dpr;
              canvas.height = height * dpr;
              ctx.scale(dpr, dpr);
              initParticles();
            }
          } else if (type === 'mousemove') {
            mouse.targetX = payload.x;
            mouse.targetY = payload.y;
            mouse.active = true;
          } else if (type === 'mouseleave') {
            mouse.targetX = -9999;
            mouse.targetY = -9999;
            mouse.active = false;
          } else if (type === 'theme') {
            currentTheme = payload;
          } else if (type === 'visibility') {
            isLoopRunning = payload;
            if (isLoopRunning) {
              lastTime = performance.now();
              requestAnimationFrame(renderLoop);
            }
          }
        };

        function initParticles() {
          const count = Math.min(Math.floor((width * height) / 15000), 100);
          const currentParticles = particles;
          const newParticles = [];
          
          for (let i = 0; i < count; i++) {
            if (i < currentParticles.length) {
              const p = currentParticles[i];
              p.x = Math.max(0, Math.min(p.x, width));
              p.y = Math.max(0, Math.min(p.y, height));
              newParticles.push(p);
            } else {
              newParticles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.6,
                vy: (Math.random() - 0.5) * 0.6,
                radius: Math.random() * 2 + 1
              });
            }
          }
          particles = newParticles;
        }

        function renderLoop(timestamp) {
          if (!isLoopRunning) return;

          const rawDelta = timestamp - lastTime;
          lastTime = timestamp;
          const deltaTime = Math.min(rawDelta, 100);
          const deltaFactor = deltaTime / 16.67;

          ctx.clearRect(0, 0, width, height);

          // Dynamic colors based on active theme
          const isDark = currentTheme === 'dark';
          const dotColor = isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(74, 222, 128, 0.45)';
          const lineColor = isDark ? 'rgba(16, 185, 129, ' : 'rgba(74, 222, 128, ';
          const glowColor = isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(74, 222, 128, 0.05)';

          if (mouse.active) {
            mouse.x += (mouse.targetX - mouse.x) * 0.08 * deltaFactor;
            mouse.y += (mouse.targetY - mouse.y) * 0.08 * deltaFactor;
            
            // Draw Cursor Glow
            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 180, 0, Math.PI * 2);
            ctx.fillStyle = glowColor;
            ctx.fill();
          }

          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            if (mouse.active) {
              const dx = mouse.x - p.x;
              const dy = mouse.y - p.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < 180 && dist > 0.1) {
                const pull = (180 - dist) / 180;
                p.vx += (dx / dist) * pull * 0.08 * deltaFactor;
                p.vy += (dy / dist) * pull * 0.08 * deltaFactor;
              }
            }

            const friction = Math.pow(0.97, deltaFactor);
            p.vx *= friction;
            p.vy *= friction;

            p.x += p.vx * deltaFactor;
            p.y += p.vy * deltaFactor;

            if (p.x < 0) { p.x = 0; p.vx *= -1; }
            else if (p.x > width) { p.x = width; p.vx *= -1; }

            if (p.y < 0) { p.y = 0; p.vy *= -1; }
            else if (p.y > height) { p.y = height; p.vy *= -1; }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = dotColor;
            ctx.fill();

            for (let j = i + 1; j < particles.length; j++) {
              const p2 = particles[j];
              const dx = p2.x - p.x;
              const dy = p2.y - p.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < 110) {
                const opacity = ((110 - dist) / 110) * 0.18;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.strokeStyle = lineColor + opacity + ')';
                ctx.lineWidth = 0.8;
                ctx.stroke();
              }
            }
          }

          requestAnimationFrame(renderLoop);
        }
      `;

      // Instantiate Web Worker
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);
      workerRef.current = worker;

      // Transfer control to OffscreenCanvas with StrictMode double-mount protection
      if ((canvas as any)._transferred) {
        return;
      }

      let offscreen: OffscreenCanvas;
      try {
        (canvas as any)._transferred = true;
        offscreen = canvas.transferControlToOffscreen();
      } catch (err) {
        console.warn('Canvas control already transferred:', err);
        return;
      }

      const isDarkTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

      worker.postMessage({
        type: 'init',
        payload: {
          canvas: offscreen,
          width: rect.width,
          height: rect.height,
          dpr: dpr,
          theme: isDarkTheme,
        }
      }, [offscreen]);

      // Resize event
      const handleResize = () => {
        const r = canvas.parentElement?.getBoundingClientRect() || {
          width: window.innerWidth,
          height: window.innerHeight,
        };
        worker.postMessage({
          type: 'resize',
          payload: { width: r.width, height: r.height, dpr: window.devicePixelRatio || 1 }
        });
      };

      // Mouse movements
      const handleMouseMove = (e: MouseEvent) => {
        const cr = canvas.getBoundingClientRect();
        worker.postMessage({
          type: 'mousemove',
          payload: { x: e.clientX - cr.left, y: e.clientY - cr.top }
        });
      };

      const handleMouseLeave = () => {
        worker.postMessage({ type: 'mouseleave' });
      };

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          worker.postMessage({ type: 'visibility', payload: entry.isIntersecting });
        });
      });

      const handleVisibility = () => {
        worker.postMessage({ type: 'visibility', payload: !document.hidden });
      };

      // Theme toggle observer
      const mutationObserver = new MutationObserver(() => {
        const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        worker.postMessage({ type: 'theme', payload: theme });
      });

      window.addEventListener('resize', handleResize);
      window.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseleave', handleMouseLeave);
      document.addEventListener('visibilitychange', handleVisibility);
      observer.observe(canvas);
      mutationObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

      return () => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseleave', handleMouseLeave);
        document.removeEventListener('visibilitychange', handleVisibility);
        observer.disconnect();
        mutationObserver.disconnect();
        (canvas as any)._transferred = false;
      };
    } else {
      // 2. MAIN-THREAD FALLBACK: For older browsers without OffscreenCanvas support
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const handleResize = () => {
        const r = canvas.parentElement?.getBoundingClientRect() || {
          width: window.innerWidth,
          height: window.innerHeight,
        };
        canvas.width = r.width * dpr;
        canvas.height = r.height * dpr;
        ctx.scale(dpr, dpr);
        initFallbackParticles(r.width, r.height);
      };

      const initFallbackParticles = (w: number, h: number) => {
        const count = Math.min(Math.floor((w * h) / 15000), 80);
        const list = [];
        for (let i = 0; i < count; i++) {
          list.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            radius: Math.random() * 2 + 1,
          });
        }
        fallbackParticles.current = list;
      };

      const renderFallback = (timestamp: number) => {
        if (!isLoopRunning.current) return;
        if (!fallbackLastTime.current) fallbackLastTime.current = timestamp;
        
        const deltaFactor = Math.min(timestamp - fallbackLastTime.current, 100) / 16.67;
        fallbackLastTime.current = timestamp;

        const w = canvas.width / dpr;
        const h = canvas.height / dpr;
        ctx.clearRect(0, 0, w, h);

        const isDark = document.documentElement.classList.contains('dark');
        const dotColor = isDark ? 'rgba(16, 185, 129, 0.4)' : 'rgba(74, 222, 128, 0.45)';
        const lineColor = isDark ? 'rgba(16, 185, 129, ' : 'rgba(74, 222, 128, ';

        const mouse = fallbackMouse.current;
        if (mouse.active) {
          mouse.x += (mouse.targetX - mouse.x) * 0.08 * deltaFactor;
          mouse.y += (mouse.targetY - mouse.y) * 0.08 * deltaFactor;
        }

        const list = fallbackParticles.current;
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          if (mouse.active) {
            const dx = mouse.x - p.x;
            const dy = mouse.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 180 && dist > 0.1) {
              const pull = (180 - dist) / 180;
              p.vx += (dx / dist) * pull * 0.08 * deltaFactor;
              p.vy += (dy / dist) * pull * 0.08 * deltaFactor;
            }
          }

          p.vx *= Math.pow(0.97, deltaFactor);
          p.vy *= Math.pow(0.97, deltaFactor);
          p.x += p.vx * deltaFactor;
          p.y += p.vy * deltaFactor;

          if (p.x < 0) { p.x = 0; p.vx *= -1; }
          else if (p.x > w) { p.x = w; p.vx *= -1; }
          if (p.y < 0) { p.y = 0; p.vy *= -1; }
          else if (p.y > h) { p.y = h; p.vy *= -1; }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = dotColor;
          ctx.fill();

          for (let j = i + 1; j < list.length; j++) {
            const p2 = list[j];
            const dist = Math.sqrt((p2.x - p.x) ** 2 + (p2.y - p.y) ** 2);
            if (dist < 110) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = lineColor + ((110 - dist) / 110) * 0.18 + ')';
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }
          }
        }

        fallbackLoopId.current = requestAnimationFrame(renderFallback);
      };

      const handleMouseMove = (e: MouseEvent) => {
        const cr = canvas.getBoundingClientRect();
        fallbackMouse.current.targetX = e.clientX - cr.left;
        fallbackMouse.current.targetY = e.clientY - cr.top;
        fallbackMouse.current.active = true;
      };

      const handleMouseLeave = () => {
        fallbackMouse.current.targetX = -9999;
        fallbackMouse.current.targetY = -9999;
        fallbackMouse.current.active = false;
      };

      handleResize();
      fallbackLoopId.current = requestAnimationFrame(renderFallback);

      window.addEventListener('resize', handleResize);
      window.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        if (fallbackLoopId.current) cancelAnimationFrame(fallbackLoopId.current);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        willChange: 'transform',
        transform: 'translate3d(0, 0, 0)',
        backfaceVisibility: 'hidden',
      }}
      className="bg-transparent opacity-[0.5] dark:opacity-[0.35]"
    />
  );
};
