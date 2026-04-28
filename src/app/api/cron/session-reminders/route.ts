import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { sessionReminderEmail } from '@/lib/email-templates';
import { getAdminDb } from '@/lib/firebase-admin';
import { format, parseISO } from 'date-fns';

// cron-job.org hits GET /api/cron/session-reminders?secret=<CRON_SECRET>
// Run every hour. Sends 12h and 2h reminders for upcoming scheduled sessions.

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();
  const now = new Date();

  // Query scheduled sessions for today and tomorrow (covers all 12h/2h windows)
  const todayStr = format(now, 'yyyy-MM-dd');
  const tomorrowStr = format(new Date(now.getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

  const snap = await db.collection('sessionInstances')
    .where('status', '==', 'scheduled')
    .where('lessonDate', '>=', todayStr)
    .where('lessonDate', '<=', tomorrowStr)
    .get();

  const results = { sent: 0, skipped: 0, errors: [] as string[] };

  for (const docSnap of snap.docs) {
    const session = docSnap.data();

    // Parse session start datetime (treat lessonDate as local date, startTime as HH:mm)
    const sessionDateTime = new Date(`${session.lessonDate}T${session.startTime}:00`);
    const hoursUntil = (sessionDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    const is12h = hoursUntil >= 11.5 && hoursUntil <= 12.5;
    const is2h  = hoursUntil >= 1.5  && hoursUntil <= 2.5;

    if (!is12h && !is2h) continue;

    const reminderKey = is12h ? 'reminder12hSentAt' : 'reminder2hSentAt';
    if (session[reminderKey]) { results.skipped++; continue; }

    // Fetch student
    const studentSnap = await db.collection('students').doc(session.studentId).get();
    if (!studentSnap.exists) { results.errors.push(`Student not found: ${session.studentId}`); continue; }
    const student = studentSnap.data()!;

    if (!student.email) { results.skipped++; continue; }

    // Fetch teacher name
    let teacherName: string | undefined;
    if (session.teacherUid) {
      const teacherSnap = await db.collection('teacherProfiles').doc(session.teacherUid).get();
      if (teacherSnap.exists) teacherName = teacherSnap.data()?.name;
    }

    const { subject: baseSubject, html } = sessionReminderEmail({
      learnerName:  student.name,
      sessionTitle: session.title || 'Upcoming Session',
      sessionDate:  format(parseISO(session.lessonDate), 'EEEE, MMMM d, yyyy'),
      startTime:    session.startTime,
      endTime:      session.endTime,
      teacherName,
      portalUrl:    `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://kiddoland.co'}/s-portal`,
    });

    const subject = is2h
      ? `Starting in 2 hours: ${session.title || 'Session'} — ${student.name}`
      : baseSubject;

    const result = await sendEmail({ to: student.email, subject, html });

    if (result.success) {
      await docSnap.ref.update({ [reminderKey]: now.toISOString() });
      results.sent++;
    } else {
      results.errors.push(`Send failed for ${session.studentId}: ${result.error}`);
    }
  }

  console.log('[session-reminders]', results);
  return NextResponse.json({ ok: true, ...results, checkedAt: now.toISOString() });
}
