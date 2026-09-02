# Story 20 — Step-by-Step Guide Steps (Story: KAN-6)

## Prerequisites

- [18-story-knowledge-base-core-crud-KAN-6.md](18-story-knowledge-base-core-crud-KAN-6.md) completed: requires `KnowledgeArticle`, `lib/api/knowledgeArticle.api.ts`, `app/(pages)/knowledge-base/page.tsx`.
- [19-story-knowledge-article-publishing-KAN-6.md](19-story-knowledge-article-publishing-KAN-6.md) completed: requires `KnowledgeArticlePublic`, `app/widget/knowledge-base/[id]/page.tsx` (this story edits it to render steps).
- [11-story-agent-tasks-reminders-KAN-4.md](11-story-agent-tasks-reminders-KAN-4.md) — read only for its precedent of a page-level list-with-add/edit/delete-modal section embedded on a detail page (`AgentTasksPanel` on `/dashboard`); this story's `KnowledgeArticleStepsSection` on the new `/knowledge-base/[id]` detail page follows that same embedded-section shape.
- **Backend dependency**: the `azm-crm-backend` sibling repo's `feature/kan-6-knowledge-base` branch (Story 23, `Step-by-Step Guide Steps`) is already implemented, exposing:
  - `POST /api/knowledge-articles/{id}/steps` (body: `{stepNumber, title, description}`) → `Result<Guid>` (201) / 400 / 404.
  - `PUT /api/knowledge-articles/{id}/steps/{stepId}` (same body) → `Result` (200) / 400 / 404.
  - `DELETE /api/knowledge-articles/{id}/steps/{stepId}` → 204 / 404.
  - `KnowledgeArticleDto` (Story 18's `GET /api/knowledge-articles/{id}`) and `KnowledgeArticlePublicDto` (Story 19's `GET /api/knowledge-articles/published/{id}`) **both now carry a trailing `steps: KnowledgeArticleStepDto[]` field**, ordered by `stepNumber` ascending, always present (empty array when none exist, never `null`).

  `KnowledgeArticleStepDto`: `id, stepNumber, title, description`. There is no standalone list-steps endpoint — steps are only ever read as part of fetching the parent article.

## Story Goal

Let an agent attach an ordered list of steps to any article (typically, but not exclusively, a `Guide`), satisfying KAN-6's **"Provide solutions and step-by-step guides"** acceptance criterion. Since step management needs more room than the existing create/edit modal, this story also introduces the first `/knowledge-base/[id]` detail page.

Outcomes:
1. A new `app/(pages)/knowledge-base/[id]/page.tsx` detail page shows one article's full content plus a **"الخطوات"** (Steps) section listing every attached step in order, with add/edit/delete.
2. Each row in `/knowledge-base`'s list gains a `<Link>` to `/knowledge-base/{id}` (a "عرض" / "التفاصيل" link), the entry point to step management.
3. The public `/widget/knowledge-base/[id]` page (Story 19) now also renders a customer-facing, read-only, numbered steps list when the published article has any — a customer following a `Guide` sees the same step content an agent authored.

**Not in scope**: a dedicated "reorder steps" drag-and-drop control — an agent reorders by editing each step's own `stepNumber` field, matching the backend's own explicit non-enforcement (no uniqueness/gap-filling on `stepNumber`); step attachments/images; step completion tracking for the reading customer.

## Context — Read These Files First

