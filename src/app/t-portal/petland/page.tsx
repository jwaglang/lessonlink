'use client';

import { useState } from 'react';
import { Zap, PawPrint, Eye, ShoppingBag, Wand2 } from 'lucide-react';
import PageHeader from '@/components/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Import tab components
import CreateAccessoryTabContent from '@/app/t-portal/petland/_components/create-accessory-content';
import RefineAccessoryTabContent from '@/app/t-portal/petland/_components/refine-accessory-content';
import BrowsePetStatusTabContent from '@/app/t-portal/petland/_components/browse-pet-status-content';
import PetShopTabContent from '@/app/t-portal/petland/_components/pet-shop-content';
import LiveSessionPrepContent from '@/app/t-portal/petland/_components/live-session-prep-content';

export default function PetlandPage() {
  const [activeTab, setActiveTab] = useState('live-sessions');

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="Petland Management"
        description="Manage your learners' pets, accessories, and pet shop inventory."
        icon={Zap}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="live-sessions">
            <Zap className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Live Sessions</span>
          </TabsTrigger>
          <TabsTrigger value="create">
            <Wand2 className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Create</span>
          </TabsTrigger>
          <TabsTrigger value="refine">
            <PawPrint className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Refine</span>
          </TabsTrigger>
          <TabsTrigger value="pet-status">
            <Eye className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Pet Status</span>
          </TabsTrigger>
          <TabsTrigger value="pet-shop">
            <ShoppingBag className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Pet Shop</span>
          </TabsTrigger>
        </TabsList>

        {/* Live Sessions */}
        <TabsContent value="live-sessions">
          <LiveSessionPrepContent />
        </TabsContent>

        {/* Create Accessory - inline content */}
        <TabsContent value="create">
          <CreateAccessoryTabContent />
        </TabsContent>

        {/* Refine Accessory - inline content */}
        <TabsContent value="refine">
          <RefineAccessoryTabContent />
        </TabsContent>

        {/* Browse Pet Status - inline content */}
        <TabsContent value="pet-status">
          <BrowsePetStatusTabContent />
        </TabsContent>

        {/* Pet Shop - inline content */}
        <TabsContent value="pet-shop">
          <PetShopTabContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
