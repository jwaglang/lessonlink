'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Loading from '@/app/loading';

export default function DeprecatedTutorsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/s-portal/t-profiles');
  }, [router]);

  return <Loading />;
}
