"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function ProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Function to start the progress bar animation immediately
  const startProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setIsVisible(true);
    setProgress(20);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 90;
        }
        // Incrementally decelerate as it approaches 90%
        const diff = 90 - prev;
        const step = Math.max(1, Math.floor(diff * 0.15));
        return prev + step;
      });
    }, 120);

    // Safety timeout: auto-hide after 8 seconds if navigation stalls
    timeoutRef.current = setTimeout(() => {
      completeProgress();
    }, 8000);
  };

  // Function to complete and fade out
  const completeProgress = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setProgress(100);
    const fadeTimer = setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, 250);

    return () => clearTimeout(fadeTimer);
  };

  // Listen to global click events on internal links for sub-millisecond feedback
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Find nearest anchor tag
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore external links, mailto, tel, anchor hashes, modifier keys, or new tabs
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        target.target === "_blank" ||
        target.hasAttribute("download") ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0
      ) {
        return;
      }

      // Check if clicking the same route and same search
      const currentFullUrl = window.location.pathname + window.location.search;
      if (href === currentFullUrl || href === window.location.pathname) {
        return;
      }

      startProgress();
    };

    document.addEventListener("click", handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      if (timerRef.current) clearInterval(timerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Complete progress whenever route path or search params change
  useEffect(() => {
    if (isVisible) {
      completeProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] h-0.75 pointer-events-none overflow-hidden"
    >
      <div
        className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 transition-all duration-150 ease-out shadow-[0_0_8px_rgba(59,130,246,0.6)]"
        style={{
          width: `${progress}%`,
          opacity: isVisible ? 1 : 0,
          transitionProperty: "width, opacity",
        }}
      />
    </div>
  );
}

export function RouteProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarInner />
    </Suspense>
  );
}
