import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const snapshot = await adminDb.collection('petShopItems').get();
    
    const items = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      collection: doc.data().collection,
      imageUrl: doc.data().imageUrl,
      hasToken: doc.data().imageUrl?.includes('&token=') || false,
    }));

    return NextResponse.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error('[list-items] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to list items';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
