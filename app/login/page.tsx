"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// TODO: replace this stub with a real call to the azm-crm-backend auth endpoint
// (e.g. POST /api/Identity/login) once it exists. On success the backend should
// set the AUTH_TOKEN_COOKIE ("azm_crm_auth_token") and this page should redirect
// to the "redirect" query param (or /dashboard).
export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: call the real login API route here instead of this placeholder.
    console.warn("TODO: wire up authentication", { username, password });

    setIsSubmitting(false);
    const redirect = new URLSearchParams(window.location.search).get("redirect") || "/dashboard";
    router.push(redirect);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-300 p-8 space-y-6"
      >
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-primary">أزم CRM</h1>
          <p className="text-sm text-text-secondary">تسجيل الدخول إلى حسابك</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium text-text-default">
              اسم المستخدم
            </label>
            <input
              id="username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-text-default">
              كلمة المرور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        <button type="submit" className="btn-primary w-full justify-center" disabled={isSubmitting}>
          {isSubmitting ? "جارٍ الدخول..." : "تسجيل الدخول"}
        </button>
      </form>
    </div>
  );
}
