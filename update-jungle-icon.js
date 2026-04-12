/**
 * Update Rumble in the Jungle to use tree icon
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config({ path: '.env.local' });

const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey,
  }),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});

const db = getFirestore(app);

async function updateIcon() {
  try {
    console.log('🌳 Updating Rumble in the Jungle icon...\n');

    const snapshot = await db
      .collection('petShopCollections')
      .where('name', '==', 'Rumble in the Jungle')
      .get();

    if (snapshot.empty) {
      console.log('❌ Collection not found');
      process.exit(1);
    }

    const docId = snapshot.docs[0].id;
    const currentData = snapshot.docs[0].data();

    console.log(`  Current icon: ${currentData.iconType}`);
    
    await db.collection('petShopCollections').doc(docId).update({
      iconType: 'tree',
    });

    console.log(`  ✅ Updated to: tree 🌲\n`);
    console.log('✨ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateIcon();
