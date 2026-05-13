import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, throwError, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CacheService } from './cache.service';

export interface CatalogItem {
  id: number;
  nombre: string;
  id_catalogo: number;
  filterValue?: number | null;
  padre?: string;
  parentId?: number;       // 👈 id del padre (id_comunidad o id_departamento)
  grandParentId?: number;  // 👈 id del abuelo (id_departamento cuando el padre es comunidad)
}

export interface CatalogMetadata {
  filterFields?: string[];
  parentLabel?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private readonly CATALOG_URL = environment.BASE_URL + '/catalogs';
  private readonly FORM_URL = environment.BASE_URL + '/formBuilder';

  // ── Claves centralizadas (igual que el backend) ─────────────────────────
  private readonly keys = {
    all: () => `CATALOG:all`,
    items: (id: number) => `CATALOG:items:${id}`,
    itemsFiltered: (id: string | number, filterValue: any) => `CATALOG:items:${id}:${filterValue}`,
    metadata: (id: string | number) => `CATALOG:metadata:${id}`,
    departamentos: () => `CATALOG:departamentos`,
    comunidad: (id: number) => `CATALOG:comunidad:${id}`,
    allForms: () => `CATALOG:allForms`,
  };

  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) { }

  // ── CATÁLOGOS ───────────────────────────────────────────────────────────

  getAvailableCatalogs(): Observable<Array<{ id: number; name: string; totalItems: number }>> {
    const cacheKey = this.keys.all();
    const cached = this.cacheService.get<any>(cacheKey);
    if (cached) return of(cached);

    return this.http.get<any>(`${this.CATALOG_URL}/all`).pipe(
      map(data => {
        if (data.success) {
          const catalogos = data.data.map((c: any) => ({
            id: c.id_catalogo,
            name: c.nombre,
            totalItems: c.totalItems
          }));
          this.cacheService.set(cacheKey, catalogos);
          return catalogos;
        }
        throw new Error('No se pudieron cargar los catálogos');
      }),
      catchError(error => {
        console.error('Error al cargar catálogos disponibles', error);
        return throwError(() => new Error('No se pudieron cargar los catálogos'));
      })
    );
  }

  createCatalog(data: { name: string }): Observable<{ id: number; name: string; totalItems: number } | null> {
    return this.http.post<any>(`${this.CATALOG_URL}/create`, { nombre: data.name }).pipe(
      map(response => {
        if (response.success) {
          const newCatalog = {
            id: response.data.id_catalogo,
            name: response.data.nombre,
            totalItems: 0
          };
          // Invalida el listado general
          this.cacheService.delete(this.keys.all());
          return newCatalog;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error al crear el catálogo', error);
        return throwError(() => new Error('Error al crear el catálogo'));
      })
    );
  }

  deleteCatalog(ids: Array<number>): Observable<boolean> {
    return this.http.post<any>(`${this.CATALOG_URL}/delete`, {
      ids
    }).pipe(
      map(response => {
        if (response.success) {
          // Invalida el listado general y los items de ese catálogo
          this.cacheService.delete(this.keys.all());
          ids.forEach(id => {
            this.cacheService.delete(this.keys.items(id));
          })
          return true;
        }
        return false;
      }),
      catchError(error => {
        console.error('Error al eliminar el catálogo', error);
        return throwError(() => new Error('Error al eliminar el catálogo'));
      })
    );
  }

  deleteMultipleCatalogs(ids: number[]): Observable<boolean> {
    return this.http.post<any>(`${this.CATALOG_URL}/deleteMultiple`, { ids }).pipe(
      map(response => {
        if (response.success) {
          // Invalida el listado general y los items de cada catálogo eliminado
          this.cacheService.delete(this.keys.all());
          ids.forEach(id => this.cacheService.delete(this.keys.items(id)));
          return true;
        }
        return false;
      }),
      catchError(error => {
        console.error('Error al eliminar los catálogos', error);
        return throwError(() => new Error('Error al eliminar los catálogos'));
      })
    );
  }

  updateNameCatalog(name: string, id_catalog: number): Observable<boolean> {
    console.log(name, id_catalog);
    return this.http.put(`${this.CATALOG_URL}/update?id_catalogo=${id_catalog}`, { nombre: name }).pipe(
      map((response: any) => {
        if (response.success) {
          this.cacheService.delete(this.keys.all());
        }
        return response.success;
      }),
      catchError(error => {
        console.error('Error al editar el nombre del catálogo', error);
        return throwError(() => new Error('Error al editar el nombre del catálogo'));
      })
    )
  }

  // ── ITEMS DE CATÁLOGO ───────────────────────────────────────────────────

  getCatalogData(catalogId: number): Observable<CatalogItem[]> {
    const cacheKey = this.keys.items(catalogId);
    const cached = this.cacheService.get<CatalogItem[]>(cacheKey);
    if (cached) return of(cached);

    return this.http.get<any>(`${this.CATALOG_URL}/${catalogId}/items`).pipe(
      map(response => {
        if (response.success) {
          const items: CatalogItem[] = response.data.map((item: any) => ({
            id: item.id,
            nombre: item.nombre,
            id_catalogo: catalogId,
            ...(item.padre ? { padre: item.padre } : {}),
            ...(item.parentId ? { parentId: item.parentId } : {}),
            ...(item.grandParentId ? { grandParentId: item.grandParentId } : {}),
          }));
          this.cacheService.set(cacheKey, items);
          return items;
        }
        throw new Error('No se pudo cargar el catálogo');
      }),
      catchError(error => {
        console.error(`Error al cargar catálogo ${catalogId}`, error);
        return throwError(() => new Error(`No se pudo cargar el catálogo ${catalogId}`));
      })
    );
  }
  invalidateCatalogItems(catalogId: number): void {
    this.cacheService.delete(this.keys.items(catalogId));
  }

  createCatalogItem(data: any): Observable<CatalogItem | null> {
    return this.http.post<any>(`${this.CATALOG_URL}/createItem`, {
      nombre: data.nombre,
      id_catalogo: data.id_catalogo,
      filterValue: data.filterValue
    }).pipe(
      map(response => {
        if (response.success) {
          const newItem: CatalogItem = {
            id: response.data.id_catalog_item,
            id_catalogo: response.data.id_catalog,
            nombre: response.data.nombre
          };
          this.cacheService.delete(this.keys.all());
          this.cacheService.delete(this.keys.items(data.id_catalogo));
          return newItem;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error al guardar el nuevo item del catalogo', error);
        return throwError(() => new Error('Error al crear el item'));
      })
    );
  }

  updateCatalogItem(data: any): Observable<CatalogItem | null> {
    return this.http.put<any>(
      `${this.CATALOG_URL}/updateItem?id_catalog_item=${data.id}`,
      {
        nombre: data.nombre,
        id_catalog: data.id_catalogo,
        filterValue: data.filterValue ?? null  // 👈
      }
    ).pipe(
      map(response => {
        if (response.success) {
          const itemUpdated: CatalogItem = {
            id: response.data.id_catalog_item,
            id_catalogo: response.data.id_catalog,
            nombre: response.data.nombre,
          };
          this.cacheService.delete(this.keys.all());
          this.cacheService.delete(this.keys.items(data.id_catalogo));
          return itemUpdated;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error al actualizar el item', error);
        return throwError(() => new Error('Error al actualizar el item'));
      })
    );
  }

  deleteCatalogItem(data: CatalogItem): Observable<boolean> {
    return this.http.delete<any>(
      `${this.CATALOG_URL}/deleteItem?id_catalog_item=${data.id}&id_catalog=${data.id_catalogo}`
    ).pipe(
      map(response => {
        if (response.success) {
          this.cacheService.delete(this.keys.all());
          this.cacheService.delete(this.keys.items(data.id_catalogo));
        }
        return response.success;
      }),
      catchError(error => {
        console.error('Error al eliminar el item del catalogo', error);
        return throwError(() => new Error('Error al eliminar el item'));
      })
    );
  }

  // ── DEPARTAMENTOS Y COMUNIDADES ─────────────────────────────────────────

  getDepartamentos(): Observable<Array<any> | null> {
    const cacheKey = this.keys.departamentos();
    const cached = this.cacheService.get<any>(cacheKey);
    if (cached) return of(cached);

    return this.http.get<any>(`${this.CATALOG_URL}/departamentos`).pipe(
      map(response => {
        if (response.success) {
          const data = response.data.map((dep: any) => ({
            id: dep.id_catalogo,
            nombre: dep.nombre
          }));
          this.cacheService.set(cacheKey, data);
          return data;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error al obtener los departamentos', error);
        return throwError(() => new Error('Error al obtener los departamentos'));
      })
    );
  }

  getComunidadesByDepto(ids: Array<number>): Observable<Array<any> | null> {
    return this.http.post<any>(`${this.CATALOG_URL}/comunidades`, { ids_departamentos: ids }).pipe(
      map(response => {
        if (response.success) {
          return response.data.map((com: any) => ({
            id: com.id_catalogo,
            nombre: com.nombre
          }));
        }
        return null;
      }),
      catchError(error => {
        console.error('Error al obtener las comunidades', error);
        return throwError(() => new Error('Error al obtener las comunidades'));
      })
    );
  }

  // ── FORMULARIOS ─────────────────────────────────────────────────────────

  getAllForms(): Observable<any> {
    const cacheKey = this.keys.allForms();
    const cached = this.cacheService.get(cacheKey);
    if (cached) return of(cached);

    return this.http.get<any>(`${this.FORM_URL}/all`).pipe(
      map(response => {
        if (response.success) {
          this.cacheService.set(cacheKey, response.data);
          return response.data;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error al obtener los formularios', error);
        return throwError(() => new Error('Error al obtener los formularios'));
      })
    );
  }

  // ── FILTROS ─────────────────────────────────────────────────────────────

  getCatalogFiltered(catalogId: string, filterKey: string, filterValue: any): Observable<CatalogItem[]> {
    const cacheKey = this.keys.itemsFiltered(catalogId, filterValue);
    const cached = this.cacheService.get<CatalogItem[]>(cacheKey);
    if (cached) return of(cached);

    return this.http.get<any>(
      `${this.CATALOG_URL}/${catalogId}/items?filterValue=${filterValue}`
    ).pipe(
      map(response => {
        if (response.success) {
          const items: CatalogItem[] = response.data.map((item: any) => ({
            id: item.id,
            nombre: item.nombre,
            id_catalogo: Number(catalogId)
          }));
          this.cacheService.set(cacheKey, items);
          return items;
        }
        throw new Error('No se pudieron filtrar los items');
      }),
      catchError(error => {
        console.error(`Error al filtrar catálogo ${catalogId}`, error);
        return throwError(() => new Error(`No se pudo filtrar el catálogo ${catalogId}`));
      })
    );
  }

  getCatalogMetadata(catalogId: string): Observable<CatalogMetadata> {
    const cacheKey = this.keys.metadata(catalogId);
    const cached = this.cacheService.get<CatalogMetadata>(cacheKey);
    if (cached) return of(cached);

    return this.http.get<any>(`${this.CATALOG_URL}/${catalogId}/metadata`).pipe(
      map(response => {
        if (response.success) {
          this.cacheService.set(cacheKey, response.data);
          return response.data;
        }
        return { filterFields: [] };
      }),
      catchError(error => {
        console.error(`Error al cargar metadata ${catalogId}`, error);
        return of({ filterFields: [] });
      })
    );
  }

  getCatalogOptionsFiltered(
    catalogId: number,
    filterIds?: (string | number)[]
  ): Observable<{ value: string | number; label: string }[]> {
    return this.getCatalogData(catalogId).pipe(
      map(catalogData => {
        const filtered = filterIds?.length
          ? catalogData.filter(item => filterIds.some(id => String(id) === String(item.id)))
          : catalogData;

        return filtered.map(item => ({ value: item.id, label: item.nombre }));
      }),
      catchError(error => {
        console.error(`Error filtrando opciones de ${catalogId}:`, error);
        return throwError(() => new Error('No se pudieron filtrar opciones'));
      })
    );
  }

  getComunidades(id_departamento: number): Observable<Array<{ id: number; nombre: string }> | null> {
    const cacheKey = this.keys.comunidad(id_departamento);
    const cached = this.cacheService.get<any>(cacheKey);
    if (cached) return of(cached);

    return this.http.post<any>(`${this.CATALOG_URL}/comunidades`, {
      ids_departamentos: [id_departamento]
    }).pipe(
      map(response => {
        if (response.success) {
          const data = response.data.map((com: any) => ({
            id: com.id_catalogo,
            nombre: com.nombre
          }));
          this.cacheService.set(cacheKey, data);
          return data;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error al obtener comunidades', error);
        return throwError(() => new Error('Error al obtener comunidades'));
      })
    );
  }
}