import { asc } from "drizzle-orm";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import { member } from "@/db/schema/members";
import { getCurrentMember } from "@/lib/current-member";
import { canManageMembers, getMemberPermissions } from "@/lib/permissions";

export default async function MembersPage() {
  const currentMember = await getCurrentMember();
  const permissions =
    currentMember === null
      ? null
      : await getMemberPermissions(currentMember.id);

  const members = await db.query.member.findMany({
    orderBy: asc(member.fullName),
    with: { sections: { with: { section: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Członkowie</h1>
        {permissions !== null && canManageMembers(permissions) ? (
          <Button asChild>
            <Link href="/members/new">Dodaj członka</Link>
          </Button>
        ) : null}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Imię i nazwisko</TableHead>
            <TableHead>Sekcje</TableHead>
            <TableHead>GitHub</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((memberRow) => (
            <TableRow key={memberRow.id}>
              <TableCell>
                <Link
                  href={`/members/${memberRow.id}`}
                  className="font-medium hover:underline"
                >
                  {memberRow.fullName}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {memberRow.sections.map((membership) => (
                    <Badge key={membership.id} variant="outline">
                      {membership.section.name}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>{memberRow.githubUsername ?? "—"}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    memberRow.status === "active" ? "default" : "secondary"
                  }
                >
                  {memberRow.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
