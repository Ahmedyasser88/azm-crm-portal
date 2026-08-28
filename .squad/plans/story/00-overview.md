# story — plan overview

Entry point for the **story** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 01 | [01-story-customer-core-crud-KAN-1.md](01-story-customer-core-crud-KAN-1.md) | Customer Profile CRUD & Contact Details | KAN-1 | None |
| 02 | [02-story-customer-interactions-KAN-1.md](02-story-customer-interactions-KAN-1.md) | Customer Interaction History | KAN-1 | Story 01 |
| 03 | [03-story-customer-notes-KAN-1.md](03-story-customer-notes-KAN-1.md) | Customer Notes | KAN-1 | Story 01 |
| 04 | [04-story-customer-attachments-KAN-1.md](04-story-customer-attachments-KAN-1.md) | Customer Attachments | KAN-1 | Story 01 |
| 05 | [05-story-ticket-core-crud-KAN-2.md](05-story-ticket-core-crud-KAN-2.md) | Ticket Core CRUD, Categorization & History | KAN-2 | Story 01 |
| 06 | [06-story-ticket-assignment-KAN-2.md](06-story-ticket-assignment-KAN-2.md) | Ticket Assignment to Agents | KAN-2 | Story 05 |
| 07 | [07-story-ticket-status-escalation-KAN-2.md](07-story-ticket-status-escalation-KAN-2.md) | Ticket Status Tracking & Escalation | KAN-2 | Story 05 |
| 08 | [08-story-communication-core-KAN-3.md](08-story-communication-core-KAN-3.md) | Communication Core: Conversations & Messages | KAN-3 | Story 01, Story 05 |
| 09 | [09-story-live-chat-KAN-3.md](09-story-live-chat-KAN-3.md) | Live Chat: Real-Time Widget & Agent Panel | KAN-3 | Story 08 |

## Dependency notes

Stories 01–04 implement KAN-1 ("Customer Management Module"), split to mirror the corresponding backend delivery increments in the `azm-crm-backend` sibling repo (which has its own KAN-1 squad plans, split identically: core CRUD, interactions, notes, attachments). Story 01 builds the customer list/detail/create/edit/delete pages and is a hard prerequisite for 02–04, since each of those edits the `/customers/[id]` page and extends the shared `lib/api/customer.api.ts` / `app/(pages)/customers/actions.ts` files Story 01 creates. Stories 02, 03, and 04 are independent of each other and can be implemented in any order — each adds one self-contained section (interaction history, notes, attachments) to the same detail page and depends only on its own corresponding backend story being deployed.

Stories 05–07 implement KAN-2 ("Ticket Management System"), again mirroring the backend's own three-story split (core CRUD, assignment, status/escalation). Story 05 builds the ticket list/detail/create/edit pages, adds the "التذاكر" sidebar entry, and is a hard prerequisite for 06–07, since both edit `/tickets/[id]/page.tsx`, `/tickets/page.tsx`, `TicketFilters.tsx`, and `lib/types/ticket.ts`. Story 05 also depends on Story 01 (KAN-1) for `customerEndpoints` — ticket creation requires searching existing customers, and the ticket detail page resolves the owning customer's name. Stories 06 and 07 are independent of each other and can land in either order; each adds one section (assignment, status/escalation) to the same ticket detail page and depends only on its own corresponding backend story being deployed.

Stories 08–09 implement KAN-3 ("Communication Channels Integration"). Unlike KAN-1/KAN-2, the frontend split does **not** mirror the backend's five-story split (core/web-form, email, WhatsApp, SMS, live chat) one-to-one — the backend's Stories 09–11 (email, WhatsApp, SMS) each add only a new outbound `IChannelMessageSender` and an inbound webhook against Story 08's shared `Conversation`/`Message` model, requiring **zero** additional frontend work beyond what Story 08 already builds (a channel-agnostic conversations/messages UI). Story 08 therefore covers the frontend surface for four of KAN-3's five acceptance criteria (email, WhatsApp, SMS, web forms) in one story, reusing the ticket module's `CustomerPicker`/`searchCustomersAction` as-is. Story 09 covers only the fifth criterion, live chat, which is architecturally distinct enough (a real-time SignalR hub connection, the app's first-ever client-side/browser network call) to warrant its own story; it depends on Story 08's conversation detail page and types, and on the backend's Story 12 specifically (not 09–11).
