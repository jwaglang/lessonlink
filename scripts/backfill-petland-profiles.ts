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

const DEFAULT_PROFILE = {
  xp: 0,
  xpSpent: 0,
  hp: 100,
  maxHp: 100,
  dorkBalance: 10,
  lastHpUpdate: new Date().toISOString(),
  lastChallengeDate: '',
  isFat: false,
  petState: 'egg',
  petName: '',
  inventory: [],
  unlockedBrochures: [],
  createdAt: new Date().toISOString(),
};

async function backfill() {
  const studentsSnap = await db.collection('students').where('status', '==', 'active').get();

  console.log(`Found ${studentsSnap.size} active students`);

  for (const studentDoc of studentsSnap.docs) {
    const studentId = studentDoc.id;
    const name = studentDoc.data().name || studentId;

    const petRef = db.collection('students').doc(studentId).collection('petland').doc('profile');
    const petSnap = await petRef.get();

    if (petSnap.exists) {
      console.log(`  ✅ ${name} — already has petlandProfile`);
    } else {
      await petRef.set(DEFAULT_PROFILE);
      console.log(`  🐣 ${name} — created petlandProfile`);
    }
  }

  console.log('\nDone.');
}

backfill().catch(console.error);
