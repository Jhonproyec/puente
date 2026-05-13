import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { forkJoin, ReplaySubject, Subject, takeUntil } from 'rxjs';
import { UserService } from '../../../core/services/auth/user.service';
import { CreateUserRequest } from '../../../core/models/user.model';
import { CatalogService } from '../../../core/services/catalog.service';
import { NotificationService } from '../../../core/services/notification.service';
import { RoleService } from '../../../core/services/role.service';

interface Departamento { id: number; nombre: string; }
interface Comunidad { id: number; nombre: string; departamentoId: number; }

@Component({
  selector: 'app-create-user-dialog',
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, NgxMatSelectSearchModule,
  ],
  templateUrl: './create-user-dialog.html',
  styleUrl: './create-user-dialog.css'
})
export class CreateUserDialog implements OnInit, OnDestroy {
  createUserForm: FormGroup;

  // Estados de carga
  isLoadingForm = signal(false);   // loading inicial del dialog (al editar)
  isLoading = signal(false);       // loading del botón guardar
  isLoadingComunidades = signal(false);

  error = signal<string>('');
  hidePassword = signal(true);
  isAllDeptos = signal(false);
  isAllComunidades = signal(false);

  readonly SELECT_ALL_VALUE = 'ALL';
  readonly isEditMode: boolean;

  allDepartamentos: Departamento[] = [];
  allComunidades: Comunidad[] = [];
  allForms: Array<any> = [];
  roles: Array<{ value: string; label: string }> = [];

  departamentoFilterCtrl = new FormControl<string>('');
  filteredDepartamentos = new ReplaySubject<Departamento[]>(1);
  comunidadFilterCtrl = new FormControl<string>('');
  filteredComunidades = new ReplaySubject<Comunidad[]>(1);

