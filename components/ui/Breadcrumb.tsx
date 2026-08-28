"use client";

import { useAtomValue } from "jotai";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { breadcrumbLabelsAtom } from "@/app/atoms";
import { navItems } from "@/lib/constants/sidebar";

const labels: Record<string, string> = Object.fromEntries(
  navItems.map(({ href, label }) => [href.replace("/", ""), label])
);

// Generic action-word segments shared across every entity's CRUD routes
// (/customers/new, /customers/[id]/edit, and any future entity following the
// same pattern).
const actionLabels: Record<string, string> = {
  new: "جديد",
  edit: "تعديل",
};

export const Breadcrumb = () => {
  const pathname = usePathname();
  const dynamicLabels = useAtomValue(breadcrumbLabelsAtom);

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mb-6">
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        const label = dynamicLabels[segment] || labels[segment] || actionLabels[segment] || segment;

        return (
          <div key={href} className="flex items-center gap-2">
            {index > 0 && <ChevronLeft size={14} className="text-gray-400" />}

            {index === segments.length - 1 ? (
              <span className="text-black-700 text-sm">{label}</span>
            ) : (
              <Link href={href} className="text-sm text-gray-400 hover:text-black-700">
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
};
