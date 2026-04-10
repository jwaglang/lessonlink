import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';

// Use Firebase Admin SDK
const adminApp = initializeApp({
  credential: cert(require('./functions/src/firebase-key.json')),
});

const adminDb = getAdminFirestore(adminApp);

async function restorePet() {
  const learnerId = 'ylhpEoEIIHULLlzqS3re0K7lKSl1';
  const profileRef = adminDb.collection('students').doc(learnerId).collection('petland').doc('profile');

  try {
    console.log('Restoring pet for learner:', learnerId);
    
    // Get current profile to see what we're restoring
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists()) {
      console.log('❌ No pet profile found');
      process.exit(1);
    }

    const currentProfile = profileSnap.data();
    console.log('Current pet state:', currentProfile?.petState);
    console.log('Pet name:', currentProfile?.petName);
    console.log('Pet images:');
    console.log('  - petImageUrl:', !!currentProfile?.petImageUrl);
    console.log('  - fatPetImageUrl:', !!currentProfile?.fatPetImageUrl);
    console.log('  - thinPetImageUrl:', !!currentProfile?.thinPetImageUrl);
    console.log('  - starvingPetImageUrl:', !!currentProfile?.starvingPetImageUrl);

    // Restore the pet
    await profileRef.update({
      petState: 'hatched',
    });

    console.log('✅ Pet restored! petState changed to "hatched"');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error restoring pet:', error);
    process.exit(1);
  }
}

restorePet();
