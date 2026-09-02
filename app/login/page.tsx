"use client";

import { useState } from "react";
import Image from "next/image";
import { login } from "./actions";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const redirectTo = new URLSearchParams(window.location.search).get("redirect") || "/dashboard";

    // login() redirects on success (which throws NEXT_REDIRECT and unwinds
    // out of this function) — a returned value only ever means failure.
    const result = await login(username, password, redirectTo);

    if (result && !result.success) {
      setError(result.error);
    }
    setIsSubmitting(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-300 p-8 space-y-6"
      >
        <div className="text-center space-y-3">
          <Image src="/images/logo.svg" alt="واصل CRM" width={88} height={88} className="mx-auto" />
          <p className="text-sm text-text-secondary">تسجيل الدخول إلى حسابك</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium text-text-default">
              اسم المستخدم أو البريد الإلكتروني
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

        {error && (
          <p role="alert" className="text-sm text-red-600 text-center">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full justify-center" disabled={isSubmitting}>
          {isSubmitting ? "جارٍ الدخول..." : "تسجيل الدخول"}
        </button>
      </form>
    </div>
  );
}
