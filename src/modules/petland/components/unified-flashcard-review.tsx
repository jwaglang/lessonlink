'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Vocabulary } from '../types';
import type { GrammarCard, PhonicsCard } from '../types';

// ── Discriminated union ───────────────────────────────────────────────────────

export type ReviewCard =
  | { kind: 'vocab';   id: string; card: Vocabulary }
  | { kind: 'grammar'; id: string; card: GrammarCard }
  | { kind: 'phonics'; id: string; card: PhonicsCard }

export type ReviewResult = { id: string; kind: ReviewCard['kind']; knew: boolean }

// ── Sub-renders ───────────────────────────────────────────────────────────────

function VocabFront({ card }: { card: Vocabulary }) {
  const front =
    card.type === 'cloze'
      ? (card.sentence?.replace(card.word, '___') || card.sentence)
      : card.sentence;
  return (
    <div className="w-full max-w-sm rounded-2xl border-2 border-primary bg-primary/5 p-8 text-center">
      <p className="text-2xl font-bold text-primary">{front}</p>
    </div>
  );
}

function VocabBack({ card }: { card: Vocabulary }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border bg-muted/40 p-6 text-center space-y-2">
      {card.imageUrl && (
        <img src={card.imageUrl} className="w-16 h-16 object-contain mx-auto mb-2" alt="" />
      )}
      <p className="text-2xl font-bold">{card.word}</p>
    </div>
  );
}

function GrammarFront({ card }: { card: GrammarCard }) {
  const errorSet = new Set((card.errorWords || []).map(w => w.toLowerCase()));
  const tokens = (card.wrongSentence || '').split(/(\s+)/);
  return (
    <div className="w-full max-w-sm space-y-3">
      <div className="flex justify-center">
        <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs font-semibold px-3 py-1">
          ✍️ Sentence Switcher
        </Badge>
      </div>
      <div className="rounded-2xl border-2 border-orange-300 bg-orange-50 p-8 text-center">
        <p className="text-xs text-orange-500 font-medium mb-2 uppercase tracking-wide">{card.rule}</p>
        <p className="text-xl font-bold text-orange-900 italic">
          {tokens.map((tok, i) => {
            const clean = tok.replace(/[.,!?;:]$/, '');
            return errorSet.has(clean.toLowerCase())
              ? <span key={i} className="text-red-500">{tok}</span>
              : <span key={i}>{tok}</span>;
          })}
        </p>
        <p className="text-xs text-orange-400 mt-3">What&apos;s the mistake?</p>
      </div>
    </div>
  );
}

function GrammarBack({ card }: { card: GrammarCard }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border-2 border-orange-200 bg-orange-50 p-6 text-center space-y-3">
      <p className="text-3xl font-bold text-orange-700">{card.answer}</p>
      <p className="text-sm text-orange-600 italic">{card.correctSentence}</p>
    </div>
  );
}

