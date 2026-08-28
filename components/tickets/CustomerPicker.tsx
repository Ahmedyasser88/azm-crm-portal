"use client";

import { useEffect, useRef, useState } from "react";
import { searchCustomersAction, type CustomerSearchResult } from "@/app/(pages)/tickets/actions";

export type CustomerPickerProps = {
  value: string;
  onSelect: (customerId: string, label: string) => void;
  initialLabel?: string;
};

export function CustomerPicker({ value, onSelect, initialLabel }: CustomerPickerProps) {
  const [query, setQuery] = useState(initialLabel ?? "");
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const found = await searchCustomersAction(query);
      setResults(found);
      setOpen(found.length > 0);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(result: CustomerSearchResult) {
    onSelect(result.id, result.label);
    setQuery(result.label);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(results.length > 0)}
        placeholder="ابحث عن عميل بالاسم أو البريد الإلكتروني..."
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
      />
      {/* Hidden input keeps the selected customerId available to a plain <form> submission if ever needed;
          the controlled `value` prop is the source of truth for TicketForm's own state. */}
      <input type="hidden" value={value} readOnly />
      {open && (
        <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-300 bg-white shadow-sm max-h-60 overflow-y-auto">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={() => handleSelect(result)}
                className="w-full text-right px-3 py-2 text-sm hover:bg-surface"
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
