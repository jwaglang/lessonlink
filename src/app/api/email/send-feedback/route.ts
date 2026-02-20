import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { sessionFeedbackEmail } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      to,
      learnerName,
      sessionTitle,
      sessionDate,
      summary,
      progressHighlights,
      suggestedActivities,
      teacherName,
    } = body;

    if (!to || !learnerName || !sessionTitle || !summary) {
      return NextResponse.json({ error: 'Missing required fields: to, learnerName, sessionTitle, summary' }, { status: 400 });
    }

    const { subject, html } = sessionFeedbackEmail({
      learnerName,
      sessionTitle,
      sessionDate: sessionDate || 'N/A',
      summary,
      progressHighlights: progressHighlights || '',
      suggestedActivities: suggestedActivities || '',
      teacherName,
    });

    const result = await sendEmail({ to, subject, html });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailId: result.id });
  } catch (error: any) {
    console.error('Send feedback email error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
