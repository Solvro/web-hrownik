"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { boardSettings, boardTerm } from "@/db/schema/boards";
import { getCurrentMember } from "@/lib/current-member";
import { can, getMemberPermissions } from "@/lib/permissions";
import type { BoardTermFormValues } from "@/lib/schemas/boards";
import { boardTermFormSchema } from "@/lib/schemas/boards";

async function assertCanManageBoards() {
  const currentMember = await getCurrentMember();
  if (currentMember === null) {
    throw new Error("Unauthorized");
  }
  const permissions = await getMemberPermissions(currentMember.id);
  if (!can(permissions, "boards", "write")) {
    throw new Error("Tylko zarząd może zarządzać kadencjami zarządu.");
  }
}

export async function createBoardTerm(input: BoardTermFormValues) {
  await assertCanManageBoards();
  const values = boardTermFormSchema.parse(input);

  const [created] = await db
    .insert(boardTerm)
    .values({
      name: values.name,
      startsAt: parseDate(values.startsAt),
      endsAt: parseDate(values.endsAt),
      description: emptyToNull(values.description),
    })
    .returning();

  await db
    .insert(boardSettings)
    .values({ id: "singleton", activeBoardTermId: created.id })
    .onConflictDoNothing({ target: boardSettings.id });

  revalidatePath("/boards");
}

export async function setActiveBoardTerm(boardTermId: string) {
  await assertCanManageBoards();

  const term = await db.query.boardTerm.findFirst({
    where: eq(boardTerm.id, boardTermId),
  });
  if (term === undefined) {
    throw new Error("Nie znaleziono kadencji zarządu.");
  }

  await db
    .insert(boardSettings)
    .values({ id: "singleton", activeBoardTermId: boardTermId })
    .onConflictDoUpdate({
      target: boardSettings.id,
      set: { activeBoardTermId: boardTermId, updatedAt: new Date() },
    });

  revalidatePath("/boards");
  revalidatePath("/members");
}

export async function updateBoardTerm(
  boardTermId: string,
  input: BoardTermFormValues,
) {
  await assertCanManageBoards();
  const values = boardTermFormSchema.parse(input);

  await db
    .update(boardTerm)
    .set({
      name: values.name,
      startsAt: parseDate(values.startsAt),
      endsAt: parseDate(values.endsAt),
      description: emptyToNull(values.description),
      updatedAt: new Date(),
    })
    .where(eq(boardTerm.id, boardTermId));

  revalidatePath("/boards");
  revalidatePath("/members");
}

function parseDate(value: string | undefined): Date | null {
  if (value === undefined || value === "") {
    return null;
  }
  return new Date(`${value}T00:00:00`);
}

function emptyToNull(value: string | undefined): string | null {
  return value === undefined || value === "" ? null : value;
}
