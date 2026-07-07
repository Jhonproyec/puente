import { computed, inject, Injectable, signal } from "@angular/core";
import { environment } from "../../../../environments/environment";
import { FormSession, User } from "../../models/user.model";
import { HttpClient } from "@angular/common/http";
import { NotificationService } from "../notification.service";
import { ForgotPasswordRequest, LoginRequest } from "../../models/auth.model";
import { catchError, delay, finalize, map, Observable, of, tap, throwError } from "rxjs";
import { Router } from "@angular/router";

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly BASE_URL = environment.BASE_URL;


  currentUser = signal<User | null>(null);
  forms = signal<FormSession[]>([]);
  isLoggedIn = computed(() => this.currentUser() !== null);
  sessionChecked = signal(false);

  private http = inject(HttpClient);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  login(credentials: LoginRequest): Observable<void> {
    return this.http.post<{ data: { user: User; forms: FormSession[] } }>(
      `${this.BASE_URL}/auth/login`,
      credentials,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        this.currentUser.set(response.data.user);
        this.forms.set(response.data.forms);
        this.router.navigate(['/dashboard']);
      }),
      map(() => void 0),
      catchError(error => {
        this.notificationService.showError(
          error?.error?.message ?? 'Error al iniciar sesión'
        );
        return throwError(() => error);
      })
    );
  }

  restoreSession(): Observable<void> {
    return this.http.get<{ success: boolean; data: { user: User; forms: FormSession[] } }>(
      `${this.BASE_URL}/auth/me`,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        this.currentUser.set(response.data.user);
        this.forms.set(response.data.forms);
      }),
      map(() => void 0),
      catchError((err) => {
        this.currentUser.set(null);
        this.forms.set([]);
        return throwError(() => null);
      }),
      finalize(() => {
        this.sessionChecked.set(true); 
      })
    );
  }

  logout(): void {
    this.http.post(`${this.BASE_URL}/auth/logout`, {}, { withCredentials: true })
      .subscribe({
        complete: () => {
          this.currentUser.set(null);
          this.forms.set([]);
          this.router.navigate(['/login']);
        }
      });
  }

  hasPermission(permission: string): boolean {
    return this.currentUser()?.permissions?.includes(permission) ?? false;
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }

  addForm(form: FormSession): void {
    this.forms.update(current => [...current, form]);
  }

  removeForm(id: string): void {
    this.forms.update(current => current.filter(f => f.uuid !== id));
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<{ message: string }> {
    // Simulación - Reemplazar con llamada HTTP real
    return of({ message: 'Se ha enviado un enlace de recuperación a tu correo electrónico' }).pipe(
      delay(2000)
    );
  }


}