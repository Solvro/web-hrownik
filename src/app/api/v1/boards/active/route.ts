import { NextResponse } from "next/server";

import { db } from "@/db";
import { getReadOnly } from "@/lib/api/read-only";
import { boardApiConfig } from "@/lib/api/resources";

export async function GET(request: Request) {
  const settings = await db.query.boardSettings.findFirst({
    columns: { activeBoardTermId: true },
  });

  const activeBoardTermId = settings?.activeBoardTermId;
  if (activeBoardTermId === null || activeBoardTermId === undefined) {
    return NextResponse.json({ error: "No active board" }, { status: 404 });
  }

  return getReadOnly(request, activeBoardTermId, boardApiConfig);
}
