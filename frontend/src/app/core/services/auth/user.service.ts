import { Injectable } from '@angular/core';
import { catchError, delay, map, Observable, of, throwError } from 'rxjs';
import { CreateUserRequest, User } from '../../models/user.model';
import { environment } from '../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../notification.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  readonly BASE_URL = environment.BASE_URL;

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) { }
  getUsers(page: number, limit: number): Observable<User[]> {
    return this.http.get(`${this.BASE_URL}/user`, {
      params: {
        page: page.toString(),
        limit: limit.toString()
      }
    }).pipe(
      map((response: any) => {
        if (response.success) {
          return response.data;
        } else {
          this.notificationService.showError("Error al obtener los usuarios");
          console.log(response);
        }
      }),
      catchError(error => {
        this.notificationService.showError("Error al obtener los usuarios");
        return throwError(() => error.error);
      })
    )
  }
  getUserById(idUser: number):Observable<any>{
    return this.http.get(`${this.BASE_URL}/user/${idUser}`).pipe(  
      map((response:any) => {
        if(response.success){
          return response.data;
        }else{
          return null;
        }
      }),
      catchError((error) => {
        console.error("Error al obtener el usuario", error);
        return throwError(() => new Error("Error al obtener el usuario"));
      })
    )
  }

  createUser(userData: CreateUserRequest): Observable<any> {
    return this.http.post(`${this.BASE_URL}/auth/register`, userData).pipe(
      map((response: any) => {
        if (response.success) {
          return response.data;
        } else {
          return null;
        }
      }),
      catchError(error => {
        console.error("Error al crear el usuario", error);
        return throwError(() => error.error);
      })
    )
  }

  updateUser(userData: any):Observable<any>{
    return this.http.put(`${this.BASE_URL}/user/update`, userData).pipe(  
      map((response:any) => {
        if(response.success){
          return response.data;
        }else{
          return null;
        }
      }),
      catchError(error => {
        console.error("Error al editar el usuario", error);
        return throwError(() => error.error);
      })
    )
  }

  deleteUser(userId:number):Observable<any>{
    return this.http.delete(`${this.BASE_URL}/user`, {params: {userId}}).pipe(
      map((response:any) => {
        if(response.success){
          this.notificationService.showSuccess("Usuario eliminado correctamente");
          return response.success;
        }else{
          console.log(response);
          this.notificationService.showError("Error al eliminar el usuario");
        }
      }),catchError((error:any) =>{
        this.notificationService.showError("Error al eliminar el usuario");
        console.log(error);
        return throwError(() => error);
      })
    )
  }

  changePassword(data: any):Observable<any>{
    return this.http.put(`${this.BASE_URL}/user/changePassword`, data).pipe(  
      map((response: any) => {
        if(response.success){
          this.notificationService.showSuccess("Contraseña actualizada correctamente");
        }else{
          console.log(response);
          this.notificationService.showError("Error al actualizar la contraseña");
        }
        return response;
      }),
      catchError((error: any) => {
        this.notificationService.showError("Error al actualizar la contraseña");
        console.error(error);
        return throwError(() => error);
      })
    )
  }

}
