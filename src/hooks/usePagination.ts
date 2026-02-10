import { useState, useMemo } from 'react';

interface PaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

export function usePagination<T>(
  data: T[],
  options: PaginationOptions = {}
) {
  const {
    initialPage = 1,
    initialPageSize = 25,
    pageSizeOptions = [10, 25, 50, 100],
  } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const paginatedData = useMemo(
    () => data.slice(startIndex, endIndex),
    [data, startIndex, endIndex]
  );

  const setPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setCurrentPage(1);
  };

  const nextPage = () => setPage(safePage + 1);
  const prevPage = () => setPage(safePage - 1);
  const goToFirst = () => setPage(1);
  const goToLast = () => setPage(totalPages);

  return {
    currentPage: safePage,
    pageSize,
    totalPages,
    totalItems,
    paginatedData,
    startIndex: totalItems > 0 ? startIndex + 1 : 0,
    endIndex,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    goToFirst,
    goToLast,
    pageSizeOptions,
  };
}
