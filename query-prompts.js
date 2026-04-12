const admin = require('firebase-admin');
const serviceAccount = require('./firebase-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function getItems() {
  try {
    const snapshot = await db.collection('petShopItems').get();
    const items = [];
    snapshot.forEach(doc => {
      items.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`\nFound ${items.length} total items\n`);
    
    const spaceHelmet = items.find(i => i.name && i.name.includes('Space Helmet'));
    const wizardsCauldron = items.find(i => i.name && i.name.includes('Cauldron'));
    
    if (spaceHelmet) {
      console.log('=== SPACE HELMET ===');
      console.log('Prompt:', spaceHelmet.description);
      console.log('Created:', spaceHelmet.createdDate);
    } else {
      console.log('Space Helmet not found');
    }
    
    if (wizardsCauldron) {
      console.log('\n=== WIZARD\'S CAULDRON ===');
      console.log('Prompt:', wizardsCauldron.description);
      console.log('Created:', wizardsCauldron.createdDate);
    } else {
      console.log("Wizard's Cauldron not found");
    }
    
    if (spaceHelmet && wizardsCauldron) {
      console.log('\n=== COMPARISON ===');
      const samePrompt = spaceHelmet.description === wizardsCauldron.description;
      console.log('Same prompt?', samePrompt ? 'YES' : 'NO');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

getItems();
