import { useEffect, useState, useCallback } from 'react';
import { cacheManager, generateCacheKey } from '../lib/cache/cacheManager';

interface UseCacheOptions {
  ttl?: number;
  storage?: 'memory' | 'session' | 'local';
  enabled?: boolean;
  refetchOnMount?: boolean;
}

export function useCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCacheOptions = {}
) {
  const {
    ttl,
    storage = 'memory',
    enabled = true,
    refetchOnMount = false,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (force) {
        await cacheManager.invalidate(key);
      }

      const result = await cacheManager.wrap(key, fetcher, { ttl, storage });
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, enabled, ttl, storage]);

  const invalidate = useCallback(async () => {
    await cacheManager.invalidate(key);
    await fetchData(true);
  }, [key, fetchData]);

  useEffect(() => {
    if (enabled) {
      fetchData(refetchOnMount);
    }
  }, [fetchData, enabled, refetchOnMount]);

  return {
    data,
    loading,
    error,
    refetch: () => fetchData(true),
    invalidate,
  };
}

export function useCachedQuery<T>(
  queryKey: string[],
  fetcher: () => Promise<T>,
  options: UseCacheOptions = {}
) {
  const key = queryKey.join('_');
  return useCache(key, fetcher, options);
}

export function useQueryCache() {
  const invalidateQuery = useCallback((key: string | string[]) => {
    return cacheManager.invalidate(key);
  }, []);

  const invalidatePattern = useCallback((pattern: string) => {
    return cacheManager.invalidatePattern(pattern);
  }, []);

  const clearAll = useCallback(() => {
    cacheManager.clear();
  }, []);

  return {
    invalidateQuery,
    invalidatePattern,
    clearAll,
  };
}
