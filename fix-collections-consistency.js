/**
 * Fix collection inconsistencies between petShopCollections and petShopItems
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

async function fixCollections() {
  try {
    console.log('🔍 Analyzing collections...\n');

    // Get all collections
    const colSnapshot = await db.collection('petShopCollections').get();
    const collections = new Map();
    colSnapshot.docs.forEach(doc => {
      collections.set(doc.data().name, { id: doc.id, iconType: doc.data().iconType });
    });

    // Get all items and their collections
    const itemSnapshot = await db.collection('petShopItems').get();
    const itemCollections = new Set();
    const itemsByCollection = {};

    itemSnapshot.docs.forEach(doc => {
      const collection = (doc.data().collection || '').trim();
      if (collection) {
        itemCollections.add(collection);
        if (!itemsByCollection[collection]) {
          itemsByCollection[collection] = [];
        }
        itemsByCollection[collection].push(doc.id);
      }
    });

    console.log('📦 Missing collections in petShopCollections:\n');

    const toCreate = [];
    for (const collName of itemCollections) {
      if (!collections.has(collName)) {
        console.log(`  ⚠️  "${collName}" (referenced by ${itemsByCollection[collName].length} items)`);
        toCreate.push(collName);
      }
    }

    console.log('\n🔄 Creating missing collections...\n');
    for (const collName of toCreate) {
      await db.collection('petShopCollections').add({
        name: collName,
        iconType: 'default',
        createdDate: new Date().toISOString(),
      });
      console.log(`  ✅ Created "${collName}"`);
    }

    // Now fix items with spacing issues
    console.log('\n🔧 Fixing item collection references...\n');

    const itemsToUpdate = [];
    itemSnapshot.docs.forEach(doc => {
      const collection = doc.data().collection;
      const trimmed = collection ? collection.trim() : '';
      
      if (collection !== trimmed && trimmed) {
        console.log(`  ⚠️  Item "${doc.data().name}"`);
        console.log(`      Referenced: "${collection}"`);
        console.log(`      Fixing to: "${trimmed}"`);
        itemsToUpdate.push({ id: doc.id, newName: trimmed });
      }
    });

    console.log(`\n  Updating ${itemsToUpdate.length} items...\n`);
    for (const update of itemsToUpdate) {
      await db.collection('petShopItems').doc(update.id).update({
        collection: update.newName
      });
      console.log(`    ✅ Updated item`);
    }

    console.log('\n✨ All collections are now consistent!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixCollections();
