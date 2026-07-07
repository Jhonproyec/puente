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
import { CentroNutreme, CentroNutremeService } from '../../../core/services/centro-nutreme.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { UserService } from '../../../core/services/auth/user.service';
import { NotificationService } from '../../../core/services/notification.service';


interface Departamento { id: number; nombre: string; }
interface Comunidad { id: number; nombre: string; departamentoId: number; }

@Component({
  selector: 'app-create-centro-nutreme-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NgxMatSelectSearchModule,
  ],
  templateUrl: './create-centro-nutreme-dialog.html',
  styleUrl: './create-centro-nutreme-dialog.css'
})
export class CreateCentroNutremeDialog implements OnInit, OnDestroy {
  form: FormGroup;
  isLoading = signal(false);
  isLoadingForm = signal(false);
  isLoadingComunidades = signal(false);
  error = signal('');

  readonly isEditMode: boolean;

  allDepartamentos: Departamento[] = [];
  allComunidades: Comunidad[] = [];
  allUsuarios: any[] = [];

  departamentoFilterCtrl = new FormControl('');
  filteredDepartamentos = new ReplaySubject<Departamento[]>(1);
  comunidadFilterCtrl = new FormControl('');
  filteredComunidades = new ReplaySubject<Comunidad[]>(1);
  usuarioFilterCtrl = new FormControl('');
  filteredUsuarios = new ReplaySubject<any[]>(1);

  private _lastDeptoId: number | null = null;
  private _destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private centroService: CentroNutremeService,
    private catalogService: CatalogService,
    private userService: UserService,
    private notificationService: NotificationService,
    private dialogRef: MatDialogRef<CreateCentroNutremeDialog>,
    private cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public centro: CentroNutreme | null,
  ) {
    this.isEditMode = centro != null;

    this.form = this.fb.group({
      codigo: ['', [Validators.required, Validators.minLength(2)]],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      id_departamento: [null, Validators.required],
      id_comunidad: [null, Validators.required],
      id_usuario: [null],
      coordenadas: [''],
    });
  }

  ngOnInit(): void {
    this.filteredDepartamentos.next([]);
    this.filteredComunidades.next([]);
    this.filteredUsuarios.next([]);

    this.departamentoFilterCtrl.valueChanges
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this._filterDepartamentos());

    this.comunidadFilterCtrl.valueChanges
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this._filterComunidades());

    this.usuarioFilterCtrl.valueChanges
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => this._filterUsuarios());

    this.form.get('id_departamento')!.valueChanges
      .pipe(takeUntil(this._destroy$))
      .subscribe(deptoId => {
        if (deptoId && deptoId !== this._lastDeptoId) {
          this.form.get('id_comunidad')?.setValue(null);
          this._cargarComunidades(deptoId);
        }
      });

    this._loadInitialData();
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  private _loadInitialData(): void {
    this.isLoadingForm.set(true);

    forkJoin({
      departamentos: this.catalogService.getDepartamentos(),
      usuarios: this.userService.getUsers(1, 100),
    }).subscribe({
      next: ({ departamentos, usuarios }) => {
        this.allDepartamentos = departamentos ?? [];
        this.filteredDepartamentos.next(this.allDepartamentos.slice());

        this.allUsuarios = (usuarios as any)?.users ?? [];
        this.filteredUsuarios.next(this.allUsuarios.slice());

        if (this.isEditMode && this.centro) {
          this._fillForm();
        }

        this.isLoadingForm.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.notificationService.showError('Error al cargar datos');
        this.isLoadingForm.set(false);
      }
    });
  }

  private _fillForm(): void {
    if (!this.centro) return;
    this.form.patchValue({
      codigo: this.centro.codigo,
      nombre: this.centro.nombre,
      id_usuario: this.centro.id_usuario,
      coordenadas: this.centro.coordenadas || '',
    });

    const idDepartamento = this.centro.comunidad?.id_departamento;
    if (idDepartamento) {
      this.form.patchValue({ id_departamento: idDepartamento }, { emitEvent: false });
      this._cargarComunidades(idDepartamento, () => {
        this.form.patchValue({ id_comunidad: this.centro!.comunidad.id_comunidad });
        this.cdr.detectChanges();
      });
    }
  }

  private _cargarComunidades(deptoId: number, callback?: () => void): void {
    this.isLoadingComunidades.set(true);
    this.allComunidades = [];
    this.filteredComunidades.next([]);

    this.catalogService.getComunidadesByDepto([deptoId]).subscribe({
      next: (coms) => {
        this.allComunidades = coms ?? [];
        this.filteredComunidades.next(this.allComunidades.slice());
        this._lastDeptoId = deptoId;
        this.isLoadingComunidades.set(false);
        callback?.();
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoadingComunidades.set(false);
        this.notificationService.showError('Error al cargar comunidades');
      }
    });
  }

  private _filterDepartamentos(): void {
    const search = (this.departamentoFilterCtrl.value ?? '').toLowerCase();
    this.filteredDepartamentos.next(
      !search ? this.allDepartamentos.slice()
        : this.allDepartamentos.filter(d => d.nombre.toLowerCase().includes(search))
    );
  }

  private _filterComunidades(): void {
    const search = (this.comunidadFilterCtrl.value ?? '').toLowerCase();
    this.filteredComunidades.next(
      !search ? this.allComunidades.slice()
        : this.allComunidades.filter(c => c.nombre.toLowerCase().includes(search))
    );
  }

  private _filterUsuarios(): void {
    const search = (this.usuarioFilterCtrl.value ?? '').toLowerCase();
    this.filteredUsuarios.next(
      !search ? this.allUsuarios.slice()
        : this.allUsuarios.filter(u =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(search)
        )
    );
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const payload = {
      codigo: raw.codigo,
      nombre: raw.nombre,
      id_comunidad: Number(raw.id_comunidad),
      id_usuario: raw.id_usuario ? Number(raw.id_usuario) : null,
      coordenadas: raw.coordenadas || null,
    };

    this.isLoading.set(true);
    this.error.set('');

    const request$ = this.isEditMode
      ? this.centroService.update(this.centro!.id_centro_nutreme, payload)
      : this.centroService.create(payload);

    request$.subscribe({
      next: (result) => {
        console.log("EL RESULTADO",result);
        this.notificationService.showSuccess(
          this.isEditMode ? 'Centro actualizado correctamente' : 'Centro creado correctamente'
        );
        this.dialogRef.close(result);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Error al guardar');
        this.isLoading.set(false);
      },
      complete: () => this.isLoading.set(false),
    });
  }

  onCancel(): void { this.dialogRef.close(); }

  getFieldError(field: string): string {
    const f = this.form.get(field);
    if (f?.errors && f.touched) {
      if (f.errors['required']) return '*Este campo es requerido';
      if (f.errors['minlength']) return `*Mínimo ${f.errors['minlength'].requiredLength} caracteres`;
    }
    return '';
  }

  getNombreUsuario(u: any): string {
    return `${u.firstName} ${u.lastName}`;
  }
}
