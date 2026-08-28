# Story 01 — Customer Profile CRUD & Contact Details (Story: KAN-1)

## Prerequisites

- None. This is the first story in the `story` feature.
- **Backend dependency**: the `azm-crm-backend` sibling repo (`../azm-crm-backend` relative to this repo, base URL configured via `NEXT_PUBLIC_API_BASE_URL` in [.env.local.example](.env.local.example)) must have its own Story 01 (`Customer Profile CRUD & Contact Details`) deployed, exposing:
  - `POST /api/customers` → `Result<Guid>` (201)
  - `GET /api/customers/{id}` → `Result<CustomerDto>` (200) / 404
  - `GET /api/customers?pageNumber=&pageSize=&search=` → `Result<PaginatedResult<CustomerListItemDto>>` (200)
  - `PUT /api/customers/{id}` → `Result` (200) / 404
  - `DELETE /api/customers/{id}` → 204 No Content / 404

  `CustomerDto`/`CustomerListItemDto` fields (camelCased over the wire): `id` (guid), `fullName`, `companyName`, `email`, `phoneNumber`, `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`, `country`, `createdOn`, `updatedOn` (list item omits address fields and `updatedOn`). `CreateCustomerRequest`/`UpdateCustomerRequest` bodies carry the same fields minus `id`/`createdOn`/`updatedOn`. All endpoints require the `Authorization: Bearer <token>` header already sent by `apiServerFetch`.

## Story Goal

Give support agents a page to create, view, edit, and delete customer profiles, and store the core contact details required by KAN-1: phone, email, and postal address. This is the foundation Stories 02–04 build on (interaction history, notes, attachments all hang off the customer detail page created here).

Outcomes:
1. A **customer list** page at `/customers` with search and pagination.
2. A **create customer** page at `/customers/new`.
3. A **customer detail** page at `/customers/[id]` showing contact details, with Edit/Delete actions.
4. An **edit customer** page at `/customers/[id]/edit`.
5. Delete removes the customer (soft delete server-side) and returns to the list.

**Not in scope for this story**: interaction history, notes, and attachments UI (Stories 02–04 add these to the `/customers/[id]` page built here). Customer merge/de-duplication and CSV/Excel export are not covered by KAN-1's acceptance criteria.

## Context — Read These Files First

