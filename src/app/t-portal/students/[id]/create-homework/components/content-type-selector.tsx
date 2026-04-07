'use client';
// Q46

import { BookOpen, Music, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ContentType = 'workbook' | 'song_worksheet' | 'phonics_workbook';

interface ContentTypeSelectorProps {
  selected: ContentType | null;
  onSelect: (type: ContentType) => void;
}

const OPTIONS: { type: ContentType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    type: 'workbook',
    label: 'Workbook (WHITE)',
    description: '8 vocabulary words, reading, minimal pairs, fill-in-blanks, and riddles.',
    icon: <BookOpen className="h-7 w-7" />,
  },
  {
    type: 'song_worksheet',
    label: 'Song Worksheet',
    description: 'Lyrics, vocabulary, matching, questions, and speaking prompts for a song.',
    icon: <Music className="h-7 w-7" />,
  },
  {
    type: 'phonics_workbook',
    label: 'Phonics Workbook',
    description: 'Two sound groups with contrastive vocabulary and minimal pair focus.',
    icon: <Mic className="h-7 w-7" />,
  },
];

export default function ContentTypeSelector({ selected, onSelect }: ContentTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {OPTIONS.map(({ type, label, description, icon }) => (
        <button
          key={type}
          onClick={() => onSelect(type)}
          className={cn(
            'flex flex-col items-start gap-3 rounded-xl border-2 p-5 text-left transition-all hover:border-primary hover:bg-accent/30',
            selected === type
              ? 'border-primary bg-accent/40 shadow-sm'
              : 'border-border bg-card'
          )}
        >
          <div className={cn(
            'flex items-center justify-center h-12 w-12 rounded-lg',
            selected === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}>
            {icon}
          </div>
          <div>
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
