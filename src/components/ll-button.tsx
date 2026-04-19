'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Moon, Sun, Wrench, Flag, BookOpenCheck } from 'lucide-react';
import { GradientIcon } from './gradient-icon';

const OPEN_DELAY  = 500;
const CLOSE_DELAY = 300;

const LANGUAGES = [
  { code: 'en', cc: 'us',  label: 'English' },
  { code: 'zh', cc: 'cn',  label: 'Chinese' },
  { code: 'ja', cc: 'jp',  label: 'Japanese' },
  { code: 'ko', cc: 'kr',  label: 'Korean' },
  { code: 'pt', cc: 'pt',  label: 'Portuguese (PT)' },
];

function FlagImg({ cc, label }: { cc: string; label: string }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${cc}.png`}
      alt={label}
      width={20}
      height={15}
      className="object-cover rounded-sm"
    />
  );
}

export function LLButton({ expandLeft = false, flagsDown = false }: { expandLeft?: boolean; flagsDown?: boolean } = {}) {
  const [panelOpen,    setPanelOpen]    = useState(false);
  const [flagsOpen,    setFlagsOpen]    = useState(false);
  const [visibleFlags, setVisibleFlags] = useState(0);
  const [selectedLang, setSelectedLang] = useState('en');
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const openTimer  = useRef<NodeJS.Timeout | null>(null);
  const closeTimer = useRef<NodeJS.Timeout | null>(null);
  const flagTimers = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('ll-language');
    if (saved) setSelectedLang(saved);
  }, []);

  // Cascade flags in when flagsOpen → true
  useEffect(() => {
    flagTimers.current.forEach(clearTimeout);
    flagTimers.current = [];
    if (flagsOpen) {
      LANGUAGES.forEach((_, i) => {
        const t = setTimeout(
          () => setVisibleFlags((v) => Math.min(v + 1, LANGUAGES.length)),
          i * 55 + 20,
        );
        flagTimers.current.push(t);
      });
    } else {
      setVisibleFlags(0);
    }
    return () => flagTimers.current.forEach(clearTimeout);
  }, [flagsOpen]);

  /* ── Hover helpers (same pattern as sidebar) ── */
  const scheduleOpen = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    if (openTimer.current) return;
    openTimer.current = setTimeout(() => {
      setPanelOpen(true);
      openTimer.current = null;
    }, OPEN_DELAY);
  }, []);

  const scheduleClose = useCallback(() => {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
    if (closeTimer.current) return;
    closeTimer.current = setTimeout(() => {
      setPanelOpen(false);
      setFlagsOpen(false);
      closeTimer.current = null;
    }, CLOSE_DELAY);
  }, []);

  function handleHomeClick() {
    router.push('/?bounce=1');
  }

  function toggleTheme() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }

  function selectLanguage(code: string) {
    setSelectedLang(code);
    localStorage.setItem('ll-language', code);
    setFlagsOpen(false);
    // TODO: trigger translation when language files are wired
  }

  const currentLang = LANGUAGES.find((l) => l.code === selectedLang) ?? LANGUAGES[0];
  const isDark = mounted && resolvedTheme === 'dark';

  const themeBtn = (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="h-8 w-8 rounded-lg border border-primary/30 bg-background flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-colors flex-shrink-0"
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-yellow-500" />}
    </button>
  );

  const homeBtn = (
    <button
      type="button"
      onClick={handleHomeClick}
      title="Back to Kiddoland"
      className="h-8 w-8 rounded-lg border border-primary/30 bg-background flex items-center justify-center hover:bg-primary/10 hover:border-primary transition-colors flex-shrink-0"
    >
      <GradientIcon icon={BookOpenCheck} id="ll-home-btn" className="h-4 w-4" />
    </button>
  );

  const flagBtn = (
    <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setFlagsOpen((f) => !f)}
          title="Language Selector"
          className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors
            ${flagsOpen
              ? 'border-primary bg-primary/15'
              : 'border-primary/30 bg-background hover:bg-primary/10 hover:border-primary'}`}
        >
          <GradientIcon icon={Flag} id="ll-flag-btn" className="h-4 w-4" />
        </button>

        {/* Flags unfurl — direction controlled by prop */}
        <div className={`absolute ${flagsDown ? 'top-full mt-1.5 flex-col' : 'bottom-full mb-1.5 flex-col-reverse'} left-0 flex gap-1`}>
          {LANGUAGES.map((lang, i) => (
            <div
              key={lang.code}
              className={`transition-all duration-150
                ${visibleFlags > i
                  ? 'opacity-100 translate-y-0 pointer-events-auto'
                  : 'opacity-0 translate-y-1.5 pointer-events-none'}`}
            >
              <button
                type="button"
                onClick={() => selectLanguage(lang.code)}
                title={lang.label}
                className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors
                  ${lang.code === selectedLang
                    ? 'border-primary bg-primary/15'
                    : 'border-primary/30 bg-background hover:bg-primary/10 hover:border-primary'}`}
              >
                <FlagImg cc={lang.cc} label={lang.label} />
              </button>
            </div>
          ))}
        </div>
      </div>
  );

  const controls = <>{themeBtn}{flagBtn}</>;

  if (expandLeft) {
    return (
      <div
        className="relative h-10 w-10 flex items-center justify-center flex-shrink-0"
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
      >
        <GradientIcon icon={Wrench} id="ll-footer-btn" className="w-7 h-7" />
        {/* Panel floats absolutely to the LEFT — doesn't affect surrounding layout */}
        <div
          className={`absolute right-full top-1/2 -translate-y-1/2 flex items-center gap-2 pr-3
            transition-all duration-300 ease-out
            ${panelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        >
          {themeBtn}{homeBtn}{flagBtn}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center gap-2"
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
    >
      {/* ── LL logo ── */}
      <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
        <GradientIcon icon={Wrench} id="ll-footer-btn" className="w-7 h-7" />
      </div>

      {/* ── Slide-out row (mode + flag) ── */}
      <div
        className={`flex items-center gap-2 overflow-visible transition-all duration-300 ease-out
          ${panelOpen ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'}`}
      >
        {controls}
      </div>
    </div>
  );
}
