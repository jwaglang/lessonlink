import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { homeworkAssignmentEmail } from '@/lib/email-templates';
import { createHomeworkAssignment, updateHomeworkAssignment } from '@/lib/firestore';
import type { HomeworkAssignment } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      studentId,
      teacherId,
      courseId,
      unitId,
      sessionId,
      sessionInstanceId,
      title,
      description,
      homeworkType,
      deliveryMethod,
      dueDate,
      // Email fields (only if deliveryMethod === 'email')
      parentEmail,
      learnerName,
      unitTitle,
      teacherName,
      attachmentHtml,
      attachmentFilename,
    } = body;

    // Validate required fields
    if (!studentId || !teacherId || !courseId || !unitId || !title || !homeworkType) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, teacherId, courseId, unitId, title, homeworkType' },
        { status: 400 }
      );
    }

    // Create the homework assignment doc
    const homeworkData: Omit<HomeworkAssignment, 'id'> = {
      studentId,
      teacherId,
      courseId,
      unitId,
      sessionId: sessionId || undefined,
      sessionInstanceId: sessionInstanceId || undefined,
      title,
      description: description || undefined,
      homeworkType,
      deliveryMethod: deliveryMethod || 'manual',
      dueDate: dueDate || undefined,
      status: 'assigned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const homeworkId = await createHomeworkAssignment(homeworkData);

    // Send email if requested
    if (deliveryMethod === 'email' && parentEmail) {
      const { subject, html } = homeworkAssignmentEmail({
        learnerName: learnerName || 'Your child',
        title,
        description,
        dueDate,
        unitTitle,
        teacherName,
      });

      const emailResult = await sendEmail({
        to: parentEmail,
        subject,
        html,
        attachments: attachmentHtml
          ? [
              {
                filename: attachmentFilename || 'homework.html',
                content: Buffer.from(attachmentHtml),
              },
            ]
          : undefined,
      });

      if (emailResult.success) {
        await updateHomeworkAssignment(homeworkId, {
          status: 'delivered',
          deliveredAt: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({ success: true, homeworkId });
  } catch (error: any) {
    console.error('Homework assign error:', error);
    return NextResponse.json({ error: error.message || 'Failed to assign homework' }, { status: 500 });
  }
}
