import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const snapshot = await adminDb.collection('petShopCollections').get();
    const collections = snapshot.docs.map((doc) => ({
      name: doc.data().name,
      iconType: doc.data().iconType || 'default',
    }));
    
    // Also get collections from items
    const itemsSnapshot = await adminDb.collection('petShopItems').get();
    const itemCollections = new Map(
      itemsSnapshot.docs
        .filter(doc => doc.data().collection)
        .map((doc) => [doc.data().collection.trim(), 'default'])
    );

    // Merge: stored collections override item-based ones
    const merged = new Map(itemCollections);
    for (const col of collections) {
      merged.set(col.name, col.iconType);
    }

    const allCollections = Array.from(merged.entries())
      .map(([name, iconType]) => ({ name, iconType }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      collections: allCollections,
    });
  } catch (error) {
    console.error('[getCollections] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, iconType } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      );
    }

    // Check if collection already exists
    const existing = await adminDb
      .collection('petShopCollections')
      .where('name', '==', name.trim())
      .get();

    if (!existing.empty) {
      return NextResponse.json(
        { error: 'Collection already exists' },
        { status: 400 }
      );
    }

    // Create the collection document with icon type
    await adminDb.collection('petShopCollections').add({
      name: name.trim(),
      iconType: iconType || 'default',
      createdDate: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      name: name.trim(),
      iconType: iconType || 'default',
    });
  } catch (error) {
    console.error('[createCollection] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { oldName, newName, iconType } = body;

    if (!oldName || !oldName.trim()) {
      return NextResponse.json(
        { error: 'Current collection name is required' },
        { status: 400 }
      );
    }

    if (!newName || !newName.trim()) {
      return NextResponse.json(
        { error: 'New collection name is required' },
        { status: 400 }
      );
    }

    // Get all collections and find by trimmed name match
    const allCollectionsSnapshot = await adminDb
      .collection('petShopCollections')
      .get();

    const matchingDoc = allCollectionsSnapshot.docs.find(
      doc => doc.data().name.trim() === oldName.trim()
    );

    if (!matchingDoc) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    const docId = matchingDoc.id;

    // Check if new name already exists (unless it's the same collection)
    if (oldName.trim() !== newName.trim()) {
      const existingWithNewName = allCollectionsSnapshot.docs.some(
        doc => doc.data().name.trim() === newName.trim()
      );

      if (existingWithNewName) {
        return NextResponse.json(
          { error: 'Collection name already exists' },
          { status: 400 }
        );
      }
    }

    // Update the collection document
    await adminDb.collection('petShopCollections').doc(docId).update({
      name: newName.trim(),
      iconType: iconType || 'default',
    });

    return NextResponse.json({
      success: true,
      name: newName.trim(),
      iconType: iconType || 'default',
    });
  } catch (error) {
    console.error('[updateCollection] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update collection' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      );
    }

    // Get all collections to find by trimmed name match
    const allCollectionsSnapshot = await adminDb
      .collection('petShopCollections')
      .get();

    const matchingDoc = allCollectionsSnapshot.docs.find(
      doc => doc.data().name.trim() === name.trim()
    );

    if (!matchingDoc) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    // Delete the collection document
    await adminDb.collection('petShopCollections').doc(matchingDoc.id).delete();

    return NextResponse.json({
      success: true,
      message: `Collection "${name}" has been deleted.`,
    });
  } catch (error) {
    console.error('[deleteCollection] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    );
  }
}
