'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PawPrint, Wand2, Eye, ShoppingBag } from 'lucide-react';
import PageHeader from '@/components/page-header';

export default function PetlandPage() {
  const router = useRouter();

  const options = [
    {
      title: 'Create Accessory for Pet Shop',
      description: 'Generate new pet accessories using AI and add them to your pet shop inventory.',
      icon: Wand2,
      href: '/t-portal/petland/create-accessory',
      color: 'bg-blue-100 text-blue-700',
    },
    {
      title: 'Refine Accessory Composite',
      description: 'Fix AI-generated pet composites by providing instructions for refinement.',
      icon: PawPrint,
      href: '/t-portal/petland/refine-composite',
      color: 'bg-purple-100 text-purple-700',
    },
    {
      title: 'Browse Pet Status',
      description: 'Select a learner to view and monitor their pet status and vitals.',
      icon: Eye,
      href: '/t-portal/petland/browse-pet-status',
      color: 'bg-green-100 text-green-700',
    },
    {
      title: 'Browse Pet Shop',
      description: 'View all available pet accessories organized by collection.',
      icon: ShoppingBag,
      href: '/t-portal/petland/pet-shop',
      color: 'bg-amber-100 text-amber-700',
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="Petland Management"
        description="Manage your learners' pets, accessories, and pet shop inventory."
        icon={PawPrint}
      />

      <div className="grid md:grid-cols-2 gap-6">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <Card key={option.href} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{option.title}</CardTitle>
                    <CardDescription className="mt-2">{option.description}</CardDescription>
                  </div>
                  <div className={`p-3 rounded-lg ${option.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push(option.href)} className="w-full">
                  Open
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
