import { ChangeDetectorRef, Component, computed, signal, TemplateRef, ViewChild } from '@angular/core';
import { CatalogItem, CatalogService } from '../../core/services/catalog.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmationDialog } from '../../layout/confirmation-dialog/confirmation-dialog';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { Router } from '@angular/router';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';

interface CatalogListItem {
  id: number;
  name: string;
  count?: number;
  isLoading?: boolean;
  isExpanded?: boolean;
  items?: CatalogItem[];
}


@Component({
  selector: 'app-catalog-management',
  imports: [
    // Angular
    CommonModule,
    FormsModule,
    ReactiveFormsModule,

    // Material
    MatExpansionModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatSelectModule,
  ],
  templateUrl: './catalog-management.html',
  styleUrl: './catalog-management.css'
})
export class CatalogManagement {
  // DATA
  catalogs: CatalogListItem[] = [];
  isLoadingCatalogs = true;
  searchTerm = '';

  // MODAL
  isModalOpen = false;
  editingItem: CatalogItem | null = null;
  currentCatalogId = 0;
  form!: FormGroup;

  catalogMetadata: { filterFields: string[] } = { filterFields: [] };
  isLoadingMetadata = false;

  // Para catálogos que dependen de departamento
  departamentos: { id: number; nombre: string }[] = [];
  selectedDepartamentoId: number | null = null;

  // Para catálogos que dependen de comunidad
  comunidades: { id: number; nombre: string }[] = [];
  selectedComunidadId: number | null = null;
  isLoadingComunidades = false;

  // TABLE
  displayedColumns: string[] = ['id', 'nombre', 'acciones'];
  selectedCatalogItems: CatalogItem[] = [];
  isLoading = false;
  isSaving = signal(false);
  editingCatalog: CatalogListItem | null = null;
  // Columnas dinámicas por catálogo
  catalogColumns: Map<number, string[]> = new Map();
  catalogParentLabel: Map<number, string> = new Map();

  canCreate = computed(() => this.authService.hasPermission('CREATE_CATALOG'));
  canUpdate = computed(() => this.authService.hasPermission('UPDATE_CATALOG'));
  canDelete = computed(() => this.authService.hasPermission('DELETE_CATALOG'));
  canView = computed(() => this.authService.hasPermission('VIEW_CATALOG'));

  selectedCatalogs: Set<number> = new Set();
  isNewCatalogModalOpen = false;
  newCatalogForm!: FormGroup;
  isSavingCatalog = signal(false);

  constructor(
    private catalogService: CatalogService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService,
    private confirmationService: ConfirmDialogService,
    private authService: AuthService,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    if (!this.canView()) {
      this.notificationService.showError("No tienes permisos para esta sección de la aplicación");
      this.router.navigate(['/dashboard']);
    }
    this.loadCatalogs();
  }

