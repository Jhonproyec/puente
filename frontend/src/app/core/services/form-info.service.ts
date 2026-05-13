import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { CacheService } from './cache.service';

export interface FormInfoData {
  id_formulario: number;
  uuid: string;
  nombre: string;
  estado: string;
  version: number;
  totalFields: number;
  totalResponses: number;
  creadoPor: string;
  fecha_registro: string;
  fecha_edicion: string;
}

export interface FormResponse {
  id_respuesta: number;
  fecha_registro: string;
  version_form: number;
  usuario: { id_usuario: number; nombres: string; apellidos: string } | null;
  comunidad: { id_comunidad: number; nombre: string } | null;
  departamento: { id_departamento: number; nombre: string } | null;
  personas: Array<{
    rol_en_form: string;
    persona: {
      id_persona: number;
      cui: string;
      nombres: string;
      apellidos: string;
      tipo_persona: string;
    }
  }>;
  datos_limpios: Record<string, any>;
}

export interface FormResponsesPaginated {
  data: FormResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GetResponsesFilters {
  id_comunidad?: number;
  id_departamento?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class FormInfoService {
  private readonly FORM_BUILDER_URL = environment.BASE_URL + '/formBuilder';
  private readonly FORM_RESPONSE_URL = environment.BASE_URL + '/form-responses';
  private cacheKey = 'FORM_INFO:';

  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) { }

  /**
   * Obtiene la info del formulario con total de campos y respuestas
   */
  getFormInfo(uuid: string): Observable<FormInfoData> {
    const key = `${this.cacheKey}info:${uuid}`;
    const cached = this.cacheService.get<FormInfoData>(key);
    if (cached) {
      console.log("Desde la cache");
      this.cacheService.convertToCatalogOptions(cached);
    }

    return this.http.get<any>(`${this.FORM_BUILDER_URL}/${uuid}/info`).pipe(
      map(response => {
        if (response.success) {
          this.cacheService.set(key, response.data);
          return response.data;
        }
        throw new Error('No se pudo cargar la información del formulario');
      }),
      catchError(error => {
        console.error('Error al cargar info del formulario', error);
        return throwError(() => new Error('Error al cargar información del formulario'));
      })
    );
  }

  /**
   * Obtiene las respuestas paginadas de un formulario
   */
  getFormResponses(uuid: string, filters?: GetResponsesFilters): Observable<FormResponsesPaginated> {
    const params: Record<string, string> = {};
    if (filters?.id_comunidad) params['id_comunidad'] = String(filters.id_comunidad);
    if (filters?.id_departamento) params['id_departamento'] = String(filters.id_departamento);
    if (filters?.fecha_desde) params['fecha_desde'] = filters.fecha_desde;
    if (filters?.fecha_hasta) params['fecha_hasta'] = filters.fecha_hasta;
    if (filters?.page) params['page'] = String(filters.page);
    if (filters?.limit) params['limit'] = String(filters.limit);

    return this.http.get<any>(`${this.FORM_RESPONSE_URL}/${uuid}/responses`, { params }).pipe(
      map(response => {
        if (response.success) return response.data;
        throw new Error('No se pudieron cargar las respuestas');
      }),
      catchError(error => {
        console.error('Error al cargar respuestas', error);
        return throwError(() => new Error('Error al cargar respuestas'));
      })
    );
  }

  /**
   * Elimina una respuesta por id
   */
  deleteResponse(id_respuesta: number): Observable<boolean> {
    return this.http.delete<any>(`${this.FORM_RESPONSE_URL}/${id_respuesta}`).pipe(
      map(response => {
        return response.success
      }),
      catchError(error => {
        console.error('Error al eliminar respuesta', error);
        return throwError(() => new Error('Error al eliminar la respuesta'));
      })
    );
  }

  getFormPreview(uuid: string): Observable<any> {
    return this.http.get<any>(`${this.FORM_BUILDER_URL}/${uuid}/preview`).pipe(
      map(response => {
        if (response.success) return response.data;
        throw new Error('No se pudo cargar la vista previa');
      }),
      catchError(error => {
        console.error('Error al cargar vista previa', error);
        return throwError(() => new Error('Error al cargar vista previa'));
      })
    );
  }

  /**
   * Invalida el cache de info cuando se guarda una nueva respuesta
   */
  invalidateInfoCache(uuid: string): void {
    this.cacheService.delete(`${this.cacheKey}info:${uuid}`);
  }
}