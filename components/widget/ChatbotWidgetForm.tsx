"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { startAiChatAction, type ChatbotReply } from "@/app/widget/chatbot/actions";

const inputClassName =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type ChatbotWidgetFormProps = {
  onStarted: (reply: ChatbotReply) => void;
};

export function ChatbotWidgetForm({ onStarted }: ChatbotWidgetFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await startAiChatAction({ name, email, body: message });

    if (result.success) {
      onStarted(result.reply);
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-text-default">مساعد الدردشة الذكي</h1>

      <div className="space-y-1.5">
        <label htmlFor="chatbot-name" className="text-sm font-medium text-text-default">
          الاسم
        </label>
        <input
          id="chatbot-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClassName}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="chatbot-email" className="text-sm font-medium text-text-default">
          البريد الإلكتروني
        </label>
        <input
          id="chatbot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClassName}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="chatbot-message" className="text-sm font-medium text-text-default">
          رسالتك
        </label>
        <textarea
          id="chatbot-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className={inputClassName}
          required
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "جارٍ البدء..." : "بدء المحادثة"}
        </Button>
      </div>
    </form>
  );
}
