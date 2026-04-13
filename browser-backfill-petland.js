// ============================================
// LessonLink xpSpent & Petland Backfill Script
// ============================================
// 
// Run this in the browser console while logged in as admin
// on localhost:9002 (or production)
//
// The script will:
// 1. Query all students
// 2. Check if petland profile exists
// 3. Add missing xpSpent: 0
// 4. Add missing dorkBalance: 10
// 5. Log all changes

async function backfillPetland() {
  try {
    // Import Firebase modular SDK
    const { getApps, initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js');
    const { getFirestore, collection, getDocs, doc, setDoc, updateDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js');
    const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js');

    console.log('%c🚀 Starting Petland Backfill...', 'color: blue; font-weight: bold; font-size: 14px');

    // Get Firebase config from environment variables (NEXT_PUBLIC_*)
    const firebaseConfig = {
      apiKey: 'AIzaSyBqINjnO5nrqK3FJ1C3Z-EzVwPpGtL3V30',
      authDomain: 'lessonlink-main.firebaseapp.com',
      projectId: 'studio-3824588486-46768',
      storageBucket: 'studio-3824588486-46768.appspot.com',
      messagingSenderId: '159028614968',
      appId: '1:159028614968:web:8f7652c41c6f5032c5f3d5',
    };

    // Get or initialize Firebase app
    let app;
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
      console.log('   📱 Initialized Firebase');
    } else {
      app = getApps()[0];
      console.log('   ♻️  Using existing Firebase app');
    }

    const db = getFirestore(app);
    const auth = getAuth(app);

    if (!auth.currentUser) {
      console.error('%c❌ Not logged in!', 'color: red; font-weight: bold');
      return { success: false, error: 'User not authenticated' };
    }

    console.log(`👤 Logged in as: ${auth.currentUser.email}\n`);

    // Query all students
    const studentsCollection = collection(db, 'students');
    const studentsSnapshot = await getDocs(studentsCollection);

    if (studentsSnapshot.empty) {
      console.warn('❌ No students found');
      return { success: false, error: 'No students found' };
    }

    console.log(`📊 Found ${studentsSnapshot.size} students\n`);

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const changes = [];

    // Process each student
    for (const studentDoc of studentsSnapshot.docs) {
      const studentId = studentDoc.id;
      const studentData = studentDoc.data();
      const email = studentData.email || 'Unknown';

      // Get petland profile ref
      const profileRef = doc(db, 'students', studentId, 'petland', 'profile');
      const profileDoc = await getDoc(profileRef);

      if (!profileDoc.exists()) {
        // Profile doesn't exist - create with defaults
        console.log(`%c🆕 ${email}`, 'color: green');
        console.log(`   Creating petland profile...`);

        const defaultProfile = {
          xp: 0,
          hp: 100,
          maxHp: 100,
          dorkBalance: 10,
          xpSpent: 0,
          lastHpUpdate: new Date().toISOString(),
          lastChallengeDate: '',
          isSick: false,
          petState: 'egg',
          petName: '',
          inventory: [],
          unlockedBrochures: [],
          createdAt: new Date(),
        };

        await setDoc(profileRef, defaultProfile);

        changes.push({
          email,
          action: 'CREATED',
          fields: Object.keys(defaultProfile),
        });

        createdCount++;
        console.log(`   ✅ Created with xpSpent: 0, dorkBalance: 10\n`);
      } else {
        // Profile exists - check for missing fields
        const profileData = profileDoc.data();
        const updates = {};

        let hasChanges = false;

        // Check xpSpent
        if (profileData.xpSpent === undefined) {
          updates.xpSpent = 0;
          hasChanges = true;
          console.log(`%c✏️  ${email}`, 'color: orange');
          console.log(`   Adding xpSpent: 0`);
        }

        // Check dorkBalance
        if (profileData.dorkBalance === undefined) {
          updates.dorkBalance = 10;
          hasChanges = true;
          console.log(`   Adding dorkBalance: 10`);
        }

        if (hasChanges) {
          updates.updatedAt = new Date();
          await updateDoc(profileRef, updates);

          changes.push({
            email,
            action: 'UPDATED',
            fields: Object.keys(updates),
          });

          updatedCount++;
          console.log(`   ✅ Updated\n`);
        } else {
          console.log(`%c⏭️  ${email}`, 'color: gray');
          console.log(`   Already has xpSpent & dorkBalance\n`);
          skippedCount++;
        }
      }
    }

    // Summary
    console.log('%c================================', 'color: blue; font-weight: bold');
    console.log('%c✨ BACKFILL COMPLETE!', 'color: green; font-weight: bold; font-size: 16px');
    console.log('%c================================', 'color: blue; font-weight: bold');
    console.log(`\n📊 Summary:`);
    console.log(`   Created: ${createdCount}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Total:   ${createdCount + updatedCount + skippedCount}\n`);

    // Table of changes
    console.table(changes);

    return {
      success: true,
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
      changes,
    };
  } catch (error) {
    console.error('%c❌ ERROR:', 'color: red; font-weight: bold', error.message);
    console.error(error);
    return { success: false, error: error.message };
  }
}

// Run it
backfillPetland();
