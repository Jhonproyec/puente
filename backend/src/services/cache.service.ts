import { logger } from '@/config/logger';
import { CacheItemInterface } from '@/interface/cacheItemInterface';
export class CacheService {
    private cache: Map<string, CacheItemInterface<any>> = new Map();
    private readonly DEFAULT_TTL = Number(process.env.DEFAULT_TTL) ?? 1800;

    //Obtenemos los datos de cache  y validamos que no haya expirado
    get<T>(key: string): T | null {
        const item = this.cache.get(key);
        if (!item) {
            return null;
        }

        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return item.value as T;
    }
    set<T>(key: string, value: T, ttlSeconds: number = this.DEFAULT_TTL): void {
        const expiresAt = Date.now() + ttlSeconds * 1000;
        
        this.cache.set(key, {
            value,
            expiresAt,
        });

        logger.info(`[CACHE] SET: ${key}`);
    }

    delete(key: string): boolean {
        const deleted = this.cache.delete(key);
        if (deleted) {
            logger.info(`[CACHE] ELIMINADO: ${key}`);
        }
        return deleted;
    }

    // Limpiar todo el cache
    flush(): void {
        this.cache.clear();
        logger.info(`[CACHE] Caché eliminada completamente`)
    }

    getStatus(): { size: number; keys: string[] } {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
}

export const cacheService = new CacheService();