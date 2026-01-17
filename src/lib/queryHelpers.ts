import { Company } from '@/types/database';
import { supabase } from './supabase';
import { cacheManager, generateCacheKey } from './cache/cacheManager';
import { logPerformance } from './errorHandler';

export function buildCompanyFilter<T>(
  query: T,
  isConsolidatedView: boolean,
  companies: Company[],
  currentCompany: Company | null
): T {
  if (isConsolidatedView && companies.length > 0) {
    const companyIds = companies.map(c => c.id);
    return (query as any).in('company_id', companyIds);
  } else if (currentCompany) {
    return (query as any).eq('company_id', currentCompany.id);
  }
  return query;
}

export async function cachedQuery<T>(
  table: string,
  queryBuilder: (client: typeof supabase) => Promise<{ data: T | null; error: any }>,
  cacheKey: string,
  options?: {
    ttl?: number;
    enabled?: boolean;
  }
): Promise<{ data: T | null; error: any }> {
  const startTime = performance.now();
  const { ttl = 5 * 60 * 1000, enabled = true } = options || {};

  if (!enabled) {
    const result = await queryBuilder(supabase);
    const executionTime = Math.round(performance.now() - startTime);
    await logPerformance('query', table, executionTime, { cached: false });
    return result;
  }

  try {
    const cached = await cacheManager.get<T>(cacheKey, { ttl });

    if (cached !== null) {
      const executionTime = Math.round(performance.now() - startTime);
      await logPerformance('query', table, executionTime, { cached: true, cache_hit: true });
      return { data: cached, error: null };
    }

    const result = await queryBuilder(supabase);

    if (result.data && !result.error) {
      await cacheManager.set(cacheKey, result.data, { ttl });
    }

    const executionTime = Math.round(performance.now() - startTime);
    await logPerformance('query', table, executionTime, { cached: true, cache_hit: false });

    return result;
  } catch (error) {
    const executionTime = Math.round(performance.now() - startTime);
    await logPerformance('query', table, executionTime, { cached: true, error: true });
    return { data: null, error };
  }
}

export function invalidateQueryCache(pattern: string): Promise<void> {
  return cacheManager.invalidatePattern(pattern);
}

export function invalidateTableCache(table: string): Promise<void> {
  return cacheManager.invalidatePattern(`^${table}_`);
}
