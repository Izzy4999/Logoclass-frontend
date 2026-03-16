import { useState } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
}

export function usePagination({ initialPage = 1, initialLimit = 20 }: UsePaginationOptions = {}) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [search, setSearch] = useState("");

  const goToPage = (p: number) => setPage(p);
  const nextPage = () => setPage((prev) => prev + 1);
  const prevPage = () => setPage((prev) => Math.max(1, prev - 1));
  const resetPage = () => setPage(1);

  const onSearch = (q: string) => {
    setSearch(q);
    setPage(1);
  };

  return {
    page,
    limit,
    search,
    setPage: goToPage,
    nextPage,
    prevPage,
    resetPage,
    setLimit,
    onSearch,
    params: { page, limit, search: search || undefined },
  };
}
