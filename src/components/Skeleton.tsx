// Bloques de carga (esqueleto) con animación suave. Dan feedback inmediato
// la primera vez que se abre una pantalla, antes de que llegue la data.

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-700/50 ${className}`}
    />
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`card ${className}`}>
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="mt-3 h-3 w-full" />
    <Skeleton className="mt-2 h-3 w-5/6" />
  </div>;
}
