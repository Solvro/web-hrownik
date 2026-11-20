import { TriangleAlert } from "lucide-react";
import Link from "next/link";

import { LegacyMemberImportForm } from "@/components/members/legacy-member-import-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getCurrentMember } from "@/lib/current-member";
import { can, getMemberPermissions } from "@/lib/permissions";

export default async function LegacyImportMembersPage() {
  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);

  if (permissions === null || !can(permissions, "members", "write")) {
    return (
      <p className="text-muted-foreground">
        Tylko zarząd może importować członków.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">
        Import starego arkusza członków
      </h1>
      <Alert className="max-w-2xl">
        <TriangleAlert />
        <AlertTitle>
          Import historycznego arkusza członków — tylko do migracji danych
        </AlertTitle>
        <AlertDescription>
          Nowych członków z rekrutacji importuj z eksportu Eventownika na
          stronie{" "}
          <Link href="/members/import" className="underline">
            Import rekrutacji
          </Link>
          .
        </AlertDescription>
      </Alert>
      <p className="text-muted-foreground max-w-2xl text-sm">
        Import nie wysyła żadnych zaproszeń (GitHub, Discord) — tylko tworzy
        rekordy członków. Osoby z takim samym indeksem lub adresem e-mail jak
        już istniejący członek zostaną pominięte, więc plik można wgrać ponownie
        bez tworzenia duplikatów.
      </p>
      <LegacyMemberImportForm />
    </div>
  );
}
