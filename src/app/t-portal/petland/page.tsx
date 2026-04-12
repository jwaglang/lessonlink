'use client';

import { useRouter } from 'next/navigation';
import { PawPrint, Wand2, Eye, ShoppingBag } from 'lucide-react';
import PageHeader from '@/components/page-header';

export default function PetlandPage() {
  const router = useRouter();

  const options = [
    {
      title: 'Create Accessories',
      description: 'Generate new pet accessories using AI and add them to your pet shop inventory.',
      icon: Wand2,
      href: '/t-portal/petland/create-accessory',
    },
    {
      title: 'Refine Accessories',
      description: 'Fix AI-generated pet composites by providing instructions for refinement.',
      icon: PawPrint,
      href: '/t-portal/petland/refine-composite',
    },
    {
      title: 'Browse Pet Status',
      description: 'Select a learner to view and monitor their pet status and vitals.',
      icon: Eye,
      href: '/t-portal/petland/browse-pet-status',
    },
    {
      title: 'Browse Pet Shop',
      description: 'View all available pet accessories organized by collection.',
      icon: ShoppingBag,
      href: '/t-portal/petland/pet-shop',
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <PageHeader
        title="Petland Management"
        description="Manage your learners' pets, accessories, and pet shop inventory."
        icon={PawPrint}
      />

      {/* Options as clean rows */}
      <div className="space-y-2">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <div
              key={option.href}
              onClick={() => router.push(option.href)}
              className="flex items-center justify-between gap-4 p-4 bg-card border hover:border-purple-500 hover:shadow-md transition-all cursor-pointer rounded-lg"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex-shrink-0 p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{option.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{option.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
