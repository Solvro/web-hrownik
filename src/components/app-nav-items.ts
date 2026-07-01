import {
  FolderKanban,
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
];
