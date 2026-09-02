# Story 18 — Knowledge Base Core CRUD & FAQ Entries (Story: KAN-6)

## Prerequisites

- None — this story adds a brand-new top-level page and sidebar entry, independent of every prior KAN-1..KAN-5 story, mirroring how [14-story-sla-policies-KAN-5.md](14-story-sla-policies-KAN-5.md) started the `/automation` page from scratch.
- [14-story-sla-policies-KAN-5.md](14-story-sla-policies-KAN-5.md) — read as the worked example for this story's list-panel-with-modal-form-and-pagination shape (`SlaPoliciesPanel`/`SlaPolicyForm`/`slaPolicyActions.ts`), which this story's `KnowledgeArticlesPanel`/`KnowledgeArticleForm`/`actions.ts` copy directly.
- **Backend dependency**: the `azm-crm-backend` sibling repo's `feature/kan-6-knowledge-base` branch (Story 21, `Knowledge Base Core CRUD & FAQ Entries`) is already implemented on the working tree (verified against `src/AzmCrm.API/Controllers/KnowledgeArticlesController.cs` and `src/AzmCrm.Application/Features/KnowledgeBase/DTOs/KnowledgeArticleDto.cs` in that repo), exposing:
  - `POST /api/knowledge-articles` (body: `{title, content, type, category?, tags?}`) → `Result<Guid>` (201) / 400.
  - `GET /api/knowledge-articles/{id}` → `Result<KnowledgeArticleDto>` (200) / 404.
  - `GET /api/knowledge-articles?pageNumber=&pageSize=&type=&status=&category=` → `Result<PaginatedResult<KnowledgeArticleListItemDto>>` (200).
  - `PUT /api/knowledge-articles/{id}` (same body as create) → `Result` (200) / 400 / 404.
  - `DELETE /api/knowledge-articles/{id}` → 204 / 404.

  `KnowledgeArticleListItemDto`: `id, title, type, status, category, createdOn`. `KnowledgeArticleDto`: `id, title, content, type, status, category, tags, publishedOn, publishedBy, createdOn, updatedOn, steps` (the backend's `steps` field is populated starting with its own Story 23 — this frontend story's types omit it; [20-story-knowledge-article-guide-steps-KAN-6.md](20-story-knowledge-article-guide-steps-KAN-6.md) adds it, the same incremental-DTO convention [17-story-sla-breach-alerts-KAN-5.md](17-story-sla-breach-alerts-KAN-5.md) used). `type` is one of `"Faq" | "Article" | "Guide"`; `status` is one of `"Draft" | "Published"` — every article this story creates or edits is always `Draft` (flipping it is [19-story-knowledge-article-publishing-KAN-6.md](19-story-knowledge-article-publishing-KAN-6.md)'s job; this story never calls a publish endpoint).

## Story Goal

Let an agent create, categorize, and manage knowledge base content — FAQ entries, help articles, and step-by-step guides, all modeled as one `KnowledgeArticle` shape distinguished by a `type` field — satisfying KAN-6's **"Create and manage FAQ entries"** acceptance criterion.

Outcome: a new `/knowledge-base` page (with its own "قاعدة المعرفة" sidebar entry) lists every article newest-first, filterable by type/status/category, with add/edit/delete via the same modal-form convention `/automation`'s three panels already use.

**Not in scope**: publishing/unpublishing an article, or any customer-facing read surface (Story 19); attaching ordered steps to a `Guide`-typed article (Story 20 — `type: "Guide"` can be selected here, but no step UI exists yet); any search beyond the list's exact-match type/status/category filters (Story 21); an article detail page — every field this story exposes fits in the same create/edit modal `SlaPolicyForm` uses, so there is no `/knowledge-base/[id]` route yet (Story 20 introduces one, once steps need their own management surface).

## Context — Read These Files First

1. [app/(pages)/automation/page.tsx](<app/(pages)/automation/page.tsx>) — the `searchParams` + `Promise.all` + stacked-`.card`-panels shell this story's new `app/(pages)/knowledge-base/page.tsx` follows for a single panel instead of four.
2. [components/automation/SlaPoliciesPanel.tsx](components/automation/SlaPoliciesPanel.tsx) (full file) — the exact list/filter/pagination/modal shape `KnowledgeArticlesPanel` copies: `updateParam`/`buildHref` query-param helpers, `useState` for `addOpen`/`editingX`/`deletingX`, the two `fixed inset-0` modal blocks, and the trailing `ConfirmDialog`.
3. [components/automation/SlaPolicyForm.tsx](components/automation/SlaPolicyForm.tsx) (full file) — the exact controlled-form shape `KnowledgeArticleForm` copies: a `mode: "create" | "edit"` prop, local `values` state, an `onSubmit: (values) => Promise<ActionResult>` prop, inline `role="alert"` error display.
4. [app/(pages)/automation/slaPolicyActions.ts](<app/(pages)/automation/slaPolicyActions.ts>) (full file) — the exact `"use server"` action shape (`ActionResult` union type, `apiServerFetch` call, `revalidatePath`) this story's `app/(pages)/knowledge-base/actions.ts` copies for create/update/delete.
5. [lib/api/assignmentRule.api.ts](lib/api/assignmentRule.api.ts) — the exact `apiServerFetch<PaginatedResult<T>>` list-endpoint shape (optional filter params, `cache: "no-store"`) `knowledgeArticleEndpoints.list` follows.
6. [lib/types/slaPolicy.ts](lib/types/slaPolicy.ts) — the exact `X` / `XListItem` (via `Pick`) / `XFormValues` three-type shape `lib/types/knowledgeArticle.ts` follows.
7. [lib/constants/sla.ts](lib/constants/sla.ts) — the exact `Record<Enum, string>` + `Object.keys(...) as Enum[]` shape this story's `lib/constants/knowledgeArticle.ts` follows, for two enums (`type`, `status`) instead of one.
8. [lib/constants/sidebar.ts](lib/constants/sidebar.ts) (full file, 15 lines) — the `navItems` array this story appends one entry to.
9. [components/layout/Sidebar.tsx](components/layout/Sidebar.tsx) lines 6-26 — **the sidebar entry's icon must also be registered here**: the `ICONS` record maps each `navItems[].icon` string to an imported `lucide-react` component; adding a `navItems` row without a matching `ICONS` entry silently falls back to `LayoutDashboard` (line 51, `ICONS[icon] ?? LayoutDashboard`). This story adds a `BookOpen` import and an `"book-open"` entry.
10. [components/customers/ConfirmDialog.tsx](components/customers/ConfirmDialog.tsx) (full file) — reused as-is for the delete confirmation, no changes needed.

## Implementation tasks

### 1 — Types

**Create file: `lib/types/knowledgeArticle.ts`**

```ts
export type KnowledgeArticleType = "Faq" | "Article" | "Guide";
export type KnowledgeArticleStatus = "Draft" | "Published";

export type KnowledgeArticle = {
  id: string;
  title: string;
  content: string;
  type: KnowledgeArticleType;
  status: KnowledgeArticleStatus;
  category: string | null;
  tags: string | null;
  publishedOn: string | null;
  publishedBy: string | null;
  createdOn: string;
  updatedOn: string | null;
};

export type KnowledgeArticleListItem = Pick<
  KnowledgeArticle,
  "id" | "title" | "type" | "status" | "category" | "createdOn"
>;

export type KnowledgeArticleFormValues = {
  title: string;
  content: string;
  type: KnowledgeArticleType;
  category: string;
  tags: string;
};
```

### 2 — Constants

**Create file: `lib/constants/knowledgeArticle.ts`**

```ts
import type { KnowledgeArticleType, KnowledgeArticleStatus } from "@/lib/types/knowledgeArticle";

export const KNOWLEDGE_ARTICLE_TYPE_LABELS: Record<KnowledgeArticleType, string> = {
  Faq: "سؤال شائع",
  Article: "مقال",
  Guide: "دليل إرشادي",
};
export const KNOWLEDGE_ARTICLE_TYPES = Object.keys(KNOWLEDGE_ARTICLE_TYPE_LABELS) as KnowledgeArticleType[];

export const KNOWLEDGE_ARTICLE_STATUS_LABELS: Record<KnowledgeArticleStatus, string> = {
  Draft: "مسودة",
  Published: "منشور",
};
export const KNOWLEDGE_ARTICLE_STATUSES = Object.keys(
  KNOWLEDGE_ARTICLE_STATUS_LABELS
) as KnowledgeArticleStatus[];
```

### 3 — API client

**Create file: `lib/api/knowledgeArticle.api.ts`**

```ts
import { apiServerFetch } from "./fetch";
import type {
  KnowledgeArticle,
  KnowledgeArticleListItem,
  KnowledgeArticleType,
  KnowledgeArticleStatus,
} from "../types/knowledgeArticle";
import type { PaginatedResult } from "../types/pagination";

const KNOWLEDGE_ARTICLES_URL = "/api/knowledge-articles";

export const knowledgeArticleEndpoints = {
  list: (params: {
    pageNumber?: number;
    pageSize?: number;
    type?: KnowledgeArticleType;
    status?: KnowledgeArticleStatus;
    category?: string;
  }) =>
    apiServerFetch<PaginatedResult<KnowledgeArticleListItem>>({
      url: KNOWLEDGE_ARTICLES_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        type: params.type,
        status: params.status,
        category: params.category,
      },
      cache: "no-store",
    }),

  getById: (id: string) =>
    apiServerFetch<KnowledgeArticle>({ url: `${KNOWLEDGE_ARTICLES_URL}/${id}`, cache: "no-store" }),
};
```

### 4 — Server actions

**Create file: `app/(pages)/knowledge-base/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { apiServerFetch } from "@/lib/api/fetch";
import type { KnowledgeArticleFormValues } from "@/lib/types/knowledgeArticle";

export type KnowledgeBaseActionResult = { success: true } | { success: false; error: string };

function toRequestBody(values: KnowledgeArticleFormValues) {
  return {
    title: values.title.trim(),
    content: values.content.trim(),
    type: values.type,
    category: values.category.trim() || null,
    tags: values.tags.trim() || null,
  };
}

export async function createKnowledgeArticleAction(
  values: KnowledgeArticleFormValues
): Promise<KnowledgeBaseActionResult> {
  const result = await apiServerFetch<string>({
    url: "/api/knowledge-articles",
    method: "POST",
    body: toRequestBody(values),
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/knowledge-base");
  return { success: true };
}

export async function updateKnowledgeArticleAction(
  id: string,
  values: KnowledgeArticleFormValues
): Promise<KnowledgeBaseActionResult> {
  const result = await apiServerFetch<void>({
    url: `/api/knowledge-articles/${id}`,
    method: "PUT",
    body: toRequestBody(values),
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/knowledge-base");
  return { success: true };
}

export async function deleteKnowledgeArticleAction(id: string): Promise<KnowledgeBaseActionResult> {
  const result = await apiServerFetch<void>({ url: `/api/knowledge-articles/${id}`, method: "DELETE" });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/knowledge-base");
  return { success: true };
}
```

### 5 — Form component

**Create file: `components/knowledge-base/KnowledgeArticleForm.tsx`** (`"use client"`) — copies [SlaPolicyForm.tsx](components/automation/SlaPolicyForm.tsx)'s shape exactly: `mode: "create" | "edit"`, `initialValues: KnowledgeArticleFormValues`, `onSubmit: (values) => Promise<KnowledgeBaseActionResult>`, `onDone: () => void`. Fields, in order: `title` (text input, required), `type` (`<select>` over `KNOWLEDGE_ARTICLE_TYPES`/`KNOWLEDGE_ARTICLE_TYPE_LABELS`), `category` (text input, optional), `tags` (text input, optional, placeholder `"مفصولة بفواصل"` — comma-separated, matching the free-text `string?` the backend stores verbatim), `content` (a `<textarea rows={6}>` instead of `SlaPolicyForm`'s numeric inputs, required). Same `role="alert"` error paragraph and submit-button disabled/label pattern.

