'use client';

import { useState, useEffect } from 'react';
import { getSessionProgressByStudentId } from '@/lib/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import type { SessionProgress } from '@/lib/types';

export interface QueuedVocab   { word: string; meaning: string }
export interface QueuedGrammar { role: string; cloze: string }
export interface QueuedPhonics { keyword: string; pairWord: string }

interface Props {
  studentId: string;
  onQueue: (vocab: QueuedVocab[], grammar: QueuedGrammar[], phonics: QueuedPhonics[]) => void;
}

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SessionProcessCards({ studentId, onQueue }: Props) {
  const [sessions, setSessions] = useState<SessionProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Per-session selection state: sessionId → set of item keys
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    getSessionProgressByStudentId(studentId)
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [studentId]);

  const toggle = (sessionId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(sessionId) ? next.delete(sessionId) : next.add(sessionId);
      return next;
    });
    if (!selected[sessionId]) {
      setSelected(prev => ({ ...prev, [sessionId]: new Set() }));
    }
  };

  const toggleItem = (sessionId: string, key: string) => {
    setSelected(prev => {
      const cur = new Set(prev[sessionId] || []);
      cur.has(key) ? cur.delete(key) : cur.add(key);
      return { ...prev, [sessionId]: cur };
    });
  };

  const handleSave = (session: SessionProgress) => {
    const sel = selected[session.id] || new Set();
    const vocab: QueuedVocab[] = (session.vocabulary || [])
      .filter((_, i) => sel.has(`v-${i}`))
      .map(v => ({ word: v.word, meaning: v.meaning }));
    const grammar: QueuedGrammar[] = (session.grammar || [])
      .filter((_, i) => sel.has(`g-${i}`))
      .map(g => ({ role: g.point, cloze: g.example }));
    const phonics: QueuedPhonics[] = (session.phonics || [])
      .filter((_, i) => sel.has(`p-${i}`))
      .map(p => ({ keyword: p.sound, pairWord: p.examples?.[0] || '' }));
    onQueue(vocab, grammar, phonics);
    // Deselect all after saving
    setSelected(prev => ({ ...prev, [session.id]: new Set() }));
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions…
      </div>
    );
  }

  const completed = sessions.filter(s => s.status === 'completed' || s.vocabulary?.length || s.grammar?.length || s.phonics?.length);

  if (completed.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No past sessions with captured items yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {completed.map(session => {
        const isOpen = expanded.has(session.id);
        const sel = selected[session.id] || new Set();
        const totalItems = (session.vocabulary?.length || 0) + (session.grammar?.length || 0) + (session.phonics?.length || 0);
        const selCount = sel.size;

        return (
          <Card key={session.id} className="border border-border">
            <CardHeader
              className="py-3 px-4 cursor-pointer select-none"
              onClick={() => toggle(session.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <CardTitle className="text-sm font-semibold">
                    Past Session — {formatDate(session.createdAt)}
                  </CardTitle>
                  {session.sessionQuestion && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">· {session.sessionQuestion}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {totalItems > 0 && (
                    <Badge variant="secondary" className="text-xs">{totalItems} items</Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            {isOpen && (
              <CardContent className="pt-0 pb-4 px-4 space-y-4">

                {/* Vocab */}
                {(session.vocabulary?.length || 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">📖 Vocabulary</p>
                    <div className="flex flex-col gap-1">
                      {session.vocabulary!.map((v, i) => (
                        <label key={i} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-muted/40 rounded px-2 py-1">
                          <Checkbox
                            checked={sel.has(`v-${i}`)}
                            onCheckedChange={() => toggleItem(session.id, `v-${i}`)}
                          />
                          <span className="font-medium">{v.word}</span>
                          {v.meaning && <span className="text-muted-foreground">— {v.meaning}</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grammar */}
                {(session.grammar?.length || 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">✍️ Grammar</p>
                    <div className="flex flex-col gap-1">
                      {session.grammar!.map((g, i) => (
                        <label key={i} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-muted/40 rounded px-2 py-1">
                          <Checkbox
                            checked={sel.has(`g-${i}`)}
                            onCheckedChange={() => toggleItem(session.id, `g-${i}`)}
                          />
                          <span className="font-medium">{g.point}</span>
                          {g.example && <span className="text-muted-foreground italic">— {g.example}</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Phonics */}
                {(session.phonics?.length || 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">🔤 Phonics</p>
                    <div className="flex flex-col gap-1">
                      {session.phonics!.map((p, i) => (
                        <label key={i} className="flex items-center gap-3 text-sm cursor-pointer hover:bg-muted/40 rounded px-2 py-1">
                          <Checkbox
                            checked={sel.has(`p-${i}`)}
                            onCheckedChange={() => toggleItem(session.id, `p-${i}`)}
                          />
                          <span className="font-medium">{p.sound}</span>
                          {p.examples?.[0] && <span className="text-muted-foreground">sounds like {p.examples[0]}</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {selCount > 0 && (
                  <Button
                    size="sm"
                    className="bg-k-orange hover:bg-k-orange/90 text-white"
                    onClick={() => handleSave(session)}
                  >
                    Save {selCount} selected item{selCount !== 1 ? 's' : ''} →
                  </Button>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
