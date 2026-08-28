"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiServerFetch } from "@/lib/api/fetch";
import { AUTH_TOKEN_COOKIE } from "@/lib/constants/auth";
import type { CustomerFormValues } from "@/lib/types/customer";
import type { LogInteractionFormValues } from "@/lib/types/customerInteraction";
import type { AddNoteFormValues } from "@/lib/types/customerNote";

export type CustomerActionResult = { success: true } | { success: false; error: string };

function toRequestBody(values: CustomerFormValues) {
  return {
    fullName: values.fullName.trim(),
    companyName: values.companyName.trim() || null,
    email: values.email.trim() || null,
    phoneNumber: values.phoneNumber.trim() || null,
    addressLine1: values.addressLine1.trim() || null,
    addressLine2: values.addressLine2.trim() || null,
    city: values.city.trim() || null,
    state: values.state.trim() || null,
    postalCode: values.postalCode.trim() || null,
    country: values.country.trim() || null,
  };
}

export async function createCustomerAction(
  values: CustomerFormValues
): Promise<CustomerActionResult | undefined> {
  const result = await apiServerFetch<string>({
    url: "/api/customers",
    method: "POST",
    body: toRequestBody(values),
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/customers");
  // redirect() throws NEXT_REDIRECT and unwinds out of this function — same
  // convention as app/login/actions.ts's login().
  redirect(`/customers/${result.data}`);
}

export async function updateCustomerAction(
  id: string,
  values: CustomerFormValues
): Promise<CustomerActionResult | undefined> {
  const result = await apiServerFetch<void>({
    url: `/api/customers/${id}`,
    method: "PUT",
    body: toRequestBody(values),
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  redirect(`/customers/${id}`);
}

export async function logInteractionAction(
  customerId: string,
  values: LogInteractionFormValues
): Promise<CustomerActionResult | undefined> {
  const result = await apiServerFetch<string>({
    url: `/api/customers/${customerId}/interactions`,
    method: "POST",
    body: {
      type: values.type,
      subject: values.subject.trim(),
      description: values.description.trim() || null,
      occurredOn: new Date(values.occurredOn).toISOString(),
    },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}

export async function addNoteAction(
  customerId: string,
  values: AddNoteFormValues
): Promise<CustomerActionResult | undefined> {
  const result = await apiServerFetch<string>({
    url: `/api/customers/${customerId}/notes`,
    method: "POST",
    body: { content: values.content.trim() },
  });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}

export async function uploadAttachmentAction(
  customerId: string,
  formData: FormData
): Promise<CustomerActionResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/customers/${customerId}/attachments`, {
      method: "POST",
      headers: {
        "Accept-Language": "ar",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
  } catch {
    return { success: false, error: "تعذر الاتصال بالخادم." };
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return { success: false, error: payload?.errors?.[0] || "تعذر رفع الملف." };
  }

  revalidatePath(`/customers/${customerId}`);
  return { success: true };
}

export async function deleteCustomerAction(id: string): Promise<CustomerActionResult> {
  const result = await apiServerFetch<void>({ url: `/api/customers/${id}`, method: "DELETE" });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/customers");
  return { success: true };
}
