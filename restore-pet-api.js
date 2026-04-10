#!/usr/bin/env node

/**
 * Restore Luke's pet from dead state using Firebase REST API
 * Usage: node restore-pet-api.js
 */

const https = require('https');

const FIRESTORE_DATABASE = 'lessonlink-6c4de';
const LEARNER_ID = 'ylhpEoEIIHULLlzqS3re0K7lKSl1';
const PROJECT_ID = 'studio-3824588486-46768'; // LessonLink project

async function restorePet() {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/students/${LEARNER_ID}/petland/profile?key=${process.env.FIREBASE_REST_KEY}`;

  return new Promise((resolve, reject) => {
    // First, GET the current document
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Current profile:');
        const profile = JSON.parse(data);
        console.log(JSON.stringify(profile, null, 2));

        // Now PATCH to change petState
        const petStateValue = {
          stringValue: 'hatched'
        };

        const patchUrl = url + '&updateMask.fieldPaths=petState';
        const updateData = JSON.stringify({
          fields: {
            petState: petStateValue
          }
        });

        const options = {
          hostname: 'firestore.googleapis.com',
          path: `/v1/projects/${PROJECT_ID}/databases/(default)/documents/students/${LEARNER_ID}/petland/profile?updateMask.fieldPaths=petState&key=${process.env.FIREBASE_REST_KEY}`,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(updateData)
          }
        };

        const req = https.request(options, (res) => {
          let responseData = '';
          res.on('data', chunk => responseData += chunk);
          res.on('end', () => {
            console.log('\n✅ Pet restored!');
            console.log('Updated profile:');
            console.log(JSON.stringify(JSON.parse(responseData), null, 2));
            resolve();
          });
        });

        req.on('error', reject);
        req.write(updateData);
        req.end();
      });
    }).on('error', reject);
  });
}

restorePet().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
