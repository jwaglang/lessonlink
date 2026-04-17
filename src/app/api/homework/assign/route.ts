import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { homeworkAssignmentEmail } from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      // Homework info (for email content)
      title,
      description,
      dueDate,
      homeworkType,
      // For email
      parentEmail,
      learnerName,
      unitTitle,
      teacherName,
      // Attachment
      attachmentBase64,
      attachmentFilename,
    } = body;

    // Validate required fields
    if (!parentEmail || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: parentEmail, title' },
        { status: 400 }
      );
    }

    // Build email
    const { subject, html } = homeworkAssignmentEmail({
      learnerName: learnerName || 'Your child',
      title,
      description,
      dueDate,
      unitTitle,
      teacherName,
    });

    console.log('[Homework Assign] Sending email to:', parentEmail);
    console.log('[Homework Assign] Has attachment:', !!attachmentBase64, 'filename:', attachmentFilename || 'homework');

    // Send email
    const emailResult = await sendEmail({
      to: parentEmail,
      subject,
      html,
      attachments: attachmentBase64
        ? [
            {
              filename: attachmentFilename || 'homework',
              content: attachmentBase64,
            },
          ]
        : undefined,
    });

    if (!emailResult.success) {
      console.error('[Homework Assign] Email send failed:', emailResult.error);
      return NextResponse.json({ error: emailResult.error }, { status: 500 });
    }

    console.log('[Homework Assign] Email sent successfully, ID:', emailResult.id);
    return NextResponse.json({ success: true, emailId: emailResult.id });

  } catch (error: any) {
    console.error('Homework email error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
