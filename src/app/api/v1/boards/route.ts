import { listReadOnly } from "@/lib/api/read-only";
import { boardApiConfig } from "@/lib/api/resources";

export async function GET(request: Request) {
  return listReadOnly(request, boardApiConfig);
}
