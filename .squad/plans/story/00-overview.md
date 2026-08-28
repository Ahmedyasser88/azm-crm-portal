# story — plan overview

Entry point for the **story** feature. Stories execute in order by their `NN` prefix.

## Stories

| NN | File | Title | Tracker id | Depends on |
|----|------|-------|------------|------------|
| 01 | [01-story-customer-core-crud-KAN-1.md](01-story-customer-core-crud-KAN-1.md) | Customer Profile CRUD & Contact Details | KAN-1 | None |
| 02 | [02-story-customer-interactions-KAN-1.md](02-story-customer-interactions-KAN-1.md) | Customer Interaction History | KAN-1 | Story 01 |
| 03 | [03-story-customer-notes-KAN-1.md](03-story-customer-notes-KAN-1.md) | Customer Notes | KAN-1 | Story 01 |
| 04 | [04-story-customer-attachments-KAN-1.md](04-story-customer-attachments-KAN-1.md) | Customer Attachments | KAN-1 | Story 01 |

## Dependency notes

All four stories implement KAN-1 ("Customer Management Module"), split to mirror the corresponding backend delivery increments in the `azm-crm-backend` sibling repo (which has its own KAN-1 squad plans, split identically: core CRUD, interactions, notes, attachments). Story 01 builds the customer list/detail/create/edit/delete pages and is a hard prerequisite for 02–04, since each of those edits the `/customers/[id]` page and extends the shared `lib/api/customer.api.ts` / `app/(pages)/customers/actions.ts` files Story 01 creates. Stories 02, 03, and 04 are independent of each other and can be implemented in any order — each adds one self-contained section (interaction history, notes, attachments) to the same detail page and depends only on its own corresponding backend story being deployed.
