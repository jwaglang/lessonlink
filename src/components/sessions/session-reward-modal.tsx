'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { addReward, addSessionVocabulary, addSessionGrammar, addSessionPhonics } from '@/lib/firestore';
import { Star, Sparkles, Volume2, BookOpen, Loader2 } from 'lucide-react';

interface SessionRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionProgressId: string;
  studentName: string;
}

export default function SessionRewardModal({
  isOpen,
  onClose,
  sessionProgressId,
  studentName,
}: SessionRewardModalProps) {
  const [tab, setTab] = useState<'rewards' | 'vocabulary' | 'grammar' | 'phonics'>('rewards');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    word: '',
    definition: '',
    rule: '',
    example: '',
    sound: '',
    soundWord: '',
  });

  const handleReward = async (type: 'wow' | 'treasure' | 'brainfart') => {
    if (loading) return;
    setLoading(true);
    try {
      await addReward(sessionProgressId, type);
      // Keep modal open for quick repeated rewards
    } catch (error) {
      console.error('Failed to add reward:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddVocabulary = async () => {
    if (!formData.word || !formData.definition) return;
    setLoading(true);
    try {
      await addSessionVocabulary(sessionProgressId, formData.word, formData.definition);
      setFormData({ ...formData, word: '', definition: '' });
    } catch (error) {
      console.error('Failed to add vocabulary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddGrammar = async () => {
    if (!formData.rule || !formData.example) return;
    setLoading(true);
    try {
      await addSessionGrammar(sessionProgressId, formData.rule, formData.example);
      setFormData({ ...formData, rule: '', example: '' });
    } catch (error) {
      console.error('Failed to add grammar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhonics = async () => {
    if (!formData.sound || !formData.soundWord) return;
    setLoading(true);
    try {
      await addSessionPhonics(sessionProgressId, formData.sound, [formData.soundWord]);
      setFormData({ ...formData, sound: '', soundWord: '' });
    } catch (error) {
      console.error('Failed to add phonics:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Live Session Rewards</DialogTitle>
          <DialogDescription>{studentName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setTab('rewards')}
              className={`p-2 rounded-lg font-medium text-sm transition-colors ${
                tab === 'rewards'
                  ? 'bg-yellow-100 text-yellow-900 border-2 border-yellow-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Star className="w-4 h-4 mx-auto mb-1" />
              Rewards
            </button>
            <button
              onClick={() => setTab('vocabulary')}
              className={`p-2 rounded-lg font-medium text-sm transition-colors ${
                tab === 'vocabulary'
                  ? 'bg-green-100 text-green-900 border-2 border-green-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Volume2 className="w-4 h-4 mx-auto mb-1" />
              Vocab
            </button>
            <button
              onClick={() => setTab('grammar')}
              className={`p-2 rounded-lg font-medium text-sm transition-colors ${
                tab === 'grammar'
                  ? 'bg-blue-100 text-blue-900 border-2 border-blue-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4 mx-auto mb-1" />
              Grammar
            </button>
            <button
              onClick={() => setTab('phonics')}
              className={`p-2 rounded-lg font-medium text-sm transition-colors ${
                tab === 'phonics'
                  ? 'bg-purple-100 text-purple-900 border-2 border-purple-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 mx-auto mb-1" />
              Sounds
            </button>
          </div>

          {/* Content */}
          <div className="mt-6">
            {tab === 'rewards' && (
              <div className="space-y-3">
                <p className="text-sm text-slate-600 mb-4">Award instant feedback</p>
                <Button
                  onClick={() => handleReward('wow')}
                  disabled={loading}
                  className="w-full h-14 text-lg bg-yellow-500 hover:bg-yellow-600 text-white font-bold"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      ⭐ Wow!
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleReward('treasure')}
                  disabled={loading}
                  className="w-full h-14 text-lg bg-amber-500 hover:bg-amber-600 text-white font-bold"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      💎 Treasure Chest
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleReward('brainfart')}
                  disabled={loading}
                  variant="outline"
                  className="w-full h-14 text-lg"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      🧠 Brain Freeze
                    </>
                  )}
                </Button>
              </div>
            )}

            {tab === 'vocabulary' && (
              <div className="space-y-3">
                <Input
                  placeholder="Word"
                  value={formData.word}
                  onChange={e => setFormData({ ...formData, word: e.target.value })}
                />
                <Input
                  placeholder="Definition"
                  value={formData.definition}
                  onChange={e => setFormData({ ...formData, definition: e.target.value })}
                />
                <Button
                  onClick={handleAddVocabulary}
                  disabled={loading || !formData.word || !formData.definition}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Vocabulary'}
                </Button>
              </div>
            )}

            {tab === 'grammar' && (
              <div className="space-y-3">
                <Input
                  placeholder="Grammar rule"
                  value={formData.rule}
                  onChange={e => setFormData({ ...formData, rule: e.target.value })}
                />
                <Input
                  placeholder="Example sentence"
                  value={formData.example}
                  onChange={e => setFormData({ ...formData, example: e.target.value })}
                />
                <Button
                  onClick={handleAddGrammar}
                  disabled={loading || !formData.rule || !formData.example}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Grammar'}
                </Button>
              </div>
            )}

            {tab === 'phonics' && (
              <div className="space-y-3">
                <Input
                  placeholder="Sound (e.g., /θ/)"
                  value={formData.sound}
                  onChange={e => setFormData({ ...formData, sound: e.target.value })}
                />
                <Input
                  placeholder="Example word"
                  value={formData.soundWord}
                  onChange={e => setFormData({ ...formData, soundWord: e.target.value })}
                />
                <Button
                  onClick={handleAddPhonics}
                  disabled={loading || !formData.sound || !formData.soundWord}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Sound'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
