import { Skeleton } from '@/components/ui/Skeleton';

export default function SettingsLoading() {
  return (
    <div className="max-w-3xl space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-44 w-full" />
      <Skeleton className="h-52 w-full" />
    </div>
  );
}
