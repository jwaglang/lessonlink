'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Loading from '@/app/loading';

export default function DeprecatedBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Preserve query parameters during redirection
    const params = new URLSearchParams(searchParams.toString());
    router.replace(`/s-portal/calendar?${params.toString()}`);
  }, [router, searchParams]);

  return <Loading />;
}
