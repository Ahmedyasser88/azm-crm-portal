import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE } from "@/lib/constants/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  return NextResponse.json({ token });
}
