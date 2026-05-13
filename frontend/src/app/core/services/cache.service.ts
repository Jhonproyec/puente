import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface CacheInterface<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

@Injectable({
  providedIn: 'root'
})
export class CacheService {
  private cache = new Map<string, CacheInterface<any>>();
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }


  deleteByPrefix(prefix: string): void {
    this.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) this.cache.delete(key);
    });
  }

  clear(): void {
    this.cache.clear();
  }

  convertToCatalogOptions(items: any): Observable<any> {
    return new Observable(observer => {
      observer.next(items);
      observer.complete();
    });
  }

}