1. [lib/api/identity.api.ts](lib/api/identity.api.ts) — the `identityEndpoints` object pattern (an object of named `apiServerFetch` calls) and the `getCurrentUser` "resolve to null on failure" convention. `lib/api/customer.api.ts` (new) follows the exact same shape for the two read endpoints (`list`, `getById`).
2. [lib/api/fetch/server.ts](lib/api/fetch/server.ts) — read in full (119 lines). `ApiOptions` (lines 9–17) and `ApiResult<T>` (lines 19–21) are the generic request/response envelope every `*.api.ts` module uses. `apiServerFetch` (lines 52–119) attaches the `Authorization` header from the `azm_crm_auth_token` cookie (line 49, 65, 73) and redirects to `/login` on a 401 (lines 82, 116–119). **This story must edit this file**: lines 82–107 always call `await response.json()` (line 95) before checking `response.ok` — a `DELETE` returning `204 No Content` has no body, so `response.json()` throws, which the outer `catch` (lines 108–114) swallows into a generic `{ success: false, error: "error from catch" }`. Add a `response.status === 204` short-circuit (returning `{ success: true, data: undefined as T }`) immediately after the `responseType === "arrayBuffer"` block (after line 93) and before line 95, so `DELETE /api/customers/{id}`'s 204 response is treated as success.
3. [app/login/actions.ts](app/login/actions.ts) — read in full (107 lines). The `"use server"` file-level pragma (line 1), the `LoginResult` success/failure union pattern (line 23), and the `redirect()`-outside-any-try-block convention (comment at lines 75–77) are the pattern `app/(pages)/customers/actions.ts` (new) follows for `createCustomerAction`/`updateCustomerAction`/`deleteCustomerAction`.
4. [app/login/page.tsx](app/login/page.tsx) — read in full (86 lines). The client-form pattern this story's `CustomerForm` component follows: `useState` per field (lines 7–10), `handleSubmit` with `e.preventDefault()` and `isSubmitting` guard (lines 12–27), plain `<input>` styling (`"w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"`, lines 50, 66), and the error-paragraph pattern (lines 73–77, `role="alert"`).
5. [app/(pages)/dashboard/page.tsx](app/(pages)/dashboard/page.tsx) — read in full (12 lines). The `.card` utility class usage this story's pages reuse for panel styling.
6. [app/(pages)/layout.tsx](app/(pages)/layout.tsx) — read in full (8 lines). Confirms every route under `app/(pages)/` (including the new `app/(pages)/customers/` segment) is already wrapped in `AppLayout` with the signed-in `user`, and already sits behind `proxy.ts`'s auth guard (see item 8) — no new auth wiring is needed for the customers routes.
7. [lib/constants/sidebar.ts](lib/constants/sidebar.ts) — lines 7–12. `{ label: "العملاء", href: "/customers", icon: "users" }` is **already registered** (line 9), and [components/layout/Sidebar.tsx](components/layout/Sidebar.tsx) lines 15–20 already map `"users"` to the Lucide `Users` icon. **No sidebar/navigation changes are required by this story.**
8. [proxy.ts](proxy.ts) — read in full (32 lines). `/customers` is not in `PUBLIC_PATHS` (line 5), so it is already guarded: an unauthenticated request is redirected to `/login?redirect=/customers...` (lines 17–19). No changes needed here.
9. [components/ui/button.tsx](components/ui/button.tsx) — the `Button` component (`variant`/`size` props, lines 44–65) — reuse this for all new action buttons (New Customer, Save, Delete, Prev/Next) instead of the raw `btn-primary`/`btn-secondary` CSS classes.
10. [components/layout/AppLayout.tsx](components/layout/AppLayout.tsx) lines 22–27 — the fixed, semi-transparent overlay (`className="md:hidden bg-black opacity-30 fixed z-40 inset-0"`) that closes the sidebar on click. The delete-confirmation `ConfirmDialog` component (new, Task 5 below) reuses this exact overlay pattern instead of introducing an unverified Radix `AlertDialog` primitive — `components/ui/` currently only has `Breadcrumb.tsx`, `avatar.tsx`, `button.tsx`, `dropdown-menu.tsx` (confirmed via directory listing); no `Dialog`/`Table`/`Input` primitives exist yet, so this story builds with plain semantic HTML and Tailwind utility classes (matching `.card`, `.btn-primary`, `.btn-secondary` in [app/globals.css](app/globals.css) lines 164–172) rather than adding new shadcn/radix components, keeping the diff minimal. Adding a proper shadcn `Dialog`/`Table`/`Input` kit is a reasonable follow-up, not required by KAN-1's acceptance criteria.
11. [app/not-found.tsx](app/not-found.tsx) — read in full (36 lines). The customer-detail and edit pages call Next.js's `notFound()` (from `next/navigation`) when `apiServerFetch` returns `status: 404`, which renders this existing boundary — no new not-found UI is needed.
12. [app/atoms/sidebarAtom.ts](app/atoms/sidebarAtom.ts) and [app/atoms/index.ts](app/atoms/index.ts) — confirms the Jotai atom re-export convention, referenced only so the executor knows not to duplicate `app/atoms/index.ts` when adding new atoms in later stories (none needed in this story).

## Implementation tasks

### 1 — Types

**Create file: `lib/types/customer.ts`**

```ts
export type Customer = {
  id: string;
  fullName: string;
  companyName: string | null;
  email: string | null;
  phoneNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  createdOn: string;
  updatedOn: string | null;
};

export type CustomerListItem = Pick<
  Customer,
  "id" | "fullName" | "companyName" | "email" | "phoneNumber" | "createdOn"
>;

export type CustomerFormValues = {
  fullName: string;
  companyName: string;
  email: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};
```

**Create file: `lib/types/pagination.ts`**

```ts
export type PaginatedResult<T> = {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};
```

### 2 — API client (reads)

**Create file: `lib/api/customer.api.ts`**

```ts
import { apiServerFetch } from "./fetch";
import type { Customer, CustomerListItem } from "../types/customer";
import type { PaginatedResult } from "../types/pagination";

const CUSTOMERS_URL = "/api/customers";

export const customerEndpoints = {
  list: (params: { pageNumber?: number; pageSize?: number; search?: string }) =>
    apiServerFetch<PaginatedResult<CustomerListItem>>({
      url: CUSTOMERS_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        search: params.search,
      },
      cache: "no-store",
    }),
  getById: (id: string) =>
    apiServerFetch<Customer>({ url: `${CUSTOMERS_URL}/${id}`, cache: "no-store" }),
};
```

