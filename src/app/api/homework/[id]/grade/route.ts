import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { homeworkGradedEmail } from '@/lib/email-templates';
import {
  getHomeworkAssignment,
  updateHomeworkAssignment,
  updateProgressWithHomeworkStats,
} from '@/lib/firestore';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      score,           // 0-100
      maxScore,        // e.g. 8
      achievedScore,   // e.g. 6
      teacherNotes,
      gradedBy,        // teacherId
      // Email fields (optional)
      parentEmail,
      learnerName,
      unitTitle,
      teacherName,
      levelTargetHours,  // e.g. 200
    } = body;

    if (typeof score !== 'number' || !gradedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: score (number), gradedBy' },
        { status: 400 }
      );
    }

    // Get the homework assignment
    const homework = await getHomeworkAssignment(id);
    if (!homework) {
      return NextResponse.json({ error: 'Homework assignment not found' }, { status: 404 });
    }

    // Calculate practice hours from the submission
    const practiceMinutes = homework.submission?.parsedResults?.totalPracticeMinutes ?? 0;
    const practiceHours = Math.round((practiceMinutes / 60) * 100) / 100;

    // Update homework with grading
    await updateHomeworkAssignment(id, {
      grading: {
        score,
        maxScore: maxScore ?? homework.submission?.parsedResults?.totalActivities ?? 0,
        achievedScore: achievedScore ?? Math.round((score / 100) * (maxScore ?? 0)),
        teacherNotes: teacherNotes || undefined,
        gradedAt: new Date().toISOString(),
        gradedBy,
        practiceHours,
      },
      status: 'graded',
    });

    // Update studentProgress with homework stats
    await updateProgressWithHomeworkStats(
      homework.studentId,
      homework.courseId,
      homework.unitId
    );

    // Send graded notification email to parent if requested
    if (parentEmail && learnerName) {
      // We need to calculate total practice hours across all graded HW for this student
      // The updateProgressWithHomeworkStats already did this calculation,
      // so we read the updated value. For now, use a simple estimate from this HW.
      const totalHoursTowardTarget = practiceHours; // TODO: read from updated studentProgress

      const { subject, html } = homeworkGradedEmail({
        learnerName,
        title: homework.title,
        unitTitle,
        score,
        achievedScore: achievedScore ?? Math.round((score / 100) * (maxScore ?? 0)),
        maxScore: maxScore ?? 0,
        practiceHours,
        totalHoursTowardTarget,
        levelTargetHours: levelTargetHours ?? 200,
        teacherNotes,
        teacherName,
      });

      await sendEmail({ to: parentEmail, subject, html });
    }

    return NextResponse.json({ success: true, practiceHours });
  } catch (error: any) {
    console.error('Homework grade error:', error);
    return NextResponse.json({ error: error.message || 'Failed to grade homework' }, { status: 500 });
  }
}
