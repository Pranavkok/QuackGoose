import { Skeleton } from '@/components/ui/Skeleton';

export default function GardenLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-52" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <Skeleton className="h-[560px] w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
