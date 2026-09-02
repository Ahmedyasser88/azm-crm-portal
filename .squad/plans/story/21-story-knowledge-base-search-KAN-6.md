# Story 21 — Full-Text Search Across Knowledge Base (Story: KAN-6)

## Prerequisites

- [18-story-knowledge-base-core-crud-KAN-6.md](18-story-knowledge-base-core-crud-KAN-6.md), [19-story-knowledge-article-publishing-KAN-6.md](19-story-knowledge-article-publishing-KAN-6.md), and [20-story-knowledge-article-guide-steps-KAN-6.md](20-story-knowledge-article-guide-steps-KAN-6.md) completed: this story **edits** `app/widget/knowledge-base/page.tsx` a final time to add a search box, reusing `KnowledgeArticlePublicListItem` and the public-page conventions those stories established.
- **Backend dependency**: the `azm-crm-backend` sibling repo's `feature/kan-6-knowledge-base` branch (Story 24, `Full-Text Search Across Knowledge Base`) is already implemented, exposing:
  - `GET /api/knowledge-articles/search?query={term}&pageNumber=&pageSize=` → `Result<PaginatedResult<KnowledgeArticlePublicListItemDto>>` (200) / 400 when `query` is empty/whitespace. **`[AllowAnonymous]`**.

  A match on any of the article's `title`/`content`/`category`/`tags`, or any attached step's `title`/`description` (case-insensitive substring), returns the parent article exactly once, restricted to `Status == Published` only, ordered `publishedOn` descending (no relevance ranking). `query` is **required** — unlike every other list endpoint in this feature, there is no "browse everything" fallback on this route.

## Story Goal

Let a customer or agent search across every field of every published knowledge base article — including step content — with a single keyword, satisfying KAN-6's **"Full-text search across all knowledge base content"** acceptance criterion.

