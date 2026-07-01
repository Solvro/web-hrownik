import { FolderKanban, Settings, Shapes, Users } from "lucide-react";

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
    label: "Ustawienia",
    icon: Settings,
    requiredGrant: { resource: "roles", action: "write" },
  },
];
