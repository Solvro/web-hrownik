import Link from "next/link";
import type { ComponentType } from "react";

import {
  DiscordIcon,
  FacebookIcon,
  GithubIcon,
  InstagramIcon,
  LinkedinIcon,
} from "@/components/social-icons";
import { Badge } from "@/components/ui/badge";

interface ContactPill {
  key: string;
  href: string | null;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

export function MemberContactPills({
  githubUsername,
  discordId,
  facebookUrl,
  linkedinUrl,
  instagramUrl,
}: {
  githubUsername: string | null;
  discordId: string | null;
  facebookUrl: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
}) {
  const pills: ContactPill[] = [
    githubUsername === null
      ? null
      : {
          key: "github",
          href: `https://github.com/${githubUsername}`,
          label: githubUsername,
          icon: GithubIcon,
        },
    discordId === null
      ? null
      : { key: "discord", href: null, label: discordId, icon: DiscordIcon },
    facebookUrl === null
      ? null
      : {
          key: "facebook",
          href: facebookUrl,
          label: "Facebook",
          icon: FacebookIcon,
        },
    linkedinUrl === null
      ? null
      : {
          key: "linkedin",
          href: linkedinUrl,
          label: "LinkedIn",
          icon: LinkedinIcon,
        },
    instagramUrl === null
      ? null
      : {
          key: "instagram",
          href: instagramUrl,
          label: "Instagram",
          icon: InstagramIcon,
        },
  ].filter((pill) => pill !== null);

  if (pills.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {pills.map((pill) =>
        pill.href === null ? (
          <Badge key={pill.key} variant="outline" className="h-7 px-3">
            <pill.icon className="size-3.5" data-icon="inline-start" />
            {pill.label}
          </Badge>
        ) : (
          <Badge key={pill.key} variant="outline" asChild className="h-7 px-3">
            <Link
              href={pill.href}
              target="_blank"
              rel="noreferrer"
              title={pill.href}
            >
              <pill.icon className="size-3.5" data-icon="inline-start" />
              {pill.label}
            </Link>
          </Badge>
        ),
      )}
    </div>
  );
}
