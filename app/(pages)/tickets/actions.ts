"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiServerFetch } from "@/lib/api/fetch";
import { customerEndpoints } from "@/lib/api/customer.api";
import { identityEndpoints } from "@/lib/api/identity.api";
import type { TicketFormValues, TicketStatus } from "@/lib/types/ticket";

export type TicketActionResult = { success: true } | { success: false; error: string };

export async function createTicketAction(
  values: TicketFormValues
): Promise<TicketActionResult | undefined> {
  const result = await apiServerFetch<string>({
    url: "/api/tickets",
    method: "POST",
    body: {
      customerId: values.customerId,
      title: values.title.trim(),
      description: values.description.trim() || null,
      category: values.category,
      priority: values.priority,
    },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/tickets");
  // redirect() throws NEXT_REDIRECT and unwinds out of this function — same
  // convention as app/(pages)/customers/actions.ts's createCustomerAction().
  redirect(`/tickets/${result.data}`);
}

export async function updateTicketAction(
  id: string,
  values: Omit<TicketFormValues, "customerId">
): Promise<TicketActionResult | undefined> {
  const result = await apiServerFetch<void>({
    url: `/api/tickets/${id}`,
    method: "PUT",
    body: {
      title: values.title.trim(),
      description: values.description.trim() || null,
      category: values.category,
      priority: values.priority,
    },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${id}`);
  redirect(`/tickets/${id}`);
}

export async function assignTicketAction(
  ticketId: string,
  assignedToUserId: string | null
): Promise<TicketActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/tickets/${ticketId}/assign`,
    method: "PUT",
    body: { assignedToUserId },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  return { success: true };
}

export async function changeTicketStatusAction(
  ticketId: string,
  status: TicketStatus
): Promise<TicketActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/tickets/${ticketId}/status`,
    method: "PUT",
    body: { status },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  return { success: true };
}

export async function escalateTicketAction(
  ticketId: string,
  reason: string
): Promise<TicketActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/tickets/${ticketId}/escalate`,
    method: "POST",
    body: { reason: reason.trim() || null },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
  return { success: true };
}

export async function addTicketCommentAction(
  ticketId: string,
  values: { content: string }
): Promise<TicketActionResult | undefined> {
  const result = await apiServerFetch<string>({
    url: `/api/tickets/${ticketId}/comments`,
    method: "POST",
    body: { content: values.content.trim() },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/tickets/${ticketId}`);
  return { success: true };
}

export type CustomerSearchResult = { id: string; label: string };

export async function searchCustomersAction(query: string): Promise<CustomerSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const result = await customerEndpoints.list({ search: trimmed, pageSize: 10 });
  if (!result.success) return [];

  return result.data.items.map((customer) => ({
    id: customer.id,
    label: customer.companyName ? `${customer.fullName} — ${customer.companyName}` : customer.fullName,
  }));
}

export type AgentSearchResult = { id: string; label: string };

export async function searchAgentsAction(query: string): Promise<AgentSearchResult[]> {
  const result = await identityEndpoints.searchAgents({ search: query.trim() || undefined, pageSize: 10 });
  if (!result.success) return [];

  return result.data.map((agent) => ({
    id: agent.id,
    label: agent.email ? `${agent.fullName} — ${agent.email}` : agent.fullName,
  }));
}
