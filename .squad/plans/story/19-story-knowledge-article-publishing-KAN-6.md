# Story 19 — Publish Workflow & Public Knowledge Base (Story: KAN-6)

## Prerequisites

- [18-story-knowledge-base-core-crud-KAN-6.md](18-story-knowledge-base-core-crud-KAN-6.md) completed: this story **edits** `components/knowledge-base/KnowledgeArticlesPanel.tsx` to add publish/unpublish buttons and reuses `lib/types/knowledgeArticle.ts`, `lib/api/knowledgeArticle.api.ts`, and `app/(pages)/knowledge-base/actions.ts`.
- [app/widget/live-chat/page.tsx](<app/widget/live-chat/page.tsx>) — read as this codebase's only precedent for a public, unauthenticated page living outside the `(pages)` route group (no sidebar, no `getCurrentUser` gate) — this story's new `app/widget/knowledge-base/` pages follow that same placement, since `app/(pages)/layout.tsx` calls `getCurrentUser()` unconditionally (not a hard requirement, but every page under it renders inside the authenticated `AppLayout` shell, which is wrong for a customer-facing surface).
- **Backend dependency**: the `azm-crm-backend` sibling repo's `feature/kan-6-knowledge-base` branch (Story 22, `Publish Workflow for Help Articles & Guides`) is already implemented, exposing:
  - `POST /api/knowledge-articles/{id}/publish` → `Result` (200) / 404. Idempotent.
  - `POST /api/knowledge-articles/{id}/unpublish` → `Result` (200) / 404. Idempotent.
  - `GET /api/knowledge-articles/published?pageNumber=&pageSize=&type=&category=` → `Result<PaginatedResult<KnowledgeArticlePublicListItemDto>>` (200), **`[AllowAnonymous]`** — no `Authorization` header required or sent.
  - `GET /api/knowledge-articles/published/{id}` → `Result<KnowledgeArticlePublicDto>` (200) / 404 (also for a `Draft` article's real id — indistinguishable from a nonexistent one), **`[AllowAnonymous]`**.

  `KnowledgeArticlePublicListItemDto`: `id, title, type, category, publishedOn`. `KnowledgeArticlePublicDto`: `id, title, content, type, category, tags, publishedOn` (the backend's trailing `steps` field arrives with its own Story 23 — [20-story-knowledge-article-guide-steps-KAN-6.md](20-story-knowledge-article-guide-steps-KAN-6.md) adds it here too). Both DTOs omit every internal user id (`createdBy`, `updatedBy`, `publishedBy`) — this is deliberate on the backend side (see that story's Story Goal, outcome 5) and this story's types mirror the omission exactly, not adding those fields "just in case."

## Story Goal

Let an agent publish a `Draft` article so it becomes visible to customers, and unpublish it again, satisfying KAN-6's **"Publish help articles and guides"** acceptance criterion. Publishing exposes the article through this app's first customer-facing (unauthenticated) surface.

Outcomes:
1. Each row in `/knowledge-base`'s list gains a **"نشر"** (publish) or **"إلغاء النشر"** (unpublish) button depending on its current `status`, alongside the existing تعديل/حذف buttons.
2. A new public route, `/widget/knowledge-base`, lists every `Published` article (filterable by `type`/`category`), reachable without logging in — the customer-facing entry point KAN-6's description calls for ("so common issues can be resolved without creating tickets").
3. `/widget/knowledge-base/[id]` shows one published article's full content. Requesting a `Draft` article's id (or a nonexistent one) renders the same not-found state either way — this page must never let a visitor distinguish "this article doesn't exist" from "this article exists but isn't published."

**Not in scope**: any in-app notification when an article is published; a "schedule publish for later" date; role-gating who may publish (any authenticated agent can, matching every other KAN-5/KAN-6 action in this codebase); guide step content on the public detail page (Story 20 — this story's public detail page renders `title`/`content`/`category`/`tags`/`publishedOn` only, no steps yet, since the backend DTO doesn't carry them until its own Story 23).

## Context — Read These Files First

1. [18-story-knowledge-base-core-crud-KAN-6.md](18-story-knowledge-base-core-crud-KAN-6.md) — read in full for `KnowledgeArticlesPanel`'s current shape (this story edits it) and `lib/types/knowledgeArticle.ts`'s current field list (this story appends to it).
2. [components/tickets/EscalateTicketControl.tsx](components/tickets/EscalateTicketControl.tsx) — the precedent for a small, single-purpose state-flip button component wired to a server action, used as the shape for this story's inline publish/unpublish button (a `<Button onClick={...}>` calling an action and `router.refresh()`, with a brief pending/disabled state) — reused here as an inline button inside a list row rather than a standalone control on a detail page, since Story 18 has no detail page yet.
3. [app/widget/live-chat/page.tsx](<app/widget/live-chat/page.tsx>) lines 1-16 — the file-location and `"use client"`-vs-server-component precedent for a route under `app/widget/`; this story's public pages are plain **server** components (no client state needed for a read-only list/detail), unlike the live-chat widget's client-side SignalR page.
4. [app/(pages)/tickets/page.tsx](<app/(pages)/tickets/page.tsx>) lines 1-40 — the `searchParams` + list-fetch + empty-state shape this story's `app/widget/knowledge-base/page.tsx` follows for a public list page (no auth-derived data, unlike the tickets page).
5. [lib/api/fetch/server.ts](lib/api/fetch/server.ts) lines 63-73 — confirms `apiServerFetch` only attaches an `Authorization` header **when a token cookie exists**; for an anonymous visitor (no session) the header is simply omitted and the backend's `[AllowAnonymous]` actions still succeed — no separate "public" fetch client is needed.
6. [app/not-found.tsx](app/not-found.tsx) — reused (via Next.js's `notFound()`) for `/widget/knowledge-base/[id]`'s missing/draft-article case, the same call [app/(pages)/tickets/[id]/page.tsx](<app/(pages)/tickets/[id]/page.tsx>) line 28 makes on a 404 `result.status`.

## Implementation tasks

### 1 — Types

**Edit file: `lib/types/knowledgeArticle.ts`** (Story 18) — append two public-facing types:

```ts
export type KnowledgeArticlePublicListItem = Pick<
  KnowledgeArticle,
  "id" | "title" | "type" | "category" | "publishedOn"
>;

export type KnowledgeArticlePublic = Pick<
  KnowledgeArticle,
  "id" | "title" | "content" | "type" | "category" | "tags" | "publishedOn"
>;
```

### 2 — API client

**Edit file: `lib/api/knowledgeArticle.api.ts`** (Story 18) — add four entries to `knowledgeArticleEndpoints`:

```ts
publish: (id: string) =>
  apiServerFetch<void>({ url: `${KNOWLEDGE_ARTICLES_URL}/${id}/publish`, method: "POST" }),

unpublish: (id: string) =>
  apiServerFetch<void>({ url: `${KNOWLEDGE_ARTICLES_URL}/${id}/unpublish`, method: "POST" }),

listPublished: (params: { pageNumber?: number; pageSize?: number; type?: KnowledgeArticleType; category?: string }) =>
  apiServerFetch<PaginatedResult<KnowledgeArticlePublicListItem>>({
    url: `${KNOWLEDGE_ARTICLES_URL}/published`,
    params: {
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 20,
      type: params.type,
      category: params.category,
    },
    cache: "no-store",
  }),

getPublishedById: (id: string) =>
  apiServerFetch<KnowledgeArticlePublic>({ url: `${KNOWLEDGE_ARTICLES_URL}/published/${id}`, cache: "no-store" }),
```

Add `KnowledgeArticlePublicListItem`/`KnowledgeArticlePublic` to the type import line.

### 3 — Server actions

**Edit file: `app/(pages)/knowledge-base/actions.ts`** (Story 18) — append:

```ts
export async function publishKnowledgeArticleAction(id: string): Promise<KnowledgeBaseActionResult> {
  const result = await apiServerFetch<void>({ url: `/api/knowledge-articles/${id}/publish`, method: "POST" });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/knowledge-base");
  return { success: true };
}

export async function unpublishKnowledgeArticleAction(id: string): Promise<KnowledgeBaseActionResult> {
  const result = await apiServerFetch<void>({ url: `/api/knowledge-articles/${id}/unpublish`, method: "POST" });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/knowledge-base");
  return { success: true };
}
```

### 4 — Publish/unpublish button in the list panel

**Edit file: `components/knowledge-base/KnowledgeArticlesPanel.tsx`** (Story 18) — for each row, add a third action button before تعديل/حذف: `"نشر"` (`onClick` → `publishKnowledgeArticleAction(article.id)` then `router.refresh()`) when `article.status === "Draft"`, or `"إلغاء النشر"` (→ `unpublishKnowledgeArticleAction`) when `"Published"`. Track a local `isTogglingId: string | null` state so only the clicked row's button shows a `"جارٍ..."` disabled state during the call, following `SlaPoliciesPanel`'s existing `isDeleting` boolean pattern but keyed by id since multiple rows share this panel.

### 5 — Public list page

**Create file: `app/widget/knowledge-base/page.tsx`** — an `async` server component (no `"use client"`), `searchParams: Promise<{ type?: string; category?: string }>` (no pagination param namespacing needed — this is the only list on the page). Calls `knowledgeArticleEndpoints.listPublished({ type, category })`. Renders, inside a centered `min-h-screen bg-surface p-4` wrapper (matching [app/widget/live-chat/page.tsx](<app/widget/live-chat/page.tsx>) line 85's container class), a `.card` with `<h1>قاعدة المعرفة</h1>`, a short intro paragraph, a plain (non-namespaced) `type`/`category` filter row using `<Link>`-built hrefs (server component — no `updateParam`/client-side `useSearchParams`, since this page has no other panel to avoid colliding with), and a `<ul>` of `<Link href={`/widget/knowledge-base/${item.id}`}>` cards showing `title`, a type badge, and `category` when present. Empty state: `"لا يوجد محتوى منشور بعد"`.

### 6 — Public detail page

**Create file: `app/widget/knowledge-base/[id]/page.tsx`** — `params: Promise<{ id: string }>`. Calls `knowledgeArticleEndpoints.getPublishedById(id)`; on `!result.success && result.status === 404`, calls `notFound()` (same pattern as [app/(pages)/tickets/[id]/page.tsx](<app/(pages)/tickets/[id]/page.tsx>) line 28) — this covers both "id doesn't exist" and "id belongs to a Draft article" identically, since the backend's own predicate already merges those two cases into one 404 (see Prerequisites). Renders the same `min-h-screen bg-surface p-4` wrapper as the list page, with a `.card` showing `title`, a type badge, `category`/`tags` when present, `content` (`whitespace-pre-wrap`), and `formatDateTime(publishedOn)` when present. A `<Link href="/widget/knowledge-base">` back link at the top.

## Edge Cases & Failure Modes

- **Publishing an already-`Published` article, or unpublishing an already-`Draft` one** — the backend handler is a no-op success either way (see backend Story 22's idempotency note); the frontend button simply reflects the row's current `status` after `router.refresh()`, so a double-click before the refresh lands is harmless — the second call is still a no-op 200.
- **A visitor opens `/widget/knowledge-base/{id}` for an article an agent unpublishes moments later** — no invalidation exists (documented backend gap, see Story 22's Edge Cases); a page refresh after the unpublish then 404s via this story's `notFound()` call.
- **A visitor hand-edits `/widget/knowledge-base/{id}` to a `Draft` article's real, guessed id** — renders the exact same not-found page as a random/nonexistent id, per Story Goal outcome 3 — there is no separate "this exists but is unpublished" message anywhere in this story's UI.
- **`?type=`/`?category=` on the public list page set to values matching nothing** — `apiServerFetch`'s `result.success ? result.data.items : []` guard renders the empty state.
- **An agent navigates to `/widget/knowledge-base` while logged in (same browser)** — renders identically to a logged-out visitor; this route reads no auth cookie and calls only `[AllowAnonymous]` endpoints, so an agent's session has no effect on it (matches `app/widget/live-chat`'s existing behavior).

## Test Plan

No automated test infrastructure exists in this repository. Manual verification only, per Verification Steps below.

## Verification Steps

1. **Frontend builds:** `pnpm build` from the repository root.
2. **Lint passes:** `pnpm lint`.
3. **Frontend runs against a live backend:** `pnpm dev`, with `azm-crm-backend`'s `feature/kan-6-knowledge-base` branch running locally.
4. **Manual smoke test:** create a `Draft` FAQ article via `/knowledge-base` (Story 18); confirm it does **not** appear on `/widget/knowledge-base` opened in a private/incognito window (no session). Click "نشر" on it; confirm it now appears in the incognito window's list and its `/widget/knowledge-base/{id}` page renders its content. Click "إلغاء النشر"; confirm it disappears from the incognito list again and its detail page now 404s (`app/not-found.tsx`'s page).

## Done Criteria

- [ ] Each `/knowledge-base` row shows a working "نشر"/"إلغاء النشر" button matching its current status.
- [ ] `/widget/knowledge-base` and `/widget/knowledge-base/[id]` are reachable without logging in and show only `Published` content.
- [ ] A `Draft` article's id 404s on `/widget/knowledge-base/[id]` indistinguishably from a nonexistent id.
- [ ] `pnpm build` and `pnpm lint` both succeed with no new errors.

This story satisfies KAN-6's "Publish help articles and guides" acceptance criterion.
