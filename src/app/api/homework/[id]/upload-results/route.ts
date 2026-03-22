import { NextRequest, NextResponse } from 'next/server';
import { getHomeworkAssignment, updateHomeworkAssignment } from '@/lib/firestore';
import { parseHomeworkJson, isValidKiddolandExport, detectToolType } from '@/lib/homework-parser';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { rawJson, uploadedBy } = body;

    if (!rawJson || typeof rawJson !== 'object') {
      return NextResponse.json({ error: 'Missing or invalid rawJson' }, { status: 400 });
    }

    // Get the existing homework assignment
    const homework = await getHomeworkAssignment(id);
    if (!homework) {
      return NextResponse.json({ error: 'Homework assignment not found' }, { status: 404 });
    }

    // Validate the JSON looks like a Kiddoland export
    if (!isValidKiddolandExport(rawJson)) {
      return NextResponse.json(
        { error: 'This does not appear to be a valid Kiddoland homework export. Please check the file and try again.' },
        { status: 400 }
      );
    }

    // Auto-detect tool type if not set, or use the homework's type
    const toolType = detectToolType(rawJson) || homework.homeworkType;

    // Parse the JSON into normalized results
    const parsedResults = parseHomeworkJson(rawJson, toolType);

    // Calculate a suggested score from completion rate (T can override later)
    const suggestedScore = Math.round(parsedResults.completionRate * 100);

    // Update the homework doc with the submission
    await updateHomeworkAssignment(id, {
      submission: {
        uploadedAt: new Date().toISOString(),
        uploadedBy: uploadedBy || 'teacher',
        rawJson,
        parsedResults,
      },
      status: 'submitted',
    });

    // Return the parsed results so T can review before grading
    return NextResponse.json({
      success: true,
      parsedResults,
      suggestedScore,
      practiceMinutes: parsedResults.totalPracticeMinutes,
    });
  } catch (error: any) {
    console.error('Homework upload error:', error);
    return NextResponse.json({ error: error.message || 'Failed to upload results' }, { status: 500 });
  }
}
