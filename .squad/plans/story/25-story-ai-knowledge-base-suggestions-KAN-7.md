# Story 25 — AI-Suggested Knowledge Base Solutions for Tickets (Story: KAN-7)

## Prerequisites

- [05-story-ticket-core-crud-KAN-2.md](05-story-ticket-core-crud-KAN-2.md) completed: this story **edits** `app/(pages)/tickets/[id]/page.tsx` and `app/(pages)/tickets/actions.ts`, both created by that story.
- [18-story-knowledge-base-core-crud-KAN-6.md](18-story-knowledge-base-core-crud-KAN-6.md) completed: this story reuses `KnowledgeArticlePublicListItem` from `lib/types/knowledgeArticle.ts` and links to the agent-facing `/knowledge-base/[id]` detail page that story creates.
- [23-story-ai-suggested-replies-KAN-7.md](23-story-ai-suggested-replies-KAN-7.md) completed: this story **edits** `app/(pages)/tickets/[id]/page.tsx` a third time, adding its own panel directly below `TicketSuggestedReplyPanel` in the same "AI" section Stories 22–23 establish.
- **Backend dependency**: the `azm-crm-backend` sibling repo's `feature/kan-7-ai-features` branch (Story 28, `AI-Suggested Knowledge Base Solutions for Tickets`) is already implemented, exposing:
  - `GET /api/tickets/{id}/suggested-articles?maxResults=5` → `Result<IReadOnlyList<KnowledgeArticlePublicListItemDto>>` (200) / 400 / 404. `KnowledgeArticlePublicListItemDto`: `id, title, type, category, publishedOn` — the exact same shape as `KnowledgeArticlePublicListItem` (`lib/types/knowledgeArticle.ts`), already used by the `/widget/knowledge-base` public list (Story 19). `maxResults` defaults to 5 server-side if omitted.

  Matching is a case-insensitive substring search of the ticket's own `title` against each `Published` article's `title`/`content`/`category`/`tags` and any attached step's `title`/`description` — the same technique KAN-6 Story 24's `SearchKnowledgeArticlesQueryHandler` uses, keyed on the ticket's title instead of a user-typed query. This endpoint does **not** call `IAiClient` — no LLM round-trip, so it has no "AI provider unavailable" failure mode the way Stories 22–23's endpoints do; a 400 here can only come from validation (e.g. a malformed `maxResults`).

## Story Goal

Let an agent see knowledge base articles that might already solve a ticket, without leaving the ticket detail page, satisfying KAN-7's **"Suggest solutions from knowledge base"** acceptance criterion.

Outcome: `/tickets/[id]` gains an "حلول مقترحة من قاعدة المعرفة" (Suggested Knowledge Base Solutions) card below the suggested-reply card. It lists up to 5 matching published articles (title, type badge, category) as links to each article's agent-facing detail page (`/knowledge-base/[id]`), fetched automatically when the ticket detail page loads (unlike Stories 22–23's explicit-click panels, since this endpoint is a plain database query with no LLM cost or latency to guard against).

