import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { homeworkGradedEmail } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      parentEmail,
      learnerName,
      title,
      unitTitle,
      score,
      achievedScore,
      maxScore,
      practiceHours,
      teacherNotes,
      teacherName,
      totalHoursTowardTarget,
      levelTargetHours,
    } = body;

    if (!parentEmail || !learnerName || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: parentEmail, learnerName, title' },
        { status: 400 }
      );
    }

    const { subject, html } = homeworkGradedEmail({
      learnerName,
      title,
      unitTitle,
      score: score ?? 0,
      achievedScore: achievedScore ?? 0,
      maxScore: maxScore ?? 0,
      practiceHours: practiceHours ?? 0,
      totalHoursTowardTarget: totalHoursTowardTarget ?? practiceHours ?? 0,
      levelTargetHours: levelTargetHours ?? 200,
      teacherNotes,
      teacherName,
    });

    const result = await sendEmail({ to: parentEmail, subject, html });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error: any) {
    console.error('Send homework graded email error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
