import Link from "next/link";

import { appNavItems } from "@/components/app-nav-items";
import { Button } from "@/components/ui/button";
import { getCurrentMember } from "@/lib/current-member";

export default async function DashboardPage() {
  const member = await getCurrentMember();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold break-words">
          Cześć, {member?.fullName ?? "nieznajomy"}!
        </h1>
        <p className="text-muted-foreground">
          Zarządzaj członkami, sekcjami i projektami KN Solvro.
        </p>
      </div>
      <div className="flex flex-col gap-3 min-[360px]:flex-row min-[360px]:flex-wrap">
        {appNavItems.map((item, index) => (
          <Button
            key={item.href}
            asChild
            variant={index === 0 ? "default" : "outline"}
            className="w-full min-[360px]:w-auto"
          >
            <Link href={item.href}>
              <item.icon data-icon="inline-start" />
              {item.label}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
