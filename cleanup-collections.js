/**
 * Clean up collection names with leading/trailing spaces and consolidate duplicates
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

async function cleanupCollections() {
  try {
    console.log('📋 Fetching all collections...');
    const snapshot = await db.collection('petShopCollections').get();
    
    const collections = snapshot.docs.map(doc => ({
      id: doc.id,
      data: doc.data()
    }));

    console.log(`\nFound ${collections.length} collections:\n`);
    
    // Group by trimmed name to find duplicates
    const grouped = {};
    const toDelete = [];
    const toUpdate = {};

    for (const col of collections) {
      const trimmed = col.data.name.trim();
      
      if (col.data.name !== trimmed) {
        console.log(`  ⚠️  "${col.data.name}" (has spacing)`);
        console.log(`      → Should be: "${trimmed}"`);
        toDelete.push(col.id);
      } else {
        console.log(`  ✅ "${col.data.name}"`);
      }

      if (!grouped[trimmed]) {
        grouped[trimmed] = [];
      }
      grouped[trimmed].push(col.id);
    }

    // Check for duplicates with same trimmed name
    Object.entries(grouped).forEach(([name, ids]) => {
      if (ids.length > 1) {
        console.log(`\n  ⚠️  DUPLICATE: "${name}" has ${ids.length} versions`);
        ids.forEach((id, i) => {
          console.log(`      Version ${i + 1}: ${id}`);
        });
      }
    });

    if (toDelete.length === 0 && Object.values(grouped).every(ids => ids.length === 1)) {
      console.log('\n✅ All collections are clean!');
      process.exit(0);
    }

    console.log(`\n🔄 Cleaning up ${toDelete.length} collection(s) with spacing issues...\n`);

    for (const docId of toDelete) {
      const col = collections.find(c => c.id === docId);
      await db.collection('petShopCollections').doc(docId).delete();
      console.log(`  ✅ Deleted "${col.data.name}"`);
    }

    console.log(`\n✨ Cleanup complete!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error cleaning up collections:', error);
    process.exit(1);
  }
}

cleanupCollections();