  private _lastFetchedDeptoIds: number[] = [];
  private _destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private dialogRef: MatDialogRef<CreateUserDialog>,
    @Inject(MAT_DIALOG_DATA) public userId: number | null,  // ahora es solo el ID
    private catalogService: CatalogService,
    private notificationService: NotificationService,
    private rolService: RoleService,
    private cdr: ChangeDetectorRef,
  ) {
    this.isEditMode = userId != null;

    this.createUserForm = this.fb.group({
      userId: [''],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      repeatPassword: ['', [Validators.required, Validators.minLength(8)]],
      role: ['', [Validators.required]],
      departamentos: [[], [Validators.required]],
      comunidades: [[], [Validators.required]],
      forms: [[]],
    });

    // En edición no se requiere contraseña
    if (this.isEditMode) {
      this.createUserForm.get('password')?.clearValidators();
      this.createUserForm.get('password')?.updateValueAndValidity();
      this.createUserForm.get('repeatPassword')?.clearValidators();
      this.createUserForm.get('repeatPassword')?.updateValueAndValidity();
    }
  }

  ngOnInit(): void {
    this.filteredDepartamentos.next([]);

    this.departamentoFilterCtrl.valueChanges
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this._filterDepartamentos());

    this.comunidadFilterCtrl.valueChanges
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this._filterComunidades());

    this.createUserForm.get('departamentos')!.valueChanges
      .pipe(takeUntil(this._destroy$))
      .subscribe((val) => {
        const ids = (val ?? []).filter((v: any) => v !== this.SELECT_ALL_VALUE);
        this.isAllDeptos.set(ids.length === this.allDepartamentos.length && this.allDepartamentos.length > 0);
        this.createUserForm.get('comunidades')?.setValue([], { emitEvent: false });
        this.allComunidades = [];
        this.filteredComunidades.next([]);
        this._lastFetchedDeptoIds = [];
        this.isAllComunidades.set(false);
      });

    this.createUserForm.get('comunidades')!.valueChanges
      .pipe(takeUntil(this._destroy$))
      .subscribe((val) => {
        const ids = (val ?? []).filter((v: any) => v !== this.SELECT_ALL_VALUE);
        this.isAllComunidades.set(ids.length === this.allComunidades.length && this.allComunidades.length > 0);
      });

    this._loadInitialData();
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  // ── Carga inicial ──────────────────────────────────────────────────────────

  private _loadInitialData(): void {
    this.isLoadingForm.set(true);

    // Cargamos catálogos base en paralelo
    const catalogs$ = forkJoin({
      departamentos: this.catalogService.getDepartamentos(),
      roles: this.rolService.getAllRoles(),
      forms: this.catalogService.getAllForms(),
    });

    catalogs$.subscribe({
      next: ({ departamentos, roles, forms }) => {
        this.allDepartamentos = departamentos ?? [];
        this.filteredDepartamentos.next(this.allDepartamentos.slice());

        this.roles = (roles ?? []).map(r => ({
          value: r.id_rol!.toString(),
          label: r.name
        }));

        this.allForms = forms ?? [];

        // Si es edición, ahora consultamos el usuario
        if (this.isEditMode) {
          this._loadUserForEdit();
        } else {
          this.isLoadingForm.set(false);
        }

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando catálogos', err);
        this.notificationService.showError('Error al cargar datos del formulario');
        this.isLoadingForm.set(false);
      }
    });
  }

  private _loadUserForEdit(): void {
    this.userService.getUserById(this.userId!).subscribe({
      next: (response) => {
        console.log(response);
        if (response != null) {
          const u = response;
          this._fillForm(u);
          this.isLoadingForm.set(false);
          this.cdr.detectChanges();
        } else {
          this.notificationService.showError("Error al cargar los datos del usuario");
        }
      },
      error: (err) => {
        console.error('Error cargando usuario', err);
        this.notificationService.showError('Error al cargar los datos del usuario');
        this.isLoadingForm.set(false);
      }
    });
  }

  private _fillForm(u: any): void {
    // ── Campos simples ──────────────────────────────────────────────────────
    this.createUserForm.patchValue({
      userId: u.idUser,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.rol?.id_rol?.toString() ?? '',
      forms: (u.forms ?? []).map((f: any) => f.formulario?.id_formulario),
    });

    // ── Departamentos y comunidades ─────────────────────────────────────────
    if (u.access_global) {
      const todosDeptoIds = this.allDepartamentos.map(d => d.id);
      this.createUserForm.get('departamentos')?.setValue(todosDeptoIds, { emitEvent: false });
      this.isAllDeptos.set(true);
      this.isAllComunidades.set(true);
      // comunidades queda vacío; onSubmit enviará null por isAllComunidades = true
      this._loadComunidadesForEdit(todosDeptoIds, null);
    } else {
      const deptoIds: number[] = [
        ...new Set(
          (u.comunidades as any[])
            .map((c: any) => c.departamento?.id_departamento)
            .filter(Boolean)
        )
      ];

      this.createUserForm.get('departamentos')?.setValue(deptoIds, { emitEvent: false });
      this.isAllDeptos.set(deptoIds.length === this.allDepartamentos.length && this.allDepartamentos.length > 0);

      if (deptoIds.length > 0) {
        this._loadComunidadesForEdit(deptoIds, u.comunidades);
      }
    }
  }

  private _loadComunidadesForEdit(deptoIds: number[], comunidadesUsuario: any[] | null): void {
    this.isLoadingComunidades.set(true);

    this.catalogService.getComunidadesByDepto(deptoIds).subscribe({
      next: (response) => {
        if (response != null) {
          this.allComunidades = response;
          this.filteredComunidades.next(response.slice());
          this._lastFetchedDeptoIds = [...deptoIds];

          // Si comunidadesUsuario es null → access_global, seleccionar todas
          const comunidadIds = comunidadesUsuario == null
            ? response.map((c: any) => c.id)
            : comunidadesUsuario.map((c: any) => c.id);

          this.createUserForm.get('comunidades')?.setValue(comunidadIds, { emitEvent: false });
          this.isAllComunidades.set(true);  // siempre true en ambos casos aquí
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error cargando comunidades para edición', err);
        this.notificationService.showError('Error al cargar comunidades del usuario');
      },
      complete: () => this.isLoadingComunidades.set(false)
    });
  }

  // ── Departamentos helpers ──────────────────────────────────────────────────

  private _filterDepartamentos(): void {
    const search = (this.departamentoFilterCtrl.value ?? '').toLowerCase().trim();
    if (!search) { this.filteredDepartamentos.next(this.allDepartamentos.slice()); return; }
    this.filteredDepartamentos.next(
      this.allDepartamentos.filter(d => d.nombre.toLowerCase().includes(search))
    );
  }

  toggleSelectAllDepartamentos(): void {
    if (this.isAllDeptos()) {
      this.createUserForm.get('departamentos')?.setValue([]);
    } else {
      this.createUserForm.get('departamentos')?.setValue(this.allDepartamentos.map(d => d.id));
    }
  }

  // ── Comunidades helpers ────────────────────────────────────────────────────

  private _filterComunidades(): void {
    const search = (this.comunidadFilterCtrl.value ?? '').toLowerCase().trim();
    if (!search) { this.filteredComunidades.next(this.allComunidades.slice()); return; }
    this.filteredComunidades.next(
      this.allComunidades.filter(c => c.nombre.toLowerCase().includes(search))
    );
  }

  private _deptoIdsChanged(current: number[]): boolean {
    if (current.length !== this._lastFetchedDeptoIds.length) return true;
    return current.some(id => !this._lastFetchedDeptoIds.includes(id));
  }

  onComunidadesOpened(): void {
    const deptoIds: number[] = (this.createUserForm.get('departamentos')?.value ?? [])
      .filter((v: any) => v !== this.SELECT_ALL_VALUE);

    if (!deptoIds.length || !this._deptoIdsChanged(deptoIds)) return;

    this.isLoadingComunidades.set(true);
    this.allComunidades = [];
    this.filteredComunidades.next([]);
    this.comunidadFilterCtrl.setValue('');

    this.catalogService.getComunidadesByDepto(deptoIds).subscribe({
      next: (response) => {
        if (response != null) {
          this.allComunidades = response;
          this.filteredComunidades.next(response.slice());
          this._lastFetchedDeptoIds = [...deptoIds];
        } else {
          this.notificationService.showError('Error al obtener las comunidades del servidor');
        }
      },
      error: (err) => {
        console.error('Error componente comunidades', err);
        this.notificationService.showError('Error al obtener las comunidades');
      },
      complete: () => this.isLoadingComunidades.set(false)
    });
  }

  toggleSelectAllComunidades(): void {
    if (this.isAllComunidades()) {
      this.isAllComunidades.set(false);
      this.createUserForm.get('comunidades')?.setValue([]);
    } else {
      this.isAllComunidades.set(true);
      this.createUserForm.get('comunidades')?.setValue(this.allComunidades.map(c => c.id));
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (!this.createUserForm.valid) return;

    const raw = this.createUserForm.getRawValue();
    const payload: CreateUserRequest = {
      ...raw,
      departamentos: this.isAllDeptos() ? null : raw.departamentos,
      comunidades: this.isAllComunidades() ? null : raw.comunidades,
    };

    if (!this.isEditMode) {
      if (!this.validatePassword()) {
        this.error.set('Las contraseñas ingresadas no coinciden');
        return;
      }
      this.isLoading.set(true);
      this.error.set('');
      this.userService.createUser(payload).subscribe({
        next: (user) => {
          if (user != null) {
            this.dialogRef.close(user);
          } else {
            this.notificationService.showError('Error al crear el usuario');
          }
        },
        error: (err) => this._handleError(err),
        complete: () => this.isLoading.set(false)
      });
    } else {
      this.isLoading.set(true);
      this.error.set('');
      this.userService.updateUser(payload).subscribe({
        next: (user) => {
          if (user != null) {
            this.dialogRef.close(user);
          } else {
            this.notificationService.showError('Error al actualizar el usuario');
          }
        },
        error: (err) => this._handleError(err),
        complete: () => this.isLoading.set(false)
      });
    }
  }

  // ── Utils ──────────────────────────────────────────────────────────────────

  private _handleError(error: any): void {
    this.isLoading.set(false);
    const msg = error?.error?.details?.[0]?.message ?? error?.error?.message ?? 'Error desconocido';
    this.error.set(msg);
  }

  validatePassword(): boolean {
    return this.createUserForm.get('password')?.value === this.createUserForm.get('repeatPassword')?.value;
  }

  onCancel(): void { this.dialogRef.close(); }
  togglePasswordVisibility(): void { this.hidePassword.set(!this.hidePassword()); }

  getFieldError(fieldName: string): string {
    const field = this.createUserForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) return '*Este campo es requerido';
      if (field.errors['email']) return '*Ingresa un email válido';
      if (field.errors['minlength']) return `*Debe tener al menos ${field.errors['minlength'].requiredLength} caracteres`;
    }
    return '';
  }
}