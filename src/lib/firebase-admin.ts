/**
 * Firebase Admin initialization for Node.js scripts
 */

import admin from 'firebase-admin';
import { cert } from 'firebase-admin/app';
import path from 'path';

// Load service account
const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

let firebaseInitialized = false;

export function getAdminDb() {
  if (!firebaseInitialized) {
    const serviceAccount = require(serviceAccountPath);

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    firebaseInitialized = true;
  }
  return admin.firestore();
}
