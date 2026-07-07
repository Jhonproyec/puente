import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CarnetPersona {
  id_respuesta: number;
  fecha_registro: string;
  persona: {
    id_persona: number;
    cui: string;
    codigo_temporal: string | null;
    nombres: string;
    apellidos: string;
    registro_incompleto: boolean;
    qr_path: string | null;
    comunidad: {
      id_comunidad: number;
      nombre: string;
    } | null;
  };
  bimestres: Array<{
    id_carnet_bimestre: number;
    mes: number;
    bimestre: number;
    huellas: Array<{ fecha: string; sesion: number | null }>;
  }>;
}


@Injectable({
  providedIn: 'root'
})
export class CarnetService {
  private readonly base = `${environment.BASE_URL}/form-responses`;

  constructor(private http: HttpClient) { }

  getCarnetPersonas(id_formulario: number, filters: {
    id_comunidad?: number;
    page?: number;
    limit?: number;
  } = {}): Observable<any> {
    const params: any = { id_formulario };
    if (filters.id_comunidad) params['id_comunidad'] = filters.id_comunidad;
    if (filters.page) params['page'] = filters.page;
    if (filters.limit) params['limit'] = filters.limit;

    return this.http.get(`${this.base}/carnet`, { params });
  }

  getPersonaByCodigoTemporal(codigo: string): Observable<any> {
    return this.http.get(`${this.base}/persona/codigo/${codigo}`);
  }

  generarQrPersona(idPersona: number) {
    return this.http.get<any>(
      `${this.base}/persona/${idPersona}/qr`
    );
  }



}
