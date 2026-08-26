"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/constants/auth";

type AuthenticationResponse = {
  userId: string;
  username: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresOn: string;
  refreshTokenExpiresOn: string;
};

type ApiEnvelope<T> = {
  isSuccess: boolean;
  data?: T;
  errors?: string[];
};

export type LoginResult = { success: true } | { success: false; error: string };

const GENERIC_ERROR = "تعذر تسجيل الدخول. حاول مرة أخرى.";

function setAuthCookies(auth: AuthenticationResponse, cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const isProd = process.env.NODE_ENV === "production";

  cookieStore.set(AUTH_TOKEN_COOKIE, auth.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: new Date(auth.accessTokenExpiresOn),
  });

  cookieStore.set(REFRESH_TOKEN_COOKIE, auth.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: new Date(auth.refreshTokenExpiresOn),
  });
}

export async function login(
  usernameOrEmail: string,
  password: string,
  redirectTo: string
): Promise<LoginResult | undefined> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/identity/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept-Language": "ar" },
      body: JSON.stringify({ usernameOrEmail, password }),
      cache: "no-store",
    });
  } catch {
    return { success: false, error: "تعذر الاتصال بالخادم. تأكد من تشغيل azm-crm-backend." };
  }

  const payload: ApiEnvelope<AuthenticationResponse> | null = await response.json().catch(() => null);

  if (!response.ok || !payload?.isSuccess || !payload.data) {
    return { success: false, error: payload?.errors?.[0] || GENERIC_ERROR };
  }

  const cookieStore = await cookies();
  setAuthCookies(payload.data, cookieStore);

  // Must run outside the try/catch above: redirect() throws NEXT_REDIRECT,
  // which Next.js intercepts at the framework level.
  redirect(redirectTo);
}

export async function logout() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  if (accessToken && refreshToken) {
    // Best-effort: invalidate the refresh token server-side too. Cookies are
    // cleared below regardless of whether this call succeeds.
    try {
      await fetch(`${baseUrl}/api/identity/revoke-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // ignored — local cookies still get cleared
    }
  }

  cookieStore.delete(AUTH_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
  redirect("/login");
}
