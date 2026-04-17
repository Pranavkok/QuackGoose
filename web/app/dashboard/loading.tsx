import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 w-full" />
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
