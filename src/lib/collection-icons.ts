export type IconType = 'sparkles' | 'wind' | 'wand' | 'rocket' | 'flame' | 'droplet' | 'zap' | 'star' | 'heart' | 'leaf' | 'tree' | 'bug' | 'bird' | 'default';

export const ICON_OPTIONS: { value: IconType; label: string; description: string }[] = [
  { value: 'sparkles', label: '✨ Sparkles', description: 'Stars, magic, shine' },
  { value: 'wind', label: '🌬️ Wind', description: 'Air, steam, movement' },
  { value: 'wand', label: '✨ Wand', description: 'Magic, spells, wizard' },
  { value: 'rocket', label: '🚀 Rocket', description: 'Space, speed, adventure' },
  { value: 'flame', label: '🔥 Flame', description: 'Fire, heat, energy' },
  { value: 'droplet', label: '💧 Droplet', description: 'Water, liquid, cool' },
  { value: 'zap', label: '⚡ Zap', description: 'Electric, energy, power' },
  { value: 'star', label: '⭐ Star', description: 'Excellence, merit' },
  { value: 'heart', label: '❤️ Heart', description: 'Love, care, emotion' },
  { value: 'leaf', label: '🍃 Leaf', description: 'Nature, jungle, plants' },
  { value: 'tree', label: '🌲 Tree', description: 'Forest, nature, wildlife' },
  { value: 'bug', label: '🐛 Bug', description: 'Insects, jungle creatures' },
  { value: 'bird', label: '🐦 Bird', description: 'Flying, sky, freedom' },
  { value: 'default', label: '📦 Default', description: 'Generic, placeholder' },
];

export function getIconTypeLabel(iconType: IconType | string): string {
  const option = ICON_OPTIONS.find(o => o.value === iconType);
  return option?.label || 'Default';
}
