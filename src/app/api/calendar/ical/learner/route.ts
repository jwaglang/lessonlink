import { NextRequest, NextResponse } from 'next/server';
import { getSessionInstancesByStudentId } from '@/lib/firestore';
import { format } from 'date-fns';

// Generate iCal format for a single session
function generateICalEvent(
  session: {
    id: string;
    title?: string;
    lessonDate: string;
    startTime: string;
    endTime: string;
    teacherUid?: string;
  },
  studentName: string
): string {
  // Parse the date and time to create proper Date objects
  const [year, month, day] = session.lessonDate.split('-').map(Number);
  const [startHour, startMinute] = session.startTime.split(':').map(Number);
  const [endHour, endMinute] = session.endTime.split(':').map(Number);

  const startDate = new Date(year, month - 1, day, startHour, startMinute);
  const endDate = new Date(year, month - 1, day, endHour, endMinute);

  // Format as UTC for iCal (most calendar apps handle this well)
  const formatICSDate = (date: Date): string => {
    return format(date, "yyyyMMdd'T'HHmmss");
  };

  const now = format(new Date(), "yyyyMMdd'T'HHmmss");

  return `BEGIN:VEVENT
UID:${session.id}@lessonlink
DTSTAMP:${now}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:LessonLink Session - ${session.title || 'Lesson'}
DESCRIPTION:Tutoring session
STATUS:CONFIRMED
END:VEVENT`;
}

// Generate the full iCal calendar
function generateICalCalendar(
  sessions: Array<{
    id: string;
    title?: string;
    lessonDate: string;
    startTime: string;
    endTime: string;
    teacherUid?: string;
  }>,
  studentName: string
): string {
  const events = sessions
    .filter(session => (session as any).status !== 'cancelled')
    .map(session => generateICalEvent(session, studentName))
    .join('\n');

  const now = format(new Date(), "yyyyMMdd'T'HHmmss");

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//LessonLink//Learner Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:LessonLink Schedule
X-WR-TIMEZONE:UTC
${events}
END:VCALENDAR`;
}

export async function GET(request: NextRequest) {
  try {
    // Get studentId from query params
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    // Fetch session instances for this student
    const sessions = await getSessionInstancesByStudentId(studentId);

    // Generate iCal feed
    const icalContent = generateICalCalendar(sessions, 'Student');

    // Return as plain text with proper headers
    return new NextResponse(icalContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="lessonlink-schedule.ics"',
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (error) {
    console.error('Error generating iCal feed:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar feed' },
      { status: 500 }
    );
  }
}
