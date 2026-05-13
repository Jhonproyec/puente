import { Injectable } from '@angular/core';
import { Observable, of, delay, throwError, map, catchError } from 'rxjs';
import { ModuleInterface, RolesInterface } from '../models/rol.model';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CacheService } from './cache.service';
import { error } from 'console';
// import { v4 as uuidv4 } from 'uuid';

export interface CreateRoleRequest {
  roleName: string;
  permissions: string[];
  allowedForms: string[];
}

export interface Role extends CreateRoleRequest {
  idRole: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  // Almacenamiento simulado en memoria
  private rolesStorage: Role[] = [];

  // También guardar en localStorage para persistencia entre recargas
  private storageKey = 'roles_storage';


  private catalogCacheKey = 'CATALOG:';
  private readonly CATALOG_URL = environment.BASE_URL + '/rol';

  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) { }

  getAllPermissions(): Observable<ModuleInterface[]> {
    const cacheKey = `${this.catalogCacheKey}:allPermission`;
    const cached = this.cacheService.get<ModuleInterface>(cacheKey);
    if (cached) {
      console.log('Del cache');
      return this.cacheService.convertToCatalogOptions(cacheKey);
    }
    return this.http.get(`${this.CATALOG_URL}/allPermission`).pipe(
      map((response: any) => {
        if (response.success) {
          const permissions: ModuleInterface[] = response.data.map((mo: any) => ({
            id_module: mo.id_module,
            name: mo.name,
            permissions: mo.permissions.map((per: any) => ({
              id_permission: per.id_permission,
              id_module: per.id_module,
              name: per.name,
              code: per.code,
              descripcion: per.descripcion
            }))
          }));
          return permissions;
        }
        return []
      }),
      catchError(error => {
        console.error('Error al cargar catálogos disponibles', error)
        return throwError(() => new Error('No se pudieron cargar los catálogos'));

      })
    )
  }

  createRol(data: any): Observable<RolesInterface> {
    const cacheKey = `${this.catalogCacheKey}:allRoles`;
    const newData = {
      nombre: data.roleName,
      permisos: data.permissions
    };
    return this.http.post(`${this.CATALOG_URL}/create`, newData).pipe(
      map((response: any) => {
        if (response.success) {
          const newRol: RolesInterface = {
            id_rol: response.data.id_rol,
            count_permissions: response.data.permissions.lenght,
            name: response.data.name,
            permissions: response.data.permissions,
            created_at: response.data.fecha_registro
          }
          this.cacheService.delete(cacheKey);
          return newRol;
        } else {
          throw throwError(() => new Error('No se pudo cargar el catálogo'))
        }
      }),
      catchError(error => {
        console.log("Error al guardar el rol", error);
        return throwError(() => new Error("Error al guardar el rol"));
      })
    )
  }
  /**
   * Cargar roles
   */
  getAllRoles(): Observable<RolesInterface[] | null> {
    const cacheKey = `${this.catalogCacheKey}:allRoles`;
    const cached = this.cacheService.get<RolesInterface[]>(cacheKey);
    if (cached) {
      console.log('Desde la cache');
      return this.cacheService.convertToCatalogOptions(cached);
    }

    return this.http.get(`${this.CATALOG_URL}/allRoles`).pipe(
      map((response: any) => {

        if(response.success){
          const roles: RolesInterface[] = response.data.map((rol:any) => ({
            id_rol: rol.id_rol, 
            name: rol.name, 
            permissions: rol.permissions,
            count_permissions: rol.permissions.length,
            created_at: rol.fecha_registro
          }))
          this.cacheService.set(cacheKey, roles);
          return roles;
        }else{
          return null;
        }
      }),
      catchError(error => {
        console.error('Error al obtener los roles', error);
        return throwError(() => new Error('Error al obtener los roles'));
      })
    )
  }


  updateRole(roleData: RolesInterface): Observable<RolesInterface | null> {
    const cacheKey = `${this.catalogCacheKey}:allRoles`;
    const rolToUpdate = {
      nombre: roleData.name,
      permisos: roleData.permissions
    };
    return this.http.put(`${this.CATALOG_URL}/update?id_rol=${roleData.id_rol}`, rolToUpdate).pipe(
      map((response:any) => {
        if(response.success){
          const rol: RolesInterface = {
            id_rol: response.data.id_rol, 
            name: response.data.name, 
            permissions: response.data.permissions,
            count_permissions: response.data.permissions.length,
            created_at: response.data.fecha_registro
          }
          this.cacheService.delete(cacheKey);
          return rol;
        }else{
          return null;
        }
      }),
      catchError(error => {
        console.error('Error al editar el rol', error);
        return throwError(() => new Error('Error al editar el error'));
      })
    )
  }


  deleteRole(roleId: number): Observable<boolean> {
    const cacheKey = `${this.catalogCacheKey}:allRoles`;
    return this.http.delete(`${this.CATALOG_URL}/delete?id_rol=${roleId}`).pipe(  
      map((response:any) => {
        this.cacheService.delete(cacheKey);
        return response.success;
      }),
      catchError(error => {
        console.error('error al eliminar el rol', error);
        return throwError(() => new Error('Error'));
      })
    )
  }



  /**
   * Limpiar todos los roles (Para testing)
   */
  clearAllRoles(): void {
    this.rolesStorage = [];
    localStorage.removeItem(this.storageKey);
    console.log('🗑️ Todos los roles han sido eliminados');
  }
}