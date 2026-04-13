'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { onSessionProgressUpdate, getSessionProgressBySessionId } from '@/lib/firestore';
import type { SessionProgress, Reward } from '@/lib/types';
import { Star, Award, Sparkles, Volume2 } from 'lucide-react';

export default function LiveSessionBackgroundPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const [sessionProgress, setSessionProgress] = useState<SessionProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentRewards, setRecentRewards] = useState<Reward[]>([]);
  const [floatingRewards, setFloatingRewards] = useState<Array<{id: string; type: string}>>([]);

  // Initialize: look up sessionProgressId from sessionId
  useEffect(() => {
    const initializeSession = async () => {
      try {
        if (!sessionId) return;
        
        // Look up sessionProgress by sessionId
        const progress = await getSessionProgressBySessionId(sessionId);
        if (progress) {
          setSessionProgress(progress);
        } else {
          console.warn('No session progress found for sessionId:', sessionId);
        }
      } catch (error) {
        console.error('Error initializing session:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, [sessionId]);

  // Real-time listener for session progress updates
  useEffect(() => {
    if (!sessionProgress?.id) return;

    const unsubscribe = onSessionProgressUpdate(sessionProgress.id, (updatedProgress) => {
      setSessionProgress(updatedProgress);
      
      // Track recent rewards for animation
      if (updatedProgress.rewards.length > (sessionProgress?.rewards.length || 0)) {
        const newReward = updatedProgress.rewards[updatedProgress.rewards.length - 1];
        setRecentRewards(prev => [...prev, newReward].slice(-5)); // Keep last 5
        
        // Add floating animation
        const floatingId = `float-${Date.now()}-${Math.random()}`;
        setFloatingRewards(prev => [...prev, {id: floatingId, type: newReward.type}]);
        
        // Remove after animation
        setTimeout(() => {
          setFloatingRewards(prev => prev.filter(r => r.id !== floatingId));
        }, 1000);
      }
    });

    return () => unsubscribe();
  }, [sessionProgress?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-kiddoland-purple/20 to-pink-200/20 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 animate-spin text-kiddoland-purple mx-auto mb-4" />
          <p className="text-slate-600">Initializing live session...</p>
        </div>
      </div>
    );
  }

  if (!sessionProgress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-kiddoland-purple/20 to-pink-200/20 flex items-center justify-center">
        <p className="text-slate-600">Loading session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-kiddoland-purple/10 via-transparent to-pink-200/10 overflow-hidden">
      <style>{`
        @keyframes pop-in {
          0% {
            transform: scale(0) translateY(20px);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes float-up {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 1;
            font-size: 2rem;
          }
          100% {
            transform: translateY(-100px) translateX(20px);
            opacity: 0;
            font-size: 3rem;
          }
        }
        
        .animate-pop-in {
          animation: pop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .animate-float-up {
          animation: float-up 1s ease-out forwards;
          pointer-events: none;
        }
      `}</style>

      {/* Floating Rewards */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {floatingRewards.map(reward => (
          <div
            key={reward.id}
            className="animate-float-up fixed top-1/2 left-1/2"
            style={{
              fontSize: '2rem',
              left: 'calc(50% + ' + (Math.random() - 0.5) * 100 + 'px)',
              top: 'calc(50% + ' + (Math.random() - 0.5) * 100 + 'px)',
            }}
          >
            {reward.type === 'wow' && '⭐'}
            {reward.type === 'treasure' && '💎'}
            {reward.type === 'brainfart' && '🧠'}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-gradient-to-b from-white/80 to-transparent backdrop-blur-sm p-6 border-b border-slate-200/50">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="text-3xl">🎓</div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Live Session</h1>
              <p className="text-sm text-slate-600">Keep up the great work!</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-kiddoland-purple">{sessionProgress.points}</div>
            <div className="text-sm text-slate-600">Points</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-24 pb-8 px-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rewards Feed (Left) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-yellow-500" />
                <h2 className="font-semibold text-slate-900">Rewards</h2>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sessionProgress.rewards.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Waiting for rewards...</p>
                ) : (
                  sessionProgress.rewards.map((reward, idx) => (
                    <div
                      key={reward.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        recentRewards.includes(reward)
                          ? 'bg-yellow-50 border-yellow-200 animate-pop-in'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {reward.type === 'wow'
                              ? '⭐'
                              : reward.type === 'treasure'
                              ? '💎'
                              : '🧠'}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900 capitalize">
                              {reward.type === 'wow' && 'Wow!'}
                              {reward.type === 'treasure' && 'Treasure Chest'}
                              {reward.type === 'brainfart' && 'Brain Freeze'}
                            </div>
                            <div className="text-xs text-slate-600">
                              {new Date(reward.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        {reward.points && (
                          <div className="text-lg font-bold text-yellow-600">+{reward.points}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Vocabulary Feed */}
            {sessionProgress.vocabulary.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Volume2 className="w-5 h-5 text-green-500" />
                  <h2 className="font-semibold text-slate-900">Vocabulary</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {sessionProgress.vocabulary.map(vocab => (
                    <div
                      key={vocab.id}
                      className="bg-green-50 p-3 rounded-lg border border-green-200 animate-pop-in"
                    >
                      <div className="font-semibold text-sm text-slate-900">{vocab.word}</div>
                      <div className="text-xs text-slate-600 mt-1">{vocab.definition}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Grammar */}
            {sessionProgress.grammar.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-3 text-sm">Grammar Tips</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {sessionProgress.grammar.map(item => (
                    <div key={item.id} className="text-xs bg-blue-50 p-2 rounded border border-blue-200 animate-pop-in">
                      <div className="font-semibold text-blue-900">{item.rule}</div>
                      <div className="text-blue-800 italic mt-1">"{item.example}"</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phonics */}
            {sessionProgress.phonics.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-3 text-sm">Sounds</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {sessionProgress.phonics.map(item => (
                    <div key={item.id} className="text-xs bg-purple-50 p-2 rounded border border-purple-200 animate-pop-in">
                      <div className="font-semibold text-purple-900">/{item.sound}/</div>
                      <div className="text-purple-800 mt-1">{item.word}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-gradient-to-br from-kiddoland-purple/10 to-pink-200/10 rounded-lg p-4 border border-kiddoland-purple/20">
              <h3 className="font-semibold text-slate-900 mb-3 text-sm">Session Stats</h3>
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex justify-between">
                  <span>Rewards:</span>
                  <span className="font-semibold">{sessionProgress.rewards.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vocabulary:</span>
                  <span className="font-semibold">{sessionProgress.vocabulary.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Grammar:</span>
                  <span className="font-semibold">{sessionProgress.grammar.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sounds:</span>
                  <span className="font-semibold">{sessionProgress.phonics.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Points Indicator */}
      <div className="fixed bottom-8 right-8 bg-kiddoland-purple text-white rounded-full p-6 shadow-lg">
        <div className="text-center">
          <div className="text-3xl font-bold">{sessionProgress.points}</div>
          <div className="text-xs mt-1">Points</div>
        </div>
      </div>
    </div>
  );
}

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-kiddoland-purple/20 to-pink-200/20 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 animate-spin text-kiddoland-purple mx-auto mb-4" />
          <p className="text-slate-600">Initializing live session...</p>
        </div>
      </div>
    );
  }

  if (!sessionProgress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-kiddoland-purple/20 to-pink-200/20 flex items-center justify-center">
        <p className="text-slate-600">Loading session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-kiddoland-purple/10 via-transparent to-pink-200/10 overflow-hidden">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-gradient-to-b from-white/80 to-transparent backdrop-blur-sm p-6 border-b border-slate-200/50">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="text-3xl">🎓</div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Live Session</h1>
              <p className="text-sm text-slate-600">Keep up the great work!</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-kiddoland-purple">{sessionProgress.points}</div>
            <div className="text-sm text-slate-600">Points</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-24 pb-8 px-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rewards Feed (Left) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-5 h-5 text-yellow-500" />
                <h2 className="font-semibold text-slate-900">Rewards</h2>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sessionProgress.rewards.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Waiting for rewards...</p>
                ) : (
                  sessionProgress.rewards.map((reward, idx) => (
                    <div
                      key={reward.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        recentRewards.includes(reward)
                          ? 'bg-yellow-50 border-yellow-200 animate-pulse'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">
                            {reward.type === 'wow'
                              ? '⭐'
                              : reward.type === 'treasure'
                              ? '💎'
                              : '🧠'}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900 capitalize">
                              {reward.type === 'wow' && 'Wow!'}
                              {reward.type === 'treasure' && 'Treasure Chest'}
                              {reward.type === 'brainfart' && 'Brain Freeze'}
                            </div>
                            <div className="text-xs text-slate-600">
                              {new Date(reward.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        {reward.points && (
                          <div className="text-lg font-bold text-yellow-600">+{reward.points}</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Vocabulary Feed */}
            {sessionProgress.vocabulary.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Volume2 className="w-5 h-5 text-green-500" />
                  <h2 className="font-semibold text-slate-900">Vocabulary</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                  {sessionProgress.vocabulary.map(vocab => (
                    <div
                      key={vocab.id}
                      className="bg-green-50 p-3 rounded-lg border border-green-200"
                    >
                      <div className="font-semibold text-sm text-slate-900">{vocab.word}</div>
                      <div className="text-xs text-slate-600 mt-1">{vocab.definition}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Grammar */}
            {sessionProgress.grammar.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-3 text-sm">Grammar Tips</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {sessionProgress.grammar.map(item => (
                    <div key={item.id} className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
                      <div className="font-semibold text-blue-900">{item.rule}</div>
                      <div className="text-blue-800 italic mt-1">"{item.example}"</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phonics */}
            {sessionProgress.phonics.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-4 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-3 text-sm">Sounds</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {sessionProgress.phonics.map(item => (
                    <div key={item.id} className="text-xs bg-purple-50 p-2 rounded border border-purple-200">
                      <div className="font-semibold text-purple-900">/{item.sound}/</div>
                      <div className="text-purple-800 mt-1">{item.word}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-gradient-to-br from-kiddoland-purple/10 to-pink-200/10 rounded-lg p-4 border border-kiddoland-purple/20">
              <h3 className="font-semibold text-slate-900 mb-3 text-sm">Session Stats</h3>
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex justify-between">
                  <span>Rewards:</span>
                  <span className="font-semibold">{sessionProgress.rewards.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vocabulary:</span>
                  <span className="font-semibold">{sessionProgress.vocabulary.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Grammar:</span>
                  <span className="font-semibold">{sessionProgress.grammar.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sounds:</span>
                  <span className="font-semibold">{sessionProgress.phonics.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Points Indicator */}
      <div className="fixed bottom-8 right-8 bg-kiddoland-purple text-white rounded-full p-6 shadow-lg">
        <div className="text-center">
          <div className="text-3xl font-bold">{sessionProgress.points}</div>
          <div className="text-xs mt-1">Points</div>
        </div>
      </div>
    </div>
  );
}
