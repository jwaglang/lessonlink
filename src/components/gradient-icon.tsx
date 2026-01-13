'use client';

import type { LucideProps } from 'lucide-react';
import React from 'react';

interface GradientIconProps extends LucideProps {
  icon: React.ElementType;
  id: string;
}

export const GradientIcon: React.FC<GradientIconProps> = ({ icon: Icon, id, ...props }) => {
  const gradientId = `gradient-icon-${id}`;

  return (
    <>
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#3F51B5' }} />
            <stop offset="100%" style={{ stopColor: '#9C27B0' }} />
          </linearGradient>
        </defs>
      </svg>
      <Icon {...props} stroke={`url(#${gradientId})`} />
    </>
  );
};
