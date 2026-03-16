/**
 * InfiniteSelect — searchable dropdown with infinite scroll.
 *
 * Usage:
 *   <InfiniteSelect
 *     value={selectedId}
 *     onChange={setSelectedId}
 *     placeholder="Select student"
 *     queryKey={["users", "infinite"]}
 *     fetcher={({ page, search }) =>
 *       usersApi.list({ page, limit: 100, search }).then(r => r.data)
 *     }
 *     getLabel={u => `${u.firstName} ${u.lastName}`}
 *     getValue={u => u.id}
 *   />
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronDown, Check, Loader2, X } from "lucide-react";
import type { PaginationMeta } from "@/types/api";

// ── Types ──────────────────────────────────────────────────────────────────────
interface FetcherResult<T> {
  data: T[];
  meta: PaginationMeta;
}

interface InfiniteSelectProps<T> {
  value: string;
  onChange: (value: string, item?: T) => void;
  placeholder?: string;
  /** Stable array used as React Query key — include anything that changes the data set */
  queryKey: unknown[];
  /** Must return { data: T[], meta: { totalPages, page, ... } } */
  fetcher: (params: { page: number; search: string }) => Promise<FetcherResult<T>>;
  getLabel: (item: T) => string;
  getValue: (item: T) => string;
  /** Optional second line shown in each option */
  getSublabel?: (item: T) => string;
  enabled?: boolean;
  disabled?: boolean;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function InfiniteSelect<T>({
  value,
  onChange,
  placeholder = "Select…",
  queryKey,
  fetcher,
  getLabel,
  getValue,
  getSublabel,
  enabled = true,
  disabled = false,
  className = "",
}: InfiniteSelectProps<T>) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState("");
  const containerRef  = useRef<HTMLDivElement>(null);
  const searchRef     = useRef<HTMLInputElement>(null);
  const sentinelRef   = useRef<HTMLDivElement>(null);
  const listRef       = useRef<HTMLUListElement>(null);

  // ── Infinite query ───────────────────────────────────────────────────────────
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: [...queryKey, search],
    queryFn: ({ pageParam }) => fetcher({ page: pageParam as number, search }),
    initialPageParam: 1,
    getNextPageParam: (last: FetcherResult<T>) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    enabled: enabled && open,
    staleTime: 30_000,
  });

  const allItems: T[] = data?.pages.flatMap((p) => p.data) ?? [];

  // ── IntersectionObserver sentinel ────────────────────────────────────────────
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage(); },
      { root: listRef.current, threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, open]);

  // ── Close on outside click ───────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Focus search on open ─────────────────────────────────────────────────────
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);

  // ── Selected item label ──────────────────────────────────────────────────────
  const selectedItem = allItems.find((i) => getValue(i) === value);
  const selectedLabel = selectedItem ? getLabel(selectedItem) : null;

  const handleSelect = useCallback((item: T) => {
    onChange(getValue(item), item);
    setOpen(false);
    setSearch("");
  }, [onChange, getValue]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", undefined);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-lg outline-none transition
          ${open ? "border-primary ring-2 ring-primary/20" : "border-slate-200"}
          ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : "bg-white hover:border-slate-300 cursor-pointer"}
        `}
      >
        <span className={selectedLabel ? "text-foreground truncate" : "text-muted-foreground"}>
          {selectedLabel ?? placeholder}
        </span>
        <span className="flex items-center gap-1 ml-2 flex-shrink-0">
          {value && !disabled && (
            <span
              role="button"
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-slate-100 text-muted-foreground"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
          >
            {/* Search input */}
            <div className="p-2 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            {/* Options list */}
            <ul
              ref={listRef}
              className="max-h-52 overflow-y-auto py-1"
            >
              {isLoading ? (
                <li className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </li>
              ) : allItems.length === 0 ? (
                <li className="py-6 text-center text-sm text-muted-foreground">
                  No results found
                </li>
              ) : (
                <>
                  {allItems.map((item) => {
                    const val      = getValue(item);
                    const label    = getLabel(item);
                    const sublabel = getSublabel?.(item);
                    const selected = val === value;
                    return (
                      <li
                        key={val}
                        onClick={() => handleSelect(item)}
                        className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm
                          ${selected
                            ? "bg-primary/5 text-primary"
                            : "text-foreground hover:bg-slate-50"
                          }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{label}</p>
                          {sublabel && (
                            <p className="text-xs text-muted-foreground truncate">{sublabel}</p>
                          )}
                        </div>
                        {selected && <Check className="h-3.5 w-3.5 flex-shrink-0 ml-2 text-primary" />}
                      </li>
                    );
                  })}

                  {/* Sentinel for infinite scroll */}
                  <div ref={sentinelRef} className="h-1" />

                  {isFetchingNextPage && (
                    <li className="flex items-center justify-center py-3 gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading more…
                    </li>
                  )}
                </>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