  /**
   * Carga la lista inicial de catálogos disponibles
   */
  loadCatalogs(): void {
    this.isLoadingCatalogs = true;
    this.cdr.markForCheck();

    this.catalogService.getAvailableCatalogs().subscribe({
      next: (catalogs) => {
        this.catalogs = catalogs
          .filter(cat => cat.name !== 'Centro Nútreme' && cat.name !== 'Usuarios') // ocultar del mantenimiento
          .map(cat => ({
            id: cat.id,
            name: cat.name,
            isLoading: false,
            isExpanded: false,
            items: [],
            count: cat.totalItems,
          }));

        this.isLoadingCatalogs = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error al cargar catálogos:', error);
        this.snackBar.open('❌ Error al cargar catálogos', 'Cerrar', { duration: 5000 });
        this.isLoadingCatalogs = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Se dispara cuando se abre/cierra un acordeón
   * Carga automáticamente los items cuando se expande
   */
  onPanelOpenClose(catalog: CatalogListItem, isOpen: boolean): void {
    if (isOpen && (!catalog.items || catalog.items.length === 0)) {
      this.loadCatalogItems(catalog);
      this.loadCatalogColumns(catalog);
    }
  }

  loadCatalogColumns(catalog: CatalogListItem): void {
    this.catalogService.getCatalogMetadata(String(catalog.id)).subscribe({
      next: (metadata) => {
        if (metadata.parentLabel) {
          // Tiene columna padre → [id, padre, nombre, acciones]
          this.catalogColumns.set(catalog.id, ['id', 'padre', 'nombre', 'acciones']);
          this.catalogParentLabel.set(catalog.id, metadata.parentLabel);
        } else {
          // Sin padre → columnas normales
          this.catalogColumns.set(catalog.id, ['id', 'nombre', 'acciones']);
        }
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Carga los items de un catálogo específico
   */
  loadCatalogItems(catalog: CatalogListItem): void {
    // Evitar cargar múltiples veces si ya se está cargando
    if (catalog.isLoading) {
      console.log(`${catalog.name} ya está cargándose, ignorando...`);
      return;
    }

    catalog.isLoading = true;
    this.cdr.markForCheck();

    this.catalogService.getCatalogData(catalog.id!).subscribe({
      next: (items) => {
        catalog.items = items;
        catalog.isExpanded = true;
        catalog.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error(`Error al cargar items del catálogo ${catalog.id}:`, error);
        this.snackBar.open(`❌ Error al cargar ${catalog.name}`, 'Cerrar', { duration: 5000 });
      }
    });
  }

  /**
   * Filtra los catálogos según el término de búsqueda
   */
  filterCatalogs(): CatalogListItem[] {
    if (!this.searchTerm.trim()) {
      return this.catalogs;
    }
    const filtered = this.catalogs.filter(cat =>
      cat.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    return filtered;
  }

  /**
   * Abre el modal para agregar un nuevo item
   */
  openAddModal(catalogId: number): void {
    if (!this.canCreate()) {
      this.notificationService.showError("Permisos insuficientes");
      return;
    }

    this.currentCatalogId = catalogId;
    this.editingItem = null;
    this.selectedDepartamentoId = null;
    this.selectedComunidadId = null;
    this.comunidades = [];
    this.catalogMetadata = { filterFields: [] };
    this.initializeForm();

    this.isLoadingMetadata = true;
    this.isModalOpen = true;
    this.cdr.markForCheck();

    this.catalogService.getCatalogMetadata(String(catalogId)).subscribe({
      next: (metadata) => {
        this.catalogMetadata = metadata as { filterFields: string[] };
        this.isLoadingMetadata = false;

        // Si depende de departamento o comunidad, precargamos los departamentos
        if (this.needsDepartamento() || this.needsComunidad()) {
          this.loadDepartamentos();
        }

        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingMetadata = false;
        this.cdr.markForCheck();
      }
    });
  }
  /**
   * Abre el modal para editar un item existente
   */
  openEditModal(catalogId: number, item: CatalogItem): void {
    if (!this.canUpdate()) {
      this.notificationService.showError("Permisos insuficientes");
      return;
    }

    this.currentCatalogId = catalogId;
    this.editingItem = item;
    this.selectedDepartamentoId = null;
    this.selectedComunidadId = null;
    this.comunidades = [];
    this.catalogMetadata = { filterFields: [] };

    this.form.patchValue({
      nombre: item.nombre,
      id: item.id,
      id_catalogo: item.id_catalogo
    });

    this.isLoadingMetadata = true;
    this.isModalOpen = true;
    this.cdr.markForCheck();

    this.catalogService.getCatalogMetadata(String(catalogId)).subscribe({
      next: (metadata) => {
        this.catalogMetadata = metadata as { filterFields: string[], parentLabel?: string };
        this.isLoadingMetadata = false;

        if (this.needsDepartamento() || this.needsComunidad()) {
          this.loadDepartamentos();

          if (this.needsComunidad() && item.grandParentId) {
            // centroAtencion: pre-seleccionar departamento y cargar comunidades
            this.selectedDepartamentoId = item.grandParentId;

            this.catalogService.getComunidades(item.grandParentId).subscribe({
              next: (comunidades) => {
                this.comunidades = comunidades ?? [];
                // Pre-seleccionar comunidad después de cargarlas
                this.selectedComunidadId = item.parentId ?? null;
                this.cdr.markForCheck();
              }
            });

          } else if (this.needsDepartamento() && item.parentId) {
            // comunidad: pre-seleccionar solo el departamento
            this.selectedDepartamentoId = item.parentId;
          }
        }

        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingMetadata = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Cierra el modal
   */
  closeModal(): void {
    this.isModalOpen = false;
    this.editingItem = null;
    this.initializeForm();
    this.cdr.markForCheck();
  }

  /**
   * Guarda un nuevo item o actualiza uno existente
   */
  saveItem(): void {
    if (!this.form.valid) {
      this.notificationService.showError("Formulario incompleto");
      return;
    }

    const nombreValue = this.form.value.nombre?.trim();
    if (!nombreValue) {
      this.notificationService.showError("El nombre es requerido");
      return;
    }

    // Validar selector padre si aplica
    if (this.needsDepartamento() && !this.needsComunidad() && !this.selectedDepartamentoId) {
      this.notificationService.showError("Debes seleccionar un departamento");
      return;
    }
    if (this.needsComunidad() && !this.selectedComunidadId) {
      this.notificationService.showError("Debes seleccionar una comunidad");
      return;
    }

    if (this.editingItem) {
      this.updateItem({ ...this.form.value });
    } else {
      // Construye el filterValue según la dependencia
      const filterValue = this.needsComunidad()
        ? this.selectedComunidadId
        : this.needsDepartamento()
          ? this.selectedDepartamentoId
          : null;

      const newItem = {
        ...this.form.value,
        id_catalogo: this.currentCatalogId,
        filterValue  // el backend lo usará para asignar el padre
      };

      this.addItem(newItem);
    }
  }

  /**
   * Elimina un item del catálogo
   */
  deleteItem(catalogId: number, item: CatalogItem): void {
    if (!this.canDelete()) {
      this.notificationService.showError("Permisos insuficientes");
      return;
    }

    this.confirmationService.confirmDelete(`¿Está seguro de eliminar ${item.nombre}?`).subscribe(confirmed => {
      if (!confirmed) return;

      this.catalogService.deleteCatalogItem(item).subscribe({
        next: (response) => {
          if (response) {
            setTimeout(() => {  // 👈
              const catalogo = this.catalogs.find(cat => cat.id === catalogId);
              if (!catalogo) return;

              catalogo.items = catalogo.items?.filter(i => i.id !== item.id) ?? [];
              catalogo.count = (catalogo.count ?? 1) - 1;

              this.notificationService.showSuccess('Registro eliminado correctamente');
              this.cdr.detectChanges();
            }, 0);
          } else {
            this.notificationService.showError('Error al eliminar el registro');
          }
        },
        error: (error) => {
          console.error(error);
          this.notificationService.showError('Error al eliminar el registro');
        }
      });
    });
  }

  private addItem(item: CatalogItem): void {
    this.isSaving.set(true);
    this.catalogService.createCatalogItem(item).subscribe({
      next: (newItem: CatalogItem | null) => {
        if (!newItem) {
          this.notificationService.showError("Error al crear el item");
          return;
        }
        const catalogo = this.catalogs.find((c) => c.id == newItem.id_catalogo);
        if (!catalogo) return;

        // Invalidar items del catálogo y recargar para obtener el padre
        this.catalogService.invalidateCatalogItems(newItem.id_catalogo);
        catalogo.items = [];  // forzar recarga
        this.loadCatalogItems(catalogo);

        catalogo.count = (catalogo.count ?? 0) + 1;
        this.closeModal();
        this.notificationService.showSuccess('Item creado correctamente');
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.notificationService.showError(error?.message ?? 'Error al guardar el item');
        this.isSaving.set(false);
      },
      complete: () => this.isSaving.set(false)
    });
  }




  private updateItem(item: CatalogItem): void {
    this.isSaving.set(true);

    // Construir filterValue según la dependencia
    const filterValue = this.needsComunidad()
      ? this.selectedComunidadId
      : this.needsDepartamento()
        ? this.selectedDepartamentoId
        : null;

    const payload = {
      ...item,
      ...(filterValue !== null ? { filterValue } : {})
    };

    this.catalogService.updateCatalogItem(payload).subscribe({
      next: (updated: CatalogItem | null) => {
        if (!updated) {
          this.notificationService.showError("Error al editar el item");
          return;
        }

        const catalogo = this.catalogs.find(c => c.id === updated.id_catalogo);
        if (!catalogo) return;

        // Recargar igual que en addItem para obtener el padre actualizado
        this.catalogService.invalidateCatalogItems(updated.id_catalogo);
        catalogo.items = [];
        this.loadCatalogItems(catalogo);

        this.notificationService.showSuccess('Item actualizado correctamente');
        this.closeModal();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.notificationService.showError('Error al actualizar el item');
        console.error(error);
      },
      complete: () => this.isSaving.set(false)
    });
  }
  /**
   * Inicializa el formulario reactivo
   */
  private initializeForm(): void {
    this.form = this.fb.group({
      id: [''],
      id_catalogo: [],
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      codigo: [''],
      estado: ['activo'],
    });
  }

  /**
   * Retorna la clase CSS para el estado
   */
  getStatusClass(status: string): string {
    const statusLower = String(status).toLowerCase();
    if (statusLower === 'activo' || statusLower === 'si') return 'status-active';
    if (statusLower === 'inactivo' || statusLower === 'no') return 'status-inactive';
    return 'status-pending';
  }

  // ─── SELECCIÓN MÚLTIPLE DE CATÁLOGOS ───────────────────────────────────────

  toggleCatalogSelection(catalogId: number, event: MatCheckboxChange): void {
    if (this.selectedCatalogs.has(catalogId)) {
      this.selectedCatalogs.delete(catalogId);
    } else {
      this.selectedCatalogs.add(catalogId);
    }
    this.cdr.markForCheck();
  }

  toggleSelectAll(event: MatCheckboxChange): void {
    if (event.checked) {
      this.filterCatalogs().forEach(cat => this.selectedCatalogs.add(cat.id));
    } else {
      this.selectedCatalogs.clear();
    }
    this.cdr.markForCheck();
  }

  isAllSelected(): boolean {
    const visible = this.filterCatalogs();
    return visible.length > 0 && visible.every(cat => this.selectedCatalogs.has(cat.id));
  }

  isSomeSelected(): boolean {
    return this.selectedCatalogs.size > 0 && !this.isAllSelected();
  }

  deleteSelectedCatalogs(): void {
    if (this.selectedCatalogs.size === 0) return;

    const names = this.catalogs
      .filter(c => this.selectedCatalogs.has(c.id))
      .map(c => c.name)
      .join(', ');

    this.confirmationService.confirmDelete(
      `¿Está seguro de eliminar los catálogos: ${names}?`
    ).subscribe(confirmed => {
      if (!confirmed) return;

      const ids = Array.from(this.selectedCatalogs);
      this.catalogService.deleteCatalog(ids).subscribe({
        next: (response) => {
          if (response) {
            // ✅ setTimeout evita el NG0100 al diferir los cambios
            // al siguiente ciclo de detección de Angular
            setTimeout(() => {
              this.catalogs = this.catalogs.filter(c => !this.selectedCatalogs.has(c.id));
              this.selectedCatalogs.clear();
              this.notificationService.showSuccess('Catálogos eliminados correctamente');
              this.cdr.detectChanges();
            }, 0);
          } else {
            this.notificationService.showError('Error al eliminar el catálogo');
          }
        },
        error: (error) => {
          this.notificationService.showError(error);
        }
      });
    });
  }
  // ─── MODAL NUEVO CATÁLOGO ───────────────────────────────────────────────────

  openNewCatalogModal(): void {
    this.newCatalogForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]]
    });
    this.isNewCatalogModalOpen = true;
    this.cdr.markForCheck();
  }

  closeNewCatalogModal(): void {
    this.isNewCatalogModalOpen = false;
    this.editingCatalog = null;
    this.cdr.markForCheck();
  }

  saveNewCatalog(): void {
    if (!this.newCatalogForm.valid) {
      this.notificationService.showError('El nombre del catálogo es requerido');
      return;
    }

    const name = this.newCatalogForm.value.name?.trim();
    if (!name) return;

    this.isSavingCatalog.set(true);

    if (this.editingCatalog) {
      this.catalogService.updateNameCatalog(name, this.editingCatalog.id).subscribe({
        next: (response) => {
          if (response) {
            setTimeout(() => {
              const catalog = this.catalogs.find(c => c.id === this.editingCatalog!.id);
              if (catalog) catalog.name = name;
              this.isSavingCatalog.set(false);
              this.notificationService.showSuccess('Catálogo actualizado correctamente');
              this.closeNewCatalogModal();
              this.cdr.detectChanges();
            }, 0);
          }
        },
        error: (error) => {
          this.notificationService.showError(error);
        },
        complete: () => {
          this.isSavingCatalog.set(false);
        }
      })
    } else {
      this.catalogService.createCatalog({ name }).subscribe({
        next: (response) => {
          if (response != null) {
            const newCatalog: CatalogListItem = {
              id: response.id,
              name,
              count: 0,
              isLoading: false,
              isExpanded: false,
              items: []
            }

            this.catalogs = [newCatalog, ...this.catalogs,];
            this.isSavingCatalog.set(false);
            this.notificationService.showSuccess('Catálogo creado correctamente');
            this.closeNewCatalogModal();
            this.cdr.detectChanges();
          }
        },
        error: (error) => {
          this.notificationService.showError(error);
        },
        complete: () => {
          this.isSavingCatalog.set(false);
        }
      })
    }

  }

  openEditCatalogModal(catalog: CatalogListItem, event: Event): void {
    event.stopPropagation(); // Evita que el accordion se abra/cierre

    if (!this.canUpdate()) {
      this.notificationService.showError('Permisos insuficientes');
      return;
    }

    this.editingCatalog = catalog;
    this.newCatalogForm = this.fb.group({
      name: [catalog.name, [Validators.required, Validators.minLength(2)]]
    });
    this.isNewCatalogModalOpen = true;
    this.cdr.markForCheck();
  }


  needsDepartamento(): boolean {
    return this.catalogMetadata.filterFields?.includes('id_departamento') ?? false;
  }

  needsComunidad(): boolean {
    return this.catalogMetadata.filterFields?.includes('id_comunidad') ?? false;
  }

  loadDepartamentos(): void {
    if (this.departamentos.length > 0) return; // ya cargados (cache local)

    this.catalogService.getDepartamentos().subscribe({
      next: (data) => {
        this.departamentos = data ?? [];
        this.cdr.markForCheck();
      }
    });
  }

  onDepartamentoChange(id: number): void {
    this.selectedDepartamentoId = id;
    this.selectedComunidadId = null;
    this.comunidades = [];

    if (!id) return;

    // Si el catálogo depende de comunidad, necesitamos cargar las comunidades del depto seleccionado
    if (this.needsComunidad()) {
      this.isLoadingComunidades = true;
      this.cdr.markForCheck();

      this.catalogService.getComunidades(id).subscribe({
        next: (data) => {
          this.comunidades = data ?? [];
          this.isLoadingComunidades = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoadingComunidades = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  onComunidadChange(id: number): void {
    this.selectedComunidadId = id;
  }

  getColumnsForCatalog(catalogId: number): string[] {
    return this.catalogColumns.get(catalogId) ?? ['id', 'nombre', 'acciones'];
  }

  getParentLabelForCatalog(catalogId: number): string {
    return this.catalogParentLabel.get(catalogId) ?? 'Padre';
  }
}