This mirrors `identityEndpoints` in [lib/api/identity.api.ts](lib/api/identity.api.ts) — plain reads, `cache: "no-store"` since customer data changes frequently and must not be cached across agents.

### 3 — Fix `apiServerFetch` to handle `204 No Content`

**Edit file: `lib/api/fetch/server.ts`** — insert immediately after the `responseType === "arrayBuffer"` block (after the closing `}` that currently precedes line 94's blank line) and before the existing `const responseData = await response.json();` line:

```ts
      if (response.status === 204) {
        return { success: true, data: undefined as T };
      }
```

Without this, `DELETE /api/customers/{id}`'s 204 response makes `response.json()` throw on the empty body, which the surrounding `try/catch` (lines 67–114) turns into a misleading `{ success: false, error: "error from catch" }` — the delete flow in Task 5 below depends on this fix to report success correctly.

### 4 — Server actions (mutations)

**Create file: `app/(pages)/customers/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiServerFetch } from "@/lib/api/fetch";
import type { CustomerFormValues } from "@/lib/types/customer";

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

export async function deleteCustomerAction(id: string): Promise<CustomerActionResult> {
  const result = await apiServerFetch<void>({ url: `/api/customers/${id}`, method: "DELETE" });

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidatePath("/customers");
  return { success: true };
}
```

### 5 — Shared components

**Create file: `components/customers/CustomerForm.tsx`** (`"use client"`) — controlled form with one `useState<CustomerFormValues>`, following the field-by-field input styling from [app/login/page.tsx](app/login/page.tsx) lines 41–70. Props:

```ts
type CustomerFormProps = {
  mode: "create" | "edit";
  initialValues?: CustomerFormValues;
  onSubmit: (values: CustomerFormValues) => Promise<CustomerActionResult | undefined>;
};
```

Fields, in this order, each with an Arabic `<label>` and the login-page input classes: الاسم الكامل (`fullName`, required), اسم الشركة (`companyName`), البريد الإلكتروني (`email`, `type="email"`), رقم الهاتف (`phoneNumber`), العنوان (`addressLine1`), العنوان (تكملة) (`addressLine2`), المدينة (`city`), المنطقة (`state`), الرمز البريدي (`postalCode`), الدولة (`country`). On submit: call `onSubmit(values)`; if the result is `{ success: false, error }`, show it in the same `role="alert"` paragraph pattern as the login form (lines 73–77); a `success`/`undefined` result means the action already redirected (mirrors the `login()` "a returned value only ever means failure" comment at [app/login/page.tsx:19-21](app/login/page.tsx)). Submit button: `<Button type="submit" disabled={isSubmitting}>{isSubmitting ? "جارٍ الحفظ..." : "حفظ"}</Button>` from [components/ui/button.tsx](components/ui/button.tsx).

**Create file: `components/customers/ConfirmDialog.tsx`** (`"use client"`) — a minimal confirmation modal reusing the overlay pattern from [components/layout/AppLayout.tsx:22-27](components/layout/AppLayout.tsx):

```ts
type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean;
};
```

Renders `null` when `!open`; otherwise a `fixed inset-0 z-50` overlay (`bg-black opacity-30`) plus a centered `.card` panel with `title`/`description` and two `Button`s (`variant="destructive"` for confirm, `variant="outline"` for cancel).

**Create file: `components/customers/DeleteCustomerButton.tsx`** (`"use client"`) — holds `open` state, renders a `Button variant="destructive"` that opens `ConfirmDialog`; `onConfirm` calls `deleteCustomerAction(id)` from `app/(pages)/customers/actions.ts`, and on success either `router.push("/customers")` (when `redirectAfterDelete` prop is true, used on the detail page) or relies on the row disappearing after `router.refresh()` (used on the list page). Show the returned `error` via `sonner`'s `toast.error(...)` (the `Toaster` is already mounted globally in [app/layout.tsx:19](app/layout.tsx)) — this is the first consumer of `sonner`'s `toast` API in this codebase; import `{ toast } from "sonner"`.

### 6 — Pages

**Create file: `app/(pages)/customers/page.tsx`** (Server Component) — reads `searchParams: { page?: string; search?: string }`, calls `customerEndpoints.list({ pageNumber: Number(searchParams.page) || 1, search: searchParams.search })`. Renders:
- A header row: `<h1>` "العملاء" + `<Link href="/customers/new"><Button>عميل جديد</Button></Link>`.
- `components/customers/CustomerSearch.tsx` (`"use client"`, new) — a debounced (300ms) text `<input>` that updates the `?search=` query param via `useRouter()`/`usePathname()` (`next/navigation`) `router.replace(...)`, resetting `?page=1` on each new search.
- A `.card`-wrapped `<table>` (plain HTML, per Task-list item 10's reasoning) with columns: الاسم الكامل, الشركة, البريد الإلكتروني, الهاتف, تاريخ الإنشاء (formatted via `formatDateTime` from [lib/utils/date.ts](lib/utils/date.ts)), each row wrapped in a `<Link href={`/customers/${item.id}`}>` for the name cell.
- When `result.data.items.length === 0`, render an empty-state message: "لا يوجد عملاء بعد" (create) or "لا توجد نتائج مطابقة" (search with no matches).
- Pagination: two `Button variant="outline"` (السابق/التالي) driven by `hasPreviousPage`/`hasNextPage`, linking to `?page=N&search=...`.
- On `!result.success`, throw a plain `Error(result.error)` (there is no list-level 404 case) so Next.js's nearest `error.tsx` boundary handles it — no `error.tsx` exists yet in this repo; creating one is optional polish, not required by this story (Next.js's default dev/prod error overlay still surfaces the error).

**Create file: `app/(pages)/customers/new/page.tsx`** (Server Component, thin) — renders a `.card`-wrapped `<h1>` "عميل جديد" plus `<CustomerForm mode="create" onSubmit={createCustomerAction} />`. Since `createCustomerAction` is an async Server Action imported into a Client Component (`CustomerForm`), pass it through directly as the prop value — this is the standard Next.js App Router pattern for invoking Server Actions from Client Components.

**Create file: `app/(pages)/customers/[id]/page.tsx`** (Server Component) — `const result = await customerEndpoints.getById(id)`; `if (!result.success) { if (result.status === 404) notFound(); throw new Error(result.error); }` (`notFound` from `next/navigation`, rendering [app/not-found.tsx](app/not-found.tsx)). Renders a `.card` with the customer's `fullName` as `<h1>`, `companyName` as a subtitle when present, and a contact-details grid (البريد الإلكتروني / رقم الهاتف / العنوان / المدينة / المنطقة / الرمز البريدي / الدولة — render `"—"` for any `null` field), plus `<Link href={`/customers/${id}/edit`}><Button variant="outline">تعديل</Button></Link>` and `<DeleteCustomerButton id={id} redirectAfterDelete />`. **Stories 02–04 edit this file** to add interaction-history, notes, and attachments sections below the contact-details card — leave room for that (e.g. a `<div className="space-y-6">` wrapper) but do not add placeholder sections now.

**Create file: `app/(pages)/customers/[id]/edit/page.tsx`** (Server Component) — same `getById` + `notFound()`/error handling as the detail page, then renders `.card` "تعديل بيانات العميل" + `<CustomerForm mode="edit" initialValues={{...mapped from result.data, replacing null with ""}} onSubmit={updateCustomerAction.bind(null, id)} />`. Use `Function.prototype.bind` (or an inline arrow `(values) => updateCustomerAction(id, values)`) since `updateCustomerAction` takes `(id, values)` but `CustomerForm`'s `onSubmit` prop is `(values) => ...`.

## Edge Cases & Failure Modes

- **`DELETE` returns 204 with an empty body** — see Task 3; without the fix, `apiServerFetch` misreports every successful delete as a generic failure. Verify by deleting a customer and confirming `deleteCustomerAction` returns `{ success: true }`, not the `"error from catch"` string.
- **Customer id in the URL does not exist (never existed, or was soft-deleted server-side)** — `GET /api/customers/{id}` 404s (soft-deleted rows are excluded by the backend's query filter); the detail and edit pages call `notFound()`, rendering [app/not-found.tsx](app/not-found.tsx). Verify by navigating to `/customers/00000000-0000-0000-0000-000000000000`.
- **Unauthenticated request to any `/customers/*` route** — `proxy.ts` (unedited) already redirects to `/login?redirect=/customers...` before any page code runs. If a session expires mid-visit (cookie present but token rejected), `apiServerFetch`'s existing 401 handling (`lib/api/fetch/server.ts` lines 82, 116–119) redirects to `/login`.
- **Empty/whitespace search term** — the backend list handler only filters `when (!string.IsNullOrWhiteSpace(request.Search))`; `CustomerSearch`'s debounce should omit the `search` param entirely (not send `search=""`) so the URL stays clean, but sending an empty string is also harmless since `apiServerFetch`'s `getFullUrl` (lib/api/fetch/server.ts lines 25–47) still includes empty-string params (only `undefined`/`null` are filtered, line 36) — trim in `CustomerSearch` before updating the URL to avoid a stray `?search=` with nothing meaningful.
- **`pageNumber`/`pageSize` out of the backend's validated range (`pageNumber >= 1`, `pageSize` 1–100)** — an out-of-range value returns a 400 `Result.Failure`; the list page's `result.success === false` branch surfaces `result.error` via the generic `throw new Error(...)` fallback. This should not normally happen since this story's UI only ever sends `pageNumber` derived from its own Prev/Next controls and a fixed `pageSize=20`, but a hand-edited URL (`?page=-1`) can trigger it — acceptable given KAN-1's scope; a friendlier "invalid page" message is a follow-up.
- **Very long `fullName`/`companyName`/address fields** — the backend rejects `fullName` over 200 chars and each address field per its own max length (see the backend's `CreateCustomerCommandValidator`: `FullName` 200, `CompanyName` 200, `AddressLine1`/`AddressLine2` 250, `City`/`State` 100, `PostalCode` 20, `Country` 100) with a 400; `CustomerForm` does not duplicate these limits client-side in this story (no `maxLength` attributes) — the server error message surfaces via the shared error-paragraph. Client-side `maxLength` mirroring is a reasonable follow-up.
- **Malformed email/phone** — same pattern: the backend validates (`EmailAddress()`, and a phone regex accepting `05XXXXXXXX`, `+9665XXXXXXXX`, or a generic `+?\d{10,15}`) and returns a 400 with a message; `CustomerForm` relies on the native `type="email"` browser hint plus the server round-trip rather than re-implementing the regex, keeping the two validation sources from drifting apart.
- **Two customers created concurrently with the same email/phone** — explicitly allowed; the backend enforces no uniqueness constraint on `Email`/`PhoneNumber`. No special handling needed.
- **Breadcrumb on nested routes** — [components/ui/Breadcrumb.tsx](components/ui/Breadcrumb.tsx)'s `labels` map (lines 8–10) only knows the four top-level `navItems` hrefs; on `/customers/[id]` or `/customers/[id]/edit` the trailing segments (the id, `edit`) render as raw path segments since they are not in `labels`. This is existing, unmodified behavior — not addressed by this story; a customer name in the breadcrumb is a reasonable follow-up but out of scope.

## Test Plan

This repository has no test runner configured yet (`package.json` has no `test` script; only `lint`). No automated test infrastructure exists to extend for this story — manual verification only, per the Verification Steps below. Flag adding a test runner (Vitest/Playwright) as a follow-up if project testing conventions are established later.

## Verification Steps

1. **Frontend builds:** `npm run build` (or `pnpm build`, per the `packageManager` pin in `package.json`) from the repository root.
2. **Lint passes:** `npm run lint`.
3. **Frontend runs against a live backend:** `npm run dev` (starts on port 3100 per `package.json`'s `dev` script), with `azm-crm-backend` running locally and `NEXT_PUBLIC_API_BASE_URL` in `.env.local` pointing at it.
4. **Manual smoke test:** log in, navigate to `/customers` (via the sidebar "العملاء" link), confirm the empty state renders on a fresh database; create a customer via `/customers/new`; confirm redirect to `/customers/{id}` shows the saved contact details; edit the customer via `/customers/{id}/edit` and confirm changes persist; search for the customer by partial name/email on `/customers`; delete the customer from the detail page and confirm redirect to `/customers` with the row gone; navigate directly to a deleted/nonexistent customer id and confirm the 404 page renders.

## Done Criteria

- [ ] `/customers` lists customers with working search and pagination, including an empty state.
- [ ] `/customers/new` creates a customer and redirects to its detail page.
- [ ] `/customers/[id]` shows all stored contact details (phone, email, address) with Edit/Delete actions.
- [ ] `/customers/[id]/edit` pre-fills and saves changes, redirecting back to the detail page.
- [ ] Deleting a customer works end-to-end (verifies the `apiServerFetch` 204 fix from Task 3) and returns to the list.
- [ ] A nonexistent/deleted customer id renders the existing 404 page on both the detail and edit routes.
- [ ] `npm run build` and `npm run lint` both succeed with no new errors.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 02.**
