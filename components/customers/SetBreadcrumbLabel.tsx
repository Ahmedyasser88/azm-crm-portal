"use client";

import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { breadcrumbLabelsAtom } from "@/app/atoms";

/**
 * Registers a human-readable label for a raw URL path segment (e.g. a
 * customer id) so Breadcrumb can show it instead of the raw segment. Renders
 * nothing — mount it anywhere on a page that knows the resolved name for a
 * dynamic segment in its own route.
 */
export function SetBreadcrumbLabel({ segment, label }: { segment: string; label: string }) {
  const setLabels = useSetAtom(breadcrumbLabelsAtom);

  useEffect(() => {
    setLabels((prev) => (prev[segment] === label ? prev : { ...prev, [segment]: label }));

    return () => {
      setLabels((prev) => {
        if (!(segment in prev)) return prev;
        return Object.fromEntries(Object.entries(prev).filter(([key]) => key !== segment));
      });
    };
  }, [segment, label, setLabels]);

  return null;
}
