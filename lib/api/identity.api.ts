import { apiServerFetch } from "./fetch";
import type { CurrentUser } from "../types/identity";

const IDENTITY_URL = "/api/identity";

export const identityEndpoints = {
  me: () => apiServerFetch<CurrentUser>({ url: `${IDENTITY_URL}/me`, cache: "no-store" }),
};

/**
 * Server-side helper for pages/layouts that just need to render the signed-in
 * user (or null) without caring about the failure reason — the auth guard
 * itself lives in `proxy.ts` (redirects to /login) and `apiServerFetch`
 * (redirects to /login on a 401), so by the time this resolves to `null` here
 * a redirect is typically already underway.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const result = await identityEndpoints.me();
  return result.success ? result.data : null;
}
