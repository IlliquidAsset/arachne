import { clearAuthCookie } from "@/app/lib/api-helpers";

export async function POST() {
  return clearAuthCookie();
}
