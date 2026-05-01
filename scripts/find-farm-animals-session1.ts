/**
 * Find the Firestore doc ID for Farm Animals Session 1.
 * READ-ONLY — prints to console only.
 *
 * Run: npx tsx scripts/find-farm-animals-session1.ts
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

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

async function main() {
  // Find unit whose title contains "Farm Animals"
  const unitsSnap = await db.collection('units').get();
  const farmUnit = unitsSnap.docs.find(d => (d.data().title ?? '').toLowerCase().includes('farm animals'));
  if (!farmUnit) {
    console.error('No unit with "Farm Animals" in title found.');
    process.exit(1);
  }
  console.log(`Farm Animals unit ID: ${farmUnit.id} (title: "${farmUnit.data().title}")`);

  // Find session with order = 1 for that unit
  const sessionsSnap = await db.collection('sessions')
    .where('unitId', '==', farmUnit.id)
    .where('order', '==', 1)
    .get();

  if (sessionsSnap.empty) {
    console.error('No session with order=1 found for this unit.');
    process.exit(1);
  }

  sessionsSnap.docs.forEach(d => {
    console.log(`Session 1 doc ID: ${d.id} (title: "${d.data().title}")`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
