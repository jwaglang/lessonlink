#!/usr/bin/env node

require('dotenv').config();

const admin = require('firebase-admin');

const serviceAccount = {
  type: 'service_account',
  project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
  private_key_id: 'fbsvc',
  private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  client_id: '117799732341980844769',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
});

const db = admin.firestore();
const LEARNER_ID = process.argv[2] || '1SLNgciKQlhKVzE9INPBROgBsEz2';

async function fixMaxProfile() {
  try {
    console.log(`Updating profile for learner: ${LEARNER_ID}`);
    
    const profileRef = db.doc(`students/${LEARNER_ID}/petland/profile`);
    
    await profileRef.update({
      xp: 233,
      xpSpent: 150,
      dorkBalance: 150,
    });

    console.log('✅ Successfully updated Max profile!');
    console.log('New values:');
    console.log('  xp: 233');
    console.log('  xpSpent: 150');
    console.log('  dorkBalance: 150');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Update failed:', error.message);
    process.exit(1);
  }
}

fixMaxProfile();
