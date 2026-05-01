/**
 * Export a single session doc to JSON for inspection.
 * READ-ONLY.
 *
 * Run from project root:
 *   npx tsx scripts/export-session.ts <sessionId>
 *
 * Output:
 *   ./session-export.json
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';

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
  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error('Usage: npx tsx scripts/export-session.ts <sessionId>');
    process.exit(1);
  }

  const snap = await db.collection('sessions').doc(sessionId).get();
  if (!snap.exists) {
    console.error(`Session "${sessionId}" not found.`);
    process.exit(1);
  }

  const data = snap.data();
  writeFileSync('./session-export.json', JSON.stringify(data, null, 2));
  console.log(`Written to ./session-export.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
