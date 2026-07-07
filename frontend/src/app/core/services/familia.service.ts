import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FamiliaListItem {
  id_familia: number;
  codigo: string;
  qr_path: string | null;
  fecha_registro: string;
  madre: {
    id_persona: number;
    cui: string;
    nombres: string;
    apellidos: string;
    fecha_ingreso_programa: string | null;
  };
  comunidad: {
    id_comunidad: number;
    nombre: string;
    departamento: {
      id_departamento: number;
      nombre: string;
    };
  };
  _count: {
    integrantes: number;
  };
  respuestas: Array<{
    id_respuesta: number;
  }>;
}
export interface Integrante {
  id_persona: number;
  cui: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string | null;
  tipo_persona: string;
  rol: string;
  datos_extra: any;
}

export interface QrResult {
  url: string;
  qr_path: string;
}

@Injectable({
  providedIn: 'root'
})
export class FamiliaService {
  private readonly base = `${environment.BASE_URL}/familias`;

  constructor(private http: HttpClient) { }

  getFamilias(filters: {
    id_comunidad?: number;
    id_departamento?: number;
    page?: number;
    limit?: number;
  } = {}): Observable<any> {
    const params: any = {};
    if (filters.id_comunidad) params['id_comunidad'] = filters.id_comunidad;
    if (filters.id_departamento) params['id_departamento'] = filters.id_departamento;
    if (filters.page) params['page'] = filters.page;
    if (filters.limit) params['limit'] = filters.limit;

    return this.http.get(`${this.base}`, { params });
  }

  getFamiliaById(id_familia: number): Observable<any> {
    return this.http.get(`${this.base}/${id_familia}`);
  }

  getQr(id_familia: number): Observable<{ success: boolean; data: QrResult }> {
    return this.http.get<{ success: boolean; data: QrResult }>(
      `${this.base}/${id_familia}/qr`
    );
  }

  getIntegrantes(id_familia: number): Observable<{ success: boolean; data: Integrante[] }> {
    return this.http.get<{ success: boolean; data: Integrante[] }>(
      `${this.base}/${id_familia}/integrantes`
    );
  }

  generarCodigoTemporal(data: {
    nombres: string;
    apellidos: string;
    id_comunidad: number;
    fecha_inscripcion: string;
  }): Observable<{ success: boolean; data: { codigo: string } }> {
    return this.http.post<{ success: boolean; data: { codigo: string } }>(
      `${this.base}/generar-codigo`,
      data
    );
  }

}