**Not in scope**: semantic/embedding-based relevance ranking (substring match only, mirroring the backend's own documented deferral, identical to KAN-6 Story 24's); showing suggestions from `Draft` articles (the backend's `Published`-only filter is enforced server-side); linking a suggested article back to the ticket in any persisted way (this is a read-only, non-persisted suggestion list, regenerated fresh on every page load); a way to dismiss or rate a suggestion.

## Context — Read These Files First

1. [21-story-knowledge-base-search-KAN-6.md](21-story-knowledge-base-search-KAN-6.md) — read in full. The `KnowledgeArticlePublicListItem`-rendering card convention (title, type, category) this story's ticket-scoped panel reuses, adapted from a full public list page into a small embedded card.
2. [lib/types/knowledgeArticle.ts](lib/types/knowledgeArticle.ts) lines 45–48 — `KnowledgeArticlePublicListItem`'s exact shape (`id, title, type, category, publishedOn`), reused as-is for this endpoint's response — no new type is needed.
3. [lib/constants/knowledgeArticle.ts](lib/constants/knowledgeArticle.ts) — confirm `KNOWLEDGE_ARTICLE_TYPE_LABELS` (used by `app/(pages)/knowledge-base/[id]/page.tsx`), reused here to render each suggested article's `type` badge in Arabic.
4. [app/(pages)/tickets/[id]/page.tsx](app/(pages)/tickets/[id]/page.tsx) lines 21–43 — the page's existing `Promise`-based data-fetch shape (`ticketEndpoints.getById`, `customerEndpoints.getById`, `ticketEndpoints.history.list`, `ticketEndpoints.comments.list`, all awaited sequentially). This story adds one more fetch to this same block, called unconditionally on every page load (see Story Goal).
5. [app/(pages)/tickets/actions.ts](app/(pages)/tickets/actions.ts) — this story does **not** add a new server action here (unlike Stories 22–23) — the suggestions fetch happens directly in the server-component page via a new `ticketEndpoints` entry (Task 1), the same "server component reads via `lib/api/*.api.ts` directly" shape the page's other four fetches already use.
6. [lib/api/ticket.api.ts](lib/api/ticket.api.ts) — read in full (55 lines, before this story's edit). This story adds a `suggestedArticles` entry to `ticketEndpoints`, following the exact `apiServerFetch`-with-`params` shape `list`/`history.list`/`comments.list` already use.

## Implementation tasks

### 1 — API client

**Edit file: `lib/api/ticket.api.ts`** — add one entry to `ticketEndpoints` (add `KnowledgeArticlePublicListItem` to the file's type imports):

```ts
suggestedArticles: (ticketId: string, maxResults = 5) =>
  apiServerFetch<KnowledgeArticlePublicListItem[]>({
    url: `${TICKETS_URL}/${ticketId}/suggested-articles`,
    params: { maxResults },
    cache: "no-store",
  }),
```

### 2 — Suggested articles panel

**Create file: `components/tickets/TicketSuggestedArticlesPanel.tsx`** (a plain server component — no `"use client"`, since it takes already-fetched data as props and has no interactivity beyond `<Link>` navigation, unlike Stories 22–23's client panels):

```ts
import Link from "next/link";
import { KNOWLEDGE_ARTICLE_TYPE_LABELS } from "@/lib/constants/knowledgeArticle";
import type { KnowledgeArticlePublicListItem } from "@/lib/types/knowledgeArticle";

export type TicketSuggestedArticlesPanelProps = {
  articles: KnowledgeArticlePublicListItem[];
};

export function TicketSuggestedArticlesPanel({ articles }: TicketSuggestedArticlesPanelProps) {
  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-text-default">حلول مقترحة من قاعدة المعرفة</h2>

      {articles.length === 0 ? (
        <p className="text-sm text-text-secondary">لا توجد حلول مقترحة لهذه التذكرة.</p>
      ) : (
        <ul className="space-y-3">
          {articles.map((article) => (
            <li key={article.id}>
              <Link href={`/knowledge-base/${article.id}`} className="text-sm text-primary hover:underline">
                {article.title}
              </Link>
              <div className="flex gap-2 mt-1">
                <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                  {KNOWLEDGE_ARTICLE_TYPE_LABELS[article.type]}
                </span>
                {article.category && (
                  <span className="inline-block rounded-full bg-primary-100 text-primary text-xs font-medium px-2 py-0.5">
                    {article.category}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### 3 — Wire into the ticket detail page

**Edit file: `app/(pages)/tickets/[id]/page.tsx`** — add a fifth fetch alongside the page's existing four (after `ticketEndpoints.comments.list`, around line 41):

```ts
const suggestedArticlesResult = await ticketEndpoints.suggestedArticles(id);
```

Import `TicketSuggestedArticlesPanel` and render it directly after `TicketSuggestedReplyPanel` (Story 23):

```tsx
<TicketSuggestedArticlesPanel
  articles={suggestedArticlesResult.success ? suggestedArticlesResult.data : []}
/>
```

Following the same `result.success ? result.data... : []` fallback every other panel on this page already uses for a failed fetch (e.g. `historyResult.success ? historyResult.data.items : []`, line 129).

## Edge Cases & Failure Modes

- **No published article matches the ticket's title** — `articles.length === 0` renders `"لا توجد حلول مقترحة لهذه التذكرة."`, distinct copy from Story 21's public-search empty state (`"لا توجد نتائج مطابقة"`) since this is a passive suggestion list, not a search result the agent typed.
- **The backend request fails (400/404/network error)** — `suggestedArticlesResult.success` is `false`; the panel falls back to `articles={[]}`, rendering the same empty state as a genuine zero-match result — indistinguishable to the agent, matching every other panel's identical fallback convention on this page (see Context item 4).
- **A ticket whose title matches only a `Draft` article's content** — never appears; the backend's `Status == Published` filter (documented in Prerequisites) excludes it before any text match runs, mirroring KAN-6 Story 24's identical guarantee for its own search endpoint.
- **A ticket title matching more than `maxResults` (5) articles** — the backend caps and orders by `publishedOn` descending (most recently published first); the frontend renders exactly what it receives, in that order, with no further client-side sorting or truncation.
- **Clicking a suggested article's link** — navigates to `/knowledge-base/[id]` (the **agent-facing** management page from Story 18), not `/widget/knowledge-base/[id]` (the public customer-facing page) — correct, since this panel is only ever seen by an authenticated agent viewing a ticket.

## Test Plan

No automated test infrastructure exists in this repository. Manual verification only, per Verification Steps below.

## Verification Steps

1. **Frontend builds:** `pnpm build` from the repository root.
2. **Lint passes:** `pnpm lint`.
3. **Frontend runs against a live backend:** `pnpm dev`, with `azm-crm-backend`'s `feature/kan-7-ai-features` branch running locally.
4. **Manual smoke test:** publish a knowledge base article (KAN-6 Stories 18–19) titled `"How do I reset my password?"`; create a ticket titled `"How do I reset my password?"` and confirm its detail page's "حلول مقترحة من قاعدة المعرفة" card shows that article, linking correctly to `/knowledge-base/[id]`; create a second, unrelated ticket and confirm its card shows the empty state.

## Done Criteria

- [ ] `/tickets/[id]` shows a suggested-knowledge-base-articles card, populated automatically on page load.
- [ ] Suggestions are restricted to `Published` articles and link to the agent-facing knowledge base detail page.
- [ ] A failed fetch or a genuine zero-match result both render the same empty state without an error.
- [ ] `pnpm build` and `pnpm lint` both succeed with no new errors.

This story satisfies KAN-7's "Suggest solutions from knowledge base" acceptance criterion.
