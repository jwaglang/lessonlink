
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function seedNewCollections() {
  console.log('🌱 Starting to seed new collections...');
  const now = Timestamp.now();

  try {
    // Collection 2: sessions
    const sessionData = {
      unitId: "unit_sample_001",
      courseId: "course_a1_sample",
      title: "Session 1: Food Vocabulary",
      littleQuestion: "What foods do you eat every day?",
      description: "Learn basic food vocabulary and discuss daily eating habits",
      order: 1,
      duration: 30,
      thumbnailUrl: "",
      materials: [],
      homeworkId: null,
      createdAt: now,
      updatedAt: now
    };
    const sessionDoc = await addDoc(collection(db, 'sessions'), sessionData);
    console.log('✅ Collection "sessions" seeded with sample document.');

    // Collection 3: homeworks
    const homeworkData = {
      sessionId: "session_sample_001", // Should match a real session ID, using placeholder for now
      title: "Food Vocabulary Worksheet",
      description: "Complete the food matching exercise",
      type: "worksheet",
      thumbnailUrl: "",
      materials: [],
      triggerType: "auto",
      xpReward: 50,
      createdAt: now,
      updatedAt: now
    };
    const homeworkDoc = await addDoc(collection(db, 'homeworks'), homeworkData);
    console.log('✅ Collection "homeworks" seeded with sample document.');

    // Collection 4: homeworkSubmissions
    const homeworkSubmissionData = {
      homeworkId: "homework_sample_001", // Should match a real homework ID
      studentId: "student_sample_001",
      assignedAt: now,
      submittedAt: null,
      status: "assigned",
      submissionFiles: [],
      submissionText: null,
      grade: null,
      accuracy: null,
      feedback: null,
      gradedAt: null
    };
    await addDoc(collection(db, 'homeworkSubmissions'), homeworkSubmissionData);
    console.log('✅ Collection "homeworkSubmissions" seeded with sample document.');

    // Collection 5: studentProgress
    const studentProgressData = {
      studentId: "student_sample_001",
      courseId: "course_a1_sample",
      totalHoursCompleted: 0,
      targetHours: 200,
      percentComplete: 0,
      unitsCompleted: 0,
      unitsTotal: 0,
      sessionsCompleted: 0,
      sessionsTotal: 0,
      homeworkAccuracyAvg: null,
      assessmentScoreAvg: null,
      evaluationScoreAvg: null,
      overallAccuracy: null,
      lastActivityAt: now,
      startedAt: now,
      completedAt: null
    };
    await addDoc(collection(db, 'studentProgress'), studentProgressData);
    console.log('✅ Collection "studentProgress" seeded with sample document.');

    // Collection 6: studentRewards
    const studentRewardsData = {
      studentId: "student_sample_001",
      totalXP: 0,
      totalHP: 100,
      totalDorks: 0,
      lastSyncedFromPetland: now,
      manualXPAdjustment: 0,
      manualHPAdjustment: 0,
      adjustmentNotes: null,
      displayedXP: 0,
      displayedHP: 100,
      updatedAt: now
    };
    await addDoc(collection(db, 'studentRewards'), studentRewardsData);
    console.log('✅ Collection "studentRewards" seeded with sample document.');

    // Collection 7: projects
    const projectData = {
      unitId: "unit_sample_001",
      title: "Create a Restaurant Menu",
      description: "Design a menu with food vocabulary learned in this unit",
      type: "tblt_task",
      materials: [],
      xpReward: 100,
      createdAt: now,
      updatedAt: now
    };
    await addDoc(collection(db, 'projects'), projectData);
    console.log('✅ Collection "projects" seeded with sample document.');

    // Collection 8: assessmentReports
    const assessmentReportData = {
      studentId: "student_sample_001",
      unitId: "unit_sample_001",
      type: "initial",
      audioUrl: "",
      teacherNotes: "",
      generatedReport: "",
      score: null,
      createdAt: now,
      sentToParent: false,
      sentAt: null
    };
    await addDoc(collection(db, 'assessmentReports'), assessmentReportData);
    console.log('✅ Collection "assessmentReports" seeded with sample document.');

    console.log('\n🎉 All 7 collections have been successfully seeded.');

  } catch (error) {
    console.error("🔥 Error seeding collections:", error);
  }
}
