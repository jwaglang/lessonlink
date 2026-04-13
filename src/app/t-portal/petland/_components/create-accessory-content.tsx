'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Wand2, Loader2 } from 'lucide-react';

type TabType = 'ai' | 'manual';

export default function CreateAccessoryTabContent() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('ai');
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<string[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [showNewCollectionDialog, setShowNewCollectionDialog] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionTab, setNewCollectionTab] = useState<'ai' | 'manual'>('ai');
  const [showPreview, setShowPreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [pendingAiData, setPendingAiData] = useState<typeof aiFormData | null>(null);
  const [isCleaningImage, setIsCleaningImage] = useState(false);
  
  const [aiFormData, setAiFormData] = useState({
    prompt: '',
    name: '',
    price: '',
    stock: '',
    collection: '',
  });

  const [manualFormData, setManualFormData] = useState({
    name: '',
    description: '',
    imageUrl: '',
    price: '',
    stock: '',
    collection: '',
  });

  useEffect(() => {
    async function loadCollections() {
      try {
        const response = await fetch('/api/petshop/collections');
        if (!response.ok) throw new Error('Failed to load collections');
        
        const data = await response.json();
        const uniqueCollections = [...new Set(data.collections || [])];
        setCollections(uniqueCollections);
      } catch (error) {
        console.error('Failed to load collections:', error);
      } finally {
        setLoadingCollections(false);
      }
    }
    loadCollections();
  }, []);

  const handleCreateNewCollection = async () => {
    if (!newCollectionName.trim()) {
      toast({
        title: 'Please enter a collection name',
        variant: 'destructive',
      });
      return;
    }

    if (collections.includes(newCollectionName)) {
      toast({
        title: 'Collection already exists',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/petshop/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCollectionName.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create collection');
      }

      const collectionsResponse = await fetch('/api/petshop/collections');
      if (!collectionsResponse.ok) throw new Error('Failed to reload collections');
      
      const data = await collectionsResponse.json();
      const uniqueCollections = [...new Set(data.collections || [])];
      setCollections(uniqueCollections);

      if (newCollectionTab === 'ai') {
        setAiFormData((prev) => ({
          ...prev,
          collection: newCollectionName,
        }));
      } else {
        setManualFormData((prev) => ({
          ...prev,
          collection: newCollectionName,
        }));
      }

      setNewCollectionName('');
      setShowNewCollectionDialog(false);
      toast({
        title: 'Success',
        description: `Collection "${newCollectionName}" created and selected.`,
      });
    } catch (error) {
      console.error('Failed to create collection:', error);
      toast({
        title: 'Error creating collection',
        description: error instanceof Error ? error.message : 'Failed to create collection',
        variant: 'destructive',
      });
    }
  };

  const urlToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUri = reader.result as string;
          const base64 = dataUri.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Failed to convert image to base64:', error);
      throw error;
    }
  };

  const handleRemoveText = async () => {
    if (!previewImageUrl) return;

    setIsCleaningImage(true);
    try {
      const base64 = await urlToBase64(previewImageUrl);

      const response = await fetch('/api/petshop/cleanup-accessory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove text from image');
      }

      const data = await response.json();
      setPreviewImageUrl(data.imageUrl);
      
      toast({
        title: 'Text removed',
        description: 'Image has been cleaned successfully.',
      });
    } catch (error) {
      console.error('Error removing text:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove text from image. Try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCleaningImage(false);
    }
  };

  const handleAiInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setAiFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleManualInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setManualFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!aiFormData.prompt || !aiFormData.name || !aiFormData.price || !aiFormData.collection) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in prompt, name, price, and collection.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const previewResponse = await fetch('/api/petshop/generate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiFormData.prompt,
        }),
      });

      if (!previewResponse.ok) {
        throw new Error('Failed to generate preview');
      }

      const previewData = await previewResponse.json();
      
      setPreviewImageUrl(previewData.imageUrl);
      setPendingAiData({ ...aiFormData });
      setShowPreview(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate preview. Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPreview = async () => {
    if (!pendingAiData || !previewImageUrl) return;

    setLoading(true);
    try {
      const response = await fetch('/api/petshop/create-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pendingAiData.name,
          description: '',
          imageUrl: previewImageUrl,
          price: parseInt(pendingAiData.price),
          stock: parseInt(pendingAiData.stock) || 0,
          collection: pendingAiData.collection,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save accessory');
      }

      toast({
        title: 'Success!',
        description: 'Accessory added to pet shop.',
      });

      setAiFormData({
        prompt: '',
        name: '',
        price: '',
        stock: '',
        collection: '',
      });
      setPendingAiData(null);
      setPreviewImageUrl('');
      setShowPreview(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save accessory. Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualFormData.name || !manualFormData.imageUrl || !manualFormData.price || !manualFormData.collection) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in name, image URL, price, and collection.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/petshop/create-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: manualFormData.name,
          description: manualFormData.description,
          imageUrl: manualFormData.imageUrl,
          price: parseInt(manualFormData.price),
          stock: parseInt(manualFormData.stock) || 0,
          collection: manualFormData.collection,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create accessory');
      }

      toast({
        title: 'Success!',
        description: 'Accessory added to pet shop.',
      });

      setManualFormData({
        name: '',
        description: '',
        imageUrl: '',
        price: '',
        stock: '',
        collection: '',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create accessory. Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'ai' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('ai')}
          className="rounded-none"
        >
          AI Generation
        </Button>
        <Button
          variant={activeTab === 'manual' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('manual')}
          className="rounded-none"
        >
          Manual Upload
        </Button>
      </div>

      {activeTab === 'ai' && (
        <Card>
          <CardHeader>
            <CardTitle>Generate Accessory with AI</CardTitle>
            <CardDescription>
              Describe the accessory you want, and AI will generate an image for it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAiSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Accessory Name *</label>
                <Input
                  name="name"
                  value={aiFormData.name}
                  onChange={handleAiInputChange}
                  placeholder="e.g., Crystal Orb"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Accessory Description *</label>
                <Textarea
                  name="prompt"
                  value={aiFormData.prompt}
                  onChange={handleAiInputChange}
                  placeholder="Describe the accessory you want to create (e.g., a magical crystal orb, floating on a surface, glowing blue light)"
                  className="min-h-24"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (XP) *</label>
                  <Input
                    name="price"
                    value={aiFormData.price}
                    onChange={handleAiInputChange}
                    type="number"
                    placeholder="50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock</label>
                  <Input
                    name="stock"
                    value={aiFormData.stock}
                    onChange={handleAiInputChange}
                    type="number"
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Collection *</label>
                <Select
                  value={aiFormData.collection}
                  onValueChange={(value) => {
                    if (value === '__create_new__') {
                      setNewCollectionTab('ai');
                      setShowNewCollectionDialog(true);
                    } else {
                      setAiFormData((prev) => ({
                        ...prev,
                        collection: value,
                      }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a collection..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingCollections ? (
                      <SelectItem value="__loading__" disabled>
                        Loading collections...
                      </SelectItem>
                    ) : (
                      <>
                        {collections.map((collection, index) => {
                          const collectionName = typeof collection === 'string' ? collection : collection?.name || String(collection);
                          const collectionValue = typeof collection === 'string' ? collection : collection?.name || JSON.stringify(collection);
                          return (
                            <SelectItem key={`collection-ai-${index}`} value={collectionValue}>
                              {collectionName}
                            </SelectItem>
                          );
                        })}
                        <SelectItem value="__create_new__" className="font-semibold">
                          + Create New Collection
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate & Add to Pet Shop'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === 'manual' && (
        <Card>
          <CardHeader>
            <CardTitle>Add Existing Accessory</CardTitle>
            <CardDescription>
              Link an existing image from storage to add it to your pet shop.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Accessory Name *</label>
                <Input
                  name="name"
                  value={manualFormData.name}
                  onChange={handleManualInputChange}
                  placeholder="e.g., Wizard's Hat"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  name="description"
                  value={manualFormData.description}
                  onChange={handleManualInputChange}
                  placeholder="Describe this accessory..."
                  className="min-h-24"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Image URL *</label>
                <Input
                  name="imageUrl"
                  value={manualFormData.imageUrl}
                  onChange={handleManualInputChange}
                  placeholder="https://..."
                  type="url"
                  required
                />
                {manualFormData.imageUrl && (
                  <img
                    src={manualFormData.imageUrl}
                    alt="Preview"
                    className="mt-2 h-32 rounded-lg border object-contain bg-muted"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Price (XP) *</label>
                  <Input
                    name="price"
                    value={manualFormData.price}
                    onChange={handleManualInputChange}
                    type="number"
                    placeholder="50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stock</label>
                  <Input
                    name="stock"
                    value={manualFormData.stock}
                    onChange={handleManualInputChange}
                    type="number"
                    placeholder="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Collection *</label>
                <Select
                  value={manualFormData.collection}
                  onValueChange={(value) => {
                    if (value === '__create_new__') {
                      setNewCollectionTab('manual');
                      setShowNewCollectionDialog(true);
                    } else {
                      setManualFormData((prev) => ({
                        ...prev,
                        collection: value,
                      }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a collection..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingCollections ? (
                      <SelectItem value="__loading__" disabled>
                        Loading collections...
                      </SelectItem>
                    ) : (
                      <>
                        {collections.map((collection, index) => {
                          const collectionName = typeof collection === 'string' ? collection : collection?.name || String(collection);
                          const collectionValue = typeof collection === 'string' ? collection : collection?.name || JSON.stringify(collection);
                          return (
                            <SelectItem key={`collection-manual-${index}`} value={collectionValue}>
                              {collectionName}
                            </SelectItem>
                          );
                        })}
                        <SelectItem value="__create_new__" className="font-semibold">
                          + Create New Collection
                        </SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add to Pet Shop'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Generated Image</DialogTitle>
            <DialogDescription>
              Does this image look good for "{pendingAiData?.name}"? You can regenerate or save it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {previewImageUrl && (
              <div className="flex justify-center">
                <img
                  src={previewImageUrl}
                  alt="Preview"
                  className="h-64 rounded-lg border object-contain bg-muted"
                />
              </div>
            )}
            {pendingAiData && (
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Name:</span> {pendingAiData.name}
                </div>
                <div>
                  <span className="font-semibold">Collection:</span> {pendingAiData.collection}
                </div>
                <div>
                  <span className="font-semibold">Price:</span> {pendingAiData.price} XP
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowPreview(false);
                setPendingAiData(null);
                setPreviewImageUrl('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleRemoveText}
              disabled={isCleaningImage || loading}
            >
              {isCleaningImage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing Text...
                </>
              ) : (
                'Remove Text'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowPreview(false);
                setLoading(false);
              }}
            >
              Regenerate
            </Button>
            <Button onClick={handleConfirmPreview} disabled={loading || isCleaningImage}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save to Pet Shop'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewCollectionDialog} onOpenChange={setShowNewCollectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Collection</DialogTitle>
            <DialogDescription>
              Enter a name for the new collection. It will be available in the collection list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-collection-name">Collection Name</Label>
              <Input
                id="new-collection-name"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g., Magical Creatures, Fantasy Items, etc."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateNewCollection();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewCollectionDialog(false);
                setNewCollectionName('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateNewCollection}>
              Create Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
