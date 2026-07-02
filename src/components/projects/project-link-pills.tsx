import { ExternalLink, GitBranch } from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

import { GithubIcon } from "@/components/social-icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 87.3 78" className={className} aria-hidden="true">
      <path
        d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
        fill="#0066da"
      />
      <path
        d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
        fill="#00ac47"
      />
      <path
        d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
        fill="#ea4335"
      />
      <path
        d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
        fill="#00832d"
      />
      <path
        d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
        fill="#2684fc"
      />
      <path
        d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
        fill="#ffba00"
      />
    </svg>
  );
}

const DRIVE_PILL_CLASS =
  "border-blue-200 bg-blue-50 text-blue-800 [a]:hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300 dark:[a]:hover:bg-blue-950/60";
const PRODUCTION_PILL_CLASS =
  "border-emerald-200 bg-emerald-50 text-emerald-800 [a]:hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:[a]:hover:bg-emerald-950/60";

interface ExternalLinkPill {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  className?: string;
}

interface RepoPill {
  id: string;
  label: string;
}

export function ProjectLinkPills({
  productionUrl,
  driveFolderUrl,
  reportUrl,
  reportLabel,
  repositories,
  projectSlug,
}: {
  productionUrl: string | null;
  driveFolderUrl: string | null;
  reportUrl: string | null;
  reportLabel: string;
  repositories: RepoPill[];
  projectSlug: string;
}) {
  const externalLinks: ExternalLinkPill[] = [
    productionUrl === null
      ? null
      : {
          href: productionUrl,
          label: "Produkcja",
          icon: ExternalLink,
          className: PRODUCTION_PILL_CLASS,
        },
    driveFolderUrl === null
      ? null
      : {
          href: driveFolderUrl,
          label: "Dysk Google",
          icon: GoogleDriveIcon,
          className: DRIVE_PILL_CLASS,
        },
    reportUrl === null
      ? null
      : {
          href: reportUrl,
          label: reportLabel,
          icon: GoogleDriveIcon,
          className: DRIVE_PILL_CLASS,
        },
  ].filter((link) => link !== null);

  if (externalLinks.length === 0 && repositories.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {externalLinks.map((link) => (
        <Badge
          key={link.href}
          variant="outline"
          asChild
          className={cn("h-7 px-3", link.className)}
        >
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            title={link.href}
          >
            <link.icon className="size-3.5" data-icon="inline-start" />
            {link.label}
          </a>
        </Badge>
      ))}
      {repositories.map((repo) => (
        <Badge key={repo.id} variant="outline" asChild className="h-7 px-3">
          <Link
            href={`/projects/${projectSlug}/repos/${repo.id}`}
            transitionTypes={["nav-forward"]}
          >
            {repo.label.startsWith("Solvro/") ? (
              <GithubIcon className="size-3.5" data-icon="inline-start" />
            ) : (
              <GitBranch className="size-3.5" data-icon="inline-start" />
            )}
            {repo.label}
          </Link>
        </Badge>
      ))}
    </div>
  );
}
