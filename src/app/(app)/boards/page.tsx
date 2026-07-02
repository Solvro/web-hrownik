import { asc, desc } from "drizzle-orm";
import Link from "next/link";

import { NewBoardTermDialog } from "@/components/boards/new-board-term-dialog";
import { SetActiveBoardTermButton } from "@/components/boards/set-active-board-term-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { boardTerm } from "@/db/schema/boards";
import { roleAssignment } from "@/db/schema/roles";
import { getCurrentMember } from "@/lib/current-member";
import { can, getMemberPermissions } from "@/lib/permissions";

export default async function BoardsPage() {
  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);
  const canManageBoards =
    permissions !== null && can(permissions, "roles", "write");

  const [settings, terms] = await Promise.all([
    db.query.boardSettings.findFirst({ with: { activeBoardTerm: true } }),
    db.query.boardTerm.findMany({
      orderBy: [desc(boardTerm.startsAt), asc(boardTerm.name)],
      with: {
        roleAssignments: {
          orderBy: asc(roleAssignment.startedAt),
          with: { member: true, roleDefinition: true },
        },
      },
    }),
  ]);
  const activeBoardTermId = settings?.activeBoardTermId ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Zarządy</h1>
          <p className="text-muted-foreground text-sm">
            Kadencje zarządu i historyczne przypisania funkcji.
          </p>
        </div>
        {canManageBoards ? <NewBoardTermDialog /> : null}
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Aktywna kadencja</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {settings?.activeBoardTerm === undefined ||
          settings.activeBoardTerm === null ? (
            <p className="text-muted-foreground">Brak aktywnej kadencji.</p>
          ) : (
            <p>{settings.activeBoardTerm.name}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {terms.map((term) => {
          const isActive = term.id === activeBoardTermId;
          const assignments = term.roleAssignments.filter(
            (assignment) => assignment.roleDefinition.scope === "board",
          );

          return (
            <Card key={term.id} size="sm">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{term.name}</CardTitle>
                      {isActive ? <Badge>aktywna</Badge> : null}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {formatRange(term.startsAt, term.endsAt)}
                    </p>
                  </div>
                  {canManageBoards && !isActive ? (
                    <SetActiveBoardTermButton boardTermId={term.id} />
                  ) : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {term.description === null ? null : (
                  <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                    {term.description}
                  </p>
                )}
                <div>
                  <h2 className="mb-2 text-sm font-medium">Skład zarządu</h2>
                  <ul className="space-y-2">
                    {assignments.map((assignment) => (
                      <li
                        key={assignment.id}
                        className="rounded-md border p-3 text-sm"
                      >
                        <div className="font-medium">
                          <Link
                            href={`/members/${assignment.member.id}`}
                            className="hover:underline"
                          >
                            {assignment.member.fullName}
                          </Link>
                        </div>
                        <div className="text-muted-foreground">
                          {assignment.roleDefinition.name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {assignment.startedAt.toLocaleDateString("pl-PL")} -{" "}
                          {assignment.endedAt === null
                            ? "obecnie"
                            : assignment.endedAt.toLocaleDateString("pl-PL")}
                        </div>
                      </li>
                    ))}
                    {assignments.length === 0 ? (
                      <li className="text-muted-foreground text-sm">
                        Brak przypisanych ról w tej kadencji.
                      </li>
                    ) : null}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {terms.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Brak kadencji zarządu.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function formatRange(startsAt: Date | null, endsAt: Date | null) {
  if (startsAt === null && endsAt === null) {
    return "Brak dat";
  }
  return `${startsAt?.toLocaleDateString("pl-PL") ?? "?"} - ${
    endsAt?.toLocaleDateString("pl-PL") ?? "?"
  }`;
}
