import { useState, ReactNode } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<T> {
  key: keyof T | string;
  direction: SortDirection;
}

interface SortableTableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: SortConfig<any>;
  onSort: (key: string) => void;
  align?: 'left' | 'center' | 'right';
}

export function SortableTableHeader({
  label,
  sortKey,
  currentSort,
  onSort,
  align = 'left',
}: SortableTableHeaderProps) {
  const isActive = currentSort.key === sortKey;
  const alignClass =
    align === 'center'
      ? 'justify-center'
      : align === 'right'
      ? 'justify-end'
      : 'justify-start';

  return (
    <th
      className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors`}
      onClick={() => onSort(sortKey)}
    >
      <div className={`flex items-center space-x-1 ${alignClass}`}>
        <span>{label}</span>
        <span className="flex-shrink-0">
          {isActive ? (
            currentSort.direction === 'asc' ? (
              <ChevronUp className="h-4 w-4 text-primary-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-primary-600" />
            )
          ) : (
            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
          )}
        </span>
      </div>
    </th>
  );
}

export function useSortableData<T>(
  data: T[],
  initialSort?: SortConfig<T>
): {
  sortedData: T[];
  sortConfig: SortConfig<T>;
  requestSort: (key: string) => void;
} {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>(
    initialSort || { key: '', direction: null }
  );

  const getSortedData = () => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data;
    }

    const sortedData = [...data].sort((a, b) => {
      const keys = String(sortConfig.key).split('.');
      let aValue: any = a;
      let bValue: any = b;

      for (const key of keys) {
        aValue = aValue?.[key];
        bValue = bValue?.[key];
      }

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sortedData;
  };

  const requestSort = (key: string) => {
    let direction: SortDirection = 'asc';

    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      }
    }

    setSortConfig({ key, direction });
  };

  return {
    sortedData: getSortedData(),
    sortConfig,
    requestSort,
  };
}
