import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getCurrentMember, getSessionUser } from "@/lib/current-member";

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
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <p className="text-muted-foreground max-w-md text-sm">
          Twoje konto nie jest jeszcze powiązane z żadnym profilem członka w
          HRowniku. Skontaktuj się z zarządem, aby dokończyć onboarding.
        </p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar memberName={member.fullName} />
      <SidebarInset>
        <header className="flex h-12 items-center border-b px-4">
          <SidebarTrigger />
        </header>
        <div className="flex-1 p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
