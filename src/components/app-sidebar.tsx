"use client";

import { ChevronsUpDown, LogOut, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import logoSolvro from "@/assets/logo_solvro.svg";
import { appNavItems } from "@/components/app-nav-items";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { grantKey } from "@/lib/permissions/catalog";

import { ModeToggle } from "./mode-toggle";

const logoSolvroSource = logoSolvro as unknown as string;

function getInitials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AppSidebar({
  memberId,
  memberName,
  memberPhotoUrl,
  memberEmail,
  grantKeys,
}: {
  memberId: string;
  memberName: string;
  memberPhotoUrl: string | null;
  memberEmail: string;
  grantKeys: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();

  const grants = new Set(grantKeys);
  const generalNavItems = appNavItems.filter(
    (item) => item.requiredGrant === undefined,
  );
  const adminNavItems = appNavItems.filter(
    (item) =>
      item.requiredGrant !== undefined &&
      grants.has(
        grantKey(item.requiredGrant.resource, item.requiredGrant.action),
      ),
  );

  function closeMobileSidebar() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }
  const initials = getInitials(memberName);

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="HRownik">
              <Link href="/" onClick={closeMobileSidebar}>
                <span className="flex size-6 shrink-0 items-center justify-center">
                  <Image
                    src={logoSolvroSource}
                    alt=""
                    className="size-5 dark:brightness-0 dark:invert"
                    aria-hidden="true"
                  />
                </span>
                <span className="text-lg font-semibold">HRownik</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Ogólne</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {generalNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href} onClick={closeMobileSidebar}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {adminNavItems.length === 0 ? null : (
          <SidebarGroup>
            <SidebarGroupLabel>Administracja</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.startsWith(item.href)}
                      tooltip={item.label}
                    >
                      <Link href={item.href} onClick={closeMobileSidebar}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ModeToggle sidebar />
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator className="my-1" />
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip={memberName}>
                  <Avatar className="size-8 rounded-lg">
                    {memberPhotoUrl === null ? null : (
                      <AvatarImage src={memberPhotoUrl} alt={memberName} />
                    )}
                    <AvatarFallback className="rounded-lg">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{memberName}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {memberEmail}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isMobile ? "top" : "right"}
                align="end"
                sideOffset={4}
                className="w-(--radix-dropdown-menu-trigger-width) max-w-[calc(100vw-1rem)] min-w-56 rounded-md"
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-lg">
                      {memberPhotoUrl === null ? null : (
                        <AvatarImage src={memberPhotoUrl} alt={memberName} />
                      )}
                      <AvatarFallback className="rounded-lg">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{memberName}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {memberEmail}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link
                    href={`/members/${memberId}`}
                    onClick={closeMobileSidebar}
                  >
                    <User />
                    Dane członka
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    void authClient.signOut().then(() => {
                      closeMobileSidebar();
                      router.push("/login");
                    });
                  }}
                >
                  <LogOut />
                  Wyloguj
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
