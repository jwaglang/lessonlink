import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';
config({ path: '.env.local' });
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');
const app = getApps().length === 0 ? initializeApp({ credential: cert({ projectId: process.env.FIREBASE_ADMIN_PROJECT_ID, clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL, privateKey }) }) : getApps()[0];
const db = getFirestore(app);
async function main() {
  const snap = await db.collection('sessions').where('unitId', '==', 'lFZModFQpYZSEfzQi3dl').orderBy('order', 'asc').get();
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.order >= 2 && data.order <= 4) {
      console.log(JSON.stringify({ id: d.id, order: data.order, title: data.title, materialsRich: data.materialsRich }, null, 2));
    }
  });
}
main().catch(e => { console.error(e); process.exit(1); });
