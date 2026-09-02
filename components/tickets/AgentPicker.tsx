"use client";

import { useEffect, useRef, useState } from "react";

export type AgentSearchResult = { id: string; label: string };

export type AgentPickerProps = {
  value: string;
  onSelect: (agentId: string, label: string) => void;
  onSearch: (query: string) => Promise<AgentSearchResult[]>;
  initialLabel?: string;
  placeholder?: string;
};

/**
 * Searchable agent picker, mirroring CustomerPicker.tsx's exact debounced-search-dropdown
 * shape. Takes the search action as a prop (rather than hardcoding one server action import
 * like CustomerPicker does) since it's reused from two different route segments (tickets and
 * automation), each with its own local "use server" wrapper around identityEndpoints.searchAgents.
 */
export function AgentPicker({ value, onSelect, onSearch, initialLabel, placeholder }: AgentPickerProps) {
  const [query, setQuery] = useState(initialLabel ?? "");
  const [results, setResults] = useState<AgentSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  // Skip the very first search-and-open pass: when arriving with a known `initialLabel`,
  // `query` already equals it on mount, and this effect firing anyway would immediately
  // re-open the dropdown with the already-selected agent as a clickable result.
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timeout = setTimeout(async () => {
      const found = await onSearch(query);
      setResults(found);
      setOpen(found.length > 0);
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  function handleSelect(result: AgentSearchResult) {
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
        onFocus={async () => {
          if (results.length > 0) {
            setOpen(true);
            return;
          }
          // Browsable, not only searchable — mirrors the quick-reply template picker's
          // precedent of listing everything on first open, before the agent has typed.
          const found = await onSearch(query);
          setResults(found);
          setOpen(found.length > 0);
        }}
        placeholder={placeholder ?? "ابحث عن موظف بالاسم أو البريد الإلكتروني..."}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
      />
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
