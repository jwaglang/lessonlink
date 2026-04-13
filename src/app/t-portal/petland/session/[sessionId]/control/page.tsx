'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  getOrCreateSessionProgress,
  onSessionProgressUpdate,
  getSessionInstanceById,
  getStudentById,
} from '@/lib/firestore';
import type { SessionProgress, SessionInstance, Student } from '@/lib/types';
import SessionRewardModal from '@/components/sessions/session-reward-modal';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart3,
  Sparkles,
  Users,
  Clock,
  Award,
  Star,
  Gem,
  Brain,
  Volume2,
  BookOpen,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

export default function TeacherLiveSessionPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const { user } = useAuth();

  const [sessionProgress, setSessionProgress] = useState<SessionProgress | null>(null);
  const [sessionInstance, setSessionInstance] = useState<SessionInstance | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Initialize session progress
  useEffect(() => {
    const initialize = async () => {
      try {
        if (!sessionId || !user?.uid) return;

        // Fetch session instance to get student info
        const instance = await getSessionInstanceById(sessionId);
        if (!instance) throw new Error('Session not found');
        setSessionInstance(instance);

        // Fetch student data
        const studentData = await getStudentById(instance.studentId);
        if (studentData) setStudent(studentData);

        // Get or create session progress
        const progress = await getOrCreateSessionProgress(
          sessionId,
          instance.studentId,
          user.uid
        );
        setSessionProgress(progress);
      } catch (error) {
        console.error('Error initializing session:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [sessionId, user?.uid]);

  // Real-time listener for session progress
  useEffect(() => {
    if (!sessionProgress?.id) return;

    const unsubscribe = onSessionProgressUpdate(sessionProgress.id, (updatedProgress) => {
      setSessionProgress(updatedProgress);
    });

    return () => unsubscribe();
  }, [sessionProgress?.id]);

  if (loading) {
    return (
      <div className="flex flex-col gap-8 p-4 md:p-8">
        <PageHeader
          title="Live Session"
          description="Control panel for live petland session"
        />
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!sessionProgress || !student) {
    return (
      <div className="flex flex-col gap-8 p-4 md:p-8">
        <PageHeader title="Session Error" description="Could not load session data" />
        <p className="text-red-500">Failed to initialize session</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <PageHeader
        title="Live Session Control"
        description={`Teaching ${student.displayName}`}
        icon={Sparkles}
      />

      {/* Session Info Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Student
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{student.displayName}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4" />
              Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{sessionProgress.points}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="w-4 h-4" />
              Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionProgress.rewards.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Learning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessionProgress.vocabulary.length + sessionProgress.grammar.length + sessionProgress.phonics.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Control Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>

          {/* Reward Buttons */}
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Award Rewards
            </h3>
            <Button
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
              onClick={() => setIsModalOpen(true)}
            >
              <Star className="w-4 h-4 mr-2" />
              Open Reward Panel
            </Button>
            <p className="text-xs text-muted-foreground">
              Award Wow (⭐), Treasure (💎), Brainfart (🧠), or add learning content
            </p>
          </div>

          {/* Reward Stats */}
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm">Reward Breakdown</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <span className="text-lg">⭐</span>
                  Wow Rewards
                </span>
                <span className="font-bold">
                  {sessionProgress.rewards.filter(r => r.type === 'wow').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <span className="text-lg">💎</span>
                  Treasure
                </span>
                <span className="font-bold">
                  {sessionProgress.rewards.filter(r => r.type === 'treasure').length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-2">
                  <span className="text-lg">🧠</span>
                  Brainfart
                </span>
                <span className="font-bold">
                  {sessionProgress.rewards.filter(r => r.type === 'brainfart').length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle/Right: Learning Content Display */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Learning Content Feed</h2>

          {/* Vocabulary */}
          {sessionProgress.vocabulary.length > 0 && (
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Vocabulary ({sessionProgress.vocabulary.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sessionProgress.vocabulary.map(vocab => (
                  <div key={vocab.id} className="bg-green-50 dark:bg-green-900/20 p-3 rounded border border-green-200 dark:border-green-800">
                    <div className="font-medium text-sm text-green-900 dark:text-green-100">{vocab.word}</div>
                    <div className="text-xs text-green-700 dark:text-green-300 mt-1">{vocab.definition}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grammar */}
          {sessionProgress.grammar.length > 0 && (
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Grammar ({sessionProgress.grammar.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sessionProgress.grammar.map(item => (
                  <div key={item.id} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded border border-blue-200 dark:border-blue-800">
                    <div className="font-medium text-sm text-blue-900 dark:text-blue-100">{item.rule}</div>
                    <div className="text-xs text-blue-700 dark:text-blue-300 italic mt-1">"{item.example}"</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phonics */}
          {sessionProgress.phonics.length > 0 && (
            <div className="bg-card border rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Sounds ({sessionProgress.phonics.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {sessionProgress.phonics.map(item => (
                  <div key={item.id} className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded border border-purple-200 dark:border-purple-800">
                    <div className="font-medium text-sm text-purple-900 dark:text-purple-100">/{item.sound}/</div>
                    <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">{item.word}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {sessionProgress.vocabulary.length === 0 &&
            sessionProgress.grammar.length === 0 &&
            sessionProgress.phonics.length === 0 && (
            <div className="bg-card border rounded-lg p-8 text-center text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No learning content added yet</p>
              <p className="text-xs mt-1">Use the reward panel to add vocabulary, grammar, or phonics items</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Rewards Timeline */}
      {sessionProgress.rewards.length > 0 && (
        <div className="bg-card border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Reward Timeline
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {[...sessionProgress.rewards].reverse().map(reward => (
              <div key={reward.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-900/30 rounded">
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {reward.type === 'wow' && '⭐'}
                    {reward.type === 'treasure' && '💎'}
                    {reward.type === 'brainfart' && '🧠'}
                  </span>
                  <div>
                    <span className="font-medium capitalize">
                      {reward.type === 'wow' && 'Wow!'}
                      {reward.type === 'treasure' && 'Treasure Chest'}
                      {reward.type === 'brainfart' && 'Brain Freeze'}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {new Date(reward.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                {reward.points && <span className="font-bold text-yellow-600">+{reward.points}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <SessionRewardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sessionProgressId={sessionProgress.id}
        studentName={student.displayName}
      />
    </div>
  );
}
