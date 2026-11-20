import { asc } from "drizzle-orm";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";

import { RecruitmentImportWizard } from "@/components/members/import/recruitment-import-wizard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { db } from "@/db";
import { section } from "@/db/schema/sections";
import { getCurrentMember } from "@/lib/current-member";
import { getUniversityInfoOptionsOrEmpty } from "@/lib/integrations/topwr";
import { can, getMemberPermissions } from "@/lib/permissions";

export default async function ImportMembersPage() {
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

  const [sections, universityInfo] = await Promise.all([
    db.query.section.findMany({ orderBy: asc(section.name) }),
    getUniversityInfoOptionsOrEmpty(),
  ]);
  // Today in Poland as YYYY-MM-DD (the en-CA locale formats dates that way).
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Warsaw",
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">
          Import przyjętych z rekrutacji
        </h1>
        <p className="text-muted-foreground max-w-3xl text-sm">
          Wgraj eksport uczestników wydarzenia rekrutacyjnego z Eventownika.
          Przyjęte osoby (z wybraną sekcją ostateczną) zostaną dodane jako nowi
          członkowie z rolą członka swoich sekcji. Import nie wysyła zaproszeń
          (GitHub, Discord) i nie tworzy nowych sekcji.
        </p>
        <Link
          href="/members/import/legacy"
          className="text-muted-foreground text-sm underline underline-offset-4"
        >
          Import starego arkusza (legacy)
        </Link>
      </div>
      {universityInfo.departments.length === 0 ? (
        <Alert className="max-w-3xl">
          <TriangleAlert />
          <AlertTitle>Brak danych o wydziałach i kierunkach z ToPWR</AlertTitle>
          <AlertDescription>
            ToPWR jest teraz niedostępne. Import zadziała, ale bez wydziału i
            kierunku — uzupełnisz je później na profilach albo spróbuj za
            chwilę.
          </AlertDescription>
        </Alert>
      ) : null}
      <RecruitmentImportWizard
        sections={sections.map(({ id, name }) => ({ id, name }))}
        universityInfo={universityInfo}
        defaultJoinedAt={today}
      />
    </div>
  );
}
