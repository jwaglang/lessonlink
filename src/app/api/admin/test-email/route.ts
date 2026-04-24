import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import {
  homeworkAssignmentEmail,
  homeworkGradedEmail,
  sessionFeedbackEmail,
  parentReportEmail,
  sessionReminderEmail,
} from '@/lib/email-templates';

function buildPing(): { subject: string; html: string } {
  return {
    subject: `Kiddoland Email Test — ${new Date().toISOString()}`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f5f0ff}
  .wrap{max-width:600px;margin:20px auto;background:#fff;border-radius:12px;overflow:hidden}
  .hdr{background:linear-gradient(135deg,#7c3aed,#a855f7);padding:24px 32px;text-align:center;color:#fff}
  .hdr h1{margin:0;font-size:22px}.hdr p{margin:4px 0 0;font-size:13px;color:#e9d5ff}
  .body{padding:32px;color:#374151;font-size:15px;line-height:1.6}
  .badge{display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:6px;padding:4px 10px;font-size:13px;font-family:monospace;color:#374151}
  .footer{background:#f9fafb;padding:16px 32px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb}
</style></head>
<body>
  <div class="wrap">
    <div class="hdr"><h1>Kiddoland</h1><p>Email Delivery Test</p></div>
    <div class="body">
      <p>This is a test email sent from the <strong>Kiddoland Admin Panel</strong>.</p>
      <p>If you received this, email delivery to this address is working correctly.</p>
      <p>Sent at: <span class="badge">${new Date().toUTCString()}</span></p>
    </div>
    <div class="footer">Sent from <a href="https://kiddoland.co" style="color:#7c3aed;text-decoration:none">Kiddoland</a> via LessonLink</div>
  </div>
</body>
</html>`,
  };
}

const TEMPLATES: Record<string, () => { subject: string; html: string }> = {
  ping: buildPing,

  'homework-assignment': () =>
    homeworkAssignmentEmail({
      learnerName: 'Tommy',
      title: 'Unit 3 Reading Worksheet',
      description: 'Read the story and answer the comprehension questions on page 2.',
      dueDate: 'Friday, May 3',
      unitTitle: 'Unit 3: Animals',
      teacherName: 'Jon',
    }),

  'homework-graded': () =>
    homeworkGradedEmail({
      learnerName: 'Tommy',
      title: 'Unit 3 Reading Worksheet',
      unitTitle: 'Unit 3: Animals',
      score: 85,
      achievedScore: 17,
      maxScore: 20,
      practiceHours: 0.75,
      totalHoursTowardTarget: 12.5,
      levelTargetHours: 200,
      teacherNotes: 'Great job on the reading! Work on listening for the /th/ sound next time.',
      teacherName: 'Jon',
    }),

  'session-feedback': () =>
    sessionFeedbackEmail({
      learnerName: 'Tommy',
      sessionTitle: 'Unit 3, Session 2: Farm Animals',
      sessionDate: 'Thursday, April 24',
      summary: 'We practised farm animal vocabulary and played a fun guessing game.',
      progressHighlights: 'Tommy correctly identified all 10 animal names and used 3 in full sentences.',
      suggestedActivities: 'Watch the farm animals video and try saying the names out loud.',
      teacherName: 'Jon',
    }),

  'parent-report-initial': () =>
    parentReportEmail({
      learnerName: 'Tommy',
      reportType: 'initial',
      unitName: 'Unit 3: Animals',
      summary: 'Tommy showed strong receptive skills and good enthusiasm in the initial assessment.',
      progressHighlights: 'Can identify 15+ animal names. Good phonics base for this level.',
      suggestedActivities: 'Daily 10-minute reading aloud, flashcard review three times a week.',
      teacherName: 'Jon',
    }),

  'parent-report-final': () =>
    parentReportEmail({
      learnerName: 'Tommy',
      reportType: 'final',
      unitName: 'Unit 3: Animals',
      summary: 'Tommy completed Unit 3 with strong results, showing clear improvement in both speaking and listening.',
      progressHighlights: 'Achieved 90% on the final assessment. Can use target vocabulary in full sentences.',
      suggestedActivities: 'Review Unit 3 flashcards twice a week to retain vocabulary before Unit 4.',
      teacherName: 'Jon',
    }),

  'session-reminder': () =>
    sessionReminderEmail({
      learnerName: 'Tommy',
      sessionTitle: 'Unit 4, Session 1: Transport',
      sessionDate: 'Friday, April 25',
      startTime: '4:00 PM',
      endTime: '4:45 PM',
      teacherName: 'Jon',
    }),
};

export const TEMPLATE_LABELS: Record<string, string> = {
  ping: 'Ping (basic delivery test)',
  'homework-assignment': 'Homework Assignment',
  'homework-graded': 'Homework Graded',
  'session-feedback': 'Session Feedback',
  'parent-report-initial': 'Parent Report — Initial Assessment',
  'parent-report-final': 'Parent Report — Final Evaluation',
  'session-reminder': 'Session Reminder',
};

export async function POST(request: NextRequest) {
  try {
    const { to, template } = (await request.json()) as { to: string; template: string };

    if (!to || !template) {
      return NextResponse.json({ error: 'Missing to or template' }, { status: 400 });
    }

    const build = TEMPLATES[template];
    if (!build) {
      return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 400 });
    }

    const { subject, html } = build();
    const result = await sendEmail({ to, subject, html });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: result.id, subject });
  } catch (err: any) {
    console.error('[test-email]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
