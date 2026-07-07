import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { map, Observable } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';


export interface HitosNinoResumen {
  id_nino: number;
  nombres: string;
  apellidos: string;
  tiene_consentimiento: boolean;
  rango_hitos_id: string | null;
  mes_seleccionado_label: string | null;
}

export interface HitosEncuestaResumen {
  id_encuesta: number;
  uuid: string;
  cantidad_ninos: number;
  estado: string;
  fecha_registro: string;
  comunidad: { id_comunidad: number; nombre: string } | null;
  usuario: { id_usuario: number; nombres: string; apellidos: string } | null;
  total_ninos: number;
  con_consentimiento: number;
  sin_consentimiento: number;
  ninos: HitosNinoResumen[];
}

export interface HitosEncuestasResponse {
  success: boolean;
  data: HitosEncuestaResumen[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface HitosFilters {
  id_comunidad?: number;
  id_usuario?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  page?: number;
  limit?: number;
}


@Injectable({
  providedIn: 'root'
})
export class HitosService {
  private apiUrl = `${environment.BASE_URL}/hitos`;

  constructor(private http: HttpClient) { }

  getEncuestas(filters: HitosFilters = {}): Observable<HitosEncuestasResponse> {
    let params = new HttpParams();
    if (filters.id_comunidad) params = params.set('id_comunidad', filters.id_comunidad);
    if (filters.id_usuario) params = params.set('id_usuario', filters.id_usuario);
    if (filters.fecha_desde) params = params.set('fecha_desde', filters.fecha_desde);
    if (filters.fecha_hasta) params = params.set('fecha_hasta', filters.fecha_hasta);
    if (filters.page) params = params.set('page', filters.page);
    if (filters.limit) params = params.set('limit', filters.limit);

    return this.http.get<HitosEncuestasResponse>(this.apiUrl, { params });
  }

  // hitos.service.ts
  getEncuestaComoResponses(id_encuesta: number): Observable<Record<string, any>> {
    return this.http.get<any>(
      `${this.apiUrl}/${id_encuesta}/responses`
    ).pipe(
      map(res => res.data) // 👈 extraer solo el data
    );
  }

}
