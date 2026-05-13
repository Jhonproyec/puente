import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

export const authInterceptorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const http = inject(HttpClient);
  const router = inject(Router);

  const reqWithCredentials = req.clone({ withCredentials: true });
  return next(reqWithCredentials).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si es 401 y no es la propia petición de refresh o login, intentamos renovar
      const isAuthEndpoint = req.url.includes('/auth/refresh') || req.url.includes('/auth/login');

      if (error.status === 401 && !isAuthEndpoint) {
        return http.post(`${environment.BASE_URL}/auth/refresh`, {}, { withCredentials: true }).pipe(
          switchMap(() => {
            // Token renovado — reintentar la petición original
            return next(reqWithCredentials);
          }),
          catchError(() => {
            // Refresh también falló — sesión expirada
            authService.currentUser.set(null);
            authService.forms.set([]);
            router.navigate(['/login']);
            return throwError(() => error);
          })
        );
      }

      return throwError(() => error);
    })
  );
};