Outcome: `/widget/knowledge-base` (Story 19) gains a search box. Submitting a query calls the search endpoint instead of the plain published-list endpoint and shows matching articles; clearing the query returns to the normal browsable list (Story 19's existing `type`/`category` filters).

**Not in scope**: relevance ranking or match highlighting/snippets (results are ordered exactly as the backend returns them — `publishedOn` descending); typo-tolerance; search analytics; a search box on the agent-facing `/knowledge-base` management page (that page already has exact-match `type`/`status`/`category` filters from Story 18, which is what an agent managing content uses — this endpoint is `Published`-only and is the customer-facing search surface named in the acceptance criterion).

## Context — Read These Files First

1. [19-story-knowledge-article-publishing-KAN-6.md](19-story-knowledge-article-publishing-KAN-6.md) Task 5 — `app/widget/knowledge-base/page.tsx`'s current body (this story edits it) and its existing plain `<Link>`-built filter-row convention (server component, no client-side `useSearchParams`).
2. [components/tickets/TicketFilters.tsx](components/tickets/TicketFilters.tsx) — read only for its precedent of a `<form>`-based query-param-writing control on a **server**-rendered list page (a `<form>` with `method="get"` semantics via a plain submit, not `useRouter`); this story's search `<form>` follows that same "server component page, plain HTML form navigation" shape rather than introducing client-side state, since the rest of `app/widget/knowledge-base/page.tsx` is deliberately a server component (Story 19 built it that way).
3. [lib/api/knowledgeArticle.api.ts](lib/api/knowledgeArticle.api.ts) — the current `knowledgeArticleEndpoints` shape (`listPublished` from Story 19) this story adds a `search` entry beside.

## Implementation tasks

### 1 — API client

**Edit file: `lib/api/knowledgeArticle.api.ts`** — add one entry to `knowledgeArticleEndpoints`:

```ts
search: (params: { query: string; pageNumber?: number; pageSize?: number }) =>
  apiServerFetch<PaginatedResult<KnowledgeArticlePublicListItem>>({
    url: `${KNOWLEDGE_ARTICLES_URL}/search`,
    params: {
      query: params.query,
      pageNumber: params.pageNumber ?? 1,
      pageSize: params.pageSize ?? 20,
    },
    cache: "no-store",
  }),
```

### 2 — Wire search into the public list page

**Edit file: `app/widget/knowledge-base/page.tsx`** (Story 19) — add `query?: string` to the `searchParams` type. At the top of the page body, add a plain `<form>` (`action="/widget/knowledge-base"` implicit via no `action` attribute, relying on the browser's default GET-to-current-path submission) with a single `<input type="search" name="query" defaultValue={query ?? ""} placeholder="ابحث في قاعدة المعرفة..." />` and a submit `<Button type="submit">بحث</Button>` — no client-side state, matching this page's server-component shape.

Branch the data fetch: when `query` is a non-empty, non-whitespace string, call `knowledgeArticleEndpoints.search({ query })` instead of `knowledgeArticleEndpoints.listPublished({ type, category })`; render the same `<ul>` of result cards either branch produces (both resolve to `KnowledgeArticlePublicListItem[]`, so the existing card-rendering JSX is shared, not duplicated). When a search is active, hide the `type`/`category` filter row (search does not accept those params) and show a `` `نتائج البحث عن "${query}"` `` heading plus a "مسح البحث" link back to `/widget/knowledge-base` (no query param). Empty state for a no-match search: `"لا توجد نتائج مطابقة"` (distinct copy from the plain empty-list state, `"لا يوجد محتوى منشور بعد"`, so a searcher knows their query is why the list is empty).

## Edge Cases & Failure Modes

- **`?query=` present but empty/whitespace after trimming** — the page treats this the same as no query at all (falls back to `listPublished`), avoiding a guaranteed 400 from the backend's `NotEmpty()` validator on a blank submit — the check is `query?.trim()` truthy, not merely `query !== undefined`.
- **A query matching zero published articles** — `apiServerFetch`'s `result.success ? result.data.items : []` guard renders the "لا توجد نتائج مطابقة" empty state, same guard shape every other list panel in this codebase already uses.
- **A query matching only a step's content, not the parent article's own fields** — the parent article still appears once in the results (backend-guaranteed, see backend Story 24's Edge Cases); this story's UI has no way to indicate which step matched, matching the backend DTO's lack of a snippet/highlight field (see Story Goal, "Not in scope").
- **A `Draft` article whose content matches the query exactly** — never appears; the backend's `Status == Published` clause is evaluated before any text match (see backend Story 24's Edge Cases) — no separate handling needed on the frontend.
- **The backend returns 400 (should only happen if the trim-guard above is bypassed, e.g. a hand-edited URL with `?query=%20`)** — `apiServerFetch` returns `{success:false, error}`; the page falls back to the same `[]` empty-list rendering rather than throwing, consistent with every other panel's `result.success ? ... : []` guard.

## Test Plan

No automated test infrastructure exists in this repository. Manual verification only, per Verification Steps below.

## Verification Steps

1. **Frontend builds:** `pnpm build` from the repository root.
2. **Lint passes:** `pnpm lint`.
3. **Frontend runs against a live backend:** `pnpm dev`, with `azm-crm-backend`'s `feature/kan-6-knowledge-base` branch running locally.
4. **Manual smoke test:** publish an FAQ article (Stories 18-19) with `title:"How do I reset my password?"`, `tags:"password,reset"`; publish a `Guide` article (Story 20) with a step titled `"Click Forgot Password"`. On `/widget/knowledge-base`, search `"password"` and confirm both articles appear; clear the search and confirm the normal browsable list returns; search a term matching nothing and confirm the "لا توجد نتائج مطابقة" empty state; create a third, unpublished `Draft` article containing `"password"` in its content and confirm the same search does **not** return it.

## Done Criteria

- [ ] `/widget/knowledge-base` has a working search box that queries across title/content/category/tags/step content.
- [ ] Search results are restricted to `Published` articles only.
- [ ] Clearing the search query returns to the normal type/category-filterable browsable list.
- [ ] `pnpm build` and `pnpm lint` both succeed with no new errors.

This story satisfies KAN-6's "Full-text search across all knowledge base content" acceptance criterion and completes all four KAN-6 acceptance criteria across Stories 18-21.
