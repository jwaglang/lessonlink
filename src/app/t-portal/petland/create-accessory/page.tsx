'use client';

import { useState } from 'react';
import PageHeader from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Wand2, Loader2 } from 'lucide-react';

type TabType = 'ai' | 'manual';

export default function CreateAccessoryPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('ai');
  const [loading, setLoading] = useState(false);
  
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
      const response = await fetch('/api/petshop/generate-accessory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiFormData.prompt,
          name: aiFormData.name,
          price: parseInt(aiFormData.price),
          stock: parseInt(aiFormData.stock) || 0,
          collection: aiFormData.collection,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate accessory');
      }

      toast({
        title: 'Success!',
        description: 'Accessory generated and added to pet shop.',
      });

      setAiFormData({
        prompt: '',
        name: '',
        price: '',
        stock: '',
        collection: '',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate accessory. Try again.',
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
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="Create Accessory for Pet Shop"
        description="Generate new pet accessories using AI or add existing ones manually."
        icon={Wand2}
      />

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
                <Input
                  name="collection"
                  value={aiFormData.collection}
                  onChange={handleAiInputChange}
                  placeholder="e.g., Magic and Spells"
                  required
                />
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
                <Input
                  name="collection"
                  value={manualFormData.collection}
                  onChange={handleManualInputChange}
                  placeholder="e.g., Magic and Spells"
                  required
                />
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
    </div>
  );
}
