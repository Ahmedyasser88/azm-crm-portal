"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/constants/sidebar";

const labels: Record<string, string> = Object.fromEntries(
  navItems.map(({ href, label }) => [href.replace("/", ""), label])
);

export const Breadcrumb = () => {
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <div className="flex items-center gap-2 mb-6">
      {segments.map((segment, index) => (
        <div key={segment} className="flex items-center gap-2">
          {index > 0 && <ChevronLeft size={14} className="text-gray-400" />}

          {index === segments.length - 1 ? (
            <span className="text-black-700 text-sm">{labels[segment] || segment}</span>
          ) : (
            <Link href={`/${segment}`} className="text-sm text-gray-400 hover:text-black-700">
              {labels[segment] || segment}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
};
