/**
 * Preview the rendered unit plan markdown for Farm Animals.
 * READ-ONLY. Fetches unit + all sessions from Firestore.
 *
 * Run: npx tsx scripts/preview-unit-plan.ts
 * Output: ./unit-plan-preview.md
 */
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';
import { renderUnitMarkdown } from '../src/lib/unit-package-renderer';

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
  const unitSnap = await db.collection('units').doc('lFZModFQpYZSEfzQi3dl').get();
  const unit = { id: unitSnap.id, ...unitSnap.data() };

  const sessionsSnap = await db.collection('sessions')
    .where('unitId', '==', 'lFZModFQpYZSEfzQi3dl')
    .orderBy('order', 'asc')
    .get();
  const sessions = sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const md = renderUnitMarkdown(unit as any, sessions as any);
  writeFileSync('./unit-plan-preview.md', md);
  console.log('Written to ./unit-plan-preview.md');
}
main().catch(err => { console.error(err); process.exit(1); });
