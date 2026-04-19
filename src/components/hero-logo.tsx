'use client';

import { useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function HeroLogoInner() {
  const imgRef = useRef<HTMLImageElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const restart = useCallback(() => {
    const el = imgRef.current;
    if (!el) return;
    el.classList.remove('damped-bounce');
    void el.offsetWidth;
    el.classList.add('damped-bounce');
  }, []);

  // Trigger on navigate-back with ?bounce=1
  useEffect(() => {
    if (searchParams.get('bounce')) {
      restart();
      router.replace('/', { scroll: false });
    }
  }, [searchParams, restart, router]);

  // Trigger on same-page nav brand click
  useEffect(() => {
    window.addEventListener('kiddoland-bounce', restart);
    return () => window.removeEventListener('kiddoland-bounce', restart);
  }, [restart]);

  return (
    <img
      ref={imgRef}
      src="/Logo Star Big.png"
      alt="Kiddoland"
      className="w-24 h-24 object-contain mb-6 damped-bounce"
    />
  );
}

export function HeroLogo() {
  return (
    <Suspense fallback={<img src="/Logo Star Big.png" alt="Kiddoland" className="w-24 h-24 object-contain mb-6 damped-bounce" />}>
      <HeroLogoInner />
    </Suspense>
  );
}
