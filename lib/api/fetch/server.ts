"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_TOKEN_COOKIE } from "@/lib/constants/auth";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiOptions = {
  url: string;
  method?: HttpMethod;
  body?: unknown;
  params?: Record<string, string | number | boolean | string[] | number[] | undefined | null>;
  cache?: RequestCache;
  revalidate?: number;
  responseType?: "json" | "arrayBuffer";
};

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number };

type RequestCookieStore = Awaited<ReturnType<typeof cookies>>;

const getFullUrl = (
  url: string,
  params?: Record<string, string | number | boolean | string[] | number[] | undefined | null>
) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

  if (!params) return fullUrl;

  const searchParams = new URLSearchParams();
  Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((item) => searchParams.append(k, String(item)));
      } else {
        searchParams.append(k, String(v));
      }
    });

  const qs = searchParams.toString();
  return qs ? `${fullUrl}?${qs}` : fullUrl;
};

const getAuthToken = (cookieStore: RequestCookieStore) => cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

// ✅ pure fetch logic — server-side API client used by every lib/api/*.api.ts module
export async function apiServerFetch<T>(options: ApiOptions): Promise<ApiResult<T>> {
  const {
    url,
    method = "GET",
    body,
    params,
    revalidate,
    cache,
    responseType = "json",
  } = options;
  const fullUrl = getFullUrl(url, params);

  const cookieStore = await cookies();
  const token = getAuthToken(cookieStore);

  try {
    const response = await fetch(fullUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": "ar",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...(cache && { cache }),
      ...(revalidate !== undefined && {
        next: { revalidate },
      }),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (response?.status !== 401) {
      if (responseType === "arrayBuffer") {
        if (!response.ok) {
          return {
            success: false,
            error: "حدث خطأ ما",
            status: response.status,
          };
        }
        const buffer = await response.arrayBuffer();
        return { success: true, data: Buffer.from(buffer).toString("base64") as T };
      }

      if (response.status === 204) {
        return { success: true, data: undefined as T };
      }

      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: responseData.errors?.length ? responseData.errors[0] : "حدث خطأ ما",
          status: response.status,
        };
      }

      const data = responseData.data as T;
      return { success: true, data };
    }
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: "error from catch",
    };
  }

  // Must run outside try/catch: redirect() throws NEXT_REDIRECT, which Next.js
  // intercepts at the framework level — a local catch would swallow it.
  redirect("/login");
}
