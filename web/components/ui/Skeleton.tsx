type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`qf-skeleton ${className}`.trim()} aria-hidden="true" />;
}