1. [18-story-knowledge-base-core-crud-KAN-6.md](18-story-knowledge-base-core-crud-KAN-6.md) — read in full for `KnowledgeArticlesPanel`'s current row shape (this story adds a detail link to it) and the existing `KnowledgeArticleForm`/modal conventions this story's step form reuses.
2. [19-story-knowledge-article-publishing-KAN-6.md](19-story-knowledge-article-publishing-KAN-6.md) — read in full for `app/widget/knowledge-base/[id]/page.tsx`'s current body (this story edits it) and `KnowledgeArticlePublic`'s current field list (this story appends `steps` to it).
3. [app/(pages)/tickets/[id]/page.tsx](<app/(pages)/tickets/[id]/page.tsx>) (full file, 145 lines) — the exact detail-page shape (`SetBreadcrumbLabel`, a header `.card` with badges + تعديل link, then stacked section components below) `app/(pages)/knowledge-base/[id]/page.tsx` follows.
4. [components/customers/NoteHistorySection.tsx](components/customers/NoteHistorySection.tsx) (full file, 100 lines) — the exact "list + add-modal, no pagination" section shape `KnowledgeArticleStepsSection` extends with edit/delete (this section needs all three, since a step's `stepNumber`/`title`/`description` are all editable and a step can be removed, unlike a note).
5. [components/customers/AddNoteForm.tsx](components/customers/AddNoteForm.tsx) — the single-purpose add-only form shape; this story's `KnowledgeArticleStepForm` instead follows `KnowledgeArticleForm`'s (Story 18) `mode: "create" | "edit"` two-mode shape, since steps need editing too.
6. [components/customers/SetBreadcrumbLabel.tsx](components/customers/SetBreadcrumbLabel.tsx) (full file) — reused as-is on the new detail page, registering the article's `title` for the breadcrumb.

## Implementation tasks

### 1 — Types

**Edit file: `lib/types/knowledgeArticle.ts`** — add a step type and append `steps` to the two full-article types:

```ts
export type KnowledgeArticleStep = {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
};

export type KnowledgeArticleStepFormValues = {
  stepNumber: number;
  title: string;
  description: string;
};
```

Change `KnowledgeArticle` to append `steps: KnowledgeArticleStep[];` as its trailing field, and `KnowledgeArticlePublic` (Story 19) to append the same trailing `steps: KnowledgeArticleStep[];` field.

### 2 — API client

**Edit file: `lib/api/knowledgeArticle.api.ts`** — add three entries to `knowledgeArticleEndpoints`:

```ts
addStep: (articleId: string, values: KnowledgeArticleStepFormValues) =>
  apiServerFetch<string>({
    url: `${KNOWLEDGE_ARTICLES_URL}/${articleId}/steps`,
    method: "POST",
    body: values,
  }),

updateStep: (articleId: string, stepId: string, values: KnowledgeArticleStepFormValues) =>
  apiServerFetch<void>({
    url: `${KNOWLEDGE_ARTICLES_URL}/${articleId}/steps/${stepId}`,
    method: "PUT",
    body: values,
  }),

deleteStep: (articleId: string, stepId: string) =>
  apiServerFetch<void>({
    url: `${KNOWLEDGE_ARTICLES_URL}/${articleId}/steps/${stepId}`,
    method: "DELETE",
  }),
```

### 3 — Server actions

**Edit file: `app/(pages)/knowledge-base/actions.ts`** — append, revalidating the detail path this time (not the list):

```ts
export async function addKnowledgeArticleStepAction(
  articleId: string,
  values: KnowledgeArticleStepFormValues
): Promise<KnowledgeBaseActionResult> {
  const result = await knowledgeArticleEndpoints.addStep(articleId, values);

  if (!result.success) return { success: false, error: result.error };

  revalidatePath(`/knowledge-base/${articleId}`);
  return { success: true };
}

export async function updateKnowledgeArticleStepAction(
  articleId: string,
  stepId: string,
  values: KnowledgeArticleStepFormValues
): Promise<KnowledgeBaseActionResult> {
  const result = await knowledgeArticleEndpoints.updateStep(articleId, stepId, values);

  if (!result.success) return { success: false, error: result.error };

  revalidatePath(`/knowledge-base/${articleId}`);
  return { success: true };
}

export async function deleteKnowledgeArticleStepAction(
  articleId: string,
  stepId: string
): Promise<KnowledgeBaseActionResult> {
  const result = await knowledgeArticleEndpoints.deleteStep(articleId, stepId);

  if (!result.success) return { success: false, error: result.error };

  revalidatePath(`/knowledge-base/${articleId}`);
  return { success: true };
}
```

Import `knowledgeArticleEndpoints` and `KnowledgeArticleStepFormValues` at the top of the file.

### 4 — Step form

**Create file: `components/knowledge-base/KnowledgeArticleStepForm.tsx`** (`"use client"`) — copies [KnowledgeArticleForm.tsx](components/knowledge-base/KnowledgeArticleForm.tsx)'s (Story 18) `mode`/`initialValues`/`onSubmit`/`onDone` shape. Fields: `stepNumber` (`type="number" min={1}`, required), `title` (text input, required), `description` (`<textarea rows={4}>`, required).

### 5 — Steps section

**Create file: `components/knowledge-base/KnowledgeArticleStepsSection.tsx`** (`"use client"`) — Props: `{ articleId: string; steps: KnowledgeArticleStep[] }`. Copies `NoteHistorySection`'s `.card space-y-4` + header + `<ul>` shape (no pagination — the backend returns every step on the parent article fetch, never paginated), extended with per-row تعديل/حذف buttons (`editingStep`/`deletingStep` state, same `ConfirmDialog` pattern as `KnowledgeArticlesPanel`). Renders:
- Header: `<h2>الخطوات</h2>` + `+ إضافة خطوة` button opening the add modal.
- Empty state: `"لا توجد خطوات بعد"`.
- An **ordered** `<ol className="space-y-3 list-decimal list-inside">` (steps arrive pre-sorted by `stepNumber` from the backend; render in that order rather than re-sorting client-side) of rows, each showing `step.title` (bold), `step.description`, and a small `#{step.stepNumber}` marker, plus تعديل/حذف buttons.
- Create/edit modals render `<KnowledgeArticleStepForm mode="create|edit" ... onSubmit={(values) => addKnowledgeArticleStepAction(articleId, values) | updateKnowledgeArticleStepAction(articleId, editingStep.id, values)} onDone={() => { setModalState(null); router.refresh(); }} />`.
- `ConfirmDialog` for delete: title `"حذف الخطوة"`, description `` `هل أنت متأكد من حذف الخطوة "${deletingStep?.title}"؟` ``, `onConfirm` calls `deleteKnowledgeArticleStepAction(articleId, deletingStep.id)`.

### 6 — Agent detail page

**Create file: `app/(pages)/knowledge-base/[id]/page.tsx`** — `params: Promise<{ id: string }>`. Calls `knowledgeArticleEndpoints.getById(id)`; `notFound()` on a 404 `result.status`, matching [app/(pages)/tickets/[id]/page.tsx](<app/(pages)/tickets/[id]/page.tsx>) line 28. Renders:
- `<SetBreadcrumbLabel segment={id} label={article.title} />`.
- A header `.card` with `article.title`, type/status badges (same badge classes as `KnowledgeArticlesPanel`, Story 18), a تعديل link opening... **note**: since Story 18's edit flow is a modal on the list page (not a route), this detail page instead renders `article.content` (`whitespace-pre-wrap`) and `category`/`tags` directly, with a `<Link href="/knowledge-base">العودة إلى القائمة</Link>` back-link — editing the article's own fields still happens from the list page's modal, not here; this page's only new interactive surface is the Steps section.
- `<KnowledgeArticleStepsSection articleId={id} steps={article.steps} />` below the header card.

### 7 — Link from the list

**Edit file: `components/knowledge-base/KnowledgeArticlesPanel.tsx`** (Story 18) — wrap each row's title (or add a small `"التفاصيل"` link) in `<Link href={`/knowledge-base/${article.id}`}>`, following [app/(pages)/tickets/page.tsx](<app/(pages)/tickets/page.tsx>) lines 109-113's `<Link href={`/tickets/${id}`}>` convention.

### 8 — Public detail page gains steps

**Edit file: `app/widget/knowledge-base/[id]/page.tsx`** (Story 19) — when `article.steps.length > 0`, render a `"الخطوات"` heading and the same ordered `<ol>` markup as `KnowledgeArticleStepsSection` but **read-only** (no تعديل/حذف buttons, no modals) — a plain server-rendered list, matching this page's existing server-component shape (Story 19 built it with no client state).

## Edge Cases & Failure Modes

- **Two steps with the same `stepNumber`** — allowed (no backend enforcement, see backend Story 23's Edge Cases); the list renders both in whatever order the backend returns them, since this story does not re-sort client-side.
- **A gap in `stepNumber` (e.g. 1, 2, 5)** — allowed and rendered as-is; the `#{step.stepNumber}` marker shows the actual stored number, not a recomputed sequential index.
- **Adding a step while `article.steps` is empty** — `KnowledgeArticleStepsSection` renders the empty state until the first `router.refresh()` after a successful add.
- **Viewing `/knowledge-base/{id}` for an article with `type: "Faq"` (non-`Guide`)** — the Steps section still renders (possibly empty); this story does not hide it based on `type`, matching the backend's identical non-enforcement (any article can carry steps, see backend Story 23's Story Goal outcome 3).
- **`stepNumber` of `0` or negative** — rejected server-side (`GreaterThan(0)` validator); surfaced via the step form's `role="alert"` error paragraph.
- **A published `Guide` with steps is unpublished then re-published** — its steps are untouched by publish/unpublish (Story 19's handlers only flip `status`/`publishedOn`/`publishedBy`); the public detail page shows the same steps list before and after.

## Test Plan

No automated test infrastructure exists in this repository. Manual verification only, per Verification Steps below.

## Verification Steps

1. **Frontend builds:** `pnpm build` from the repository root.
2. **Lint passes:** `pnpm lint`.
3. **Frontend runs against a live backend:** `pnpm dev`, with `azm-crm-backend`'s `feature/kan-6-knowledge-base` branch running locally.
4. **Manual smoke test:** create a `Guide`-typed article (Story 18), open its `/knowledge-base/{id}` detail page, add two steps (`stepNumber` 1 and 2), confirm both appear in order; edit the second step's title, confirm the change persists; publish the article (Story 19), open its `/widget/knowledge-base/{id}` page and confirm both steps render there too, in order; delete one step from the agent page and confirm the public page reflects it after a refresh.

## Done Criteria

- [ ] `/knowledge-base/{id}` shows the article plus a Steps section supporting add/edit/delete.
- [ ] Steps render in `stepNumber` order on both the agent detail page and the public detail page.
- [ ] A `/knowledge-base` row links to its detail page.
- [ ] `pnpm build` and `pnpm lint` both succeed with no new errors.

This story satisfies KAN-6's "Provide solutions and step-by-step guides" acceptance criterion.
