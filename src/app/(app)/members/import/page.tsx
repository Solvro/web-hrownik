import { MemberImportForm } from "@/components/members/member-import-form";
import { getCurrentMember } from "@/lib/current-member";
import { canManageMembers, getMemberPermissions } from "@/lib/permissions";

export default async function ImportMembersPage() {
  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);

  if (permissions === null || !canManageMembers(permissions)) {
    return (
      <p className="text-muted-foreground">
        Tylko zarząd może importować członków.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Importuj członków z pliku</h1>
      <p className="text-muted-foreground max-w-2xl text-sm">
        Import nie wysyła żadnych zaproszeń (GitHub, Discord) — tylko tworzy
        rekordy członków. Osoby z takim samym indeksem lub adresem e-mail jak
        już istniejący członek zostaną pominięte, więc plik można wgrać ponownie
        bez tworzenia duplikatów.
      </p>
      <MemberImportForm />
    </div>
  );
}
