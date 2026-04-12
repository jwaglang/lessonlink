/**
 * Manual one-time fix to restore correct icons in petShopCollections
 * Run with: npm run build && node fix-collection-icons.js
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

// Icon mappings for known collections
const iconMap = {
  'Oh my stars!': 'sparkles',
  'Letting off some steam!': 'wind',
  'Magic and Spells': 'wand',
  'Under the sea': 'droplet',
  'Rumble in the Jungle': 'rocket',
};

async function fixCollectionIcons() {
  try {
    console.log('📋 Fetching all collections from petShopCollections...');
    const snapshot = await db.collection('petShopCollections').get();
    
    console.log(`\n Found ${snapshot.size} collections:\n`);
    
    const updates = [];
    
    snapshot.forEach(doc => {
      const { name, iconType } = doc.data();
      const trimmedName = name.trim();
      const correctIcon = iconMap[trimmedName];
      
      if (correctIcon && iconType !== correctIcon) {
        console.log(`  ⚠️  "${name}"`);
        console.log(`      Current: ${iconType}`);
        console.log(`      Fixing to: ${correctIcon}`);
        updates.push({ docId: doc.id, name, newIcon: correctIcon });
      } else if (correctIcon) {
        console.log(`  ✅ "${name}" (already correct: ${iconType})`);
      } else {
        console.log(`  ℹ️  "${name}" (current: ${iconType || 'default'}) - no mapping defined`);
      }
    });
    
    if (updates.length === 0) {
      console.log('\n✅ All collections already have correct icons!');
      process.exit(0);
    }
    
    console.log(`\n🔄 Updating ${updates.length} collection(s)...\n`);
    
    for (const { docId, name, newIcon } of updates) {
      await db.collection('petShopCollections').doc(docId).update({
        iconType: newIcon,
      });
      console.log(`  ✅ Updated "${name}" → ${newIcon}`);
    }
    
    console.log(`\n✨ Done! All collection icons have been restored.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing icons:', error);
    process.exit(1);
  }
}

fixCollectionIcons();
