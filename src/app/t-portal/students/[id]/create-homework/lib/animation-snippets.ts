// Q46

export interface AnimationSnippet {
  label: string;
  description: string;
  css: (emoji: string) => string;
}

export const ANIMATION_SNIPPETS: Record<string, AnimationSnippet> = {
  floating_particles: {
    label: 'Floating Particles',
    description: 'Emoji drift upward slowly from the bottom',
    css: (emoji) => `
<style>
@keyframes floatUp {
  0%   { transform: translateY(100vh) scale(0.5); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateY(-10vh) scale(1); opacity: 0; }
}
.anim-particle {
  position: fixed;
  font-size: 1.5rem;
  animation: floatUp linear infinite;
  pointer-events: none;
  z-index: 0;
  user-select: none;
}
</style>
<script>
(function() {
  const emoji = '${emoji}';
  const count = 12;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'anim-particle';
    el.textContent = emoji;
    el.style.left = Math.random() * 100 + 'vw';
    el.style.animationDuration = (6 + Math.random() * 8) + 's';
    el.style.animationDelay = (Math.random() * 10) + 's';
    document.body.appendChild(el);
  }
})();
</script>`,
  },

  horizontal_scroll: {
    label: 'Horizontal Scroll',
    description: 'Emoji scroll across the top of the page',
    css: (emoji) => `
<style>
@keyframes scrollRight {
  0%   { transform: translateX(-10vw); }
  100% { transform: translateX(110vw); }
}
.anim-scroller {
  position: fixed;
  top: 8px;
  font-size: 1.4rem;
  animation: scrollRight linear infinite;
  pointer-events: none;
  z-index: 0;
  user-select: none;
}
</style>
<script>
(function() {
  const emoji = '${emoji}';
  const count = 5;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'anim-scroller';
    el.textContent = emoji;
    el.style.animationDuration = (8 + Math.random() * 6) + 's';
    el.style.animationDelay = -(i * 3) + 's';
    el.style.top = (4 + Math.random() * 20) + 'px';
    document.body.appendChild(el);
  }
})();
</script>`,
  },

  pulsing_glow: {
    label: 'Pulsing Glow',
    description: 'Large emoji pulses gently in the background',
    css: (emoji) => `
<style>
@keyframes pulseGlow {
  0%, 100% { transform: scale(1);   opacity: 0.08; }
  50%       { transform: scale(1.2); opacity: 0.18; }
}
.anim-glow {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 18rem;
  animation: pulseGlow 3s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
  user-select: none;
}
</style>
<div class="anim-glow">${emoji}</div>`,
  },

  rising_bubbles: {
    label: 'Rising Bubbles',
    description: 'Emoji rise with a slight wobble like bubbles',
    css: (emoji) => `
<style>
@keyframes riseBubble {
  0%   { transform: translateY(100vh) translateX(0);      opacity: 0; }
  10%  { opacity: 0.9; }
  50%  { transform: translateY(50vh) translateX(15px); }
  75%  { transform: translateY(25vh) translateX(-15px); }
  90%  { opacity: 0.9; }
  100% { transform: translateY(-10vh) translateX(0);      opacity: 0; }
}
.anim-bubble {
  position: fixed;
  font-size: 1.6rem;
  animation: riseBubble ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
  user-select: none;
}
</style>
<script>
(function() {
  const emoji = '${emoji}';
  const count = 10;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'anim-bubble';
    el.textContent = emoji;
    el.style.left = (5 + Math.random() * 90) + 'vw';
    el.style.animationDuration = (7 + Math.random() * 7) + 's';
    el.style.animationDelay = (Math.random() * 12) + 's';
    document.body.appendChild(el);
  }
})();
</script>`,
  },

  spinning_orbit: {
    label: 'Spinning Orbit',
    description: 'Emoji orbit around a center point',
    css: (emoji) => `
<style>
@keyframes orbit {
  from { transform: rotate(0deg) translateX(120px) rotate(0deg); }
  to   { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
}
.anim-orbit-container {
  position: fixed;
  top: 50%;
  left: 50%;
  pointer-events: none;
  z-index: 0;
}
.anim-orbiter {
  position: absolute;
  font-size: 1.5rem;
  animation: orbit linear infinite;
  user-select: none;
}
</style>
<script>
(function() {
  const emoji = '${emoji}';
  const container = document.createElement('div');
  container.className = 'anim-orbit-container';
  const count = 4;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'anim-orbiter';
    el.textContent = emoji;
    el.style.animationDuration = (8 + i * 2) + 's';
    el.style.animationDelay = -(i * (8 / count)) + 's';
    container.appendChild(el);
  }
  document.body.appendChild(container);
})();
</script>`,
  },

  wave_motion: {
    label: 'Wave Motion',
    description: 'Emoji move in a sine wave across the screen',
    css: (emoji) => `
<style>
@keyframes wave {
  0%   { transform: translateX(-10vw) translateY(0); }
  25%  { transform: translateX(25vw) translateY(-40px); }
  50%  { transform: translateX(60vw) translateY(0); }
  75%  { transform: translateX(85vw) translateY(-40px); }
  100% { transform: translateX(110vw) translateY(0); }
}
.anim-wave {
  position: fixed;
  font-size: 1.4rem;
  animation: wave ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
  user-select: none;
}
</style>
<script>
(function() {
  const emoji = '${emoji}';
  const count = 4;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'anim-wave';
    el.textContent = emoji;
    el.style.top = (20 + i * 20) + '%';
    el.style.animationDuration = (10 + i * 2) + 's';
    el.style.animationDelay = -(i * 3) + 's';
    document.body.appendChild(el);
  }
})();
</script>`,
  },

  twinkle: {
    label: 'Twinkle',
    description: 'Emoji appear and fade randomly across the page',
    css: (emoji) => `
<style>
@keyframes twinkle {
  0%, 100% { opacity: 0; transform: scale(0.5); }
  50%       { opacity: 1; transform: scale(1.2); }
}
.anim-twinkle {
  position: fixed;
  font-size: 1.4rem;
  animation: twinkle ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
  user-select: none;
}
</style>
<script>
(function() {
  const emoji = '${emoji}';
  const count = 16;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'anim-twinkle';
    el.textContent = emoji;
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = Math.random() * 100 + 'vh';
    el.style.animationDuration = (2 + Math.random() * 3) + 's';
    el.style.animationDelay = (Math.random() * 4) + 's';
    document.body.appendChild(el);
  }
})();
</script>`,
  },

  bouncing: {
    label: 'Bouncing',
    description: 'Emoji bounce up and down at the bottom of the screen',
    css: (emoji) => `
<style>
@keyframes bounce {
  0%, 100% { transform: translateY(0); animation-timing-function: ease-in; }
  50%       { transform: translateY(-60px); animation-timing-function: ease-out; }
}
.anim-bouncer {
  position: fixed;
  bottom: 12px;
  font-size: 1.6rem;
  animation: bounce ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
  user-select: none;
}
</style>
<script>
(function() {
  const emoji = '${emoji}';
  const count = 6;
  const positions = [5, 20, 38, 55, 72, 88];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'anim-bouncer';
    el.textContent = emoji;
    el.style.left = positions[i] + 'vw';
    el.style.animationDuration = (0.8 + Math.random() * 0.6) + 's';
    el.style.animationDelay = (Math.random() * 0.5) + 's';
    document.body.appendChild(el);
  }
})();
</script>`,
  },
};
