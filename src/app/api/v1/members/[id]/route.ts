import { getReadOnly } from "@/lib/api/read-only";
import { memberApiConfig } from "@/lib/api/resources";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return getReadOnly(request, id, memberApiConfig);
}
