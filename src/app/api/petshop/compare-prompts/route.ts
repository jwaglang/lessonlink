import { getPetShopItems } from '@/lib/firestore';

export async function GET() {
  try {
    const items = await getPetShopItems();
    
    const spaceHelmet = items?.find(i => i.name?.trim() === 'Space Helmet');
    const wizardsCauldron = items?.find(i => i.name?.trim() === "Wizard's Cauldron");
    
    return Response.json({
      spaceHelmet: spaceHelmet ? {
        name: spaceHelmet.name,
        prompt: spaceHelmet.description,
        createdDate: spaceHelmet.createdDate,
        collection: spaceHelmet.collection,
      } : null,
      wizardsCauldron: wizardsCauldron ? {
        name: wizardsCauldron.name,
        prompt: wizardsCauldron.description,
        createdDate: wizardsCauldron.createdDate,
        collection: wizardsCauldron.collection,
      } : null,
      allItems: items?.map(i => ({ name: i.name, createdDate: i.createdDate })) || [],
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch items' },
      { status: 500 }
    );
  }
}
