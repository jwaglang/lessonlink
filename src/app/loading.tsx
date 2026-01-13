import { Loader } from 'lucide-react';

export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex items-center gap-2">
        <Loader className="h-8 w-8 animate-spin primary-gradient-text" />
        <span className="text-lg font-semibold text-muted-foreground">Loading...</span>
      </div>
    </div>
  );
}