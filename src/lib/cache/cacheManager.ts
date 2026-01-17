import { supabase } from '../supabase';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  ttl?: number;
  storage?: 'memory' | 'session' | 'local';
  trackStats?: boolean;
}

class CacheManager {
  private static instance: CacheManager;
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000;

  private constructor() {
    this.startCleanupInterval();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async get<T>(key: string, config?: CacheConfig): Promise<T | null> {
    const storage = config?.storage || 'memory';
    const startTime = performance.now();

    let entry: CacheEntry<T> | null = null;

    try {
      switch (storage) {
        case 'memory':
          entry = this.memoryCache.get(key) || null;
          break;
        case 'session':
          entry = this.getFromWebStorage(sessionStorage, key);
          break;
        case 'local':
          entry = this.getFromWebStorage(localStorage, key);
          break;
      }

      if (entry && this.isValid(entry)) {
        await this.trackCacheHit(key, performance.now() - startTime);
        return entry.data;
      }

      await this.trackCacheMiss(key);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(
    key: string,
    data: T,
    config?: CacheConfig
  ): Promise<void> {
    const storage = config?.storage || 'memory';
    const ttl = config?.ttl || this.DEFAULT_TTL;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    try {
      switch (storage) {
        case 'memory':
          this.memoryCache.set(key, entry);
          break;
        case 'session':
          this.setInWebStorage(sessionStorage, key, entry);
          break;
        case 'local':
          this.setInWebStorage(localStorage, key, entry);
          break;
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidate(key: string | string[]): Promise<void> {
    const keys = Array.isArray(key) ? key : [key];

    for (const k of keys) {
      this.memoryCache.delete(k);
      sessionStorage.removeItem(`cache_${k}`);
      localStorage.removeItem(`cache_${k}`);

      await this.trackCacheInvalidation(k);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);

    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        await this.invalidate(key);
      }
    }

    this.clearWebStoragePattern(sessionStorage, pattern);
    this.clearWebStoragePattern(localStorage, pattern);
  }

  async wrap<T>(
    key: string,
    fetcher: () => Promise<T>,
    config?: CacheConfig
  ): Promise<T> {
    const cached = await this.get<T>(key, config);

    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, config);

    return data;
  }

  clear(): void {
    this.memoryCache.clear();
    this.clearWebStorage(sessionStorage);
    this.clearWebStorage(localStorage);
  }

  getStats(): {
    memoryCacheSize: number;
    sessionStorageSize: number;
    localStorageSize: number;
  } {
    return {
      memoryCacheSize: this.memoryCache.size,
      sessionStorageSize: this.getStorageSize(sessionStorage),
      localStorageSize: this.getStorageSize(localStorage),
    };
  }

  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private getFromWebStorage<T>(
    storage: Storage,
    key: string
  ): CacheEntry<T> | null {
    try {
      const item = storage.getItem(`cache_${key}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  private setInWebStorage<T>(
    storage: Storage,
    key: string,
    entry: CacheEntry<T>
  ): void {
    try {
      storage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Storage quota exceeded, clearing old entries');
      this.clearWebStorage(storage);
    }
  }

  private clearWebStorage(storage: Storage): void {
    const keys = Object.keys(storage).filter((k) => k.startsWith('cache_'));
    keys.forEach((k) => storage.removeItem(k));
  }

  private clearWebStoragePattern(storage: Storage, pattern: string): void {
    const regex = new RegExp(pattern);
    const keys = Object.keys(storage).filter(
      (k) => k.startsWith('cache_') && regex.test(k.replace('cache_', ''))
    );
    keys.forEach((k) => storage.removeItem(k));
  }

  private getStorageSize(storage: Storage): number {
    return Object.keys(storage).filter((k) => k.startsWith('cache_')).length;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.memoryCache.entries()) {
        if (!this.isValid(entry)) {
          this.memoryCache.delete(key);
        }
      }
    }, 60000);
  }

  private async trackCacheHit(key: string, retrievalTime: number): Promise<void> {
    try {
      await supabase.rpc('log_performance_metric', {
        p_company_id: null,
        p_metric_type: 'cache',
        p_metric_name: 'cache_hit',
        p_execution_time_ms: Math.round(retrievalTime),
        p_metadata: { cache_key: key },
      });
    } catch (error) {
      console.error('Failed to track cache hit:', error);
    }
  }

  private async trackCacheMiss(key: string): Promise<void> {
    try {
      await supabase.rpc('log_performance_metric', {
        p_company_id: null,
        p_metric_type: 'cache',
        p_metric_name: 'cache_miss',
        p_execution_time_ms: 0,
        p_metadata: { cache_key: key },
      });
    } catch (error) {
      console.error('Failed to track cache miss:', error);
    }
  }

  private async trackCacheInvalidation(key: string): Promise<void> {
    try {
      await supabase.rpc('log_performance_metric', {
        p_company_id: null,
        p_metric_type: 'cache',
        p_metric_name: 'cache_invalidation',
        p_execution_time_ms: 0,
        p_metadata: { cache_key: key },
      });
    } catch (error) {
      console.error('Failed to track cache invalidation:', error);
    }
  }
}

export const cacheManager = CacheManager.getInstance();

export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}:${params[key]}`)
    .join('_');
  return `${prefix}_${sortedParams}`;
}
