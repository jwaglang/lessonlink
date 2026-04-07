'use client';
// Q46

import { ANIMATION_SNIPPETS } from '../lib/animation-snippets';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface AnimationPickerProps {
  animationType: string;
  animationEmoji: string;
  onTypeChange: (type: string) => void;
  onEmojiChange: (emoji: string) => void;
}

export default function AnimationPicker({
  animationType,
  animationEmoji,
  onTypeChange,
  onEmojiChange,
}: AnimationPickerProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Animation Type</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(ANIMATION_SNIPPETS).map(([key, anim]) => (
            <button
              key={key}
              onClick={() => onTypeChange(key)}
              className={cn(
                'flex flex-col items-start rounded-lg border-2 px-3 py-2 text-left transition-all',
                animationType === key
                  ? 'border-primary bg-accent/40'
                  : 'border-border hover:border-muted-foreground'
              )}
            >
              <span className="text-xs font-medium">{anim.label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">{anim.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1 max-w-xs">
        <Label htmlFor="anim-emoji">Animation Emoji</Label>
        <Input
          id="anim-emoji"
          value={animationEmoji}
          onChange={(e) => onEmojiChange(e.target.value)}
          placeholder="e.g. 🎵"
          className="text-lg"
        />
      </div>
    </div>
  );
}
