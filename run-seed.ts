
import { seedNewCollections } from './src/lib/seed-collections';

async function run() {
  try {
    await seedNewCollections();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

run();
