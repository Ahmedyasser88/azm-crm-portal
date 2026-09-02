import { slaPolicyEndpoints } from "@/lib/api/slaPolicy.api";
import { assignmentRuleEndpoints } from "@/lib/api/assignmentRule.api";
import { escalationRuleEndpoints } from "@/lib/api/escalationRule.api";
import { slaBreachNotificationEndpoints } from "@/lib/api/slaBreachNotification.api";
import { SlaPoliciesPanel } from "@/components/automation/SlaPoliciesPanel";
import { AssignmentRulesPanel } from "@/components/automation/AssignmentRulesPanel";
import { EscalationRulesPanel } from "@/components/automation/EscalationRulesPanel";
import { SlaBreachNotificationsPanel } from "@/components/automation/SlaBreachNotificationsPanel";
import type { TicketCategory, TicketPriority } from "@/lib/types/ticket";
import type { SlaBreachType } from "@/lib/types/slaBreachNotification";

type AutomationPageProps = {
  searchParams: Promise<{
    slaPage?: string;
    slaPriority?: string;
    slaActive?: string;
    assignPage?: string;
    assignCategory?: string;
    assignPriority?: string;
    assignActive?: string;
    escPage?: string;
    escPriority?: string;
    escActive?: string;
    notifPage?: string;
    notifBreachType?: string;
  }>;
};

export default async function AutomationPage({ searchParams }: AutomationPageProps) {
  const {
    slaPage,
    slaPriority,
    slaActive,
    assignPage,
    assignCategory,
    assignPriority,
    assignActive,
    escPage,
    escPriority,
    escActive,
    notifPage,
    notifBreachType,
  } = await searchParams;

  const slaPageNumber = Number(slaPage) || 1;
  const assignPageNumber = Number(assignPage) || 1;
  const escPageNumber = Number(escPage) || 1;
  const notifPageNumber = Number(notifPage) || 1;

  const [policiesResult, assignmentRulesResult, escalationRulesResult, notificationsResult] =
    await Promise.all([
      slaPolicyEndpoints.list({
        pageNumber: slaPageNumber,
        priority: slaPriority ? (slaPriority as TicketPriority) : undefined,
        isActive: slaActive === "true" ? true : slaActive === "false" ? false : undefined,
      }),
      assignmentRuleEndpoints.list({
        pageNumber: assignPageNumber,
        category: assignCategory ? (assignCategory as TicketCategory) : undefined,
        priority: assignPriority ? (assignPriority as TicketPriority) : undefined,
        isActive: assignActive === "true" ? true : assignActive === "false" ? false : undefined,
      }),
      escalationRuleEndpoints.list({
        pageNumber: escPageNumber,
        priority: escPriority ? (escPriority as TicketPriority) : undefined,
        isActive: escActive === "true" ? true : escActive === "false" ? false : undefined,
      }),
      slaBreachNotificationEndpoints.list({
        pageNumber: notifPageNumber,
        breachType: notifBreachType ? (notifBreachType as SlaBreachType) : undefined,
      }),
    ]);

  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-2xl font-bold text-text-default">الأتمتة وضمان الخدمة</h1>
        <p className="mt-1 text-sm text-text-secondary">
          إدارة سياسات اتفاقية مستوى الخدمة وقواعد الإسناد التلقائي والتصعيد
        </p>
      </div>

      <SlaPoliciesPanel
        policies={policiesResult.success ? policiesResult.data.items : []}
        hasNextPage={policiesResult.success ? policiesResult.data.hasNextPage : false}
        hasPreviousPage={policiesResult.success ? policiesResult.data.hasPreviousPage : false}
        page={slaPageNumber}
        priorityFilter={slaPriority ?? ""}
        activeFilter={slaActive ?? ""}
      />

      <AssignmentRulesPanel
        rules={assignmentRulesResult.success ? assignmentRulesResult.data.items : []}
        hasNextPage={assignmentRulesResult.success ? assignmentRulesResult.data.hasNextPage : false}
        hasPreviousPage={assignmentRulesResult.success ? assignmentRulesResult.data.hasPreviousPage : false}
        page={assignPageNumber}
        categoryFilter={assignCategory ?? ""}
        priorityFilter={assignPriority ?? ""}
        activeFilter={assignActive ?? ""}
      />

      <EscalationRulesPanel
        rules={escalationRulesResult.success ? escalationRulesResult.data.items : []}
        hasNextPage={escalationRulesResult.success ? escalationRulesResult.data.hasNextPage : false}
        hasPreviousPage={escalationRulesResult.success ? escalationRulesResult.data.hasPreviousPage : false}
        page={escPageNumber}
        priorityFilter={escPriority ?? ""}
        activeFilter={escActive ?? ""}
      />

      <SlaBreachNotificationsPanel
        notifications={notificationsResult.success ? notificationsResult.data.items : []}
        hasNextPage={notificationsResult.success ? notificationsResult.data.hasNextPage : false}
        hasPreviousPage={notificationsResult.success ? notificationsResult.data.hasPreviousPage : false}
        page={notifPageNumber}
        breachTypeFilter={notifBreachType ?? ""}
      />
    </div>
  );
}
