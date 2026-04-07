'use client';
// Q46

import { THEME_PRESETS } from '../lib/theme-presets';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface ThemePickerProps {
  value: string;
  onChange: (theme: string) => void;
}

export default function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div className="space-y-2">
      <Label>Color Theme</Label>
      <div className="flex flex-wrap gap-2">
        {Object.entries(THEME_PRESETS).map(([key, theme]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            title={theme.label}
            className={cn(
              'flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-xs font-medium transition-all',
              value === key ? 'border-primary shadow-sm' : 'border-border hover:border-muted-foreground'
            )}
          >
            {/* Color swatches */}
            <span className="flex gap-0.5">
              {[theme.primary, theme.secondary, theme.accent].map((color, i) => (
                <span
                  key={i}
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
              ))}
            </span>
            {theme.label}
          </button>
        ))}
      </div>
    </div>
  );
}
