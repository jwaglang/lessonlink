/**
 * Preview the rendered session markdown for Farm Animals Session 1.
 * READ-ONLY. Uses session-export.json + fetches the unit from Firestore.
 *
 * Run: npx tsx scripts/preview-session-plan.ts
 * Output: ./session-plan-preview.md
 */
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';
import { renderSessionMarkdown } from '../src/lib/unit-package-renderer';

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
  const session = JSON.parse(readFileSync('./session-export.json', 'utf8'));
  session.id = 'V4wCcyBc9BP0JuwHoOWh';

  const unitSnap = await db.collection('units').doc('lFZModFQpYZSEfzQi3dl').get();
  const unit = { id: unitSnap.id, ...unitSnap.data() };

  const md = renderSessionMarkdown(session as any, unit as any);
  writeFileSync('./session-plan-preview.md', md);
  console.log('Written to ./session-plan-preview.md');
}
main().catch(err => { console.error(err); process.exit(1); });
