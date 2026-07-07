import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { CacheService } from './cache.service';

export interface CentroNutreme {
  id_centro_nutreme: number;
  uuid: string;
  codigo: string;
  nombre: string;
  id_comunidad: number;
  id_usuario: number | null;
  coordenadas: string | null;
  qr_path: string | null;
  estado_registro: boolean;
  fecha_registro: string;
  comunidad: {
    id_comunidad: number;
    nombre: string;
    id_departamento: number;
  };
  usuario: { id_usuario: number; nombres: string; apellidos: string } | null;
}
export interface CreateCentroNutremeRequest {
  codigo: string;
  nombre: string;
  id_comunidad: number;
  id_usuario: number | null;
  coordenadas?: string | null;
}

export interface EvaluacionCentroNutreme {
  id_respuesta: number;
  fecha_registro: string;
  evaluador: string;
  centro: {
    id_centro_nutreme: number;
    nombre: string;
    comunidad: string;
    personal_a_cargo: string;
  } | null;
}


@Injectable({
  providedIn: 'root'
})
export class CentroNutremeService {
  private readonly URL = `${environment.BASE_URL}/centros-nutreme`;

  constructor(private http: HttpClient, private cacheService: CacheService) { }

  getAll(filters?: { id_comunidad?: number; page?: number; limit?: number }): Observable<any> {
    const params: any = {};
    if (filters?.id_comunidad) params['id_comunidad'] = filters.id_comunidad;
    if (filters?.page) params['page'] = filters.page;
    if (filters?.limit) params['limit'] = filters.limit;

    return this.http.get<any>(this.URL, { params }).pipe(
      map(res => res.data),
      catchError(err => throwError(() => err))
    );
  }

  create(data: CreateCentroNutremeRequest): Observable<CentroNutreme> {
    return this.http.post<any>(this.URL, data).pipe(
      map(res => {
        this.cacheService.delete('CATALOG:items:88');
        return res.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  update(id: number, data: Partial<CreateCentroNutremeRequest>): Observable<CentroNutreme> {
    return this.http.put<any>(`${this.URL}/${id}`, data).pipe(
      map(res =>{
        this.cacheService.delete('CATALOG:items:88');
        return res.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.URL}/${id}`).pipe(
      map(res => res),
      catchError(err => throwError(() => err))
    );
  }

  generarQr(id: number): Observable<{ qr_path: string }> {
    return this.http.post<any>(`${this.URL}/${id}/qr`, {}).pipe(
      map(res => res.data),
      catchError(err => throwError(() => err))
    );
  }

  getEvaluaciones(filters?: { page?: number; limit?: number; fecha_desde?: string; fecha_hasta?: string }): Observable<any> {
    const params: any = {};
    if (filters?.page) params['page'] = filters.page;
    if (filters?.limit) params['limit'] = filters.limit;
    if (filters?.fecha_desde) params['fecha_desde'] = filters.fecha_desde;
    if (filters?.fecha_hasta) params['fecha_hasta'] = filters.fecha_hasta;

    return this.http.get<any>(`${this.URL}/evaluaciones`, { params }).pipe(
      map(res => res.data),
      catchError(err => throwError(() => err))
    );
  }

}
