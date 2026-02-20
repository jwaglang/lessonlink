import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { parentReportEmail } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      to,
      learnerName,
      reportType,
      unitName,
      summary,
      progressHighlights,
      suggestedActivities,
      teacherName,
    } = body;

    if (!to || !learnerName || !reportType || !summary) {
      return NextResponse.json({ error: 'Missing required fields: to, learnerName, reportType, summary' }, { status: 400 });
    }

    const { subject, html } = parentReportEmail({
      learnerName,
      reportType,
      unitName,
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
    console.error('Send parent report email error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
