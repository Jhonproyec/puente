import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormStorageService } from '../../core/services/storage.service';
import { FormResponseService } from '../../core/services/form-response.service';
import { CatalogService } from '../../core/services/catalog.service';
import { FormDefinition, FormElement, FormRegion } from '../../core/models/form-builder.model';
import { MatIcon } from '@angular/material/icon';
import { NotificationService } from '../../core/services/notification.service';
import { SurveyAnswersService } from '../../core/services/survey-answers.service';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CatalogSurveyAnswerService } from '../../core/services/catalog-survey-answer.service';
import { map } from 'rxjs';
import { AuthService } from '../../core/services/auth/auth.service';
import { FormulaService } from '../../core/services/formula.service';
import { NgxMaskDirective } from 'ngx-mask';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface RegionRepetition {
  index: number;
  regionId: string;
  title: string;
}

interface CascadeOption {
  value: string | number;
  label: string;
}

@Component({
  selector: 'app-fill-form-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatRadioModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIcon,
    MatProgressBarModule,
    NgxMaskDirective,
  ],
  templateUrl: './fill-form-modal.html',
  styleUrl: './fill-form-modal.css'
})
export class FillFormModal implements OnInit, AfterViewInit, OnDestroy {
  formDefinition: FormDefinition | null = null;
  formResponses: { [elementId: string]: any } = {};
  isLoading = false;
  visibleElements: Set<string> = new Set();
  userResponses: { [elementId: string]: any } = {};
  fieldErrors: Map<string, string> = new Map();

  // Para regiones repetidas
  repeatingRegions: Map<string, number> = new Map();
  regionRepetitions: RegionRepetition[] = [];

  // ✅ NUEVO: Para cascadas
  cascadeOptions: Map<string, CascadeOption[]> = new Map(); // elementId -> opciones filtradas
  private elementChangeSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Regiones que ya entraron al viewport y deben renderizarse
  visibleRegionIds: Set<string> = new Set();
  private intersectionObserver: IntersectionObserver | null = null;

  constructor(
    public dialogRef: MatDialogRef<FillFormModal>,
    @Inject(MAT_DIALOG_DATA) public data: {
      formKey: string,
      mode?: 'create' | 'edit' | 'preview',
      id_respuesta?: number,
      existingResponses?: Record<string, any>,
      formDefinition?: FormDefinition,
    },
    private formStorageService: FormStorageService,
    private formResponseService: FormResponseService,
    private catalogService: CatalogService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private notificacionService: NotificationService,
    private catalogSurveyService: CatalogSurveyAnswerService,
    private surveyAnswersService: SurveyAnswersService,
    private authService: AuthService,
    private formulaService: FormulaService,
  ) { }

