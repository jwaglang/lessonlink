/**
 * Debug script to see all collection references
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

async function debugCollections() {
  try {
    console.log('📋 Collections in petShopCollections:\n');
    const colSnapshot = await db.collection('petShopCollections').get();
    const collectionsByName = {};
    
    colSnapshot.docs.forEach(doc => {
      const name = doc.data().name;
      console.log(`  "${name}" (icon: ${doc.data().iconType})`);
      if (!collectionsByName[name]) {
        collectionsByName[name] = 0;
      }
      collectionsByName[name]++;
    });

    console.log('\n📦 Unique collections by name referenced in petShopItems:\n');
    const itemSnapshot = await db.collection('petShopItems').get();
    const itemCollections = new Set();
    
    itemSnapshot.docs.forEach(doc => {
      const collection = doc.data().collection;
      if (collection) {
        itemCollections.add(collection);
      }
    });

    Array.from(itemCollections).sort().forEach(name => {
      console.log(`  "${name}"`);
    });

    console.log('\n🔍 Checking for duplicates with spacing:\n');
    const allNames = [
      ...Object.keys(collectionsByName),
      ...Array.from(itemCollections)
    ];
    
    const trimmed = {};
    allNames.forEach(name => {
      const t = name.trim();
      if (!trimmed[t]) trimmed[t] = [];
      trimmed[t].push(name);
    });

    Object.entries(trimmed).forEach(([t, names]) => {
      const unique = [...new Set(names)];
      if (unique.length > 1) {
        console.log(`  ⚠️  Multiple versions of "${t}":`);
        unique.forEach(name => {
          console.log(`      - "${name}"`);
        });
      }
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugCollections();
