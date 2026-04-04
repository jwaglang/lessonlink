'use client';

import { useState, useEffect, useRef } from 'react';
import type { PetlandProfile, FeedbackType } from '../types';

interface FeedbackOverlayProps {
  profile: PetlandProfile;
}

const feedbackConfig = {
  wow: {
    content: 'WOW!',
    className: 'text-yellow-400 animate-wow',
    sound: '/wow.mp3',
  },
  brainfart: {
    content: '💩',
    className: 'text-7xl text-amber-800 animate-brainfart',
    sound: '/fart.mp3',
  },
  treasure: {
    content: '💎',
    className: 'text-6xl animate-treasure',
    sound: '/treasure.mp3',
  },
};

export function FeedbackOverlay({ profile }: FeedbackOverlayProps) {
  const [activeFeedback, setActiveFeedback] = useState<FeedbackType | null>(null);
  const [lastProcessedTimestamp, setLastProcessedTimestamp] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (profile?.lastFeedback && profile.lastFeedback.timestamp !== lastProcessedTimestamp) {
      const feedbackTime = new Date(profile.lastFeedback.timestamp).getTime();
      const now = new Date().getTime();

      if (now - feedbackTime < 5000) {
        setLastProcessedTimestamp(profile.lastFeedback.timestamp);
        setActiveFeedback(profile.lastFeedback.type);

        if (audioRef.current) {
          audioRef.current.src = feedbackConfig[profile.lastFeedback.type].sound;
          audioRef.current.play().catch((e) => console.error('Audio play failed:', e));
        }

        setTimeout(() => setActiveFeedback(null), 3000);
      }
    }
  }, [profile?.lastFeedback, lastProcessedTimestamp]);

  if (!activeFeedback) return null;

  const { content, className } = feedbackConfig[activeFeedback];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 pointer-events-none">
      <div className={`text-8xl font-black ${className}`} style={{ textShadow: '4px 4px 0px black' }}>
        {content}
      </div>
      <audio ref={audioRef} preload="auto" />
      <style jsx>{`
        @keyframes wow {
          0% { transform: scale(0) rotate(0deg); opacity: 0; }
          25% { transform: scale(1.5) rotate(-15deg); opacity: 1; }
          50% { transform: scale(1.2) rotate(15deg); }
          100% { transform: scale(2.5) rotate(0deg); opacity: 0; }
        }
        .animate-wow { animation: wow 1.5s ease-out forwards; }

        @keyframes brainfart {
          0% { transform: translateY(100vh) scale(0.5); opacity: 0; }
          50% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
        }
        .animate-brainfart { animation: brainfart 2s ease-in-out forwards; }

        @keyframes treasure {
          0% { opacity: 0; transform: scale(0.5) }
          20% { opacity: 1; transform: scale(1.2) rotate(-10deg); }
          40% { transform: scale(1) rotate(10deg); }
          60% { transform: scale(1.1) rotate(-5deg); }
          80% { transform: scale(1) rotate(5deg); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-treasure { animation: treasure 1s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards; }
      `}</style>
    </div>
  );
}
