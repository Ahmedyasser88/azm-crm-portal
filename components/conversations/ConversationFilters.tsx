"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CHANNELS, CHANNEL_LABELS, CONVERSATION_STATUSES, CONVERSATION_STATUS_LABELS } from "@/lib/constants/conversation";

const selectClassName =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export type ConversationFiltersProps = {
  initialChannel: string;
  initialStatus: string;
};

export function ConversationFilters({ initialChannel, initialStatus }: ConversationFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    params.delete("page");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={initialChannel}
        onChange={(e) => updateParam("channel", e.target.value)}
        className={selectClassName}
      >
        <option value="">كل القنوات</option>
        {CHANNELS.map((channel) => (
          <option key={channel} value={channel}>
            {CHANNEL_LABELS[channel]}
          </option>
        ))}
      </select>

      <select
        value={initialStatus}
        onChange={(e) => updateParam("status", e.target.value)}
        className={selectClassName}
      >
        <option value="">كل الحالات</option>
        {CONVERSATION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {CONVERSATION_STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </div>
  );
}
