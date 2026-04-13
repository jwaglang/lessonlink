/**
 * Call backfill Cloud Function via Firebase CLI
 *
 * This script calls the backfillXpSpentField Cloud Function
 * that was deployed to Firebase.
 */

const axios = require('axios');

async function callBackfillFunction() {
  console.log('🚀 Calling backfillXpSpentField Cloud Function...\n');

  try {
    // Get Firebase project ID from firebase.json or environment
    const projectId = 'studio-3824588486-46768';
    const region = 'us-central1';
    const functionUrl = `https://${region}-${projectId}.cloudfunctions.net/backfillXpSpentField`;

    console.log(`📍 Function URL: ${functionUrl}\n`);

    // Get ID token from Firebase CLI
    const { execSync } = require('child_process');
    let authToken;

    try {
      authToken = execSync('firebase auth:export --token-format=esm', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      
      console.log('✅ Got Firebase CLI token\n');
    } catch (e) {
      console.log(
        '⚠️  Firebase CLI token not available. Using public call (may fail if function requires auth).\n'
      );
    }

    // Call the function
    const response = await axios.post(functionUrl, {}, {
      headers: authToken
        ? {
            Authorization: `Bearer ${authToken}`,
          }
        : {},
      timeout: 300000, // 5 minutes
    });

    console.log('✨ Backfill complete!\n');
    console.log('Response:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('❌ Function error:');
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.code === 'ERR_AXIOS_RESPONSE') {
      console.error('❌ Network error - function may not be deployed');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

callBackfillFunction();
