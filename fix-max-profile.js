#!/usr/bin/env node

/**
 * Fix Max's profile XP values
 * Usage: node fix-max-profile.js
 */

const https = require('https');

const PROJECT_ID = 'studio-3824588486-46768';
const FIREBASE_DATABASE = 'lessonlink-6c4de';

// You'll need to get Max's learner ID
// For now using example - replace with actual ID
const LEARNER_ID = process.argv[2] || 'max-learner-id-here';

async function fixMaxProfile() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/students/${LEARNER_ID}/petland/profile?key=${process.env.FIREBASE_REST_KEY}`;

  return new Promise((resolve, reject) => {
    // PATCH to update values
    const updateData = {
      fields: {
        xp: { integerValue: '233' },
        xpSpent: { integerValue: '150' },
        dorkBalance: { integerValue: '150' }
      }
    };

    const options = {
      hostname: 'firestore.googleapis.com',
      port: 443,
      path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/students/${LEARNER_ID}/petland/profile?key=${process.env.FIREBASE_REST_KEY}&updateMask.fieldPaths=xp&updateMask.fieldPaths=xpSpent&updateMask.fieldPaths=dorkBalance`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': JSON.stringify(updateData).length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Update response:');
        console.log(JSON.stringify(JSON.parse(data), null, 2));
        resolve();
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(updateData));
    req.end();
  });
}

fixMaxProfile().catch(console.error);
