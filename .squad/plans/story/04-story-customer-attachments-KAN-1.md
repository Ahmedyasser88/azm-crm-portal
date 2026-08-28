# Story 04 — Customer Attachments (Story: KAN-1)

## Prerequisites

- [01-story-customer-core-crud-KAN-1.md](01-story-customer-core-crud-KAN-1.md) completed: requires `lib/api/customer.api.ts`, `app/(pages)/customers/actions.ts`, `lib/constants/auth.ts`, and the `/customers/[id]` page's `<div className="space-y-6">` wrapper.
- Independent of [02-story-customer-interactions-KAN-1.md](02-story-customer-interactions-KAN-1.md) and [03-story-customer-notes-KAN-1.md](03-story-customer-notes-KAN-1.md) — attachments are a third, separate section on the same detail page.
- **Backend dependency**: the `azm-crm-backend` sibling repo's Story 04 (`Customer Attachments`) must be deployed, exposing:
  - `POST /api/customers/{customerId}/attachments` (multipart/form-data, file field name `file`) → `Result<Guid>` (201) / 404 / 400 (oversized/zero-byte/missing file — the backend enforces a 10 MB per-file default via `FileStorageSettings.MaxFileSizeBytes`, below Kestrel's separate 50 MB request-body ceiling)
  - `GET /api/customers/{customerId}/attachments?pageNumber=&pageSize=` → `Result<PaginatedResult<CustomerAttachmentDto>>` (200) / 404
  - `GET /api/customers/{customerId}/attachments/{attachmentId}/download` → raw file bytes with `Content-Type`/`Content-Disposition` set from the stored metadata (200) / 404 (unknown id, or an id that belongs to a *different* customer than the one in the route — see the backend story's cross-customer-access edge case)

  `CustomerAttachmentDto` fields: `id`, `customerId`, `fileName`, `contentType`, `fileSizeBytes`, `createdOn`. All three endpoints require the same `Authorization: Bearer <token>` header as every other customer endpoint — critically, this means the download endpoint **cannot** be linked to directly from a plain `<a href>` in the browser (no cookie/session auth exists on the backend, only bearer tokens the frontend keeps in an `httpOnly` cookie inaccessible to client-side JS) and must be proxied through a Next.js Route Handler (Task 4).

## Story Goal

Let support agents upload file attachments to a customer profile and later list and download them, satisfying KAN-1's "Add notes and attachments to customer records" acceptance criterion (the attachments half — notes are Story 03).

Outcomes:
1. An "Add Attachment" action on `/customers/[id]` uploads a file (drag-and-drop not required — a plain file input is sufficient).
2. The attachment list renders on `/customers/[id]`, newest first, paginated, each with a working download link.

**Not in scope**: deleting an attachment, replacing/versioning an attachment, client-side virus scanning, and upload progress bars (a simple disabled-button-while-uploading state is sufficient, matching every other form in this feature).

## Context — Read These Files First

1. [01-story-customer-core-crud-KAN-1.md](01-story-customer-core-crud-KAN-1.md) — read in full. Reuses the same component/page-wiring shape as `InteractionHistorySection`/`NoteHistorySection`.
2. [02-story-customer-interactions-KAN-1.md](02-story-customer-interactions-KAN-1.md) and [03-story-customer-notes-KAN-1.md](03-story-customer-notes-KAN-1.md) — read both in full. This story's `AttachmentsSection` mirrors `InteractionHistorySection`/`NoteHistorySection`'s "`.card` + add-dialog + paginated list" shape, using `?attachmentsPage=` as its distinct query-param name.
3. [lib/api/fetch/server.ts](lib/api/fetch/server.ts) — read in full (119 lines, or 122 after Story 01's Task 3 edit). Two things this story reuses directly:
   - `getAuthToken` (lines 49, 64–65: `const cookieStore = await cookies(); const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;`) — the exact cookie-read snippet Task 3's upload server action and Task 4's download Route Handler both replicate, since neither goes through the generic `apiServerFetch` (which JSON-encodes every body and can't express `multipart/form-data`, and which returns parsed JSON rather than a raw byte stream).
   - The **already-implemented, currently-unused** `responseType: "arrayBuffer"` branch (lines 83–93: on success, reads `response.arrayBuffer()` and returns it as a base64 string via `Buffer.from(buffer).toString("base64")`) — Task 4's download Route Handler is the **first consumer** of this code path in the codebase, calling `apiServerFetch` with `responseType: "arrayBuffer"` and decoding the returned base64 string back into bytes with `Buffer.from(data, "base64")`.
4. [lib/constants/auth.ts](lib/constants/auth.ts) — `AUTH_TOKEN_COOKIE = "azm_crm_auth_token"` (line 1), used by both the upload action and the download Route Handler to read the token the same way `apiServerFetch` does internally.
5. [app/login/actions.ts](app/login/actions.ts) — lines 54–64 (the raw, non-`apiServerFetch` `fetch(...)` call `login()` makes, since `apiServerFetch` doesn't fit its unauthenticated case). Precedent for this story's upload action similarly bypassing `apiServerFetch` for a case its generic JSON-body contract doesn't fit (multipart), rather than mutating that shared client's type signature for one caller.
6. [app/(pages)/customers/[id]/page.tsx](app/(pages)/customers/[id]/page.tsx) — edited by Stories 02–03 to add `InteractionHistorySection`/`NoteHistorySection`. This story adds `AttachmentsSection` alongside them.
7. [lib/utils/date.ts](lib/utils/date.ts) — `formatDateTime` (lines 1–12), reused to render each attachment's `createdOn`.

## Implementation tasks

### 1 — Types

**Create file: `lib/types/customerAttachment.ts`**

```ts
export type CustomerAttachment = {
  id: string;
  customerId: string;
  fileName: string;
  contentType: string;
  fileSizeBytes: number;
  createdOn: string;
};
```

### 2 — API client (list only)

**Edit file: `lib/api/customer.api.ts`** — add an `attachments` sub-object to `customerEndpoints` (alongside `interactions`/`notes`); this only covers the list read — upload and download are handled outside `apiServerFetch` (Tasks 3–4):

```ts
  attachments: {
    list: (customerId: string, params: { pageNumber?: number; pageSize?: number } = {}) =>
      apiServerFetch<PaginatedResult<CustomerAttachment>>({
        url: `${CUSTOMERS_URL}/${customerId}/attachments`,
        params: { pageNumber: params.pageNumber ?? 1, pageSize: params.pageSize ?? 20 },
        cache: "no-store",
      }),
  },
```

Add `import type { CustomerAttachment } from "../types/customerAttachment";` to the file's import block.

### 3 — Upload server action (multipart, bypasses `apiServerFetch`)

**Edit file: `app/(pages)/customers/actions.ts`** — add:

```ts
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
```

Add `import { cookies } from "next/headers";` and `import { AUTH_TOKEN_COOKIE } from "@/lib/constants/auth";` to the file's import block (the file already imports `apiServerFetch`, `revalidatePath`, `redirect` from Story 01). Note the `fetch` call deliberately omits a `Content-Type` header — the browser/runtime sets `multipart/form-data; boundary=...` automatically when `body` is a `FormData` instance; setting it manually would drop the boundary and break the backend's multipart parsing.

### 4 — Download Route Handler (streams bytes back with auth)

**Create file: `app/api/customers/[id]/attachments/[attachmentId]/download/route.ts`**

```ts
import { NextResponse } from "next/server";
import { apiServerFetch } from "@/lib/api/fetch";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const { id, attachmentId } = await params;

  const result = await apiServerFetch<string>({
    url: `/api/customers/${id}/attachments/${attachmentId}/download`,
    responseType: "arrayBuffer",
    cache: "no-store",
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 500 });
  }

  const bytes = Buffer.from(result.data, "base64");

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": "attachment",
    },
  });
}
```

This route lives under `app/api/` (a plain Next.js Route Handler, distinct from the `app/(pages)/` page-route tree) so it is reachable as `GET /api/customers/{id}/attachments/{attachmentId}/download` from a plain `<a href>` — the browser's normal navigation-to-download flow — while `apiServerFetch` still attaches the agent's bearer token server-side, which a client-side link to the *backend* URL directly could never do. The generic `Content-Type: application/octet-stream` / `Content-Disposition: attachment` (no filename) is a deliberate simplification for this story — using the real `contentType`/`fileName` from `CustomerAttachmentDto` (already available to the page that renders the download link) is a two-line follow-up if inline preview or a proper save-as filename becomes a requirement; not required by KAN-1's acceptance criteria.

### 5 — Components

**Create file: `components/customers/UploadAttachmentForm.tsx`** (`"use client"`) — a form with a single `<input type="file" name="file" required />` and a `Button type="submit"`. On submit, build a `FormData` from the form element (`new FormData(event.currentTarget)`) — the input's `name="file"` matches the backend's `IFormFile file` parameter name exactly — and call `uploadAttachmentAction(customerId, formData)`; on success, reset the form and call `onUploaded: () => void`; on failure, show the error via the same `role="alert"` pattern used throughout this feature.

**Create file: `components/customers/AttachmentsSection.tsx`** (`"use client"`) — Props: `{ customerId: string; attachments: CustomerAttachment[]; hasNextPage: boolean; hasPreviousPage: boolean; page: number }`. Renders a `.card` with:
- Header: "المرفقات" + a `Button` "إضافة مرفق" that opens `UploadAttachmentForm` inside the same overlay-modal pattern used by `LogInteractionForm`/`AddNoteForm`.
- A list of attachments, each showing `fileName`, a human-readable size (format `fileSizeBytes` as KB/MB, e.g. `(bytes / 1024).toFixed(1)` KB under 1 MB else `(bytes / 1_048_576).toFixed(1)` MB), `formatDateTime(createdOn)`, and a download link: `<a href={`/api/customers/${customerId}/attachments/${attachment.id}/download`} className="text-primary hover:underline">تنزيل</a>` — a plain anchor tag pointed at the Route Handler from Task 4 (not a client-side `fetch`), since a normal browser navigation is what triggers the "Save As" download behavior for a non-HTML response.
- Empty state: "لا توجد مرفقات بعد" when `attachments.length === 0`.
- Prev/Next pagination using `?attachmentsPage=`.
- On successful upload (`onUploaded`), call `router.refresh()` and close the dialog — same pattern as the other two history sections.

### 6 — Page wiring

**Edit file: `app/(pages)/customers/[id]/page.tsx`** — inside the `<div className="space-y-6">` wrapper, after `NoteHistorySection` (or after whichever sections from Stories 02–03 are present), add:

```tsx
const attachmentsPage = Number(searchParams.attachmentsPage) || 1;
const attachmentsResult = await customerEndpoints.attachments.list(id, {
  pageNumber: attachmentsPage,
});

// ... inside the JSX:
<AttachmentsSection
  customerId={id}
  attachments={attachmentsResult.success ? attachmentsResult.data.items : []}
  hasNextPage={attachmentsResult.success ? attachmentsResult.data.hasNextPage : false}
  hasPreviousPage={attachmentsResult.success ? attachmentsResult.data.hasPreviousPage : false}
  page={attachmentsPage}
/>
```

Add `attachmentsPage` to the page component's `searchParams` type alongside `interactionsPage`/`notesPage` from Stories 02–03, if present.

## Edge Cases & Failure Modes

- **Uploading against a customer deleted between page load and submit** — the backend's `UploadCustomerAttachmentCommandHandler` checks the customer exists (non-deleted) before touching storage and 404s otherwise; `uploadAttachmentAction`'s `!response.ok` branch surfaces `payload?.errors?.[0]` (falling back to a generic Arabic message if the body isn't the expected shape) via `UploadAttachmentForm`'s error paragraph.
- **File exceeds the backend's configured max size** (10 MB default) — the backend returns 400 with a `Validation.FileTooLarge`-derived message in `errors[0]`; surfaced the same way. This story does not duplicate the size check client-side (no `maxLength`-equivalent for `<input type="file">` in this implementation) — a client-side pre-check to avoid an unnecessary upload attempt is a reasonable follow-up, not required here.
- **Zero-byte or missing file** — the backend rejects a zero-byte file (400) and ASP.NET Core's model binding itself rejects a request with no `file` part (400) before the command is even constructed; the `<input type="file" required />` attribute catches the "forgot to choose a file" case client-side, and the server error path handles the rest.
- **Downloading an `attachmentId` that belongs to a different customer than the `id` in the route** — the backend's `GetCustomerAttachmentContentQueryHandler` scopes its lookup to `(attachmentId, customerId)` together and 404s on a mismatch, closing off guessing another customer's attachment by id; the Route Handler in Task 4 returns that 404 status straight through via `NextResponse.json({ error }, { status: result.status ?? 500 })`. This cannot actually be triggered from this story's own UI (every download link is built from `customerId` + an attachment already listed for that same customer) — relevant only if a URL is hand-edited.
- **Downloading a nonexistent `attachmentId`** — same 404 path as above; the browser shows the JSON error body inline (Next.js Route Handlers don't auto-render a styled error page for a non-2xx JSON response reached via `<a href>` navigation) — acceptable for this story; a friendlier "attachment not found" page is a reasonable follow-up, not required by KAN-1.
- **Session/token expired at download time** — `apiServerFetch` inside the Route Handler (Task 4) hits its existing 401 → `redirect("/login")` path (`lib/api/fetch/server.ts` lines 82, 116–119); since a Route Handler's `redirect()` call still works via Next.js's framework-level `NEXT_REDIRECT` interception, the browser navigating to the download link when the session has expired lands on `/login` instead of a broken download — consistent with how every other page in this app behaves on an expired session.
- **Very large file uploads (near the backend's 50 MB Kestrel ceiling) on a slow connection** — `uploadAttachmentAction` has no explicit timeout beyond whatever Next.js's server-action default is; the "جارٍ الرفع..."-style disabled-button state (mirroring `isSubmitting` in every other form in this feature) is the only feedback given — no upload-progress percentage. Acceptable for this story's scope; a progress indicator is a reasonable follow-up.
- **Uploaded `fileName` containing unusual characters (e.g. right-to-left Arabic filenames, spaces, or symbols)** — passed through as-is to the backend, which sanitizes only its internal storage key, not the display `fileName` (see the backend story's own edge-case note) — `AttachmentsSection` renders `fileName` directly with no client-side sanitization needed, since it's not being used to construct a filesystem path on the frontend at all.
- **Attachments section on a customer with zero attachments** — renders the "لا توجد مرفقات بعد" empty state; "إضافة مرفق" stays available.

## Test Plan

No automated test infrastructure exists in this repository yet (see Story 01's Test Plan note). Manual verification only, per the Verification Steps below.

## Verification Steps

1. **Frontend builds:** `npm run build` from the repository root.
2. **Lint passes:** `npm run lint`.
3. **Manual smoke test:** with `azm-crm-backend` running (Story 04 deployed) and `npm run dev`, open an existing customer's detail page, confirm the attachments section renders empty; upload a small file via "إضافة مرفق" and confirm it appears in the list with a correct human-readable size; click "تنزيل" and confirm the browser downloads the file with matching byte content; upload enough files to exercise pagination and confirm Prev/Next work; upload a file larger than the backend's configured limit and confirm the rejection message surfaces; log out (or let the session cookie expire) and confirm navigating to a download link redirects to `/login` instead of erroring.

## Done Criteria

- [ ] `/customers/[id]` shows the customer's attachments, newest first, with working pagination.
- [ ] Agents can upload a file and see it appear in the list.
- [ ] Clicking "تنزيل" downloads the original file content correctly, with the agent's auth token attached server-side via the new Route Handler (verifying the `apiServerFetch` `responseType: "arrayBuffer"` path works end-to-end for its first real consumer).
- [ ] An oversized/zero-byte/missing-file upload is rejected with a surfaced error message.
- [ ] Cross-customer attachment access (a mismatched `attachmentId`/`customerId` pair) 404s through the Route Handler.
- [ ] `npm run build` and `npm run lint` both succeed with no new errors.
