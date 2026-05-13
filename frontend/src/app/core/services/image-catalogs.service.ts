import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CatalogImage } from '../../features/image-catalog/image-catalog';
import { catchError, map, Observable, tap, throwError } from 'rxjs';
import { error } from 'console';

@Injectable({
  providedIn: 'root'
})
export class ImageCatalogsService {
  private api = `${environment.BASE_URL}/image-catalog`;

  constructor(private http: HttpClient) { }

  getImages(page = 1, limit = 12, search = ''): Observable<{ data: CatalogImage[], pagination: any }> {
    const params = new HttpParams()
      .set('page', page)
      .set('limit', limit)
      .set('search', search);
    return this.http.get<{ data: CatalogImage[], pagination: any }>(this.api, { params }).pipe(
      map((response: any) => {
        if (response.success) {
          return response.data;
        }
      }),
      catchError(error => {
        console.error('Error al editar el nombre del catálogo', error);
        return throwError(() => new Error('Error al editar el nombre del catálogo'));
      })
    )
  }
  uploadImages(formData: FormData): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.api}/upload`, formData);
  }

  renameImage(id: number, nombre: string): Observable<{ success: boolean }> {
    return this.http.patch<{ success: boolean }>(`${this.api}/${id}`, { nombre });
  }

  deleteImage(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.api}/${id}`);
  }

  deleteImages(ids: number[]): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.api}/delete-bulk`, { ids });
  }

}
