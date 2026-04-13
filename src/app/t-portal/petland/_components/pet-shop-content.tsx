'use client';

import { useState, useEffect } from 'react';
import type { PetShopItem } from '@/modules/petland/types';
import { formatDorks } from '@/modules/petland/types';
import { getPetShopItems, updatePetShopItem, deletePetShopItem } from '@/lib/firestore';
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
import { Loader2, ChevronDown, ChevronRight, Edit2, Plus, Wand2, Rocket, Star, Flame, Wind, Droplet, Zap, Package, Sparkles, Heart, Leaf, Trees, Bug, Bird } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Collection name to icon mapping
function getCollectionIcon(iconType: string = 'default'): React.ComponentType<{ className?: string }> {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    'sparkles': Sparkles,
    'wind': Wind,
    'wand': Wand2,
    'rocket': Rocket,
    'flame': Flame,
    'droplet': Droplet,
    'zap': Zap,
    'star': Star,
    'heart': Heart,
    'leaf': Leaf,
    'tree': Trees,
    'bug': Bug,
    'bird': Bird,
    'default': Package,
  };

  return iconMap[iconType.toLowerCase()] || Package;
}

export default function PetShopTabContent() {
  const { toast } = useToast();
  const [items, setItems] = useState<PetShopItem[]>([]);
  const [allCollections, setAllCollections] = useState<Array<{ name: string; iconType: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionIconType, setNewCollectionIconType] = useState<string>('default');
  const [showNewCollectionDialog, setShowNewCollectionDialog] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemData, setEditingItemData] = useState<Partial<PetShopItem>>({});
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [editingCollectionName, setEditingCollectionName] = useState<string | null>(null);
  const [editingCollectionData, setEditingCollectionData] = useState<{ name: string; iconType: string }>({ name: '', iconType: 'default' });
  const [deletingCollectionName, setDeletingCollectionName] = useState<string | null>(null);

  // Generate fresh signed URLs for items that have storage paths
  async function generateFreshUrls(itemsData: PetShopItem[]): Promise<PetShopItem[]> {
    return Promise.all(
      itemsData.map(async (item) => {
        // Check if item has storagePath (new format) 
        let storagePath = (item as any).storagePath || (item as any).storePath;
        
        // If no storagePath but has old imageUrl, try to extract path from it
        if (!storagePath && item.imageUrl && typeof item.imageUrl === 'string') {
          try {
            // Try to extract storage path from any Firebase URL
            // Handles both old format: /o/path%2Fto%2Ffile and new format: .firebasestorage.app/path/to/file
            const urlObj = new URL(item.imageUrl);
            const pathname = urlObj.pathname;
            
            // If URL contains /o/ (old firebase format)
            if (pathname.includes('/o/')) {
              const match = pathname.match(/\/o\/(.+?)(?:\/|$)/);
              if (match) {
                storagePath = decodeURIComponent(match[1]);
              }
            } 
            // If URL contains .firebasestorage.app (new format), extract everything after domain
            else if (item.imageUrl.includes('.firebasestorage.app/')) {
              const match = item.imageUrl.match(/\.firebasestorage\.app\/(.+?)(?:\?|$)/);
              if (match) {
                storagePath = match[1];
              }
            }
            // Also try storage.googleapis.com format
            else if (item.imageUrl.includes('storage.googleapis.com')) {
              const match = item.imageUrl.match(/storage\.googleapis\.com\/[^\/]+\/(.+?)(?:\?|$)/);
              if (match) {
                storagePath = match[1];
              }
            }
          } catch (error) {
            // Silently fail - will use original URL
          }
        }
        
        // If we have a storagePath, generate a fresh URL
        if (storagePath && typeof storagePath === 'string') {
          try {
            const response = await fetch('/api/petshop/generate-item-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ storagePath }),
            });

            if (response.ok) {
              const data = await response.json();
              return {
                ...item,
                imageUrl: data.imageUrl,
              };
            }
          } catch (error) {
            // Silently fail - will use original URL
          }
        }
        
        // Return item as-is if no storagePath or generation failed
        return item;
      })
    );
  }

  useEffect(() => {
    async function loadData() {
      try {
        setError(null);
        const [itemsData, collectionsResponse] = await Promise.all([
          getPetShopItems(),
          fetch('/api/petshop/collections'),
        ]);
        
        // Generate fresh URLs for all items
        const itemsWithFreshUrls = await generateFreshUrls(itemsData || []);
        setItems(itemsWithFreshUrls || []);
        
        if (collectionsResponse.ok) {
          const collectionsData = await collectionsResponse.json();
          setAllCollections(collectionsData.collections || []);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to load pet shop data';
        console.error('Failed to load pet shop data:', error);
        setError(errorMsg);
        setItems([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
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
    
    try {
      const response = await fetch('/api/petshop/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollectionName, iconType: newCollectionIconType }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create collection');
      }

      // Add to expanded collections
      setExpandedCollections(new Set([...expandedCollections, newCollectionName]));
      
      // Reload collections to show new one
      const collectionsResponse = await fetch('/api/petshop/collections');
      if (collectionsResponse.ok) {
        const collectionsData = await collectionsResponse.json();
        setAllCollections(collectionsData.collections || []);
      }
      
      setNewCollectionName('');
      setNewCollectionIconType('default');
      setShowNewCollectionDialog(false);
      
      toast({ title: 'Collection created!', description: `"${newCollectionName}" is now available.` });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error instanceof Error ? error.message : 'Failed to create collection',
        variant: 'destructive' 
      });
    }
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

  const handleEditCollection = async () => {
    if (!editingCollectionName) return;

    if (!editingCollectionData.name.trim()) {
      toast({ title: 'Please enter a collection name', variant: 'destructive' });
      return;
    }

    try {
      const response = await fetch('/api/petshop/collections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldName: editingCollectionName,
          newName: editingCollectionData.name,
          iconType: editingCollectionData.iconType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update collection');
      }

      // Update local state
      const updatedCollections = allCollections.map(col =>
        col.name === editingCollectionName
          ? { name: editingCollectionData.name, iconType: editingCollectionData.iconType }
          : col
      );
      setAllCollections(updatedCollections);

      // Update items that belong to this collection
      const updatedItems = items.map(item =>
        item.collection === editingCollectionName
          ? { ...item, collection: editingCollectionData.name }
          : item
      );
      setItems(updatedItems);

      toast({
        title: 'Collection updated',
        description: `"${editingCollectionName}" has been updated.`,
      });

      setEditingCollectionName(null);
      setEditingCollectionData({ name: '', iconType: 'default' });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to update collection';
      console.error('Failed to update collection:', error);
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
    }
  };

  const handleDeleteCollection = async () => {
    if (!deletingCollectionName) return;

    try {
      const response = await fetch('/api/petshop/collections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: deletingCollectionName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete collection');
      }

      // Update local state: remove collection and move its items to Uncategorized
      const updatedCollections = allCollections.filter(col => col.name !== deletingCollectionName);
      setAllCollections(updatedCollections);

      const updatedItems = items.map(item =>
        item.collection === deletingCollectionName
          ? { ...item, collection: 'Uncategorized' }
          : item
      );
      setItems(updatedItems);

      toast({
        title: 'Collection deleted',
        description: `"${deletingCollectionName}" has been removed. Its items moved to Uncategorized.`,
      });

      setDeletingCollectionName(null);
      setEditingCollectionName(null);
      setEditingCollectionData({ name: '', iconType: 'default' });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete collection';
      console.error('Failed to delete collection:', error);
      toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">
            {allCollections.length} collections • {items.length} items
          </h3>
        </div>
        <Button onClick={() => setShowNewCollectionDialog(true)} size="sm" className="gap-2">
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
            <div>
              <Label htmlFor="collection-icon">Collection Icon Theme</Label>
              <Select value={newCollectionIconType} onValueChange={setNewCollectionIconType}>
                <SelectTrigger id="collection-icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sparkles">âœ¨ Sparkles - Stars, magic, shine</SelectItem>
                  <SelectItem value="wind">ðŸŒ¬ï¸ Wind - Air, steam, movement</SelectItem>
                  <SelectItem value="wand">âœ¨ Wand - Magic, spells, wizard</SelectItem>
                  <SelectItem value="rocket">ðŸš€ Rocket - Space, speed, adventure</SelectItem>
                  <SelectItem value="flame">ðŸ”¥ Flame - Fire, heat, energy</SelectItem>
                  <SelectItem value="droplet">ðŸ’§ Droplet - Water, liquid, cool</SelectItem>
                  <SelectItem value="zap">âš¡ Zap - Electric, energy, power</SelectItem>
                  <SelectItem value="star">â­ Star - Excellence, merit</SelectItem>
                  <SelectItem value="heart">â¤ï¸ Heart - Love, care, emotion</SelectItem>
                  <SelectItem value="leaf">ðŸƒ Leaf - Nature, jungle, plants</SelectItem>
                  <SelectItem value="tree">ðŸŒ² Tree - Forest, nature, wildlife</SelectItem>
                  <SelectItem value="bug">ðŸ› Bug - Insects, jungle creatures</SelectItem>
                  <SelectItem value="bird">ðŸ¦ Bird - Flying, sky, freedom</SelectItem>
                  <SelectItem value="default">ðŸ“¦ Default - Generic, placeholder</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Delete Collection Confirmation Dialog */}
      <Dialog open={!!deletingCollectionName} onOpenChange={(open) => !open && setDeletingCollectionName(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Collection?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The collection will be permanently removed. All items in this collection will be moved to "Uncategorized".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingCollectionName(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCollection}>
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
                  <Label htmlFor="edit-price">Price (Dorks - Copper)</Label>
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
                    {allCollections.filter(col => col.name !== 'Uncategorized').map(({ name: collectionName }) => (
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

      {/* Edit Collection Dialog */}
      <Dialog open={!!editingCollectionName} onOpenChange={(open) => !open && setEditingCollectionName(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
            <DialogDescription>Update the collection name and icon theme.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-col-name">Collection Name</Label>
              <Input
                id="edit-col-name"
                value={editingCollectionData.name}
                onChange={(e) => setEditingCollectionData({ ...editingCollectionData, name: e.target.value })}
                placeholder="Collection name"
              />
            </div>
            <div>
              <Label htmlFor="edit-col-icon">Collection Icon Theme</Label>
              <Select value={editingCollectionData.iconType} onValueChange={(value) => setEditingCollectionData({ ...editingCollectionData, iconType: value })}>
                <SelectTrigger id="edit-col-icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sparkles">âœ¨ Sparkles</SelectItem>
                  <SelectItem value="wind">ðŸ’¨ Wind</SelectItem>
                  <SelectItem value="wand">âœ¨ Wand</SelectItem>
                  <SelectItem value="rocket">ðŸš€ Rocket</SelectItem>
                  <SelectItem value="flame">ðŸ”¥ Flame</SelectItem>
                  <SelectItem value="droplet">ðŸ’§ Droplet</SelectItem>
                  <SelectItem value="zap">âš¡ Zap</SelectItem>
                  <SelectItem value="star">â­ Star</SelectItem>
                  <SelectItem value="heart">â¤ï¸ Heart</SelectItem>
                  <SelectItem value="leaf">ðŸƒ Leaf</SelectItem>
                  <SelectItem value="tree">ðŸŒ² Tree</SelectItem>
                  <SelectItem value="bug">ðŸ› Bug</SelectItem>
                  <SelectItem value="bird">ðŸ¦ Bird</SelectItem>
                  <SelectItem value="default">ðŸ“¦ Default</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setEditingCollectionName(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => setDeletingCollectionName(editingCollectionName)}>
              Delete
            </Button>
            <Button onClick={handleEditCollection}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {allCollections.length === 0 && items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Items Yet</CardTitle>
            <CardDescription>The pet shop is empty. Teachers can create accessories from the main Petland menu.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        allCollections.map(({ name: collectionName, iconType }) => {
          const collectionItems = items.filter(item => (item.collection || 'Uncategorized').trim() === collectionName.trim());
          const isExpanded = expandedCollections.has(collectionName);

          return (
            <div key={collectionName} className="space-y-3">
              {/* Collection Header - Clickable with Edit Button */}
              <div
                className={cn(
                  "w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left font-bold",
                  collectionName !== 'Uncategorized'
                    ? 'bg-gradient-to-r from-purple-400 via-pink-300 to-purple-500 text-white border-purple-600 shadow-lg hover:shadow-xl hover:from-purple-500 hover:via-pink-400 hover:to-purple-600'
                    : 'border-border hover:bg-muted/50'
                )}
              >
                <button
                  onClick={() => toggleCollection(collectionName)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-5 w-5 flex-shrink-0" />
                  )}
                  {(() => {
                    const IconComponent = getCollectionIcon(iconType || 'default');
                    return <IconComponent className="h-5 w-5 flex-shrink-0" />;
                  })()}
                  <h2 className="text-xl flex-1">{collectionName}</h2>
                </button>
                <Badge 
                  variant={collectionName !== 'Uncategorized' ? 'default' : 'secondary'}
                  className={cn(
                    collectionName !== 'Uncategorized' && 'bg-white text-purple-600 font-bold'
                  )}
                >
                  {collectionItems.length} items
                </Badge>
                {collectionName !== 'Uncategorized' && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingCollectionName(collectionName);
                      setEditingCollectionData({ name: collectionName, iconType: iconType || 'default' });
                    }}
                    className="text-white hover:bg-white/20"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

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
                            {item.imageUrl && typeof item.imageUrl === 'string' ? (
                              <img
                                src={item.imageUrl}
                                alt={String(item.name || 'Item')}
                                className="w-full h-auto max-h-80 rounded-lg border object-contain bg-white"
                                onError={(e) => {
                                  console.warn(`[PetShop] Image failed to load for "${item.name}". URL starts with:`, item.imageUrl?.substring(0, 100));
                                  (e.target as HTMLImageElement).src = '';
                                }}
                              />
                            ) : (
                              <div className="w-full h-40 rounded-lg border bg-gray-100 flex items-center justify-center text-gray-400">
                                <span>No image</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {typeof item.description === 'string' ? item.description : 'No description'}
                          </p>
                          <div className="flex items-center justify-between pt-2">
                            <div className="flex gap-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Price</p>
                                <p className="font-semibold text-sm">{formatDorks(typeof item.price === 'number' ? item.price : 0)}</p>
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

