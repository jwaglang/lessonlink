'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Volume2 } from 'lucide-react';
import { generatePairSentence } from '../ai/generate-pair-sentence';
import { generatePhonicsWordImage } from '../ai/generate-pet-image-flow';
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

type PhonicsGamePhase = 'loading' | 'ready' | 'answered';

export function PhonicsGame({ card, onAnswer, onGenerated }: {
  card: PhonicsCard;
  onAnswer: (knew: boolean) => void;
  onGenerated?: (data: NonNullable<PhonicsCard['gameData']>) => void;
}) {
  const g = card.gameData;
  const [phase, setPhase] = useState<PhonicsGamePhase>(g ? 'ready' : 'loading');
  const [pictureWord, setPictureWord] = useState(g?.pictureWord ?? '');
  const [audioWord, setAudioWord] = useState(g?.audioWord ?? '');
  const [otherWord, setOtherWord] = useState(g?.otherWord ?? '');
  const [sentence, setSentence] = useState(g?.sentence ?? '');
  const [imageUrl, setImageUrl] = useState(g?.imageUrl ?? '');
  const [isMatch, setIsMatch] = useState(g?.isMatch ?? false);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState('');
  const initialized = useRef(false);

  useEffect(() => {
    // L-side: gameData already loaded into state above — nothing to do
    if (card.gameData) return;

    if (initialized.current) return;
    initialized.current = true;

    // T-side preview only: generate image + sentence
    const pairs = card.minimalPairs;
    if (!pairs.length) { setLoadError('No minimal pairs on this card.'); return; }

    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    const picWord = Math.random() < 0.5 ? pair.word1 : pair.word2;
    const other = picWord === pair.word1 ? pair.word2 : pair.word1;
    const match = Math.random() < 0.5;
    const audWord = match ? picWord : other;

    setPictureWord(picWord);
    setAudioWord(audWord);
    setOtherWord(other);
    setIsMatch(match);

    Promise.all([
      generatePairSentence(audWord, pair.word1, pair.word2),
      generatePhonicsWordImage(picWord, other),
    ]).then(([sentResult, imgUrl]) => {
      setSentence(sentResult.sentence);
      setImageUrl(imgUrl);
      setPhase('ready');
      onGenerated?.({ imageUrl: imgUrl, sentence: sentResult.sentence, pictureWord: picWord, audioWord: audWord, otherWord: other, isMatch: match });
    }).catch(() => {
      setLoadError('Failed to load the game. Please skip this card.');
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const playAudio = () => {
    if (!sentence || typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(sentence);
    utt.rate = 0.85;
    utt.lang = 'en-US';
    window.speechSynthesis.speak(utt);
  };

  const handleGuess = (guessedMatch: boolean) => {
    const isCorrect = guessedMatch === isMatch;
    setCorrect(isCorrect);
    setPhase('answered');
    setTimeout(() => onAnswer(isCorrect), 1800);
  };

  if (loadError) return (
    <div className="text-center text-sm text-red-500 py-4">{loadError}</div>
  );

  if (phase === 'loading' && !card.gameData) return (
    <div className="text-center text-sm text-amber-600 py-6 space-y-1">
      <p className="font-medium">Card not ready</p>
      <p className="text-xs text-muted-foreground">T needs to preview a pair before this card can be played.</p>
    </div>
  );

  if (phase === 'loading') return (
    <div className="flex flex-col items-center gap-3 py-6">
      <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
      <p className="text-xs text-sky-500">Generating game…</p>
    </div>
  );

  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="flex justify-center">
        <Badge className="bg-sky-100 text-sky-700 border-sky-200 text-xs font-semibold px-3 py-1">
          🔤 Phonic Fork
        </Badge>
      </div>

      {/* Picture */}
      <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-4 flex flex-col items-center gap-3">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={pictureWord}
            className="w-36 h-36 object-contain rounded-xl bg-white border border-sky-100"
          />
        )}
        <p className="text-xs text-sky-400 italic">What does the picture show?</p>
      </div>

      {/* Audio button */}
      <Button
        variant="outline"
        className="w-full border-sky-300 text-sky-700 hover:bg-sky-50 gap-2"
        onClick={playAudio}
      >
        <Volume2 className="h-4 w-4" />
        Play sentence
      </Button>

      {/* Answer buttons or result */}
      {phase === 'ready' && (
        <div className="flex gap-3">
          <Button
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold"
            onClick={() => handleGuess(true)}
          >
            ✓ Match
          </Button>
          <Button
            variant="destructive"
            className="flex-1 font-bold"
            onClick={() => handleGuess(false)}
          >
            ✗ Mismatch
          </Button>
        </div>
      )}

      {phase === 'answered' && (
        <div className={`rounded-xl p-4 text-center space-y-2 ${correct ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`text-lg font-bold ${correct ? 'text-green-700' : 'text-red-600'}`}>
            {correct ? '✓ Correct!' : '✗ Not quite'}
          </p>
          <p className="text-sm text-slate-500 italic">"{sentence}"</p>
          <p className="text-xs text-slate-500">
            Picture: <span className="font-semibold text-slate-700">{pictureWord}</span>
            {' · '}
            Sentence: <span className="font-semibold text-slate-700">{audioWord}</span>
            {' · '}
            <span className={isMatch ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
              {isMatch ? 'match ✓' : 'mismatch ✗'}
            </span>
          </p>
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

        {/* Phonics: self-contained game (no flip) */}
        {current.kind === 'phonics' && (
          <PhonicsGame key={current.id} card={current.card} onAnswer={handleAnswer} />
        )}

        {/* Front face (vocab + grammar only) */}
        {current.kind !== 'phonics' && !revealed && (
          <>
            {current.kind === 'vocab'   && <VocabFront   card={current.card} />}
            {current.kind === 'grammar' && <GrammarFront card={current.card} />}

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

        {/* Back face (vocab + grammar only) */}
        {current.kind !== 'phonics' && revealed && (
          <>
            {current.kind === 'vocab'   && <VocabBack   card={current.card} />}
            {current.kind === 'grammar' && <GrammarBack card={current.card} />}

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
