'use client';

import { useState, useEffect } from 'react';
import type { PetShopItem } from '@/modules/petland/types';
import { getPetShopItems, updatePetShopItem, deletePetShopItem } from '@/lib/firestore';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ShoppingBag, Loader2, ChevronDown, ChevronRight, Edit2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function PetShopPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<PetShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set(['Magic and Spells', 'Wizard Collection'])); // Start some expanded
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showNewCollectionDialog, setShowNewCollectionDialog] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemData, setEditingItemData] = useState<Partial<PetShopItem>>({});
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  useEffect(() => {
    async function loadItems() {
      try {
        setError(null);
        const allItems = await getPetShopItems();
        setItems(allItems || []);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to load pet shop items';
        console.error('Failed to load pet shop items:', error);
        setError(errorMsg);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    loadItems();
  }, []);

  // Group items by collection
  const collections = Array.from(
    items.reduce((map, item) => {
      const collection = item.collection || 'Uncategorized';
      if (!map.has(collection)) map.set(collection, []);
      map.get(collection)!.push(item);
      return map;
    }, new Map<string, PetShopItem[]>())
  ).sort(([a], [b]) => a.localeCompare(b));

  const toggleCollection = (collectionName: string) => {
    const newExpanded = new Set(expandedCollections);
    if (newExpanded.has(collectionName)) {
      newExpanded.delete(collectionName);
    } else {
      newExpanded.add(collectionName);
    }
    setExpandedCollections(newExpanded);
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast({ title: 'Please enter a collection name', variant: 'destructive' });
      return;
    }
    
    // Just add to expanded collections and clear form
    setExpandedCollections(new Set([...expandedCollections, newCollectionName]));
    setNewCollectionName('');
    setShowNewCollectionDialog(false);
    toast({ title: `Created collection "${newCollectionName}"`, description: 'Add items to this collection by moving them.' });
  };

  const handleSaveItem = async () => {
    if (!editingItemId) return;
    
    try {
      const originalItem = items.find(i => i.id === editingItemId);
      if (!originalItem) return;

      // Prepare updates
      const updates: Partial<PetShopItem> = {};
      if (editingItemData.name !== undefined) updates.name = editingItemData.name;
      if (editingItemData.description !== undefined) updates.description = editingItemData.description;
      if (editingItemData.price !== undefined) updates.price = editingItemData.price;
      if (editingItemData.stock !== undefined) updates.stock = editingItemData.stock;
      if (editingItemData.collection !== undefined) updates.collection = editingItemData.collection;

      await updatePetShopItem(editingItemId, updates);
      
      // Update local state
      setItems(items.map(i => 
        i.id === editingItemId ? { ...i, ...updates } : i
      ));

      toast({
        title: 'Item updated',
        description: `"${editingItemData.name || originalItem.name}" has been saved.`,
      });

      setEditingItemId(null);
      setEditingItemData({});
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save item';
      console.error('Failed to save item:', error);
      toast({ title: 'Error saving item', description: errorMsg, variant: 'destructive' });
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItemId) return;
    
    try {
      const itemToDelete = items.find(i => i.id === deletingItemId);
      if (!itemToDelete) return;

      await deletePetShopItem(deletingItemId);
      
      // Update local state
      setItems(items.filter(i => i.id !== deletingItemId));

      toast({
        title: 'Item deleted',
        description: `"${itemToDelete.name}" has been removed from the pet shop.`,
      });

      setDeletingItemId(null);
      setEditingItemId(null);
      setEditingItemData({});
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete item';
      console.error('Failed to delete item:', error);
      toast({ title: 'Error deleting item', description: errorMsg, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16 gap-2">
        <Loader2 className="animate-spin h-5 w-5" />
        <span>Loading pet shop...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-8">
        <PageHeader
          title="Browse Pet Shop"
          description="View all available pet accessories organized by collection."
          icon={ShoppingBag}
        />
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Pet Shop</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const allCollections = Array.from(new Set([...collections.map(([name]) => name)])).sort();

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Browse Pet Shop"
          description={`${allCollections.length} collections, ${items.length} items`}
          icon={ShoppingBag}
        />
        <Button onClick={() => setShowNewCollectionDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Collection
        </Button>
      </div>

      {/* New Collection Dialog */}
      <Dialog open={showNewCollectionDialog} onOpenChange={setShowNewCollectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
            <DialogDescription>Create a new collection to organize accessories.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="collection-name">Collection Name</Label>
              <Input
                id="collection-name"
                placeholder="e.g., Magic and Spells, Dragon Collection, etc."
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCollectionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCollection}>Create Collection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingItemId} onOpenChange={(open) => !open && setDeletingItemId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Accessory?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The accessory will be permanently removed from the pet shop.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingItemId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteItem}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      {editingItemId && (
        <Dialog open={!!editingItemId} onOpenChange={(open) => !open && setEditingItemId(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Accessory</DialogTitle>
              <DialogDescription>Update the accessory details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editingItemData.name || ''}
                  onChange={(e) => setEditingItemData({ ...editingItemData, name: e.target.value })}
                  placeholder="Accessory name"
                />
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <textarea
                  id="edit-description"
                  value={editingItemData.description || ''}
                  onChange={(e) => setEditingItemData({ ...editingItemData, description: e.target.value })}
                  placeholder="Accessory description"
                  className="w-full p-2 border rounded-lg text-sm resize-none h-24"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-price">Price (XP)</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    min="0"
                    value={editingItemData.price ?? ''}
                    onChange={(e) => setEditingItemData({ ...editingItemData, price: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-stock">Stock</Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    min="0"
                    value={editingItemData.stock ?? ''}
                    onChange={(e) => setEditingItemData({ ...editingItemData, stock: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-collection">Collection</Label>
                <Select 
                  value={editingItemData.collection || 'Uncategorized'} 
                  onValueChange={(value) => setEditingItemData({ ...editingItemData, collection: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select collection..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                    {allCollections.filter(name => name !== 'Uncategorized').map((collectionName) => (
                      <SelectItem key={collectionName} value={collectionName}>
                        {collectionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => setEditingItemId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => setDeletingItemId(editingItemId)}>
                Delete
              </Button>
              <Button onClick={handleSaveItem}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {allCollections.length === 0 && items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Items Yet</CardTitle>
            <CardDescription>The pet shop is empty. Teachers can create accessories from the main Petland menu.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        allCollections.map((collectionName) => {
          const collectionItems = items.filter(item => (item.collection || 'Uncategorized') === collectionName);
          const isExpanded = expandedCollections.has(collectionName);

          return (
            <div key={collectionName} className="space-y-3">
              {/* Collection Header - Clickable */}
              <button
                onClick={() => toggleCollection(collectionName)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left font-bold",
                  collectionName === 'Magic and Spells'
                    ? 'bg-gradient-to-r from-purple-400 via-pink-300 to-purple-500 text-white border-purple-600 shadow-lg hover:shadow-xl hover:from-purple-500 hover:via-pink-400 hover:to-purple-600'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-5 w-5 flex-shrink-0" />
                )}
                <h2 className="text-xl flex-1">{collectionName}</h2>
                <Badge 
                  variant={collectionName === 'Magic and Spells' ? 'default' : 'secondary'}
                  className={cn(
                    collectionName === 'Magic and Spells' && 'bg-white text-purple-600 font-bold'
                  )}
                >
                  {collectionItems.length} items
                </Badge>
              </button>

              {/* Collection Items - Collapsible */}
              {isExpanded && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {collectionItems.map((item) => {
                    if (!item || typeof item !== 'object') return null;
                    if (!item.id) return null;

                    return (
                      <Card key={item.id} className="flex flex-col">
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{String(item.name || 'Unnamed')}</CardTitle>
                              <CardDescription className="text-xs mt-1">
                                Created {item.createdDate ? new Date(item.createdDate).toLocaleDateString() : 'Unknown'}
                              </CardDescription>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditingItemData({
                                  name: item.name,
                                  description: item.description,
                                  price: item.price,
                                  stock: item.stock,
                                  collection: item.collection || 'Uncategorized',
                                });
                              }}
                              className="flex-shrink-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-3">
                          <div className="flex-1">
                            {item.imageUrl && typeof item.imageUrl === 'string' && (
                              <img
                                src={item.imageUrl}
                                alt={String(item.name || 'Item')}
                                className="w-full h-auto max-h-80 rounded-lg border object-contain bg-white"
                              />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {typeof item.description === 'string' ? item.description : 'No description'}
                          </p>
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex gap-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Price</p>
                                <p className="font-semibold text-sm">{typeof item.price === 'number' ? item.price : 0} XP</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Stock</p>
                                <p className={`font-semibold text-sm ${typeof item.stock === 'number' && item.stock > 0 ? 'text-green-600' : 'text-destructive'}`}>
                                  {typeof item.stock === 'number' ? item.stock : 0}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
