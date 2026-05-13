import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilderStateService } from '../../core/services/form-builder-state.service';
import { FormStorageService } from '../../core/services/storage.service';
import { CatalogService } from '../../core/services/catalog.service';
import { ViewMode } from '../../core/models/form-builder.model';
import { skip, Subject, takeUntil } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { StructurePanel } from './components/structure-panel/structure-panel';
import { FormPreview } from './components/form-preview/form-preview';
import { PropertiesPanel } from './components/properties-panel/properties-panel';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { Location } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { FillFormModal } from '../fill-form-modal/fill-form-modal';

@Component({
  selector: 'app-form-builder',
  imports: [
    FormsModule,
    StructurePanel,
    // FormPreview,
    PropertiesPanel,
    MatIconModule
  ],
  templateUrl: './form-builder.html',
  styleUrl: './form-builder.css'
})
export class FormBuilder implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private routeChangeSubscription: any;
  hasUnsavedChanges = false;

  formName = 'Nuevo Formulario';
  currentView: ViewMode = 'structure';
  formKey: string = '';
  isLoadingForm = false;
  formLoaded = false;

  constructor(
    public stateService: FormBuilderStateService,
    private formStorageService: FormStorageService,
    private catalogService: CatalogService,
    private activatedRoute: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
  ) { }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  ngOnInit(): void {
    const formKey = this.activatedRoute.snapshot.paramMap.get('uuid');
    if (!formKey) {
      this.notificationService.showError("URL no es válida");
      this.router.navigate(['/dashboard']);
    }
    this.formKey = formKey!;
    this.formLoaded = false;
    this.isLoadingForm = true;

    // Resetear el estado pero mantener el formulario vacío temporalmente
    this.stateService.resetForm();

    // Forzar detección de cambios
    this.cdr.detectChanges();

    // Cargar desde storage después de resetear
    this.loadFormFromStorage();

    // Suscribirse a cambios del nombre del formulario
    this.stateService.formDefinition$
      .pipe(takeUntil(this.destroy$), skip(2))
      .subscribe(form => {
        this.formName = form.name;
        this.hasUnsavedChanges = true;
        // Forzar detección de cambios cuando el formulario cambia
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    if (this.routeChangeSubscription) {
      this.routeChangeSubscription.unsubscribe();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Cargar formulario desde localStorage
   */
  private loadFormFromStorage(): void {
    if (!this.formKey) {
      console.warn('⚠️ FormKey no configurado');
      this.isLoadingForm = false;
      this.formLoaded = true;
      return;
    }

    this.formStorageService.getFormByKey(this.formKey).subscribe({
      next: ((response: any) => {
        const existingForm = response;
        this.stateService.loadFormDefinition(existingForm);
        this.isLoadingForm = false;
        this.formLoaded = true;
        this.cdr.detectChanges();
      }),
      error: (error => {
        this.isLoadingForm = false;
        this.formLoaded = true;
        this.notificationService.showError(error);
        console.log("Error en el componente", error);
      })
    })
  }

  /**
   * Cambiar nombre del formulario
   */
  onFormNameChange(name: string): void {
    this.stateService.updateFormName(name);
  }

  /**
   * Cambiar vista (structure/preview)
   */
  changeView(view: ViewMode): void {
    this.currentView = view;
  }

  onPreviewForm(): void {
    this.dialog.open(FillFormModal, {
      width: '80vw',
      maxWidth: '95vw',
      disableClose: false,
      data: {
        formKey: '',          
        mode: 'preview',
        formDefinition: this.stateService.formDefinition
      }
    });
  }

  /**
   * Guardar formulario en localStorage
   */
  onSaveForm(estado: string): void {
    if (!this.formKey) {
      console.error('Error: FormKey no configurado');
      this.notificationService.showError("Form key no configurado");
      return;
    }

    const formData = this.stateService.formDefinition;
    const idUser = this.authService.currentUser()?.idUser;

    this.formStorageService.saveForm(this.formKey, formData, estado, idUser!).subscribe({
      next: ((response: any) => {
        if (response != null) {
          this.notificationService.showSuccess("Formulario Creado Correctamente");
        } else {
          this.notificationService.showError("Error al crear el formulario");
        }
      }),
      error: (error => {
        console.error("error en form-builder", error);
        this.notificationService.showError(error);
      })
    })
    this.hasUnsavedChanges = false;

  }

  /**
   * Exportar formulario como JSON
   */
  onExportForm(): void {
    try {
      const json = this.stateService.exportFormDefinition();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.formName || 'formulario'}.json`;
      a.click();
      URL.revokeObjectURL(url);

      console.log('✅ Formulario exportado');
      alert('✅ Formulario exportado');
    } catch (error) {
      console.error('❌ Error al exportar:', error);
      alert('❌ Error al exportar el formulario');
    }
  }

  /**
   * Cargar catálogos disponibles
   */
  onLoadCatalogs(): void {
    this.catalogService.getAvailableCatalogs()
      .subscribe({
        next: (catalogs) => {
          console.log('Catálogos disponibles:', catalogs);
          alert('✅ Catálogos cargados');
        },
        error: (error) => {
          console.error('Error al cargar catálogos:', error);
          alert('❌ Error al cargar catálogos');
        }
      });
  }

  /**
   * Ver estadísticas de almacenamiento
   */
  viewStorageStats(): void {
    try {
      const stats = this.formStorageService.getStorageStats();
      console.log('📊 Estadísticas de almacenamiento:', stats);

      const mensaje = `
📊 ESTADÍSTICAS DE ALMACENAMIENTO

Total de formularios guardados: ${stats.totalForms}

Formularios:
${stats.forms.map(f => `• ${f.formKey} 
  Creado: ${new Date(f.createdAt).toLocaleString()}
  Actualizado: ${new Date(f.updatedAt).toLocaleString()}`).join('\n\n')}
      `;

      alert(mensaje);
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
    }
  }

  /**
   * Eliminar formulario actual
   */
  deleteForm(): void {
    if (!this.formKey) {
      alert('❌ Error: FormKey no configurado');
      return;
    }

    const confirmed = confirm(
      `¿Eliminar formulario "${this.formName}" permanentemente? Esta acción no se puede deshacer.`
    );

    if (confirmed) {
      try {
        this.formStorageService.deleteForm(this.formKey);
        console.log('🗑️ Formulario eliminado:', this.formKey);

        // Resetear el componente
        this.stateService.resetForm();
        this.formName = 'Nuevo Formulario';

        // Forzar detección de cambios
        this.cdr.detectChanges();

        alert('✅ Formulario eliminado');
      } catch (error) {
        console.error('❌ Error al eliminar:', error);
        alert('❌ Error al eliminar el formulario');
      }
    }
  }

  /**
   * Limpiar todos los formularios guardados
   */
  clearAllForms(): void {
    const confirmed = confirm(
      '⚠️ ¿Eliminar TODOS los formularios guardados? Esta acción no se puede deshacer.'
    );

    if (confirmed) {
      try {
        this.formStorageService.clearAllForms();
        console.log('🗑️ Todos los formularios fueron eliminados');

        // Resetear el componente
        this.stateService.resetForm();
        this.formName = 'Nuevo Formulario';

        // Forzar detección de cambios
        this.cdr.detectChanges();

        alert('✅ Todos los formularios fueron eliminados');
      } catch (error) {
        console.error('❌ Error al limpiar:', error);
        alert('❌ Error al limpiar los formularios');
      }
    }
  }

  /**
   * Verificar estado actual para debugging
   */
  debugInfo(): void {
    const info = {
      formKey: this.formKey,
      formName: this.formName,
      isLoading: this.isLoadingForm,
      formLoaded: this.formLoaded,
      formDefinition: this.stateService.formDefinition,
      allStoredForms: this.formStorageService.getAllForms()
    };

    console.log('🔍 DEBUG INFO:', info);
    alert(`Información de debug enviada a la consola`);
  }

  goBack() {
    this.router.navigate([`/formulario/${this.formKey}`]);
  }
}