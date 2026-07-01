import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { signOutAction } from "@/actions/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  getCurrentMember,
  getSessionAuthIdentity,
  getSessionUser,
} from "@/lib/current-member";
import { can, getMemberPermissions } from "@/lib/permissions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (user === null) {
    redirect("/login");
  }

  const member = await getCurrentMember();
  if (member === null) {
    const identity = await getSessionAuthIdentity();

    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="border-border bg-card text-card-foreground w-full max-w-md rounded-xl border p-6 shadow-sm">
          <div className="space-y-2">
            <p className="text-destructive text-center text-sm font-medium">
              Nie znaleźliśmy profilu członka dla tego konta.
            </p>
            <h1 className="text-center text-xl font-semibold">
              Brak dostępu do HRownika
            </h1>
            <p className="text-muted-foreground text-center text-sm">
              Zalogowano Cię przez {identity?.providerName ?? "platformę auth"},
              ale dane tego konta nie są powiązane z żadnym profilem członka.
              Skontaktuj się z zarządem, aby dokończyć onboarding.
            </p>
          </div>

          {identity === null ? null : (
            <div className="bg-muted/50 mt-6 space-y-3 rounded-lg p-4 text-sm">
              <div>
                <p className="text-muted-foreground">Platforma logowania</p>
                <p className="font-medium">{identity.providerName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">E-mail konta</p>
                <p className="font-mono text-sm break-all">{identity.email}</p>
              </div>
              {identity.studentNumber === null ? null : (
                <div>
                  <p className="text-muted-foreground">Numer indeksu z USOS</p>
                  <p className="font-mono text-sm">{identity.studentNumber}</p>
                </div>
              )}
              {identity.usosId === null ? null : (
                <div>
                  <p className="text-muted-foreground">Identyfikator USOS</p>
                  <p className="font-mono text-sm break-all">
                    {identity.usosId}
                  </p>
                </div>
              )}
            </div>
          )}

          <form action={signOutAction} className="mt-6">
            <Button type="submit" variant="outline" className="w-full">
              Wróć do logowania
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const cookieStore = await cookies();
  const sidebarDefaultOpen =
    cookieStore.get("sidebar_state")?.value !== "false";
  const permissions = await getMemberPermissions(member.id);
  const canManageRoles = can(permissions, "roles", "write");

  return (
    <SidebarProvider defaultOpen={sidebarDefaultOpen}>
      <AppSidebar
        memberId={member.id}
        memberName={member.fullName}
        memberPhotoUrl={member.photoUrl}
        memberEmail={user.email}
        canManageRoles={canManageRoles}
      />
      <SidebarInset>
        <header className="flex h-12 items-center border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="min-w-0 flex-1 p-4 sm:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
