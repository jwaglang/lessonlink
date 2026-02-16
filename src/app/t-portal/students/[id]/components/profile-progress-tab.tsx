'use client';

import { useState, useEffect } from 'react';
import type { Student, StudentProgress, StudentRewards } from '@/lib/types';
import {
  getStudentProgressByStudentId,
  getStudentRewardsByStudentId,
  getUnitById,
  updateStudent,
} from '@/lib/firestore';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Trophy, Heart, Clock, CheckCircle, Save, StickyNote } from 'lucide-react';

import LearnerInfoSection from './learner-info-section';
import ParentInfoSection from './parent-info-section';

const ADMIN_EMAIL = 'jwag.lang@gmail.com';

interface ProfileProgressTabProps {
  studentId: string;
  student: Student;
  onStudentUpdate?: (updated: Student) => void;
}

export default function ProfileProgressTab({ studentId, student, onStudentUpdate }: ProfileProgressTabProps) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [progressList, setProgressList] = useState<StudentProgress[]>([]);
  const [rewards, setRewards] = useState<StudentRewards | null>(null);
  const [currentUnitName, setCurrentUnitName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Notes editing (always available to teacher, not admin-gated)
  const [notes, setNotes] = useState(student.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [progressData, rewardsData] = await Promise.all([
          getStudentProgressByStudentId(studentId),
          getStudentRewardsByStudentId(studentId),
        ]);

        setProgressList(progressData);
        setRewards(rewardsData);

        // Find the current (in-progress or most recent assigned) unit
        const current =
          progressData.find((p) => p.status === 'in_progress') ??
          progressData.find((p) => p.status === 'assigned') ??
          progressData[0];

        if (current?.unitId) {
          const unit = await getUnitById(current.unitId);
          setCurrentUnitName(unit?.title ?? 'Unknown unit');
        }
      } catch (err) {
        console.error('Error fetching profile & progress data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [studentId]);

  async function handleSaveNotes() {
    setSavingNotes(true);
    setNotesSaved(false);
    try {
      const updated = await updateStudent(studentId, { notes });
      setNotesSaved(true);
      onStudentUpdate?.(updated);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (err) {
      console.error('Error saving notes:', err);
    } finally {
      setSavingNotes(false);
    }
  }

  // Aggregate progress stats
  const totalSessionsCompleted = progressList.reduce((sum, p) => sum + (p.sessionsCompleted ?? 0), 0);
  const totalSessionsAll = progressList.reduce((sum, p) => sum + (p.sessionsTotal ?? 0), 0);
  const totalHoursCompleted = progressList.reduce((sum, p) => sum + (p.totalHoursCompleted ?? 0), 0);
  const totalTargetHours = progressList.reduce((sum, p) => sum + (p.targetHours ?? 0), 0);
  const unitsCompleted = progressList.filter((p) => p.status === 'completed').length;
  const unitsTotal = progressList.length;

  const currentProgress =
    progressList.find((p) => p.status === 'in_progress') ??
    progressList.find((p) => p.status === 'assigned');

  const progressPercent =
    currentProgress && currentProgress.sessionsTotal > 0
      ? Math.round((currentProgress.sessionsCompleted / currentProgress.sessionsTotal) * 100)
      : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-muted-foreground">Loading progress data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Row 1: Curriculum Progress + Petland Rewards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1 — Curriculum Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-5 w-5" />
              Curriculum Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {progressList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No curriculum assigned yet.</p>
            ) : (
              <>
                {currentProgress && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Current Unit</p>
                    <p className="text-sm font-semibold mt-1">{currentUnitName}</p>
                  </div>
                )}
                {currentProgress && (
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Sessions: {currentProgress.sessionsCompleted}/{currentProgress.sessionsTotal}</span>
                      <span>{progressPercent}%</span>
                    </div>
                    <Progress value={progressPercent} className="h-2" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Sessions Done</p>
                      <p className="text-sm font-semibold">{totalSessionsCompleted} / {totalSessionsAll}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Hours</p>
                      <p className="text-sm font-semibold">{totalHoursCompleted}{totalTargetHours > 0 ? ` / ${totalTargetHours}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Units Completed</p>
                      <p className="text-sm font-semibold">{unitsCompleted}{unitsTotal > 0 ? ` / ${unitsTotal}` : ''}</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Card 2 — Petland Rewards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5" />
              Petland Rewards
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {!rewards ? (
              <p className="text-sm text-muted-foreground">No rewards data synced yet.</p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Trophy className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">XP</p>
                    <p className="text-lg font-bold">{rewards.xp.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30">
                    <Heart className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">HP</p>
                    <p className="text-lg font-bold">{rewards.hp.toLocaleString()}</p>
                  </div>
                </div>
                {rewards.lastSyncedAt && (
                  <p className="text-xs text-muted-foreground pt-2">
                    Last synced: {new Date(rewards.lastSyncedAt).toLocaleDateString()}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Learner Information — includes messaging (admin-editable) */}
      <LearnerInfoSection
        student={student}
        studentId={studentId}
        isAdmin={isAdmin}
        onStudentUpdate={onStudentUpdate}
      />

      {/* Parent Information (admin-editable) */}
      <ParentInfoSection
        student={student}
        studentId={studentId}
        isAdmin={isAdmin}
        onStudentUpdate={onStudentUpdate}
      />

      {/* Private Notes (always editable by teacher) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <StickyNote className="h-5 w-5" />
            Private Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add private notes about this learner..."
            className="min-h-[100px] text-sm"
          />
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleSaveNotes}
              disabled={savingNotes || notes === (student.notes ?? '')}
            >
              <Save className="mr-1 h-3 w-3" />
              {savingNotes ? 'Saving...' : 'Save Notes'}
            </Button>
            {notesSaved && (
              <span className="text-xs text-primary">Saved!</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
