import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, className, children }) => {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-start md:justify-between gap-4", className)}>
      <div>
        <h1 className="text-3xl md:text-4xl font-bold font-headline tracking-tight primary-gradient-text">
          {title}
        </h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
};

export default PageHeader;