### 6 — List panel

**Create file: `components/knowledge-base/KnowledgeArticlesPanel.tsx`** (`"use client"`) — copies [SlaPoliciesPanel.tsx](components/automation/SlaPoliciesPanel.tsx)'s shape exactly. Props: `{ articles: KnowledgeArticleListItem[]; hasNextPage: boolean; hasPreviousPage: boolean; page: number; typeFilter: string; statusFilter: string; categoryFilter: string }`.

Renders a `.card space-y-4`:
- Header: `<h2>قاعدة المعرفة</h2>` + `+ إضافة محتوى` button opening the create modal.
- Filter row: two `<select>`s (`type` over `KNOWLEDGE_ARTICLE_TYPES`, `status` over `KNOWLEDGE_ARTICLE_STATUSES`, each with a leading `""` = "الكل" option) writing to `?kbType=`/`?kbStatus=` via the same `updateParam` helper (which also clears `?kbPage=`), plus a `category` text `<input>` that writes to `?kbCategory=` on blur/Enter (a free-text filter, unlike the other two enum `<select>`s — mirrors the backend's `category` being a plain string, not a fixed set).
- Empty state: `"لا يوجد محتوى بعد"` when `articles.length === 0`.
- A `<ul className="space-y-3">` of rows, each showing: `article.title`, a type badge (`KNOWLEDGE_ARTICLE_TYPE_LABELS[article.type]`, `bg-primary-100 text-primary`), a status badge (`KNOWLEDGE_ARTICLE_STATUS_LABELS[article.status]` — `bg-gray-200 text-text-secondary` for `Draft`, `bg-primary-100 text-primary` for `Published`), `article.category` when present, and `تعديل`/`حذف` buttons opening the edit modal / `ConfirmDialog`.
- Prev/Next pagination via `?kbPage=`.
- The same two `fixed inset-0` create/edit modal blocks as `SlaPoliciesPanel`, each rendering `<KnowledgeArticleForm mode="create|edit" ... />`.
- Trailing `<ConfirmDialog>` for delete, title `"حذف المحتوى"`, description `` `هل أنت متأكد من حذف "${deletingArticle?.title}"؟` ``.

### 7 — Page

**Create file: `app/(pages)/knowledge-base/page.tsx`** — copies [app/(pages)/automation/page.tsx](<app/(pages)/automation/page.tsx>)'s shell shape for one panel: a `searchParams` type with `kbPage?/kbType?/kbStatus?/kbCategory?`, one `knowledgeArticleEndpoints.list(...)` call, a page-header `.card` (`<h1>قاعدة المعرفة</h1>` + a short description paragraph), and `<KnowledgeArticlesPanel ... />` below it.

### 8 — Sidebar

**Edit file: `lib/constants/sidebar.ts`** — append one entry to `navItems`, after the `"الأتمتة وضمان الخدمة"` row:

```ts
{ label: "قاعدة المعرفة", href: "/knowledge-base", icon: "book-open" },
```

**Edit file: `components/layout/Sidebar.tsx`** — add `BookOpen` to the `lucide-react` import (line 6-15) and `"book-open": BookOpen,` to the `ICONS` record (line 18-26).

## Edge Cases & Failure Modes

- **`category`/`tags` left empty in the form** — `toRequestBody` sends `null` (not `""`) for either when the trimmed value is empty, matching the backend's optional `string?` fields; the list/edit views render nothing for a `null` `category` (no badge) rather than an empty badge.
- **Filtering by `?kbCategory=` with a value that matches no article** — `apiServerFetch`'s `result.success ? result.data.items : []` guard (same pattern every other panel on `/automation` uses) renders the empty state, not an error.
- **Creating a `Guide`-typed article** — allowed and saved exactly like `Faq`/`Article`; this story attaches no steps UI, so a `Guide` article created here has zero steps until [20-story-knowledge-article-guide-steps-KAN-6.md](20-story-knowledge-article-guide-steps-KAN-6.md) is implemented — an accepted, backend-documented gap (see that backend story's Edge Cases).
- **`Content` longer than 8000 characters or `Title` longer than 300** — rejected server-side by the backend validator; `apiServerFetch` returns `{success: false, error}` from the first validation message, surfaced via the form's `role="alert"` paragraph exactly like `SlaPolicyForm`'s existing error handling — no client-side length limit is added in this story.
- **Deleting an article that is currently `Published`** — allowed unconditionally; this story does not special-case `status` on delete (the backend soft-deletes regardless of status, per its own Story 21 Edge Cases).
- **`?kbPage=` combined with `?kbType=`/`?kbStatus=`/`?kbCategory=`** — namespaced independently from `/automation`'s own `sla*`/`assign*`/`esc*`/`notif*` params (this is a different page entirely, so no collision risk regardless).

## Test Plan

No automated test infrastructure exists in this repository (see every prior story's identical note, e.g. [17-story-sla-breach-alerts-KAN-5.md](17-story-sla-breach-alerts-KAN-5.md)). Manual verification only, per Verification Steps below.

## Verification Steps

1. **Frontend builds:** `pnpm build` from the repository root.
2. **Lint passes:** `pnpm lint`.
3. **Frontend runs against a live backend:** `pnpm dev`, with `azm-crm-backend`'s `feature/kan-6-knowledge-base` branch running locally.
4. **Manual smoke test:** open `/knowledge-base` from the new sidebar entry; create an FAQ article (`type: Faq`, a `category`, no `tags`); confirm it appears in the list as `"مسودة"`; edit it (change `title` and add `tags`), confirm the change persists after `router.refresh()`; filter by `type=Faq` and confirm it still shows; filter by a `category` that doesn't match and confirm the empty state; delete it and confirm it disappears from the list.

## Done Criteria

- [ ] `/knowledge-base` is reachable from a new "قاعدة المعرفة" sidebar entry and lists articles newest-first.
- [ ] An agent can create, edit, and delete an article of any `type` (`Faq`/`Article`/`Guide`) via the modal form.
- [ ] The list filters correctly by `type`, `status`, and `category`.
- [ ] `pnpm build` and `pnpm lint` both succeed with no new errors.

This story satisfies KAN-6's "Create and manage FAQ entries" acceptance criterion and creates the `/knowledge-base` page and `KnowledgeArticle` types Stories 19-21 extend.