function PhonicsFront({ card }: { card: PhonicsCard }) {
  return (
    <div className="w-full max-w-sm space-y-3">
      <div className="flex justify-center">
        <Badge className="bg-sky-100 text-sky-700 border-sky-200 text-xs font-semibold px-3 py-1">
          🔤 Phonic Fork
        </Badge>
      </div>
      <div className="rounded-2xl border-2 border-sky-300 bg-sky-50 p-8 text-center space-y-4">
        <p className="text-3xl font-bold text-sky-900">{card.keyword}</p>
        <p className="text-sm text-sky-500 font-medium">Which sound do you hear?</p>
        <div className="flex justify-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-mono font-bold text-sky-700">{card.targetIPA}</span>
            <span className="text-xs text-sky-400">← left</span>
          </div>
          <span className="text-sky-300 text-2xl font-light">|</span>
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-mono font-bold text-slate-500">{card.pairIPA}</span>
            <span className="text-xs text-slate-400">right →</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PhonicsBack({ card }: { card: PhonicsCard }) {
  return (
    <div className="w-full max-w-sm rounded-2xl border-2 border-sky-200 bg-sky-50 p-5 space-y-3">
      <div className="text-center">
        <span className="text-2xl font-mono font-bold text-sky-700">{card.targetIPA}</span>
        <span className="text-sky-400 mx-2">→</span>
        <span className="text-xl font-bold text-sky-900">{card.keyword}</span>
        <span className="text-sm text-slate-400 mx-3">not</span>
        <span className="text-lg font-bold text-slate-500">{card.pairWord}</span>
        <span className="text-slate-400 mx-1 font-mono text-sm">{card.pairIPA}</span>
      </div>
      {card.minimalPairs.length > 0 && (
        <div>
          <p className="text-xs text-sky-500 font-medium mb-2 text-center">Minimal pairs</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {card.minimalPairs.map((pair, i) => (
              <span
                key={i}
                className="text-xs bg-white border border-sky-200 rounded px-2 py-1 font-mono text-sky-800"
              >
                {pair.word1} / {pair.word2}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function UnifiedFlashcardReview({
  cards,
  onComplete,
}: {
  cards: ReviewCard[];
  onComplete: (results: ReviewResult[]) => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [results, setResults] = useState<ReviewResult[]>([]);
  const [done, setDone] = useState(false);

  const current = cards[index];

  const handleAnswer = (knew: boolean) => {
    const updated = [...results, { id: current.id, kind: current.kind, knew }];
    if (index + 1 >= cards.length) {
      setResults(updated);
      setDone(true);
      onComplete(updated);
    } else {
      setResults(updated);
      setIndex(index + 1);
      setRevealed(false);
      setHintsUsed(0);
    }
  };

  if (cards.length === 0) return null;

  if (done) {
    const knewCount = results.filter(r => r.knew).length;
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-2">
          <p className="text-2xl font-bold">Review complete!</p>
          <p className="text-muted-foreground">
            {knewCount} / {results.length} known
          </p>
        </CardContent>
      </Card>
    );
  }

  const titleLabel =
    current.kind === 'grammar' ? '✍️ Sentence Switcher' :
    current.kind === 'phonics' ? '🔤 Phonic Fork' :
    'Flashcard Review';

  const titleColor =
    current.kind === 'grammar' ? 'text-orange-600' :
    current.kind === 'phonics' ? 'text-sky-600' :
    'text-primary';

  // Hint only applies to vocab cards
  const vocabCard = current.kind === 'vocab' ? current.card : null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={titleColor}>{titleLabel}</CardTitle>
          <span className="text-sm text-muted-foreground font-medium">
            {index + 1} / {cards.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6 py-4">

        {/* Front face */}
        {!revealed && (
          <>
            {current.kind === 'vocab'   && <VocabFront   card={current.card} />}
            {current.kind === 'grammar' && <GrammarFront card={current.card} />}
            {current.kind === 'phonics' && <PhonicsFront card={current.card} />}

            <div className="flex flex-col items-center gap-3 w-full max-w-sm">
              {/* Vocab hint letters */}
              {vocabCard && hintsUsed > 0 && (
                <p className="text-xl font-bold tracking-widest text-primary">
                  {vocabCard.word.split('').map((ch, i) => (i < hintsUsed ? ch : '_')).join(' ')}
                </p>
              )}
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={() => setRevealed(true)}>
                  Reveal
                </Button>
                {vocabCard && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={hintsUsed >= vocabCard.word.length}
                    onClick={() => setHintsUsed(h => h + 1)}
                  >
                    Hint {hintsUsed > 0 ? `(${hintsUsed}/${vocabCard.word.length})` : ''}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Back face */}
        {revealed && (
          <>
            {current.kind === 'vocab'   && <VocabBack   card={current.card} />}
            {current.kind === 'grammar' && <GrammarBack card={current.card} />}
            {current.kind === 'phonics' && <PhonicsBack card={current.card} />}

            <div className="flex gap-4 w-full max-w-sm">
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold"
                onClick={() => handleAnswer(true)}
              >
                ✓ Knew it
              </Button>
              <Button
                variant="destructive"
                className="flex-1 font-bold"
                onClick={() => handleAnswer(false)}
              >
                ✗ Didn't know
              </Button>
            </div>
          </>
        )}

      </CardContent>
    </Card>
  );
}
