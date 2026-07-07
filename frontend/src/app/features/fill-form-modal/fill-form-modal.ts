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
import { FamiliaService } from '../../core/services/familia.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { REGION_MADRE } from '../../core/constants/form-regions.constants';
import { environment } from '../../../environments/environment';

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
    MatTooltipModule,
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
  //Generar el código temporal
  codigosGenerados: Map<string, string> = new Map();
  codigoCopiado: Map<string, boolean> = new Map();

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
    private familiaService: FamiliaService,
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


  // ngAfterViewInit(): void {
  //   setTimeout(() => {
  //     this.initIntersectionObserver();
  //     this.cdr.markForCheck();
  //   }, 300);
  // }
  ngAfterViewInit(): void {
    setTimeout(() => {
      // ✅ Log para identificar el mat-form-field sin control
      document.querySelectorAll('mat-form-field').forEach((el, i) => {
        const control = el.querySelector('input, textarea, mat-select, select');
        if (!control) {
          console.error(`❌ mat-form-field #${i} sin control:`, el.innerHTML.substring(0, 200));
        }
      });
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

    this.getAllRegionsFlat(this.formDefinition.regions).forEach(r => this.visibleRegionIds.add(r.id));

    this.getAllRegionsFlat(this.formDefinition.regions).forEach(region => {
      this.getElements(region).forEach(element => {
        if (element.type === 'checkbox' && element.multipleSelecction) {
          this.formResponses[element.id] = [];
        } else if (element.type === 'heading') {
        } else {
          this.formResponses[element.id] = '';
        }
      });
    });
    // ✅ 2. Precargar respuestas existentes ANTES de evaluar acciones
    if (this.data.existingResponses) {
      Object.assign(this.formResponses, this.data.existingResponses);

      Object.entries(this.data.existingResponses).forEach(([key, value]) => {
        if (key.startsWith('__catalog__') &&
          value && typeof value === 'object' &&
          'selectedIds' in value) {
          const surveyId = key.replace('__catalog__', '');
          const selectedIds = (value as any).selectedIds || [];
          const score = (value as any).score ?? 0;

          // 👇 Verificar si el survey es de selección simple
          const allElements = this.getAllElementsFlat(this.formDefinition?.regions ?? []);
          const element = allElements.find(el => el.id === surveyId);
          const isMultiple = element?.surveyConfig?.multipleSelection ?? true;

          const idsToRestore = isMultiple ? selectedIds : selectedIds.slice(0, 1); // 👈 solo el primero si es simple

          this.catalogSurveyService.restoreAnswer(surveyId, idsToRestore, score);
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

    const surveyElements = this.getAllElementsFlat(this.formDefinition.regions)
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
    const allElements = this.getAllElementsFlat(this.formDefinition?.regions ?? [])
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

    // ✅ Obtener el catalogType del survey (está en surveyConfig)
    const catalogType = element?.surveyConfig?.catalogType;

    // ✅ Labels de las opciones seleccionadas (para el score especial)
    const selectedLabelsForScore = options
      .filter(o => currentIds.some(id => String(id) === String(o.value)))
      .map(o => o.label);

    // ✅ Si el catálogo tiene puntaje especial, calcularlo (undefined si no aplica)
    const scoreEspecial = this.calcularScoreEspecial(catalogType, selectedLabelsForScore);

    // ✅ Guardar la respuesta con el score (especial o proporcional)
    this.catalogSurveyService.saveAnswer(
      elementId,
      currentIds,
      options.length,
      noneIds,
      scoreEspecial
    );

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
    const allElements = this.getAllElementsFlat(this.formDefinition?.regions ?? [])
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
    const allElements = this.getAllElementsFlat(this.formDefinition?.regions ?? [])
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
    const elementsWithCatalog = this.getAllElementsFlat(this.formDefinition.regions)
      .filter(el => el.catalogType != null);

    if (elementsWithCatalog.length === 0) return;

    let loaded = 0;

    elementsWithCatalog.forEach(element => {
      this.catalogService.getCatalogData(Number(element.catalogType)).subscribe({
        next: (catalogData) => {
          let options = catalogData.map(item => ({ value: item.id, label: item.nombre }));
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
    const element = this.getAllElementsFlat(this.formDefinition?.regions ?? [])
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

    const element = this.getAllElementsFlat(this.formDefinition?.regions ?? [])
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
          const element = this.getAllElementsFlat(this.formDefinition?.regions ?? [])
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

    const element = this.getAllElementsFlat(this.formDefinition.regions)
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

    const processRootRegion = (region: FormRegion) => {
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

          // 👇 Agregar subregiones por cada repetición del padre
          region.children.forEach(child => {
            if ((child as FormRegion).type === 'region') {
              const subRegion = child as FormRegion;
              this.regionRepetitions.push({
                index: i,
                regionId: subRegion.id,
                title: `${subRegion.title} #${i}`
              });
            }
          });
        }
      } else {
        this.regionRepetitions.push({
          index: 0,
          regionId: region.id,
          title: region.title
        });
        // subregiones sin repetición se renderizan inline
      }
    };

    this.formDefinition.regions.forEach(region => processRootRegion(region));
    this.evaluateAllActions();
  }
  /**
   * Obtener región por ID
   */
  getRegionById(regionId: string): FormRegion | undefined {
    if (!this.formDefinition) return undefined;
    const found = this.getAllRegionsFlat(this.formDefinition.regions)
      .find(r => r.id === regionId);
    return found ?? undefined;
  }

  /**
   * Obtener elementos de una región específica
   */
  // temporal en getRegionElements
  getRegionElements(region: FormRegion): FormElement[] {
    return region.children.filter(
      c => (c as FormRegion).type !== 'region'
    ) as FormElement[];
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

    const allRegions = this.getAllRegionsFlat(this.formDefinition.regions);

    // PASO 1: Visibilidad por defecto
    allRegions.forEach(region => {
      const hasActions = region.actions && region.actions.length > 0;

      if (!hasActions) {
        if (region.parentRegionId) {
          // Subregión sin acciones: visible por cada rep del padre
          const parentReps = this.repeatingRegions.get(region.parentRegionId) || 0;
          if (parentReps === 0) {
            this.visibleElements.add(region.id);
          } else {
            for (let i = 1; i <= parentReps; i++) {
              this.visibleElements.add(this.getElementIdForRepetition(region.id, i));
            }
          }
        } else {
          // Región raíz sin acciones: siempre visible
          this.visibleElements.add(region.id);
        }
      }
    });

    // Regiones repetibles: agregar rep1, rep2... como visibles
    this.repeatingRegions.forEach((numReps, regionId) => {
      for (let i = 1; i <= numReps; i++) {
        this.visibleElements.add(this.getElementIdForRepetition(regionId, i));
      }
    });

    // PASO 2: Evaluar acciones de REGIONES
    allRegions.forEach(region => {
      if (!region.actions || region.actions.length === 0) return;

      const parentReps = region.parentRegionId
        ? (this.repeatingRegions.get(region.parentRegionId) || 0)
        : 0;

      const evaluateForRep = (repIndex: number) => {
        const resolvedActions = region.actions.map(action => ({
          ...action,
          triggerField: repIndex > 0
            ? this.getElementIdForRepetition(action.triggerField, repIndex)
            : action.triggerField
        }));

        const shouldShow = region.actions.length > 1
          ? (() => {
            const operator = (region as any).actionsOperator || 'AND';
            const results = resolvedActions.map(a => this.evaluateActionCondition(a));
            return operator === 'OR'
              ? results.some(r => r)
              : results.every(r => r);
          })()
          : this.evaluateActionCondition(resolvedActions[0]);

        const regionId = repIndex > 0
          ? this.getElementIdForRepetition(region.id, repIndex)
          : region.id;

        this.applyActionResult(shouldShow, regionId, 'region');
      };

      if (parentReps === 0) {
        evaluateForRep(0);
      } else {
        for (let i = 1; i <= parentReps; i++) {
          evaluateForRep(i);
        }
      }
    });

    // PASO 3: Elementos sin acciones visibles por defecto
    allRegions.forEach(region => {
      // Determinar qué IDs de región están visibles
      const parentReps = region.parentRegionId
        ? (this.repeatingRegions.get(region.parentRegionId) || 0)
        : 0;
      const ownReps = this.repeatingRegions.get(region.id) || 0;

      const getRegionVisibleIds = (): string[] => {
        if (ownReps > 0) {
          // Región repetible: sus reps son las visibles
          return Array.from({ length: ownReps }, (_, i) =>
            this.getElementIdForRepetition(region.id, i + 1)
          ).filter(id => this.visibleElements.has(id));
        } else if (parentReps > 0) {
          // Subregión de repetible
          return Array.from({ length: parentReps }, (_, i) =>
            this.getElementIdForRepetition(region.id, i + 1)
          ).filter(id => this.visibleElements.has(id));
        } else {
          return this.visibleElements.has(region.id) ? [region.id] : [];
        }
      };

      const visibleRegionIds = getRegionVisibleIds();
      if (visibleRegionIds.length === 0) return;

      // Determinar repeticiones para los elementos
      const elementReps = ownReps > 0 ? ownReps
        : parentReps > 0 ? parentReps
          : 0;

      this.getElements(region).forEach(element => {
        const isResultField = element.type === 'survey' &&
          element.surveyConfig?.mode === 'result';
        if (!element.actions || element.actions.length === 0) {
          if (!isResultField) {
            this.visibleElements.add(element.id);
            for (let i = 1; i <= elementReps; i++) {
              this.visibleElements.add(this.getElementIdForRepetition(element.id, i));
            }
          }
        }
      });
    });

    // PASO 4: Evaluar acciones de ELEMENTOS
    allRegions.forEach(region => {
      const ownReps = this.repeatingRegions.get(region.id) || 0;
      const parentReps = region.parentRegionId
        ? (this.repeatingRegions.get(region.parentRegionId) || 0)
        : 0;
      const repetitions = ownReps > 0 ? ownReps : parentReps;

      this.getElements(region).forEach(element => {
        if (!element.actions || element.actions.length === 0) return;
        if (repetitions === 0) {
          this.evaluateElementActions(element, 0);
        } else {
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

    const allElements = this.getAllElementsFlat(this.formDefinition?.regions ?? []);
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
      case 'show_if_any_of':
      case 'hide_if_any_of': {
        let values: (string | number)[] = [];
        try { values = JSON.parse(actionValue); } catch { values = []; }
        const current = Array.isArray(triggerValue) ? triggerValue : [String(triggerValue)];
        // ✅ Se cumple si AL MENOS UNO de los valores requeridos está en el trigger
        conditionMet = values.some(required =>
          current.some(selected => String(selected) === String(required))
        );
        break;
      }

      case 'show_if_all_of':
      case 'hide_if_all_of': {
        let values: (string | number)[] = [];
        try { values = JSON.parse(actionValue); } catch { values = []; }
        const current = Array.isArray(triggerValue) ? triggerValue : [String(triggerValue)];
        // ✅ Se cumple si TODOS los valores requeridos están en el trigger
        conditionMet = values.every(required =>
          current.some(selected => String(selected) === String(required))
        );
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
        const allRegions = this.getAllRegionsFlat(this.formDefinition.regions);
        const region = allRegions.find(r => r.id === elementId);
        if (region) {
          this.getElements(region).forEach(el => {
            if (!this.isElementATrigger(el.id)) {
              this.visibleElements.delete(el.id);
              if (el.type === 'checkbox' && el.multipleSelecction) {
                this.formResponses[el.id] = [];
              } else {
                this.formResponses[el.id] = '';
              }
            }
          });
        }
      }
      else if (targetType === 'element') {
        if (!this.isElementATrigger(elementId)) {
          // ✅ Buscar el elemento para saber su tipo
          const el = this.getAllElementsFlat(this.formDefinition?.regions ?? [])
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
    const allRegions = this.getAllRegionsFlat(this.formDefinition.regions);
    for (const region of allRegions) {
      if (region.actions?.some(a => a.triggerField === elementId)) return true;
      for (const element of this.getElements(region)) {
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
      this.getElements(region).forEach(element => {
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
        this.getElements(region).forEach(element => {
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

      for (const element of this.getElements(region)) {
        const elementId = this.getElementIdForRepetition(element.id, regionRepeat.index);
        if (!this.isElementVisible(elementId)) continue;

        const value = this.formResponses[elementId];
        const isEmpty = value === null || value === undefined || value === '' ||
          (Array.isArray(value) && value.length === 0);

        if (element.required && isEmpty) {
          if (element.type === 'coordinates') continue;

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
    const isValid = this.validateForm();
    if (!isValid) return;


    if (!this.validateForm()) return;

    // ✅ Consolidar respuestas de survey
    this.formDefinition?.regions.forEach(region => {
      this.getElements(region).forEach(element => {
        if (element.type !== 'survey' || !element.surveyConfig) return;
        const mode = element.surveyConfig.mode;
        if (mode === 'catalog_question') {
          const selectedIds = this.catalogSurveyService.getSelectedIds(element.id);
          const score = this.catalogSurveyService.getScore(element.id);

          this.formResponses[element.id] = { selectedIds, score };
          this.formResponses[`__catalog__${element.id}`] = { selectedIds, score };
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
      });

    });
    if (this.data.mode === 'edit' && this.data.id_respuesta) {
      this.formResponseService.updateResponse(
        this.data.id_respuesta,
        {
          datos: this.formResponses,
          visibleElements: Array.from(this.visibleElements),
          id_formulario: this.data.formKey,
        }
      ).subscribe({
        next: (response) => {
          if (response.success) {
            this.showSnackBar('✅ Respuesta actualizada exitosamente', 'success');
            setTimeout(() => this.dialogRef.close({ success: true }), 1000);
          }
        },
        error: () => this.showSnackBar('❌ Error al actualizar', 'error')
      });
    }
    else {

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
  // En fill-form-modal.ts temporalmente
  isCuiField(element: FormElement): boolean {
    const result = (element as any).fieldRole === 'cui' ||
      (element as any).fieldRole === 'cui_madre';
    return result;
  }

  onCuiFocus(elementId: string, region: FormRegion): void {
    const cui = this.formResponses[elementId] || '';
    if (cui.length !== 13 && cui.length !== 15) return;

    const fieldRole = this.getElements(region).find(e => e.id === elementId)?.fieldRole;
    const isMadre = fieldRole === 'cui_madre';
    if (!isMadre) {
      this.formResponseService.getPersonaByCui(cui).subscribe({
        next: (persona) => {
          this.getElements(region).forEach(element => {
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
      this.getElements(region).forEach(element => {
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
      })

    });

    // ✅ Segunda pasada: evaluar fórmulas que dependen de campos recién calculados
    updatedFields.forEach(updatedId => {
      if (updatedId === changedElementId) return; // ya procesado

      this.formDefinition!.regions.forEach(region => {
        this.getElements(region).forEach(element => {
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
      this.getElements(region).forEach(element => {
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
      this.getElements(region).forEach(element => {
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
      })
    });

    this.cdr.markForCheck();
  }

  getOptionImage(element: FormElement, optionValue: string | number): string {
    return element.surveyConfig?.catalogOptions?.find(
      o => String(o.catalogId) === String(optionValue)
    )?.imageUrl || '';
  }


  // ══════════════════════════════════════════
  // CÓDIGO TEMPORAL
  // ══════════════════════════════════════════

  isTempCodeField(element: FormElement): boolean {
    return (element as any).generateTempCode === true;
  }

  getCodigoGenerado(elementId: string): string {
    return this.codigosGenerados.get(elementId) || '';
  }

  fueCopiadoElCodigo(elementId: string): boolean {
    return this.codigoCopiado.get(elementId) || false;
  }

  onGenerarCodigo(element: FormElement, elementId: string): void {
    // Obtener nombres y apellidos de la misma región
    const region = this.formDefinition?.regions
      .find(r => this.getElements(r).some(e => e.id === element.id));

    if (!region) return;

    const getNombreField = (fieldRole: string, repIndex: number): string => {
      const el = this.getElements(region).find((e: any) => e.fieldRole === fieldRole);
      if (!el) return '';
      const id = repIndex > 0 ? `${el.id}_rep${repIndex}` : el.id;
      return this.formResponses[id] || '';
    };

    // Detectar si es repetición
    const repMatch = elementId.match(/_rep(\d+)$/);
    const repIndex = repMatch ? parseInt(repMatch[1]) : 0;

    const nombres = getNombreField('nombres', repIndex);
    const apellidos = getNombreField('apellidos', repIndex);

    // Obtener id_comunidad de las respuestas
    const id_comunidad = this.getComunidadFromResponses();

    // Obtener fecha de inscripción
    const fechaEl = this.getElements(region).find(
      (e: any) => e.fieldRole === 'fecha_ingreso_programa'
    );
    const fechaId = fechaEl
      ? (repIndex > 0 ? `${fechaEl.id}_rep${repIndex}` : fechaEl.id)
      : null;

    let fecha_inscripcion = fechaId
      ? this.formResponses[fechaId]
      : null;

    // Si no tiene fecha de inscripción usar la fecha actual
    if (!fecha_inscripcion) {
      fecha_inscripcion = new Date().toISOString().split('T')[0];
    } else if (fecha_inscripcion instanceof Date) {
      fecha_inscripcion = fecha_inscripcion.toISOString().split('T')[0];
    } else if (typeof fecha_inscripcion === 'object' &&
      typeof fecha_inscripcion.format === 'function') {
      fecha_inscripcion = fecha_inscripcion.format('YYYY-MM-DD');
    }

    if (!nombres || !apellidos) {
      this.showSnackBar(
        'Ingresa nombres y apellidos antes de generar el código',
        'error'
      );
      return;
    }

    if (!id_comunidad) {
      this.showSnackBar(
        'Selecciona la comunidad antes de generar el código',
        'error'
      );
      return;
    }

    this.familiaService.generarCodigoTemporal({
      nombres,
      apellidos,
      id_comunidad,
      fecha_inscripcion
    }).subscribe({
      next: (res) => {
        const codigo = res.data.codigo;
        this.codigosGenerados.set(elementId, codigo);
        this.formResponses[elementId] = codigo;
        this.codigoCopiado.set(elementId, false);
        this.onElementChange(elementId);
        this.cdr.markForCheck();
      },
      error: () => {
        this.showSnackBar('Error al generar el código', 'error');
      }
    });
  }

  onCopiarCodigo(elementId: string): void {
    const codigo = this.codigosGenerados.get(elementId) ||
      this.formResponses[elementId];
    if (!codigo) return;

    navigator.clipboard.writeText(codigo).then(() => {
      this.codigoCopiado.set(elementId, true);
      this.cdr.markForCheck();

      // Resetear el ícono de copiado después de 2 segundos
      setTimeout(() => {
        this.codigoCopiado.set(elementId, false);
        this.cdr.markForCheck();
      }, 2000);
    });
  }

  private getComunidadFromResponses(): number | null {
    if (!this.formDefinition) return null;

    for (const region of this.formDefinition.regions) {
      for (const element of this.getElements(region)) {
        const catalogType = (element as any).catalogType;
        if (!catalogType) continue;

        // Buscar el elemento que tenga cascadeConfig nulo y
        // sea el campo de comunidad por su catalogType
        const valor = this.formResponses[element.id];
        if (!valor) continue;

        // Verificar si este catálogo es de comunidad
        const opciones = this.cascadeOptions.get(element.id);
        if (opciones && element.catalogType) {
          // Si tiene valor y es un select de catálogo, asumir que puede ser comunidad
          // El campo comunidad tiene cascadeConfig con filterKey: 'id_departamento'
          const cascadeConfig = (element as any).cascadeConfig;
          if (cascadeConfig?.filterKey === 'id_departamento') {
            return Number(valor);
          }
        }
      }
    }
    return null;
  }

  isRegionMadre(regionId: string) {
    return regionId == REGION_MADRE;
  }

  //Detectar si la imagen viene del servidor
  isServerImage(value: any): boolean {
    return typeof value === 'string' &&
      (value.startsWith('/uploads/') || value.startsWith('/public/'));
  }

  //Construir URL completa del servidor
  getServerImageUrl(ruta: string): string {
    const base = environment.BASE_URL.replace('/api/v1', '');
    return `${base}${ruta}`;
  }

  onSelectChange(elementId: string): void {
    this.onElementChange(elementId);
    this.cdr.markForCheck(); // ✅ refresco inmediato de la UI
  }

  //Comparar valores del select normalizando tipos (número vs string)
  compareSelectValues(a: any, b: any): boolean {
    if (a === null || a === undefined || b === null || b === undefined) {
      return a === b;
    }
    return String(a) === String(b);
  }

  // Puntajes especiales por catalogType y label (escala 0-1)
  private readonly puntajesEspeciales: Record<string, Record<string, number>> = {
    '66': {
      'bueno': 1.0,   // → 100
      'regular': 0.5,   // → 50
      'malo': 0.0,   // → 0
    }
  };

  // ✅ Calcular score especial por label si el catálogo lo tiene configurado
  private calcularScoreEspecial(
    catalogType: string | null | undefined,
    selectedLabels: string[]
  ): number | undefined {
    if (!catalogType) return undefined;
    const mapa = this.puntajesEspeciales[String(catalogType)];
    if (!mapa) return undefined;

    // ✅ Tomar el primero seleccionado (selección única) y normalizar el label
    if (selectedLabels.length === 0) return 0;

    const label = selectedLabels[0]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    return mapa[label] ?? 0;
  }

  private getElements(region: FormRegion): FormElement[] {
    return region.children.filter(
      c => (c as FormRegion).type !== 'region'
    ) as FormElement[];
  }

  private getSubRegions(region: FormRegion): FormRegion[] {
    return region.children.filter(
      c => (c as FormRegion).type === 'region'
    ) as FormRegion[];
  }

  private getAllElementsFlat(regions: FormRegion[]): FormElement[] {
    return regions.flatMap(r => [
      ...this.getElements(r),
      ...this.getAllElementsFlat(this.getSubRegions(r))
    ]);
  }

  private getAllRegionsFlat(regions: FormRegion[]): FormRegion[] {
    return regions.flatMap(r => [
      r,
      ...this.getAllRegionsFlat(
        r.children.filter(c => (c as FormRegion).type === 'region') as FormRegion[]
      )
    ]);
  }


  // ══════════════════════════════════════════
  // EVALUATION TABLE
  // ══════════════════════════════════════════

  getTableResponse(elementId: string, rowId: string, groupId: string): any {
    const value = this.formResponses[`${elementId}_${rowId}_${groupId}`];
    return value;
  }

  setTableSingleResponse(elementId: string, rowId: string, groupId: string, colId: string): void {
    this.formResponses[`${elementId}_${rowId}_${groupId}`] = colId;
    this.onElementChange(elementId);
  }

  getTableMultipleResponse(elementId: string, rowId: string, colId: string): boolean {
    return !!this.formResponses[`${elementId}_${rowId}_${colId}`];
  }

  setTableMultipleResponse(elementId: string, rowId: string, colId: string, checked: boolean): void {
    this.formResponses[`${elementId}_${rowId}_${colId}`] = checked;
    this.onElementChange(elementId);
  }

  getTableGlobalResponse(elementId: string, rowId: string): any {
    return this.formResponses[`${elementId}_${rowId}`];
  }

  setTableGlobalResponse(elementId: string, rowId: string, colId: string): void {
    this.formResponses[`${elementId}_${rowId}`] = colId;
    this.onElementChange(elementId);
  }

  getTotalColumns(element: FormElement): number {
    const config = element.evaluationTableConfig;
    if (!config) return 0;
    return config.columnGroups.reduce((total, g) => total + g.columns.length, 0);
  }

  getRegionChildrenOrdered(region: FormRegion): { type: 'element' | 'region', data: FormElement | FormRegion }[] {
    return region.children.map(child => ({
      type: (child as FormRegion).type === 'region' ? 'region' : 'element',
      data: child
    }));
  }

  isChildRegion(child: FormElement | FormRegion): boolean {
    return (child as FormRegion).type === 'region';
  }

  asRegion(child: FormElement | FormRegion): FormRegion {
    return child as FormRegion;
  }

  asElement(child: FormElement | FormRegion): FormElement {
    return child as FormElement;
  }

  isParentRepeating(region: FormRegion): boolean {
    const repeatConfig = (region as any).repeatConfig;
    return repeatConfig?.enabled === true;
  }
}