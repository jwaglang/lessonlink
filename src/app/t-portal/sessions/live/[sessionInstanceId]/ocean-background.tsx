'use client';

import { useMemo } from 'react';

interface Bubble {
  id: number;
  left: string;
  bottom: string;
  size: number;
  duration: number;
  delay: number;
}

export default function OceanBackground() {
  const floorBubbles = useMemo<Bubble[]>(() =>
    Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      bottom: '17%',
      size: 3 + Math.random() * 5,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 14,
    })), []);

  const whaleBubbles = useMemo<Bubble[]>(() =>
    Array.from({ length: 6 }).map((_, i) => ({
      id: i + 100,
      left: `${10 + Math.random() * 80}%`,
      bottom: `${62 + Math.random() * 12}%`,
      size: 4 + Math.random() * 5,
      duration: 4 + Math.random() * 5,
      delay: Math.random() * 20,
    })), []);

  const sharkBubbles = useMemo<Bubble[]>(() =>
    Array.from({ length: 6 }).map((_, i) => ({
      id: i + 200,
      left: `${10 + Math.random() * 80}%`,
      bottom: `${45 + Math.random() * 12}%`,
      size: 3 + Math.random() * 5,
      duration: 3 + Math.random() * 4,
      delay: Math.random() * 18,
    })), []);

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <style>{`
        @keyframes swimRight {
          from { transform: translateX(-400px); }
          to   { transform: translateX(calc(100vw + 400px)); }
        }
        @keyframes swimLeft {
          from { transform: translateX(calc(100vw + 400px)); }
          to   { transform: translateX(-400px); }
        }
        @keyframes whaleWiggle {
          0%   { transform: scaleX(-1) rotate(-2deg) scaleY(1.01); }
          25%  { transform: scaleX(-1) rotate(0deg)  scaleY(0.98); }
          50%  { transform: scaleX(-1) rotate(2deg)  scaleY(1.01); }
          75%  { transform: scaleX(-1) rotate(0deg)  scaleY(0.98); }
          100% { transform: scaleX(-1) rotate(-2deg) scaleY(1.01); }
        }
        @keyframes sharkWiggle {
          0%   { transform: rotate(-2deg) scaleY(1.01); }
          25%  { transform: rotate(0deg)  scaleY(0.99); }
          50%  { transform: rotate(2deg)  scaleY(1.01); }
          75%  { transform: rotate(0deg)  scaleY(0.99); }
          100% { transform: rotate(-2deg) scaleY(1.01); }
        }
        @keyframes crabDance {
          0%   { transform: translateX(0px); }
          10%  { transform: translateX(14px); }
          20%  { transform: translateX(28px); }
          30%  { transform: translateX(42px); }
          45%  { transform: translateX(42px); }
          55%  { transform: translateX(28px); }
          65%  { transform: translateX(14px); }
          75%  { transform: translateX(0px); }
          100% { transform: translateX(0px); }
        }
        @keyframes crabPinch {
          0%, 70%, 100% { transform: scaleX(1)    scaleY(1); }
          80%            { transform: scaleX(1.12) scaleY(0.9); }
          90%            { transform: scaleX(0.94) scaleY(1.05); }
        }
        @keyframes sway {
          0%, 100% { transform-origin: bottom center; transform: rotate(-4deg); }
          50%       { transform-origin: bottom center; transform: rotate(4deg); }
        }
        @keyframes coralSway {
          0%, 100% { transform-origin: bottom center; transform: rotate(-2deg); }
          50%       { transform-origin: bottom center; transform: rotate(2deg); }
        }
        @keyframes bubbleRise {
          0%   { transform: translateY(0)      scale(1);   opacity: 0.8; }
          80%  { transform: translateY(-160px) scale(1.4); opacity: 0.4; }
          100% { transform: translateY(-200px) scale(1.6); opacity: 0; }
        }
      `}</style>

      {/* Layer 1 — Water gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #003d6e 0%, #005f9e 25%, #0077be 55%, #0099cc 80%, #00b4d8 100%)',
      }} />

      {/* Layer 2 — Caustic shimmer */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 30% 10%, rgba(0,180,216,0.25) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(0,119,190,0.2) 0%, transparent 50%)',
      }} />

      {/* Layer 3 — Whale */}
      <div style={{ position: 'absolute', top: '20%', left: 0, animation: 'swimRight 28s linear infinite' }}>
        <img src="/ocean/whale1.png" alt="" style={{ width: '360px', display: 'block', animation: 'whaleWiggle 1.4s ease-in-out infinite' }} />
      </div>

      {/* Layer 4 — Shark */}
      <div style={{ position: 'absolute', top: '36%', left: 0, animation: 'swimLeft 18s linear infinite', animationDelay: '-9s' }}>
        <img src="/ocean/shark1.png" alt="" style={{ width: '280px', display: 'block', animation: 'sharkWiggle 1s ease-in-out infinite' }} />
      </div>

      {/* Layer 5 — Sand floor: matched to sprite shadow tone ~#f0d0a8 */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '19%',
        background: `
          radial-gradient(ellipse 14% 50% at 18% 55%, rgba(210,175,130,0.4) 0%, transparent 100%),
          radial-gradient(ellipse 10% 40% at 52% 75%, rgba(225,195,155,0.3) 0%, transparent 100%),
          radial-gradient(ellipse 12% 60% at 78% 45%, rgba(200,165,120,0.35) 0%, transparent 100%),
          radial-gradient(ellipse 18% 70% at 38% 65%, rgba(235,205,165,0.2) 0%, transparent 100%),
          linear-gradient(180deg, #dbb88a 0%, #e8c9a0 20%, #f0d4b0 45%, #f5dfc2 70%, #faebd5 100%)
        `,
        borderRadius: '50% 50% 0 0 / 20px 20px 0 0',
      }} />

      {/* Sand ripple texture */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '19%',
        background: `
          repeating-linear-gradient(
            90deg,
            transparent 0px, transparent 50px,
            rgba(195,155,100,0.07) 50px, rgba(195,155,100,0.07) 52px,
            transparent 52px, transparent 110px,
            rgba(215,175,120,0.05) 110px, rgba(215,175,120,0.05) 112px
          )
        `,
        borderRadius: '50% 50% 0 0 / 20px 20px 0 0',
      }} />

      {/* ── LEFT CLUSTER (compact, leaves centre clear for ManyCam) ── */}

      {/* 1. Two overlapping seaweeds far left */}
      <img src="/ocean/seaweed1.png" alt="" style={{
        position: 'absolute', bottom: '10%', left: '1%', height: '40%',
        animation: 'sway 3s ease-in-out infinite',
      }} />
      <img src="/ocean/seaweed1.png" alt="" style={{
        position: 'absolute', bottom: '10%', left: '6%', height: '32%', opacity: 0.85,
        animation: 'sway 3.8s ease-in-out infinite', animationDelay: '0.4s',
      }} />

      {/* 2. Coral next to them */}
      <img src="/ocean/coral1.png" alt="" style={{
        position: 'absolute', bottom: '10%', left: '15%', height: '28%',
        animation: 'coralSway 5s ease-in-out infinite',
      }} />

      {/* 3. Crab — right of coral cluster, dancing */}
      <div style={{ position: 'absolute', bottom: '13%', left: '32%', height: '18%', animation: 'crabDance 4s ease-in-out infinite' }}>
        <img src="/ocean/crab1.png" alt="" style={{ height: '100%', display: 'block', animation: 'crabPinch 2.5s ease-in-out infinite' }} />
      </div>

      {/* ── RIGHT CLUSTER ── */}

      {/* 4. Coral + seaweed overlapping, far right (not offscreen) */}
      <img src="/ocean/coral1.png" alt="" style={{
        position: 'absolute', bottom: '10%', right: '16%', height: '26%', opacity: 0.92,
        animation: 'coralSway 6s ease-in-out infinite', animationDelay: '1s',
      }} />
      <img src="/ocean/seaweed1.png" alt="" style={{
        position: 'absolute', bottom: '10%', right: '7%', height: '34%',
        animation: 'sway 4s ease-in-out infinite', animationDelay: '0.7s',
      }} />

      {/* 5. One seaweed to the right of the right cluster */}
      <img src="/ocean/seaweed1.png" alt="" style={{
        position: 'absolute', bottom: '10%', right: '2%', height: '28%', opacity: 0.88,
        animation: 'sway 3.3s ease-in-out infinite', animationDelay: '1.3s',
      }} />

      {/* Bubbles */}
      {[...floorBubbles, ...whaleBubbles, ...sharkBubbles].map((b) => (
        <div key={b.id} style={{
          position: 'absolute', bottom: b.bottom, left: b.left,
          width: b.size, height: b.size, borderRadius: '50%',
          background: 'rgba(255,255,255,0.4)',
          border: '1px solid rgba(255,255,255,0.6)',
          animation: `bubbleRise ${b.duration}s ease-in infinite`,
          animationDelay: `${b.delay}s`,
        }} />
      ))}
    </div>
  );
}
