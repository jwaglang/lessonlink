'use client';

import { useState } from 'react';
import type { Student } from '@/lib/types';
import VocabularyManager from './vocabulary-manager';
import GrammarManager from './grammar-manager';
import PhonicsManager from './phonics-manager';
import SessionProcessCards, { type QueuedVocab, type QueuedGrammar, type QueuedPhonics } from './session-process-cards';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface LearnerPetlandTabProps {
  studentId: string;
  student: Student;
  latestSessionInstanceId?: string;
}

export default function LearnerPetlandTab({ studentId, student, latestSessionInstanceId }: LearnerPetlandTabProps) {
  // Queues fed from session cards → into the add forms
  const [vocabQueue, setVocabQueue] = useState<QueuedVocab[]>([]);
  const [grammarQueue, setGrammarQueue] = useState<QueuedGrammar[]>([]);
  const [phonicsQueue, setPhonicsQueue] = useState<QueuedPhonics[]>([]);

  const handleQueue = (vocab: QueuedVocab[], grammar: QueuedGrammar[], phonics: QueuedPhonics[]) => {
    setVocabQueue(prev => [...prev, ...vocab]);
    setGrammarQueue(prev => [...prev, ...grammar]);
    setPhonicsQueue(prev => [...prev, ...phonics]);
  };

  // Pop next item from each queue for the form
  const vocabPrefill = vocabQueue[0] ?? null;
  const grammarPrefill = grammarQueue[0] ?? null;
  const phonicsPrefill = phonicsQueue[0] ?? null;

  return (
    <div className="flex flex-col gap-8">

      {/* Past Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Past Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionProcessCards studentId={studentId} onQueue={handleQueue} />
        </CardContent>
      </Card>

      {/* Add forms */}
      <VocabularyManager
        studentId={studentId}
        latestSessionInstanceId={latestSessionInstanceId}
        prefill={vocabPrefill}
        onPrefillConsumed={() => setVocabQueue(prev => prev.slice(1))}
      />

      <GrammarManager
        studentId={studentId}
        prefill={grammarPrefill}
        onPrefillConsumed={() => setGrammarQueue(prev => prev.slice(1))}
      />

      <PhonicsManager
        studentId={studentId}
        prefill={phonicsPrefill}
        onPrefillConsumed={() => setPhonicsQueue(prev => prev.slice(1))}
      />

    </div>
  );
}
