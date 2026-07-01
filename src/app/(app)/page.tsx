import Link from "next/link";

import { appNavItems } from "@/components/app-nav-items";
import { Button } from "@/components/ui/button";
import { getCurrentMember } from "@/lib/current-member";

export default async function DashboardPage() {
  const member = await getCurrentMember();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Cześć, {member?.fullName ?? "nieznajomy"}!
        </h1>
        <p className="text-muted-foreground">
          Zarządzaj członkami, sekcjami i projektami KN Solvro.
        </p>
      </div>
      <div className="flex gap-3">
        {appNavItems.map((item, index) => (
          <Button
            key={item.href}
            asChild
            variant={index === 0 ? "default" : "outline"}
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
