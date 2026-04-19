'use client';

import { useRef, useEffect } from 'react';

export function DragonDork() {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.remove('damped-bounce');
          void el.offsetWidth; // force reflow — resets animation state
          el.classList.add('damped-bounce');
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src="/Dork2.png"
      alt="Dork"
      className="w-12 h-12 object-contain inline-block"
    />
  );
}
