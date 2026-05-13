import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';


export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Si la sesión ya fue verificada, responder inmediatamente
  if (authService.sessionChecked()) {
    return authService.isLoggedIn() ? true : router.createUrlTree(['/login']);
  }

  // Si todavía no, esperar a que termine restoreSession
  return toObservable(authService.sessionChecked).pipe(
    filter(checked => checked),
    take(1),
    map(() => authService.isLoggedIn() ? true : router.createUrlTree(['/login']))
  );
};