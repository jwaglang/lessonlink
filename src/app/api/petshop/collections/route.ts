import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const snapshot = await adminDb.collection('petShopCollections').get();
    const collections = snapshot.docs.map((doc) => doc.data().name);
    
    // Also get collections from items
    const itemsSnapshot = await adminDb.collection('petShopItems').get();
    const itemCollections = new Set(
      itemsSnapshot.docs
        .map((doc) => doc.data().collection || 'Uncategorized')
    );

    // Merge and deduplicate
    const allCollections = Array.from(
      new Set([...collections, ...itemCollections])
    ).sort();

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
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      );
    }

    // Check if collection already exists
    const existing = await adminDb
      .collection('petShopCollections')
      .where('name', '==', name)
      .get();

    if (!existing.empty) {
      return NextResponse.json(
        { error: 'Collection already exists' },
        { status: 400 }
      );
    }

    // Create the collection document
    await adminDb.collection('petShopCollections').add({
      name,
      createdDate: Date.now(),
    });

    return NextResponse.json({
      success: true,
      name,
    });
  } catch (error) {
    console.error('[createCollection] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}
