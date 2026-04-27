/**
 * Inspection Script: Courses & Related Collections
 * Hexdate: Q4R (April 27, 2026)
 *
 * READ-ONLY. Dumps current state of courses, studentPackages, studentProgress,
 * units, and a sample of students to JSON for Claude to inspect.
 *
 * Run from project root:
 *   npx tsx scripts/inspect-courses-Q4R.ts
 *
 * Output:
 *   scripts/inspect-courses-output-Q4R.json
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { join } from 'path';

config({ path: '.env.local' });

const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

const app = getApps().length === 0 ? initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey,
  }),
}) : getApps()[0];

const db = getFirestore(app);

// Names of the four real Ls we're trying to unblock
const TARGET_NAMES = ['arina', 'luke', 'gordon', 'mark'];

async function dumpCollection(name: string, limit?: number) {
  const ref = db.collection(name);
  const snap = limit ? await ref.limit(limit).get() : await ref.get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function inspect() {
  const output: Record<string, any> = {
    inspectedAt: new Date().toISOString(),
    hexdate: 'Q4R',
    collections: {},
    notes: [],
  };

  // 1. courses — full dump (likely small)
  console.log('Dumping courses...');
  try {
    const courses = await dumpCollection('courses');
    output.collections.courses = {
      count: courses.length,
      docs: courses,
    };
    console.log(`  Found ${courses.length} courses`);
  } catch (e: any) {
    output.collections.courses = { error: e.message };
    output.notes.push(`courses collection error: ${e.message}`);
  }

  // 2. units — full dump (unit templates, also likely small)
  console.log('Dumping units...');
  try {
    const units = await dumpCollection('units');
    output.collections.units = {
      count: units.length,
      docs: units,
    };
    console.log(`  Found ${units.length} units`);
  } catch (e: any) {
    output.collections.units = { error: e.message };
  }

  // 3. studentPackages — first 5 docs to see linkage shape
  console.log('Dumping studentPackages (sample)...');
  try {
    const packages = await dumpCollection('studentPackages', 5);
    output.collections.studentPackagesSample = {
      sampleSize: packages.length,
      docs: packages,
    };
  } catch (e: any) {
    output.collections.studentPackagesSample = { error: e.message };
  }

  // 4. studentProgress — first 5 docs to see linkage shape
  console.log('Dumping studentProgress (sample)...');
  try {
    const progress = await dumpCollection('studentProgress', 5);
    output.collections.studentProgressSample = {
      sampleSize: progress.length,
      docs: progress,
    };
  } catch (e: any) {
    output.collections.studentProgressSample = { error: e.message };
  }

  // 5. studentCredit — first 5 docs
  console.log('Dumping studentCredit (sample)...');
  try {
    const credits = await dumpCollection('studentCredit', 5);
    output.collections.studentCreditSample = {
      sampleSize: credits.length,
      docs: credits,
    };
  } catch (e: any) {
    output.collections.studentCreditSample = { error: e.message };
  }

  // 6. The four target Ls — find by name (case-insensitive contains)
  console.log('Finding target learners...');
  try {
    const studentsSnap = await db.collection('students').get();
    const targetLs = studentsSnap.docs
      .filter(d => {
        const name = (d.data().name || '').toLowerCase();
        return TARGET_NAMES.some(t => name.includes(t));
      })
      .map(d => ({ id: d.id, ...d.data() }));

    output.collections.targetLearners = {
      count: targetLs.length,
      docs: targetLs,
    };
    console.log(`  Found ${targetLs.length} target learners`);

    // 7. For each target L, get their progress + packages + credit
    output.collections.targetLearnerLinkages = {};
    for (const l of targetLs) {
      const id = l.id;
      const [prog, pkgs, cred] = await Promise.all([
        db.collection('studentProgress').where('studentId', '==', id).get(),
        db.collection('studentPackages').where('studentId', '==', id).get(),
        db.collection('studentCredit').where('studentId', '==', id).get(),
      ]);
      output.collections.targetLearnerLinkages[id] = {
        name: (l as any).name,
        studentProgress: prog.docs.map(d => ({ id: d.id, ...d.data() })),
        studentPackages: pkgs.docs.map(d => ({ id: d.id, ...d.data() })),
        studentCredit: cred.docs.map(d => ({ id: d.id, ...d.data() })),
      };
    }
  } catch (e: any) {
    output.collections.targetLearners = { error: e.message };
  }

  // 8. teacherProfiles — to see slug + active T linkage
  console.log('Dumping teacherProfiles...');
  try {
    const profiles = await dumpCollection('teacherProfiles');
    output.collections.teacherProfiles = {
      count: profiles.length,
      docs: profiles,
    };
  } catch (e: any) {
    output.collections.teacherProfiles = { error: e.message };
  }

  // Write output
  const outPath = join(process.cwd(), 'scripts', 'inspect-courses-output-Q4R.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\n✅ Dumped to ${outPath}`);
  console.log(`   Upload that file to Claude.`);

  process.exit(0);
}

inspect().catch(e => {
  console.error('Inspection failed:', e);
  process.exit(1);
});
