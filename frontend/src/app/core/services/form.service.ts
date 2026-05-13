import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { error } from 'console';

@Injectable({
  providedIn: 'root'
})
export class FormService {
  private readonly FORM_URL = environment.BASE_URL + '/formBuilder';
  constructor(
    private http: HttpClient
  ) { }

  createNewForm(data: any): Observable<any> {
    const newData= {
      nombre: data.name,
      usuario_registro: data.idUser,
      estado: 'BORRADOR'
    }
    return this.http.post(`${this.FORM_URL}/create`, newData).pipe(
      map((response:any) => {
        if(response.success){
          return response.data;
        }else{
          return null;
        }
      }),
      catchError(error => {
        console.error("Error al crear el formulario", error);
        return throwError(() => new Error("Error al crear el formulario"));
      })
    )
  }

  updateName(data: any):Observable<any>{
    return this.http.put(`${this.FORM_URL}/updateName`, data).pipe(
      map((response:any) => {
        if(response.success){
          return response.data
        }
        return null;
      }),
      catchError(error => {
        console.error("Error al editar el nombre", error);
        return throwError(() => new Error('Error al editar el nombre'));
      })
    )
  }

  deleteForm(uuid: string, id_usuario: number):Observable<any>{
    return this.http.delete(`${this.FORM_URL}/delete?uuid=${uuid}&id_usuario=${id_usuario}`).pipe(
      map((response:any) => {
        return response.success;
      }),
      catchError(error => {
        console.error("Error al eliminar el formulario", error);
        return throwError(() => new Error("Error al eliminar el formulario"));
      })
    )
  }


}
