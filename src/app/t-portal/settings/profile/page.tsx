'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedProfilePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/t-portal/settings');
  }, [router]);

  return (
    <div className="p-8">
      <p>Redirecting to the correct settings page...</p>
    </div>
  );
}
