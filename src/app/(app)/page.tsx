import Link from "next/link";

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
        <Button asChild>
          <Link href="/members">Członkowie</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/sections">Sekcje</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/projects">Projekty</Link>
        </Button>
      </div>
    </div>
  );
}