  ngOnInit(): void {
    this.elementChangeSubject.pipe(
      debounceTime(150),
      takeUntil(this.destroy$)
    ).subscribe(elementId => {
      this.evaluateFormulas(elementId);
      setTimeout(() => {
        this.identifyRepeatingRegions();
        this.cdr.markForCheck();
      }, 0);
    });

    this.loadFormDefinition();
  }


  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initIntersectionObserver();
      this.cdr.markForCheck();
    }, 300);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.intersectionObserver?.disconnect();
    this.elementChangeSubject.complete();
  }

  private initIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;

    const scrollContainer = document.querySelector('.modal-content') as HTMLElement;
    if (!scrollContainer) return;

    this.intersectionObserver?.disconnect();

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        let changed = false;
        entries.forEach(entry => {
          const regionId = entry.target.getAttribute('data-region-id');
          if (!regionId) return;
          if (entry.isIntersecting && !this.visibleRegionIds.has(regionId)) {
            this.visibleRegionIds.add(regionId);
            changed = true;
          }
        });
        if (changed) this.cdr.markForCheck();
      },
      {
        root: scrollContainer,
        rootMargin: '300px 0px',
        threshold: 0
      }
    );

    // Observar todos los region-container que ya están en el DOM
    scrollContainer.querySelectorAll('[data-region-id]').forEach(el => {
      this.intersectionObserver?.observe(el);
    });
  }
  observeRegion(element: HTMLElement, regionId: string): void {
    if (!this.intersectionObserver) return;
    element.setAttribute('data-region-id', regionId);
    this.intersectionObserver.observe(element);
  }
  /**
   * Cargar la definición del formulario desde localStorage
   */
  private loadFormDefinition(): void {
    this.isLoading = true;

    // ✅ Modo preview: usar el JSON directamente sin llamar a la BD
    if (this.data.mode === 'preview' && this.data.formDefinition) {
      this.formDefinition = this.data.formDefinition;
      this.initializeForm();
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    // Flujo normal
    this.formStorageService.getFormByKey(this.data.formKey).subscribe({
      next: ((response: any) => {
        if (!response) {
          this.notificacionService.showError("Error al mostrar el formulario");
          this.isLoading = false;
        } else {
          this.formDefinition = response;
          this.initializeForm();
          this.isLoading = false;
        }
        this.cdr.markForCheck();
      }),
      error: (error => {
        this.isLoading = false;
        this.notificacionService.showError(error);
        this.cdr.markForCheck();
      })
    });
  }

  get isPreviewMode(): boolean {
    return this.data.mode === 'preview';
  }

  // =================== SURVEY: CATÁLOGO QUESTION ===================

  // Mapa de opciones para catalog_question (separado de cascadeOptions)
  catalogQuestionOptions: Map<string, { value: string | number; label: string }[]> = new Map();

  private initializeForm(): void {

    if (!this.formDefinition) return;

    this.catalogSurveyService.clearAll();
    this.visibleRegionIds.clear();

    this.formDefinition.regions.forEach(r => this.visibleRegionIds.add(r.id));

    // ✅ 1. Inicializar campos vacíos
    this.formDefinition.regions.forEach(region => {
      region.elements.forEach(element => {
        if (element.type === 'checkbox' && element.multipleSelecction) {
          this.formResponses[element.id] = [];
        } else if (element.type === 'heading') {
          // sin respuesta
        } else {
          this.formResponses[element.id] = '';
        }
      });
    });

    // ✅ 2. Precargar respuestas existentes ANTES de evaluar acciones
    if (this.data.mode === 'edit' && this.data.existingResponses) {
      Object.assign(this.formResponses, this.data.existingResponses);
    }

    if (this.data.mode === 'edit' && this.data.existingResponses) {
      Object.assign(this.formResponses, this.data.existingResponses);

      // ✅ Restaurar respuestas de catalog_question en el servicio
      Object.entries(this.data.existingResponses).forEach(([key, value]) => {
        if (value && typeof value === 'object' && 'selectedIds' in value && 'score' in value) {
          this.catalogSurveyService.restoreAnswer(key, value.selectedIds, value.score);
        }
      });
    }

    // ✅ 3. Cargar catálogos y evaluar visibilidad con los valores ya precargados
    this.loadCascadeOptions();
    this.evaluateAllActions();
    this.evaluateAllFormulasOnLoad();
    this.loadCatalogQuestionOptions();
    this.userResponses = {};

    setTimeout(() => {
      setTimeout(() => {
        this.identifyRepeatingRegions();
        this.cdr.markForCheck();

      }, 0);
    }, 0);
  }

  private loadCatalogQuestionOptions(): void {
    if (!this.formDefinition) return;

    const surveyElements = this.formDefinition.regions
      .flatMap(r => r.elements)
      .filter(el =>
        el.type === 'survey' &&
        el.surveyConfig?.mode === 'catalog_question' &&
        el.surveyConfig?.catalogType
      );

    if (surveyElements.length === 0) return;

    let loaded = 0;
    const total = surveyElements.length;

    surveyElements.forEach(element => {
      this.catalogService.getCatalogData(Number(element.surveyConfig!.catalogType)).pipe(
        map(items => items.map(item => ({ value: item.id, label: item.nombre })))
      ).subscribe({
        next: (options) => {
          const configuredIds = element.surveyConfig?.catalogSelectedIds || [];
          const filtered = configuredIds.length > 0
            ? options.filter(o => configuredIds.includes(String(o.value)))
            : options;

          this.catalogQuestionOptions.set(element.id, filtered);

          // ✅ Auto-seleccionar solo si no tiene selección previa
          const existingSelection = this.catalogSurveyService.getSelectedIds(element.id);
          if (existingSelection.length === 0) {
            this.catalogSurveyService.saveAnswer(element.id, [], filtered.length, []);
          }

          loaded++;

          // ✅ Solo re-evaluar cuando TODOS los catálogos hayan cargado
          if (loaded === total) {
            this.evaluateAllActions();
            this.cdr.markForCheck();
          }
        },
        error: (err) => {
          console.error('Error cargando opciones survey catálogo:', err);
          loaded++;
          if (loaded === total) {
            this.evaluateAllActions();
            this.cdr.markForCheck();
          }
        }
      });
    });
  }

  getCatalogQuestionOptions(elementId: string): { value: string | number; label: string }[] {
    return this.catalogQuestionOptions.get(elementId) || [];
  }

  isCatalogAnswerSelected(elementId: string, optionValue: string | number): boolean {
    return this.catalogSurveyService.getSelectedIds(elementId)
      .some(id => String(id) === String(optionValue));
  }

  isCatalogAnswerDisabled(elementId: string, optionValue: string | number, optionLabel: string): boolean {
    if (this.isNoneOption(optionLabel)) return false;

    const selectedIds = this.catalogSurveyService.getSelectedIds(elementId);
    const options = this.getCatalogQuestionOptions(elementId);

    return selectedIds.some(id => {
      const opt = options.find(o => String(o.value) === String(id));
      return opt && this.isNoneOption(opt.label);
    });
  }

  onCatalogQuestionChange(
    elementId: string,
    option: { value: string | number; label: string },
    checked: boolean
  ): void {
    const options = this.getCatalogQuestionOptions(elementId);
    const allElements = this.formDefinition?.regions.flatMap(r => r.elements) || [];
    const element = allElements.find(el => el.id === elementId);
    const isMultiple = element?.surveyConfig?.multipleSelection ?? true;

    let currentIds: (string | number)[];

    if (!isMultiple) {
      // ✅ Selección simple: siempre reemplazar con la nueva opción
      currentIds = checked ? [option.value] : [];
    } else {
      // Selección múltiple: lógica existente
      currentIds = [...this.catalogSurveyService.getSelectedIds(elementId)];

      if (checked) {
        if (this.isNoneOption(option.label)) {
          currentIds = [option.value];
        } else {
          currentIds = currentIds.filter(id => {
            const opt = options.find(o => String(o.value) === String(id));
            return opt && !this.isNoneOption(opt.label);
          });
          if (!currentIds.some(id => String(id) === String(option.value))) {
            currentIds.push(option.value);
          }
        }
      } else {
        currentIds = currentIds.filter(id => String(id) !== String(option.value));
      }
    }

    const noneIds = options.filter(o => this.isNoneOption(o.label)).map(o => o.value);
    this.catalogSurveyService.saveAnswer(elementId, currentIds, options.length, noneIds);

    // ✅ Sincronizar en formResponses y userResponses
    const selectedOpts = options.filter(o => currentIds.some(id => String(id) === String(o.value)));

    const responseValue = selectedOpts.length === 0 ? []
      : selectedOpts.map(o => o.label);

    this.formResponses[elementId] = responseValue;
    this.userResponses[elementId] = responseValue;

    this.onElementChange(elementId);
  }
  getCatalogQuestionScore(elementId: string): number {
    return this.catalogSurveyService.getScore(elementId);
  }

  // =================== SURVEY: SUBTOTAL ===================

  getSubtotalScore(element: FormElement): number {
    const linkedIds = element.surveyConfig?.linkedFieldIds || [];
    return this.catalogSurveyService.calculateSubtotal(linkedIds);
  }

  getSubtotalScoreById(fieldId: string): number {
    const allElements = this.formDefinition?.regions.flatMap(r => r.elements) || [];
    const element = allElements.find(el => el.id === fieldId);
    if (!element) return 0;

    // ✅ Si tiene fórmula, leer de formResponses
    if (this.isFormulaField(element)) {
      const val = this.formResponses[fieldId];
      return typeof val === 'number' ? val : 0;
    }

    // ✅ Si es catalog_subtotal sin fórmula, calcular por linkedFieldIds
    if (element.surveyConfig?.mode === 'catalog_subtotal') {
      return this.catalogSurveyService.calculateSubtotal(
        element.surveyConfig.linkedFieldIds || []
      );
    }

    // ✅ Si es catalog_question, usar el score del servicio
    return this.catalogSurveyService.getScore(fieldId);
  }

  // =================== SURVEY: STARS ===================

  getStarsScore(element: FormElement): number {
    const linkedIds = element.surveyConfig?.linkedFieldIds || [];

    const subtotalMap = new Map<string, number>();
    linkedIds.forEach(id => {
      subtotalMap.set(id, this.getSubtotalScoreById(id));
    });

    return this.catalogSurveyService.calculateStars(linkedIds, subtotalMap);
  }

  // =================== SURVEY: MANUAL ===================

  getLinkedFieldLabel(fieldId: string): string {
    const allElements = this.formDefinition?.regions.flatMap(r => r.elements) || [];
    return allElements.find(el => el.id === fieldId)?.label || fieldId;
  }

  getManualResultPercentage(linkedId: string): number {
    const value = this.surveyAnswersService.getSurveyAnswer(linkedId);
    if (!value) return 0;
    return (value / 5) * 100;
  }

  getManualAverage(element: FormElement): number {
    const linkedIds = element.surveyConfig?.linkedFieldIds || [];
    if (linkedIds.length === 0) return 0;
    return this.surveyAnswersService.getAverageAnswer(linkedIds);
  }



  private loadCascadeOptions(): void {
    if (!this.formDefinition) return;

    // Contar cuántos catálogos hay para saber cuándo terminan todos
    const elementsWithCatalog = this.formDefinition.regions
      .flatMap(r => r.elements)
      .filter(el => el.catalogType != null);

    if (elementsWithCatalog.length === 0) return;

    let loaded = 0;

    this.formDefinition.regions.forEach(region => {
      region.elements.forEach(element => {
        if (!element.catalogType) return;

        this.catalogService.getCatalogData(Number(element.catalogType)).subscribe({
          next: (catalogData) => {
            let options = catalogData.map(item => ({
              value: item.id,
              label: item.nombre
            }));

            const hasSpecificOptions =
              (element as any).enableSpecificOptions === true &&
              Array.isArray(element.selectedOptions) &&
              element.selectedOptions.length > 0;

            if (hasSpecificOptions) {
              const allowedIds = element.selectedOptions.map(id => String(id));
              options = options.filter(opt => allowedIds.includes(String(opt.value)));
            }

            this.cascadeOptions.set(element.id, options);
            loaded++;

            // ✅ Re-evaluar acciones cuando TODOS los catálogos hayan cargado
            if (loaded === elementsWithCatalog.length) {
              this.evaluateAllActions();
              this.cdr.markForCheck();
            }
          },
          error: () => {
            loaded++;
            if (loaded === elementsWithCatalog.length) {
              this.evaluateAllActions();
              this.cdr.markForCheck();
            }
          }
        });
      });
    });
  }

  isNoneOption(label: string): boolean {
    const normalized = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return normalized === 'ninguno' || normalized === 'ninguna' || normalized === 'ninguno/a';
  }

  isCheckboxDisabled(elementId: string, optionValue: string | number, optionLabel: string): boolean {
    const current = this.formResponses[elementId];
    if (!Array.isArray(current) || current.length === 0) return false;
    if (this.isNoneOption(optionLabel)) return false;

    // ✅ Buscar en cascadeOptions o en opciones manuales
    const catalogOptions = this.cascadeOptions.get(elementId) || [];
    const element = this.formDefinition?.regions
      .flatMap(r => r.elements)
      .find(e => e.id === elementId);
    const options = catalogOptions.length > 0
      ? catalogOptions
      : (element ? this.getSelectOptions(element) : []);

    return current.some(selectedValue => {
      const selectedOption = options.find(o => String(o.value) === String(selectedValue));
      return selectedOption && this.isNoneOption(selectedOption.label);
    });
  }
  onCheckboxChange(elementId: string, value: string | number, checked: boolean, optionLabel: string): void {

    if (!Array.isArray(this.formResponses[elementId])) {
      this.formResponses[elementId] = [];
    }

    const element = this.formDefinition?.regions
      .flatMap(r => r.elements)
      .find(e => e.id === elementId);

    const isMultiple = element?.multipleSelecction !== false; // default: múltiple

    if (!isMultiple) {
      // Selección única: si está marcando, reemplazar todo; si desmarca, vaciar
      this.formResponses[elementId] = checked ? [value] : [];
      this.onElementChange(elementId);
      this.cdr.markForCheck();
      return;
    }

    if (checked) {
      if (this.isNoneOption(optionLabel)) {
        this.formResponses[elementId] = [value];
      } else {
        const options = this.cascadeOptions.get(elementId) || [];

        if (options.length > 0) {
          // ✅ Quitar "ninguno" si estaba seleccionado
          this.formResponses[elementId] = this.formResponses[elementId].filter(
            (v: any) => {
              const opt = options.find(o => String(o.value) === String(v));
              return opt && !this.isNoneOption(opt.label);
            }
          );
        } else {
          // ✅ Para opciones manuales sin catálogo, buscar en getSelectOptions
          const element = this.formDefinition?.regions
            .flatMap(r => r.elements)
            .find(e => e.id === elementId);
          const manualOptions = element ? this.getSelectOptions(element) : [];

          // ✅ Quitar cualquier opción "ninguno" que estuviera seleccionada
          this.formResponses[elementId] = this.formResponses[elementId].filter(
            (v: any) => {
              const opt = manualOptions.find(o => String(o.value) === String(v));
              return !opt || !this.isNoneOption(opt.label);
            }
          );
        }

        if (!this.formResponses[elementId].some((v: any) => String(v) === String(value))) {
          this.formResponses[elementId] = [...this.formResponses[elementId], value];
        }
      }
    } else {
      this.formResponses[elementId] = this.formResponses[elementId].filter(
        (v: any) => String(v) !== String(value)
      );
    }
    this.cdr.markForCheck();
  }
  isCheckboxSelected(elementId: string, value: string | number): boolean {
    const current = this.formResponses[elementId];
    if (!Array.isArray(current)) return false;
    return current.some((v: any) => String(v) === String(value));
  }

  /**
   * ✅ NUEVO: Cargar opciones filtradas para un elemento con cascada
   */
  private loadCascadeOptionsForElement(element: FormElement): void {
    const cascadeConfig = (element as any).cascadeConfig;

    if (!cascadeConfig || !element.catalogType) return;


    // Cargar el catálogo completo desde el servicio
    this.catalogService.getCatalogData(Number(element.catalogType)).subscribe({
      next: (catalogData) => {
        // Convertir a opciones
        const allOptions = catalogData.map(item => ({
          value: item.id,
          label: item.nombre
        }));

        // Guardar todas las opciones para esta cascada
        this.cascadeOptions.set(`${element.id}_all`, allOptions);

        // Aplicar filtro inicial si hay valor seleccionado
        const triggerValue = this.formResponses[cascadeConfig.triggerFieldId];
        if (triggerValue) {
          this.filterCascadeOptions(element.id);
        }

      },
      error: (error) => {
        console.error(`❌ Error cargando catálogo para cascada:`, error);
      }
    });
  }

  /**
   * ✅ NUEVO: Filtrar opciones de cascada según el valor del campo disparador
   */
  private filterCascadeOptions(elementId: string): void {
    if (!this.formDefinition) return;

    const element = this.formDefinition.regions
      .flatMap(r => r.elements)
      .find(e => e.id === elementId);

    if (!element) return;

    const cascadeConfig = (element as any).cascadeConfig;
    if (!cascadeConfig || !element.catalogType) return;

    const triggerValue = this.formResponses[cascadeConfig.triggerFieldId];
    const filterKey = cascadeConfig.filterKey;


    if (!triggerValue || !filterKey) {
      // Si no hay valor disparador, mostrar todas las opciones
      this.catalogService.getCatalogData(Number(element.catalogType)).subscribe({
        next: (catalogData) => {
          const options = catalogData.map(item => ({
            value: item.id,
            label: item.nombre
          }));
          this.cascadeOptions.set(elementId, options);
          this.cdr.markForCheck();
        }
      });
      return;
    }

    // ✅ NUEVO: Usar getCatalogFiltered() del servicio
    this.catalogService.getCatalogFiltered(
      element.catalogType,
      filterKey,
      triggerValue
    ).subscribe({
      next: (filteredData) => {
        const options = filteredData.map(item => ({
          value: item.id,
          label: item.nombre
        }));

        this.cascadeOptions.set(elementId, options);
        this.cdr.markForCheck();

      },
      error: (error) => {
        console.error(`❌ Error filtrando cascada:`, error);
        this.cascadeOptions.set(elementId, []);
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * ✅ NUEVO: Convertir selectedOptions a formato de opciones
   */
  private convertToOptions(selectedOptions: any[]): CascadeOption[] {
    if (!Array.isArray(selectedOptions)) return [];

    return selectedOptions.map(opt => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return { value: opt, label: opt.toString() };
      } else if (typeof opt === 'object' && 'id' in opt && 'nombre' in opt) {
        return { value: opt.id, label: opt.nombre };
      }
      return { value: '', label: '' };
    }).filter(opt => opt.value !== '');
  }

  /**
   * ✅ NUEVO: Obtener opciones para mostrar en un select
   */
  getSelectOptions(element: FormElement): any[] {
    // ✅ Primero verificar si tiene opciones cargadas desde catálogo
    const catalogOptions = this.cascadeOptions.get(element.id);
    if (catalogOptions && catalogOptions.length > 0) {
      return catalogOptions;
    }

    // ✅ Si no hay catálogo, usar selectedOptions manuales
    if (Array.isArray(element.selectedOptions) && element.selectedOptions.length > 0) {
      const first = element.selectedOptions[0];

      // Formato objeto { id, nombre }
      if (typeof first === 'object' && 'id' in first && 'nombre' in first) {
        return element.selectedOptions.map((opt: any) => ({
          value: opt.id,
          label: opt.nombre
        }));
      }

      // Formato string/number simple
      if (typeof first === 'string' || typeof first === 'number') {
        return element.selectedOptions.map((opt: any) => ({
          value: opt,
          label: String(opt)
        }));
      }
    }

    // ✅ Fallback: opciones del campo options[] si existe
    if (Array.isArray((element as any).options) && (element as any).options.length > 0) {
      return (element as any).options.map((opt: any) => ({
        value: opt.value ?? opt.id ?? opt,
        label: opt.label ?? opt.nombre ?? String(opt)
      }));
    }

    return [];
  }

  /**
   * Identificar qué regiones pueden repetirse
   */
  private identifyRepeatingRegions(): void {
    if (!this.formDefinition) return;

    this.repeatingRegions.clear();
    this.regionRepetitions = [];

    this.formDefinition.regions.forEach((region) => {
      if (region.repeatConfig && (region.repeatConfig as any).enabled) {
        const triggerFieldId = (region.repeatConfig as any).triggerFieldId;
        const currentValue = this.formResponses[triggerFieldId] || 0;
        const numRepetitions = parseInt(currentValue.toString()) || 0;

        this.repeatingRegions.set(region.id, numRepetitions);

        for (let i = 1; i <= numRepetitions; i++) {
          this.regionRepetitions.push({
            index: i,
            regionId: region.id,
            title: `${region.title} #${i}`
          });
          // ✅ NO agregar a visibleElements aquí
        }
      } else {
        this.regionRepetitions.push({
          index: 0,
          regionId: region.id,
          title: region.title
        });
      }
    });

    // ✅ Evaluar TODO después de tener el mapa de repeticiones actualizado
    this.evaluateAllActions();
  }
  /**
   * Obtener región por ID
   */
  getRegionById(regionId: string): FormRegion | undefined {
    if (!this.formDefinition) return undefined;
    return this.formDefinition.regions.find(r => r.id === regionId);
  }

  /**
   * Obtener elementos de una región específica
   */
  getRegionElements(region: FormRegion): FormElement[] {
    return region.elements;
  }

  /**
   * Generar ID único para elemento en región repetida
   */
  getElementIdForRepetition(elementId: string, repetitionIndex: number): string {
    if (repetitionIndex === 0) {
      return elementId;
    }
    return `${elementId}_rep${repetitionIndex}`;
  }

  /**
   * Verificar si un elemento debe ser visible
   */
  isElementVisible(elementId: string): boolean {
    return this.visibleElements.has(elementId);
  }

  private evaluateAllActions(): void {
    if (!this.formDefinition) return;

    this.visibleElements.clear();

    // PASO 1: Regiones sin acciones visibles por defecto
    this.formDefinition.regions.forEach(region => {
      if (!region.actions || region.actions.length === 0) {
        this.visibleElements.add(region.id);
      }
    });

    // PASO 2: Evaluar acciones de REGIONES
    this.formDefinition.regions.forEach(region => {
      if (region.actions && region.actions.length > 0) {
        if (region.actions.length > 1) {
          const operator = (region as any).actionsOperator || 'AND';
          const results = region.actions.map(action => this.evaluateActionCondition(action));
          const shouldShow = operator === 'OR'
            ? results.some(r => r)
            : results.every(r => r);
          this.applyActionResult(shouldShow, region.id, 'region');
        } else {
          this.evaluateAction(region.actions[0], region.id, 'region');
        }
      }
    });

    // PASO 3: Elementos sin acciones visibles por defecto
    this.formDefinition.regions.forEach(region => {
      if (!this.visibleElements.has(region.id)) return;

      region.elements.forEach(element => {
        const isResultField = element.type === 'survey' &&
          element.surveyConfig?.mode === 'result';
        if (!element.actions || element.actions.length === 0) {
          if (!isResultField) {
            // ✅ Agregar tanto el ID base como todos los IDs de repetición
            this.visibleElements.add(element.id);
            const repetitions = this.repeatingRegions.get(region.id) || 0;
            for (let i = 1; i <= repetitions; i++) {
              this.visibleElements.add(this.getElementIdForRepetition(element.id, i));
            }
          }
        }
      });
    });

    // PASO 4: Evaluar acciones de ELEMENTOS (incluyendo repeticiones)
    this.formDefinition.regions.forEach(region => {
      const repetitions = this.repeatingRegions.get(region.id) || 0;

      region.elements.forEach(element => {
        if (!element.actions || element.actions.length === 0) return;

        // ✅ Evaluar para el índice 0 (región no repetida)
        if (repetitions === 0) {
          this.evaluateElementActions(element, 0);
        } else {
          // ✅ Evaluar para cada repetición
          for (let i = 1; i <= repetitions; i++) {
            this.evaluateElementActions(element, i);
          }
        }
      });
    });

    this.updateResultFields();
  }

  // ✅ NUEVO: Evaluar acciones de un elemento para un índice de repetición específico
  private evaluateElementActions(element: FormElement, repIndex: number): void {
    const elementId = this.getElementIdForRepetition(element.id, repIndex);

    if (element.actions.length > 1) {
      const operator = (element as any).actionsOperator || 'AND';
      const results = element.actions.map(action =>
        this.evaluateActionConditionForRep(action, repIndex)
      );
      const shouldShow = operator === 'OR'
        ? results.some(r => r)
        : results.every(r => r);
      this.applyElementActionResult(shouldShow, elementId);
    } else {
      const shouldShow = this.evaluateActionConditionForRep(element.actions[0], repIndex);
      this.applyElementActionResult(shouldShow, elementId);
    }
  }

  private evaluateActionConditionForRep(action: any, repIndex: number): boolean {
    // ✅ Intentar primero con repIndex, si no existe ese key usar el ID base
    const triggerWithRep = this.getElementIdForRepetition(action.triggerField, repIndex);

    const triggerFieldId = (this.formResponses[triggerWithRep] !== undefined)
      ? triggerWithRep
      : action.triggerField;

    const resolvedAction = { ...action, triggerField: triggerFieldId };
    return this.evaluateActionCondition(resolvedAction);
  }

  // ✅ NUEVO: applyActionResult solo para elementos (sin borrar regiones accidentalmente)
  private applyElementActionResult(shouldShow: boolean, elementId: string): void {
    if (shouldShow) {
      this.visibleElements.add(elementId);
    } else {
      this.visibleElements.delete(elementId);
      if (!this.isElementATrigger(elementId)) {
        this.formResponses[elementId] = '';
      }
    }
  }

  private evaluateActionCondition(action: any): boolean {
    let triggerValue = this.formResponses[action.triggerField];

    const allElements = this.formDefinition?.regions.flatMap(r => r.elements) || [];
    const triggerElement = allElements.find(el => el.id === action.triggerField);

    if (triggerElement?.type === 'survey' &&
      triggerElement?.surveyConfig?.mode === 'catalog_question') {
      const selectedIds = this.catalogSurveyService.getSelectedIds(action.triggerField);
      triggerValue = selectedIds.length > 0 ? selectedIds.map(id => String(id)) : null;
    }

    const actionValue = action.value;

    // ✅ Array vacío también es vacío
    const triggerIsEmpty =
      triggerValue === null ||
      triggerValue === undefined ||
      triggerValue === '' ||
      (Array.isArray(triggerValue) && triggerValue.length === 0);

    if (triggerIsEmpty &&
      action.type !== 'show_if_custom' &&
      action.type !== 'hide_if_custom') {
      const isHide = action.type.startsWith('hide_if_');
      return isHide ? true : false;
    }
    let conditionMet = false;

    switch (action.type) {
      case 'show_if_between':
      case 'hide_if_between': {
        // ✅ Si es tipo catálogo
        if (action.betweenType === 'catalog') {
          let requiredIds: (string | number)[] = [];
          try {
            requiredIds = JSON.parse(action.value);
          } catch {
            requiredIds = [];
          }

          // triggerValue ya es array si viene de catalog_question
          const selectedIds = Array.isArray(triggerValue) ? triggerValue : [String(triggerValue)];

          // ✅ Se cumple si TODOS los IDs requeridos están en los seleccionados
          conditionMet = requiredIds.every(reqId =>
            selectedIds.some(selId => String(selId) === String(reqId))
          );
        } else {
          // Lógica original para números y fechas
          const numValue = Number(triggerValue);
          const from = Number(actionValue);
          const to = Number(action.valueEnd);
          conditionMet = numValue >= from && numValue <= to;
        }
        break;
      }
      case 'show_if_equals':
      case 'hide_if_equals':
        if (Array.isArray(triggerValue)) {
          conditionMet = triggerValue.some(v => String(v) === String(actionValue));
        } else {
          conditionMet = String(triggerValue) === String(actionValue);
        }
        break;

      case 'show_if_not_equals':
      case 'hide_if_not_equals':
        if (Array.isArray(triggerValue)) {
          conditionMet = !triggerValue.some(v => String(v) === String(actionValue));
        } else {
          conditionMet = String(triggerValue) !== String(actionValue);
        }
        break;

      case 'show_if_greater':
      case 'hide_if_greater':
        conditionMet = Number(triggerValue) > Number(actionValue);
        break;

      case 'show_if_less':
      case 'hide_if_less':
        conditionMet = Number(triggerValue) < Number(actionValue);
        break;

      case 'show_if_greater_equal':
      case 'hide_if_greater_equal':
        conditionMet = Number(triggerValue) >= Number(actionValue);
        break;

      case 'show_if_less_equal':
      case 'hide_if_less_equal':
        conditionMet = Number(triggerValue) <= Number(actionValue);
        break;

      case 'show_if_filled':
      case 'hide_if_filled':
        conditionMet = triggerValue !== null && triggerValue !== undefined && triggerValue !== '';
        break;

      case 'show_if_empty':
      case 'hide_if_empty':
        conditionMet = triggerValue === null || triggerValue === undefined || triggerValue === '';
        break;
      case 'show_if_custom':
      case 'hide_if_custom': {
        if (!action.formulaExpression) {
          conditionMet = false;
          break;
        }

        const fieldValues: { [fieldId: string]: any } = {};
        (action.sourceFields || []).forEach((fieldId: string) => {
          let value = this.formResponses[fieldId] || 0;

          // ✅ Convertir Moment u objetos Date a string YYYY-MM-DD
          if (value && typeof value === 'object') {
            if (typeof value.format === 'function') {
              // Es un Moment
              value = value.format('YYYY-MM-DD');
            } else if (value instanceof Date) {
              value = value.toISOString().split('T')[0];
            }
          }

          fieldValues[fieldId] = value;
        });

        const result = this.formulaService.evaluateCustomExpression(
          action.formulaExpression,
          fieldValues
        );

        conditionMet = !result.error && result.result !== 0;
        break;
      }
      default:
        conditionMet = false;
    }

    const isHide = action.type.startsWith('hide_if_');
    return isHide ? !conditionMet : conditionMet;
  }
  // ✅ evaluateAction ahora delega a evaluateActionCondition, sin duplicar el switch
  private evaluateAction(action: any, elementId: string, targetType: 'element' | 'region' = 'element'): void {
    const shouldShow = this.evaluateActionCondition(action);
    this.applyActionResult(shouldShow, elementId, targetType);
  }

  private applyActionResult(shouldShow: boolean, elementId: string, targetType: 'element' | 'region'): void {
    if (shouldShow) {
      this.visibleElements.add(elementId);
    } else {
      this.visibleElements.delete(elementId);

      if (targetType === 'region' && this.formDefinition) {
        const region = this.formDefinition.regions.find(r => r.id === elementId);
        if (region) {
          region.elements.forEach(el => {
            if (!this.isElementATrigger(el.id)) {
              this.visibleElements.delete(el.id);
              // ✅ Respetar el tipo al limpiar
              if (el.type === 'checkbox' && el.multipleSelecction) {
                this.formResponses[el.id] = [];
              } else {
                this.formResponses[el.id] = '';
              }
            }
          });
        }
      } else if (targetType === 'element') {
        if (!this.isElementATrigger(elementId)) {
          // ✅ Buscar el elemento para saber su tipo
          const el = this.formDefinition?.regions
            .flatMap(r => r.elements)
            .find(e => e.id === elementId);
          if (el?.type === 'checkbox' && el?.multipleSelecction) {
            this.formResponses[elementId] = [];
          } else {
            this.formResponses[elementId] = '';
          }
        }
      }
    }
  }

  // ✅ NUEVO: Verificar si un elemento es trigger de alguna acción
  private isElementATrigger(elementId: string): boolean {
    if (!this.formDefinition) return false;

    for (const region of this.formDefinition.regions) {
      // Verificar acciones de la región
      if (region.actions?.some(a => a.triggerField === elementId)) return true;
      // Verificar acciones de cada elemento
      for (const element of region.elements) {
        if (element.actions?.some(a => a.triggerField === elementId)) return true;
      }
    }
    return false;
  }

  /**
   * Actualizar visibilidad de campos de resultado
   */
  private updateResultFields(): void {
    if (!this.formDefinition) return;

    this.formDefinition.regions.forEach(region => {
      region.elements.forEach(element => {
        const isResultField = element.type === 'survey' && element.surveyConfig?.mode === 'result';

        if (isResultField && element.surveyConfig?.linkedFieldIds) {
          const hasLinkedResponse = element.surveyConfig.linkedFieldIds.some(
            linkedId => this.formResponses[linkedId]
          );

          if (hasLinkedResponse) {
            this.visibleElements.add(element.id);
          } else {
            this.visibleElements.delete(element.id);
          }
        }
      });
    });
  }

  /**
   * ✅ ACTUALIZADO: Manejar cambio en un elemento
   * Si tiene cascada, filtrar opciones automáticamente
   */
  onElementChange(elementId: string): void {
    // ✅ Cascadas van inmediato (afectan opciones visibles)
    if (this.formDefinition) {
      this.formDefinition.regions.forEach(region => {
        region.elements.forEach(element => {
          const cascadeConfig = (element as any).cascadeConfig;
          if (cascadeConfig && cascadeConfig.triggerFieldId === elementId) {
            this.filterCascadeOptions(element.id);
          }
        });
      });
    }

    // ✅ El resto va con debounce
    this.elementChangeSubject.next(elementId);
  }

  /**
   * Obtener tipo de input para Material
   */
  getInputType(element: FormElement): string {
    const typeMap: { [key: string]: string } = {
      'text': 'text',
      'number': 'number',
      'email': 'email',
      'date': 'date',
      'textarea': 'textarea'
    };
    return typeMap[element.type] || 'text';
  }

  /**
   * Obtener label de respuesta survey
   */
  getSurveyResponseLabel(responses: any[] | undefined, value: any): string {
    if (!responses) return '';
    const response = responses.find(r => r.value === value);
    return response ? response.label : '';
  }

  /**
   * Calcular porcentaje para resultado
   */
  getResultPercentage(element: FormElement): number {
    if (!element.surveyConfig?.linkedFieldIds || element.surveyConfig.linkedFieldIds.length === 0) {
      return 0;
    }

    const linkedId = element.surveyConfig.linkedFieldIds[0];
    const responseValue = this.formResponses[linkedId];

    if (!responseValue) return 0;
    return (responseValue / 5) * 100;
  }

  /**
   * Obtener etiqueta de resultado
   */
  getResponseLabel(element: FormElement): string {
    if (!element.surveyConfig?.linkedFieldIds || element.surveyConfig.linkedFieldIds.length === 0) {
      return '';
    }

    const linkedId = element.surveyConfig.linkedFieldIds[0];
    const responseValue = this.formResponses[linkedId];

    // if (!responseValue || !element.surveyConfig?.responses) return '';

    // const response = element.surveyConfig.responses.find(r => r.value === responseValue);
    // return response ? response.label : '';
    return '';
  }

  /**
   * Validar formulario
   */
  private validateForm(): boolean {
    if (!this.formDefinition) return false;

    this.fieldErrors.clear(); // ✅ Limpiar errores previos

    for (const regionRepeat of this.regionRepetitions) {
      const region = this.getRegionById(regionRepeat.regionId);
      if (!region || !this.isElementVisible(region.id)) continue;

      for (const element of region.elements) {
        const elementId = this.getElementIdForRepetition(element.id, regionRepeat.index);
        if (!this.isElementVisible(element.id)) continue;

        const value = this.formResponses[elementId];
        const isEmpty = value === null || value === undefined || value === '' ||
          (Array.isArray(value) && value.length === 0);

        if (element.required && isEmpty) {
          this.fieldErrors.set(elementId, `El campo "${element.label}" es obligatorio`);
          continue; // ✅ No return, seguir validando
        }
        if (element.required && element.type === 'survey' &&
          element.surveyConfig?.mode === 'catalog_question') {
          const selectedIds = this.catalogSurveyService.getSelectedIds(elementId);
          if (selectedIds.length === 0) {
            this.fieldErrors.set(elementId, `El campo "${element.label}" es obligatorio`);
            continue;
          }
        }

        if (!isEmpty) {
          if (element.type === 'email') {
            const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
            if (!emailValid) {
              this.fieldErrors.set(elementId, `Debe ser un email válido`);
              continue;
            }
          }

          if (element.type === 'number') {
            const numValid = !isNaN(Number(value)) && String(value).trim() !== '';
            if (!numValid) {
              this.fieldErrors.set(elementId, `Debe ser un número válido`);
              continue;
            }
          }

          if (element.type === 'phone') {
            const phoneValid = /^\d{8}$/.test(String(value));
            if (!phoneValid) {
              this.fieldErrors.set(elementId, `Debe tener 8 dígitos`);
              continue;
            }
          }
        }

        if (isEmpty || !element.validations?.length) continue;

        for (const validation of element.validations) {
          const passes = this.validateElement(element, validation, elementId);
          if (!passes) {
            this.fieldErrors.set(elementId, validation.message);
            break;
          }
        }
      }
    }

    // ✅ Si hay errores, scroll al primero
    if (this.fieldErrors.size > 0) {
      this.scrollToFirstError();
      this.cdr.markForCheck();
      return false;
    }

    return true;
  }

  private scrollToFirstError(): void {
    const firstErrorId = this.fieldErrors.keys().next().value;
    if (!firstErrorId) return;

    setTimeout(() => {
      const el = document.getElementById(`field_${firstErrorId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  }

  hasFieldError(elementId: string): boolean {
    return this.fieldErrors.has(elementId);
  }

  getFieldError(elementId: string): string {
    return this.fieldErrors.get(elementId) || '';
  }
  /**
   * Validar elemento
   */
  private validateElement(element: FormElement, validation: any, elementId?: string): boolean {
    const id = elementId || element.id;
    const value = this.formResponses[id];
    if (value === null || value === undefined || value === '') return true;

    switch (validation.type) {
      case 'equals': return String(value) === String(validation.value);
      case 'not_equals': return String(value) !== String(validation.value);
      case 'greater': return Number(value) > Number(validation.value);
      case 'less': return Number(value) < Number(validation.value);
      case 'greater_equal': return Number(value) >= Number(validation.value);
      case 'less_equal': return Number(value) <= Number(validation.value);
      case 'between': {
        if (element.type === 'date') {
          const date = new Date(value);
          const from = new Date(validation.value);
          const to = validation.useTodayAsMax ? new Date() : new Date(validation.valueTo);
          return date >= from && date <= to;
        }
        return Number(value) >= Number(validation.value) && Number(value) <= Number(validation.valueTo);
      }
      case 'filled': return value !== null && value !== undefined && value !== '';
      case 'min_length': return String(value).length >= parseInt(validation.value);
      case 'max_length': return String(value).length <= parseInt(validation.value);
      case 'only_numbers': return /^\d+$/.test(String(value));
      case 'only_letters': return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(String(value));
      case 'no_special_chars': return /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/.test(String(value));
      case 'email_format': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
      case 'pattern':
      case 'custom': return new RegExp(validation.value).test(String(value));
      case 'min_selections': return Array.isArray(value) && value.length >= parseInt(validation.value);
      case 'max_selections': return Array.isArray(value) && value.length <= parseInt(validation.value);
      case 'custom_formula': {
        if (!validation.expression) return true;

        // ✅ Construir fieldValues con todos los sourceFields
        const fieldValues: { [fieldId: string]: any } = {};
        (validation.sourceFields || []).forEach((fieldId: string) => {
          fieldValues[fieldId] = this.formResponses[fieldId] || 0;
        });

        // ✅ También incluir el campo actual
        fieldValues[id] = value;

        const result = this.formulaService.evaluateCustomExpression(
          validation.expression,
          fieldValues
        );

        // ✅ Si el resultado es 1 (verdadero) la validación PASA
        // Si es 0 (falso) la validación FALLA
        return !result.error && result.result !== 0;
      }
      default: return true;
    }
  }

  /**
   * Enviar formulario
   */
  onSubmit(): void {
    if (!this.validateForm()) return;

    // ✅ Consolidar respuestas de survey
    this.formDefinition?.regions.forEach(region => {
      region.elements.forEach(element => {
        if (element.type !== 'survey' || !element.surveyConfig) return;
        const mode = element.surveyConfig.mode;
        if (mode === 'catalog_question') {
          this.formResponses[element.id] = {
            selectedIds: this.catalogSurveyService.getSelectedIds(element.id),
            score: this.catalogSurveyService.getScore(element.id)
          };
        } else if (mode === 'catalog_subtotal') {
          // ✅ Si tiene fórmula custom, usar el resultado de la fórmula
          if (this.isFormulaField(element)) {
            // ya está en formResponses desde evaluateFormulas, no sobreescribir
          } else {
            this.formResponses[element.id] = this.getSubtotalScore(element);
          }
        } else if (mode === 'catalog_stars') {
          this.formResponses[element.id] = this.getStarsScore(element);
        }
        // else if (mode === 'question') {
        //   this.formResponses[element.id] = this.surveyAnswersService.getSurveyAnswer(element.id);
        // }
      });
    });

    if (this.data.mode === 'edit' && this.data.id_respuesta) {
      this.formResponseService.updateResponse(
        this.data.id_respuesta,
        this.formResponses
      ).subscribe({
        next: (response) => {
          if (response.success) {
            this.showSnackBar('✅ Respuesta actualizada exitosamente', 'success');
            setTimeout(() => this.dialogRef.close({ success: true }), 1000);
          }
        },
        error: () => this.showSnackBar('❌ Error al actualizar', 'error')
      });
    } else {

      // ✅ Construir payload completo
      const payload = {
        id_formulario: this.data.formKey,
        id_usuario: this.authService.currentUser()?.idUser,
        responses: this.formResponses,
        estructura: {
          regions: this.formDefinition?.regions || []
        },
        visibleElements: Array.from(this.visibleElements) // Set -> Array
      };

      // ✅ Llamar al servicio
      this.formResponseService.saveFormResponse(payload).subscribe({
        next: (response) => {
          if (response.success) {
            this.showSnackBar('✅ Formulario enviado exitosamente', 'success');
            setTimeout(() => {
              this.dialogRef.close({ success: true });
            }, 1000);
          }
        },
        error: (error) => {
          console.error('❌ Error al guardar:', error);
          this.showSnackBar('❌ Error al enviar el formulario', 'error');
        }
      });
    }

  }
  /**
   * Cancelar
   */
  onCancel(): void {
    this.dialogRef.close(null);
  }

  /**
   * Mostrar snackbar
   */
  private showSnackBar(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [`snackbar-${type}`]
    });
  }

  triggerCamera(elementId: string): void {
    const input = document.getElementById('camera_' + elementId) as HTMLInputElement;
    if (input) input.click();
  }

  onCameraCapture(elementId: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.[0]) return;

    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
      this.showSnackBar('Por favor selecciona una imagen válida', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.showSnackBar('La imagen no debe superar 10 MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.formResponses[elementId] = e.target?.result;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);

    // Reset input para permitir seleccionar la misma imagen de nuevo
    input.value = '';
  }

  // ===== FORMATEO DE CAMPOS ESPECIALES =====
  onTimeChange(elementId: string, value: string): void {
    this.formResponses[elementId] = value;
    this.onElementChange(elementId);
  }

  // Helper para identificar si es campo CUI por fieldRole
  isCuiField(element: FormElement): boolean {
    return (element as any).fieldRole === 'cui' ||
      (element as any).fieldRole === 'cui_madre';
  }

  onCuiFocus(elementId: string, region: FormRegion): void {
    const cui = this.formResponses[elementId] || '';
    console.log(cui);
    if (cui.length !== 13 && cui.length !== 15) return;

    const fieldRole = region.elements.find(e => e.id === elementId)?.fieldRole;
    const isMadre = fieldRole === 'cui_madre';
    if (!isMadre) {
      this.formResponseService.getPersonaByCui(cui).subscribe({
        next: (persona) => {
          region.elements.forEach(element => {
            const role = (element as any).fieldRole;
            if (!role) return;

            const fieldElementId = this.getElementIdForRepetition(
              element.id,
              this.getRepetitionIndexFromElementId(elementId)
            );

            if (!isMadre) {
              // ✅ CUI de la persona
              switch (role) {
                case 'nombres': if (persona.nombres) this.formResponses[fieldElementId] = persona.nombres; break;
                case 'apellidos': if (persona.apellidos) this.formResponses[fieldElementId] = persona.apellidos; break;
                case 'fecha_nacimiento': if (persona.fecha_nacimiento) this.formResponses[fieldElementId] = new Date(persona.fecha_nacimiento); break;
                case 'sexo': if (persona.sexo) this.formResponses[fieldElementId] = persona.sexo; break;
                case 'direccion': if (persona.direccion) this.formResponses[fieldElementId] = persona.direccion; break;
                case 'fecha_ingreso_programa': if (persona.fecha_ingreso_programa) this.formResponses[fieldElementId] = new Date(persona.fecha_ingreso_programa); break;
                case 'cui_madre': if (persona.cui_madre) this.formResponses[fieldElementId] = persona.cui_madre; break;
                case 'es_hijo':
                  const esHijoVal = persona.datos_extra?.es_hijo;
                  if (esHijoVal !== undefined) {
                    this.formResponses[fieldElementId] = esHijoVal;
                    this.onElementChange(fieldElementId);
                    setTimeout(() => this.cdr.markForCheck(), 50);
                  }
                  break;
              }
            }
            //  else {
            //   // ✅ CUI de la madre
            //   switch (role) {
            //     case 'nombres_madre': if (persona.nombres) this.formResponses[fieldElementId] = persona.nombres; break;
            //     case 'apellidos_madre': if (persona.apellidos) this.formResponses[fieldElementId] = persona.apellidos; break;
            //   }
            // }
          });

          this.cdr.markForCheck();
        },
        error: () => { }
      });
    }


  }

  //Helper para extraer el índice de repetición del elementId
  private getRepetitionIndexFromElementId(elementId: string): number {
    const match = elementId.match(/_rep(\d+)$/);
    return match ? parseInt(match[1]) : 0;
  }


  formulaResults: Map<string, string> = new Map();
  isFormulaField(element: FormElement): boolean {
    return element.formulas !== undefined && element.formulas.length > 0;
  }

  getFormulaResult(elementId: string): string {
    return this.formulaResults.get(elementId) || '—';
  }

  getFormulaResultFormat(element: FormElement): string {
    return element.formulas?.[0]?.resultFormat?.type || 'number';
  }


  evaluateFormulas(changedElementId: string): void {
    if (!this.formDefinition) return;

    const updatedFields: string[] = [changedElementId];

    // ✅ Primera pasada: evaluar fórmulas que dependen del campo cambiado
    this.formDefinition.regions.forEach(region => {
      region.elements.forEach(element => {
        if (!element.formulas?.length) return;

        element.formulas.forEach(formula => {
          if (!formula.sourceFields.includes(changedElementId)) return;

          const fieldValues: { [fieldId: string]: any } = {};
          formula.sourceFields.forEach(fieldId => {
            let val = this.userResponses[fieldId] !== undefined
              ? this.userResponses[fieldId]
              : this.formResponses[fieldId];

            if (Array.isArray(val)) val = val[0] ?? 0;

            if (val && typeof val === 'object') {
              if (typeof val.format === 'function') val = val.format('YYYY-MM-DD');
              else if (val instanceof Date) val = val.toISOString().split('T')[0];
            }

            fieldValues[fieldId] = val !== undefined && val !== null ? val : 0;
          });

          const result = this.formulaService.evaluateFormula(formula, fieldValues);
          this.formResponses[element.id] = result.value;
          this.formulaResults.set(element.id, result.formattedValue);

          // ✅ Registrar que este campo se actualizó
          if (!updatedFields.includes(element.id)) {
            updatedFields.push(element.id);
          }
        });
      });
    });

    // ✅ Segunda pasada: evaluar fórmulas que dependen de campos recién calculados
    updatedFields.forEach(updatedId => {
      if (updatedId === changedElementId) return; // ya procesado

      this.formDefinition!.regions.forEach(region => {
        region.elements.forEach(element => {
          if (!element.formulas?.length) return;

          element.formulas.forEach(formula => {
            if (!formula.sourceFields.includes(updatedId)) return;
            // Evitar re-evaluar el mismo campo
            if (element.id === updatedId) return;

            const fieldValues: { [fieldId: string]: any } = {};
            formula.sourceFields.forEach(fieldId => {
              let val = this.userResponses[fieldId] !== undefined
                ? this.userResponses[fieldId]
                : this.formResponses[fieldId];

              if (Array.isArray(val)) val = val[0] ?? 0;

              if (val && typeof val === 'object') {
                if (typeof val.format === 'function') val = val.format('YYYY-MM-DD');
                else if (val instanceof Date) val = val.toISOString().split('T')[0];
              }

              fieldValues[fieldId] = val !== undefined && val !== null ? val : 0;
            });

            const result = this.formulaService.evaluateFormula(formula, fieldValues);
            this.formResponses[element.id] = result.value;
            this.formulaResults.set(element.id, result.formattedValue);
          });
        });
      });
    });

    // ✅ Tercera pasada: recalcular campos catalog_stars que usen campos actualizados
    this.formDefinition!.regions.forEach(region => {
      region.elements.forEach(element => {
        if (element.surveyConfig?.mode !== 'catalog_stars') return;
        const linkedIds = element.surveyConfig?.linkedFieldIds || [];
        const dependsOnUpdated = linkedIds.some(id => updatedFields.includes(id));
        if (dependsOnUpdated) {
          // Forzar re-render del campo de estrellas
          this.cdr.markForCheck();
        }
      });
    });

    this.cdr.markForCheck();
  }
  private evaluateAllFormulasOnLoad(): void {
    if (!this.formDefinition) return;

    this.formDefinition.regions.forEach(region => {
      region.elements.forEach(element => {
        if (!element.formulas?.length) return;

        element.formulas.forEach(formula => {
          const fieldValues: { [fieldId: string]: any } = {};
          formula.sourceFields.forEach(fieldId => {
            fieldValues[fieldId] = this.formResponses[fieldId] || 0;
          });

          const result = this.formulaService.evaluateFormula(formula, fieldValues);
          this.formResponses[element.id] = result.value;
          this.formulaResults.set(element.id, result.formattedValue);
        });
      });
    });

    this.cdr.markForCheck();
  }

  getOptionImage(element: FormElement, optionValue: string | number): string {
    return element.surveyConfig?.catalogOptions?.find(
      o => String(o.catalogId) === String(optionValue)
    )?.imageUrl || '';
  }


}