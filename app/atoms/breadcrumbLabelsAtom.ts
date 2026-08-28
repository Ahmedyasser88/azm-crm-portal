import { atom } from "jotai";

// Maps a raw URL path segment (e.g. a customer id) to a human-readable label
// (e.g. the customer's name) for Breadcrumb to display instead of the raw
// segment. Populated by SetBreadcrumbLabel on pages that know the resolved
// name for a dynamic segment.
export const breadcrumbLabelsAtom = atom<Record<string, string>>({});
