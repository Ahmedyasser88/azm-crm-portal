import type { SlaBreachType } from "@/lib/types/slaBreachNotification";

export const SLA_BREACH_TYPE_LABELS: Record<SlaBreachType, string> = {
  ResponseOverdue: "تجاوز وقت الاستجابة",
  ResolutionOverdue: "تجاوز وقت الحل",
};
export const SLA_BREACH_TYPES = Object.keys(SLA_BREACH_TYPE_LABELS) as SlaBreachType[];
