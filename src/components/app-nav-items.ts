import {
  Building2,
  FolderKanban,
  GitBranch,
  KeyRound,
  Shapes,
  ShieldCheck,
  Users,
} from "lucide-react";

import type { PermissionResourceKey } from "@/lib/permissions/catalog";

export const appNavItems: {
  href: string;
  label: string;
  icon: typeof Users;
  requiredGrant?: { resource: PermissionResourceKey; action: string };
}[] = [
  { href: "/members", label: "Członkowie", icon: Users },
  {
    href: "/boards",
    label: "Zarządy",
    icon: Building2,
    requiredGrant: { resource: "boards", action: "read" },
  },
  { href: "/sections", label: "Sekcje", icon: Shapes },
  { href: "/projects", label: "Projekty", icon: FolderKanban },
  {
    href: "/settings/roles",
    label: "Role i uprawnienia",
    icon: ShieldCheck,
    requiredGrant: { resource: "roles", action: "write" },
  },
  {
    href: "/settings/api-keys",
    label: "Klucze API",
    icon: KeyRound,
    requiredGrant: { resource: "roles", action: "write" },
  },
  {
    href: "/settings/github",
    label: "GitHub",
    icon: GitBranch,
    requiredGrant: { resource: "projects", action: "write" },
  },
];
