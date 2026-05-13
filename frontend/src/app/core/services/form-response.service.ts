import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CacheService } from './cache.service';

export interface SaveResponsePayload {
  id_formulario: string;
  id_usuario?: number | null;
  responses: Record<string, any>;
  estructura: {
    regions: any[];
  };
  visibleElements: string[];
}

export interface GetResponsesFilters {
  id_comunidad?: number;
  id_departamento?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  id_usuario?: number;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class FormResponseService {
  private cacheKey = 'FORM_INFO:';
  private readonly URL = environment.BASE_URL + '/form-responses';

  constructor(private http: HttpClient, private cacheService: CacheService) { }

  /**
   * Guardar respuesta de formulario en el backend
   */
  saveFormResponse(payload: SaveResponsePayload): Observable<any> {
    const key = `${this.cacheKey}info:${payload.id_formulario}`;

    return this.http.post(`${this.URL}/save`, payload).pipe(
      map((response: any) => {
        if (response.success) {
          console.log('✅ Respuesta guardada:', response.data);
          this.cacheService.delete(key);
          return response;
        }
        throw new Error(response.message || 'Error al guardar');
      }),
      catchError(error => {
        console.error('❌ Error al guardar respuesta:', error);
        return throwError(() => new Error('Error al guardar el formulario'));
      })
    );
  }

  /**
   * Obtener respuestas de un formulario con filtros opcionales
   */
  getFormResponses(id_formulario: number, filters?: GetResponsesFilters): Observable<any> {
    // Construir query params
    const params: Record<string, string> = {};
    if (filters?.id_comunidad) params['id_comunidad'] = String(filters.id_comunidad);
    if (filters?.id_departamento) params['id_departamento'] = String(filters.id_departamento);
    if (filters?.fecha_desde) params['fecha_desde'] = filters.fecha_desde;
    if (filters?.fecha_hasta) params['fecha_hasta'] = filters.fecha_hasta;
    if (filters?.id_usuario) params['id_usuario'] = String(filters.id_usuario);
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.limit) params['limit'] = String(filters.limit);

    return this.http.get(`${this.URL}/${id_formulario}`, { params }).pipe(
      map((response: any) => {
        if (response.success) return response.data;
        throw new Error(response.message);
      }),
      catchError(error => {
        console.error('❌ Error al obtener respuestas:', error);
        return throwError(() => new Error('Error al obtener respuestas'));
      })
    );
  }

  updateResponse(id_respuesta: number, datos: Record<string, any>): Observable<any> {
    return this.http.put<any>(`${this.URL}/${id_respuesta}`, { datos }).pipe(
      map(response => response),
      catchError(error => {
        console.error('Error al actualizar respuesta', error);
        return throwError(() => new Error('Error al actualizar la respuesta'));
      })
    );
  }

  getPersonaByCui(cui: string): Observable<any> {
    return this.http.get<any>(`${this.URL}/persona/${cui}`).pipe(
      map(response => {
        if (response.success) return response.data;
        throw new Error('Persona no encontrada');
      }),
      catchError(error => {
        console.error('Error al buscar persona por CUI', error);
        return throwError(() => new Error('Persona no encontrada'));
      })
    );
  }
}