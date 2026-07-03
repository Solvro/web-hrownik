import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "via-accent/60 animate-pulse rounded-md bg-linear-to-r from-transparent to-transparent bg-[length:200%_100%]",
        className,
      )}
    />
  );
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border p-4">
      <div className="flex items-center gap-2">
        <Shimmer className="size-4 rounded-full" />
        <Shimmer className="h-4 w-44" />
      </div>
      <Shimmer className="h-9 w-16" />
      <Shimmer className="h-4 w-36" />
    </div>
  );
}

export function HubCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}

function ContributorRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-2 p-2">
      <div className="flex items-center gap-2">
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-5 w-24 rounded-full" />
      </div>
      <Shimmer className="h-7 w-32 rounded-md" />
    </div>
  );
}

export function ContributorsListSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(14rem,1fr)_auto]">
        <Shimmer className="h-10 flex-1" />
        <Shimmer className="h-10 w-36" />
      </div>
      <div className="flex-1">
        <div className="divide-y rounded-md border text-sm">
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
          <ContributorRowSkeleton />
        </div>
      </div>
    </div>
  );
}

function UnlinkedRepoRowSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center sm:justify-between">
      <Shimmer className="h-4 w-56" />
      <div className="flex items-center gap-2">
        <Shimmer className="h-8 w-44 rounded-md" />
        <Shimmer className="h-8 w-44 rounded-md" />
        <Shimmer className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}

export function UnlinkedReposListSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(14rem,1fr)_auto]">
        <Shimmer className="h-10 flex-1" />
        <Shimmer className="h-10 w-36" />
      </div>
      <div className="flex-1">
        <div className="divide-y rounded-md border text-sm">
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
          <UnlinkedRepoRowSkeleton />
        </div>
      </div>
    </div>
  );
}

function ProjectRepoRowSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Shimmer className="h-4 w-28" />
        <Shimmer className="h-4 w-4" />
        <Shimmer className="h-4 w-48" />
      </div>
      <div className="flex items-center gap-2">
        <Shimmer className="h-8 w-44 rounded-md" />
        <Shimmer className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}

export function ProjectReposListSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(14rem,1fr)_auto]">
        <Shimmer className="h-10 flex-1" />
        <Shimmer className="h-10 w-36" />
        <Shimmer className="h-10 w-36" />
      </div>
      <div className="flex-1">
        <div className="divide-y rounded-md border text-sm">
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
          <ProjectRepoRowSkeleton />
        </div>
      </div>
    </div>
  );
}
