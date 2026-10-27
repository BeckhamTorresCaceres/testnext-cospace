import { SpaceCardSkeleton } from '@/components/shared/Loader';

export default function SpacesLoading() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-36 animate-fade-in">
      <div className="space-y-3">
        <div className="h-4 w-36 rounded-md animate-shimmer" />
        <div className="h-10 w-80 max-w-full rounded-xl animate-shimmer" />
        <div className="h-5 w-96 max-w-full rounded-lg animate-shimmer" />
      </div>

      <div className="mt-8 h-16 w-full rounded-3xl animate-shimmer" />

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <SpaceCardSkeleton key={n} />
        ))}
      </div>
    </section>
  );
}

