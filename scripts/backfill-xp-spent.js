/**
 * backfill-xp-spent.js
 *
 * One-shot script: adds xpSpent: 0 to every petlandProfiles document
 * that is missing the field.
 *
 * Run from the project root:
 *   node scripts/backfill-xp-spent.js
 *
 * Reads credentials from .env.local — no extra setup needed.
 * Safe to re-run: skips any document that already has xpSpent.
 */

const fs = require('fs');
const path = require('path');

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  if (!process.env[key]) process.env[key] = val;
}

// ── Firebase Admin ───────────────────────────────────────────────────────────
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = getFirestore();

// ── Backfill ─────────────────────────────────────────────────────────────────
// xpSpent lives at students/{studentId}/petland/profile (not top-level petlandProfiles)
async function run() {
  console.log('Fetching students...');
  const studentsSnap = await db.collection('students').get();

  if (studentsSnap.empty) {
    console.log('No documents found in students collection.');
    return;
  }

  console.log(`Found ${studentsSnap.size} students. Checking petland profiles...`);

  let skipped = 0;
  let updated = 0;
  let missing = 0; // student has no petland/profile doc at all
  const BATCH_SIZE = 400;
  let batch = db.batch();
  let batchCount = 0;

  for (const studentDoc of studentsSnap.docs) {
    const profileRef = db.doc(`students/${studentDoc.id}/petland/profile`);
    const profileSnap = await profileRef.get();

    if (!profileSnap.exists) {
      missing++;
      continue;
    }

    const data = profileSnap.data();

    if (data.xpSpent !== undefined && data.xpSpent !== null) {
      skipped++;
      continue;
    }

    batch.update(profileRef, { xpSpent: 0 });
    batchCount++;
    updated++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  Committed batch of ${batchCount}`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
    console.log(`  Committed final batch of ${batchCount}`);
  }

  console.log(`\nDone.`);
  console.log(`  Updated : ${updated}  (xpSpent set to 0)`);
  console.log(`  Skipped : ${skipped}  (xpSpent already present)`);
  console.log(`  No profile: ${missing}  (student has no petland/profile doc)`);
  console.log(`  Total students checked: ${studentsSnap.size}`);
}

run().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
