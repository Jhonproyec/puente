import { Component, Input, OnDestroy, OnInit, ChangeDetectorRef, OnChanges, SimpleChanges } from '@angular/core';
import { CatalogOption, ElementType, FormElement, FormRegion } from '../../../../../core/models/form-builder.model';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { FormBuilderStateService } from '../../../../../core/services/form-builder-state.service';
import { CatalogService } from '../../../../../core/services/catalog.service';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ElementImageEditor } from '../../form-preview/element-image-editor/element-image-editor';
import { SurveyProperties } from '../../survey-properties/survey-properties';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

interface ManualOption {
  id: string | number;
  nombre: string;
}

@Component({
  selector: 'app-element-properties',
  imports: [
    FormsModule,
    CommonModule,
    ElementImageEditor,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    SurveyProperties
  ],
  templateUrl: './element-properties.html',
  styleUrl: './element-properties.css'
})
export class ElementProperties implements OnInit, OnChanges, OnDestroy {
  @Input() element!: FormElement | FormRegion;
  @Input() elementType!: 'element' | 'region' | null;

  private destroy$ = new Subject<void>();

  availableCatalogs: Array<{ id: number; name: string }> = [];
  catalogOptions: CatalogOption[] = [];
  loadingCatalog = false;
  newOptionText = '';
  allNumericFields: FormElement[] = [];
  allSelectFields: FormElement[] = [];
  selectedNumericField?: string;

  // Propiedades para opciones específicas
  enableSpecificOptions = false;
  manualOptions: ManualOption[] = [];
  manualOptionCounter = 0;

  // Propiedades para cascadas
  isCascadeEnabled = false;
  cascadeTriggerFieldId = '';
  cascadeTriggerFieldLabel = '';
  availableCascadeFilterKeys: string[] = [];
  selectedCascadeFilterKey = '';
  cascadeConfig: any = null;

  elementTypes: Array<{ value: ElementType; label: string }> = [
    { value: 'text', label: 'Texto' },
    { value: 'number', label: 'Numérico' },
    { value: 'email', label: 'Email' },
    { value: 'date', label: 'Fecha' },
    { value: 'time', label: 'Hora' },                    // ✅ Nuevo
    { value: 'phone', label: 'Teléfono' },               // ✅ Nuevo
    { value: 'coordinates', label: 'Coordenadas' },      // ✅ Nuevo
    { value: 'textarea', label: 'Área de Texto' },
    { value: 'select', label: 'Select' },
    { value: 'radio', label: 'Radio Button' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'camera', label: 'Cámara (Foto)' },
    { value: 'heading', label: 'Título / Párrafo' },     // ✅ Nuevo
  ];

  constructor(
    private stateService: FormBuilderStateService,
    private catalogService: CatalogService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['element'] && !changes['element'].firstChange) {
      this.resetState();
      this.initializeFromElement();
    }
  }

  private resetState(): void {
    this.enableSpecificOptions = false;
    this.manualOptions = [];
    this.manualOptionCounter = 0;
    this.catalogOptions = [];
    this.isCascadeEnabled = false;
    this.cascadeTriggerFieldId = '';
    this.cascadeTriggerFieldLabel = '';
    this.selectedCascadeFilterKey = '';
    this.cascadeConfig = null;
    this.availableCascadeFilterKeys = [];
    this.newOptionText = '';
  }

  private initializeFromElement(): void {
    if (!this.isElement()) return;
    const element = this.asElement();

    // ✅ Restaurar opciones manuales
    if (!element.catalogType && element.selectedOptions?.length > 0) {
      const firstOption = element.selectedOptions[0];
      if (typeof firstOption === 'object' && 'id' in firstOption && 'nombre' in firstOption) {
        this.manualOptions = [...element.selectedOptions] as ManualOption[];
        this.manualOptionCounter = this.manualOptions.length;
      }
    }

    // ✅ Restaurar catálogo y opciones específicas
    if (element.catalogType) {
      this.enableSpecificOptions = (element as any).enableSpecificOptions === true;
      this.loadAvailableFilterKeys(element.catalogType);

      if (this.enableSpecificOptions) {
        this.loadCatalogOptions(element.catalogType);
      }
    }

    // ✅ Restaurar cascada
    if ((element as any).cascadeConfig) {
      this.cascadeConfig = (element as any).cascadeConfig;
      this.isCascadeEnabled = this.cascadeConfig.enabled;
      this.cascadeTriggerFieldId = this.cascadeConfig.triggerFieldId;
      this.cascadeTriggerFieldLabel = this.cascadeConfig.triggerFieldLabel;
      this.selectedCascadeFilterKey = this.cascadeConfig.filterKey;
    }

    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.catalogService.getAvailableCatalogs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (catalogs) => {
          this.availableCatalogs = catalogs;
          this.cdr.markForCheck();
        }
      });

    // ✅ Inicializar desde el elemento actual
    this.initializeFromElement();

    this.stateService.formDefinition$
      .pipe(debounceTime(100), takeUntil(this.destroy$))
      .subscribe(form => {
        this.updateNumericFields(form);
        this.updateSelectFields(form);
      });
  }

  /**
   * Actualiza el array de campos numéricos disponibles
   */
  updateNumericFields(form: any): void {
    if (!form) return;

    const allElements = form.regions.flatMap((r: any) => r.elements);

    this.allNumericFields = allElements.filter((el: FormElement) =>
      el.type === 'number' &&
      el.id !== (this.isElement() ? this.asElement().id : '')
    );
  }

  /**
   * Actualiza el array de campos select disponibles
   */
  updateSelectFields(form: any): void {
    if (!form) return;

    const allElements = form.regions.flatMap((r: any) => r.elements);

    this.allSelectFields = allElements.filter((el: FormElement) =>
      (el.type === 'select' || el.type === 'radio' || el.type === 'checkbox') &&
      el.id !== (this.isElement() ? this.asElement().id : '')
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isElement(): boolean {
    return this.elementType === 'element';
  }

  isRegion(): boolean {
    return this.elementType === 'region';
  }

  asElement(): FormElement {
    return this.element as FormElement;
  }

  asRegion(): FormRegion {
    return this.element as FormRegion;
  }

  showOptionsSelector(): boolean {
    if (!this.isElement()) return false;
    const el = this.asElement();
    return ['select', 'radio', 'checkbox'].includes(el.type);
  }
  isHeadingType(): boolean {
    if (!this.isElement()) return false;
    return this.asElement().type === 'heading';
  }

  showMultipleSelection(): boolean {
    if (!this.isElement()) return false;
    const el = this.asElement();
    return el.type === 'checkbox';
  }

  showPlaceholder(): boolean {
    if (!this.isElement()) return false;
    const type = this.asElement().type;
    return !['camera', 'heading', 'coordinates'].includes(type);
  }

  showEnableSpecificOptionsSection(): boolean {
    if (!this.isElement()) return false;
    const el = this.asElement();
    return el.catalogType !== null && el.catalogType !== undefined && el.catalogType !== '';
  }

  showCatalogOptionsSelection(): boolean {
    return this.showEnableSpecificOptionsSection() && this.enableSpecificOptions;
  }

  showManualOptionsSection(): boolean {
    if (!this.isElement()) return false;
    const el = this.asElement();
    return !el.catalogType || el.catalogType === null || el.catalogType === '';
  }

  /**
   * Mostrar sección de cascada solo si hay catálogo y tiene filterKeys disponibles
   */
  showCascadeSection(): boolean {
    if (!this.isElement()) return false;
    const el = this.asElement();
    return el.catalogType !== null && el.catalogType !== undefined &&
      this.availableCascadeFilterKeys.length > 0;
  }

  // ===== UPDATE METHODS =====

  updateRegionTitle(title: string): void {
    if (this.isRegion()) {
      this.stateService.updateRegionTitle(this.asRegion().id, title);
    }
  }

  updateRegionTriggerField(fieldId: string): void {
    if (!this.isRegion()) return;
    const selectedField = this.allNumericFields.find(f => f.id === fieldId);
    if (!selectedField) return;
    this.stateService.updateRegionTriggerField(
      this.asRegion().id,
      selectedField.id,
      selectedField.label
    );
  }

  updateElementProperty(property: keyof FormElement, value: any): void {
    if (!this.isElement()) return;

    const element = this.asElement();
    const updates: Partial<FormElement> = { [property]: value };

    if (property === 'type') {
      const newType = value as ElementType;
      if ((newType === 'select' || newType === 'radio' || newType === 'checkbox')) {
        updates.selectedOptions = [];
        updates.catalogType = null;
        this.enableSpecificOptions = false;
        this.manualOptions = [];
        this.catalogOptions = [];
        this.isCascadeEnabled = false;
        this.availableCascadeFilterKeys = [];
      }
    }

    this.stateService.updateElement(element.id, updates);
    this.updateNumericFields(this.stateService.formDefinition);
    this.updateSelectFields(this.stateService.formDefinition);
  }

  // ===== CATALOG METHODS =====

  // Método onCatalogChange ACTUALIZADO - Solución 1

  onCatalogChange(catalogId: string): void {
    if (!this.isElement()) return;

    const element = this.asElement();

    if (catalogId) {
      console.log(`📂 Catálogo seleccionado: ${catalogId}`);

      // Resetear opciones y cascadas
      this.enableSpecificOptions = false;
      this.catalogOptions = [];
      this.manualOptions = [];
      this.isCascadeEnabled = false;
      this.cascadeTriggerFieldId = '';
      this.availableCascadeFilterKeys = [];

      // Cargar filter keys PRIMERO
      this.loadAvailableFilterKeys(catalogId);

      // Luego actualizar estado
      this.stateService.updateElement(element.id, {
        catalogType: catalogId,
        selectedOptions: [],
        enableSpecificOptions: false,
        cascadeConfig: null,
        options: []  // ✅ AGREGAR ESTO
      });

      this.cdr.markForCheck();
    } else {
      // ...resto del código...
      this.stateService.updateElement(element.id, {
        catalogType: null,
        selectedOptions: [],
        enableSpecificOptions: undefined,
        cascadeConfig: null,
        options: []  // ✅ AGREGAR ESTO
      });

      this.cdr.markForCheck();
    }
  }

  onCascadeTriggerChange(fieldId: string): void {
    const triggerField = this.allSelectFields.find(f => f.id === fieldId);

    if (triggerField && this.isElement()) {
      this.cascadeTriggerFieldLabel = triggerField.label;
      this.cascadeTriggerFieldId = fieldId;

      console.log(`✅ Campo disparador seleccionado: ${triggerField.label}`);

      // Cargar el filterKey automáticamente desde metadata
      this.loadAndSaveFilterKeyAutomatically();

      this.cdr.markForCheck();
    }
  }
  /**
   * Cargar los filter keys disponibles para un catálogo desde metadata
   */
  loadAvailableFilterKeys(catalogId: string): void {
    this.catalogService.getCatalogMetadata(catalogId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (metadata) => {
          if (metadata && metadata.filterFields) {
            this.availableCascadeFilterKeys = metadata.filterFields;
            console.log(`✅ Filter keys disponibles para ${catalogId}:`, this.availableCascadeFilterKeys);
          } else {
            this.availableCascadeFilterKeys = [];
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error(`❌ Error cargando metadata para ${catalogId}:`, error);
          this.availableCascadeFilterKeys = [];
          this.cdr.markForCheck();
        }
      });
  }

  loadCatalogOptions(catalogId: string): void {
    this.loadingCatalog = true;
    this.catalogService.getCatalogData(Number(catalogId)).subscribe({
      next: ((response: any) => {
        console.log(response);
        this.catalogOptions = response.map((res: any) => ({
          value: res.id,
          label: res.nombre
        }));
        this.loadingCatalog = false;
        this.cdr.markForCheck();
      }),
      error: (error => {
        console.log("Error", error);

      })
    })
    // this.catalogService.getCatalogOptions(Number(catalogId))
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe({
    //     next: (options) => {
    //       this.catalogOptions = options;
    //       this.loadingCatalog = false;
    //       this.cdr.markForCheck();
    //       console.log(`✅ Opciones cargadas para ${catalogId}:`, options);

    //       if (this.isElement()) {
    //         // ❌ QUITAR ESTO - No guardes options en el JSON
    //         // const optionLabels = options.map(opt => opt.label);
    //         // this.stateService.updateElement(this.asElement().id, {
    //         //   options: optionLabels,
    //         //   selectedOptions: optionLabels
    //         // });

    //         // ✅ DEJAR SOLO ESTO:
    //         this.stateService.updateElement(this.asElement().id, {
    //           options: []  // Dejar vacío
    //         });
    //       }
    //     },
    //     error: (error) => {
    //       console.error(`❌ Error cargando catálogo ${catalogId}:`, error);
    //       this.loadingCatalog = false;
    //       this.catalogOptions = [];
    //       this.cdr.markForCheck();
    //     }
    //   });
  }

  toggleEnableSpecificOptions(): void {
    if (!this.isElement()) return;

    this.enableSpecificOptions = !this.enableSpecificOptions;

    if (this.enableSpecificOptions) {
      const catalogId = this.asElement().catalogType;
      if (catalogId) {
        this.loadCatalogOptions(catalogId);
      }
    } else {
      this.catalogOptions = [];
    }

    const element = this.asElement();
    this.stateService.updateElement(element.id, {
      enableSpecificOptions: this.enableSpecificOptions,
      selectedOptions: this.enableSpecificOptions ? [] : []
    });

    this.cdr.markForCheck();
    console.log(`🔄 Opciones específicas ${this.enableSpecificOptions ? 'habilitadas' : 'deshabilitadas'}`);
  }

  toggleCatalogOption(optionId: string | number, checked: boolean): void {
    if (!this.isElement()) return;

    const element = this.asElement();
    let selectedOptions = [...(element.selectedOptions || [])];
    const optionIdStr = String(optionId);

    if (checked) {
      if (!selectedOptions.includes(optionIdStr)) {
        selectedOptions.push(optionIdStr);
      }
    } else {
      selectedOptions = selectedOptions.filter(opt => opt !== optionIdStr);
    }

    this.stateService.updateElement(element.id, { selectedOptions });
    this.cdr.markForCheck();
    console.log('✅ Opción de catálogo seleccionada:', selectedOptions);
  }

  isCatalogOptionSelected(optionId: string | number): boolean {
    if (!this.isElement()) return false;
    const selectedOptions = this.asElement().selectedOptions || [];
    return selectedOptions.includes(String(optionId));
  }

  toggleAllCatalogOptions(): void {
    if (!this.isElement()) return;

    const element = this.asElement();
    const allIds = this.catalogOptions.map(opt => String(opt.value));

    const currentSelected = element.selectedOptions || [];
    let selectedOptions: any[] = [];

    if (currentSelected.length === allIds.length) {
      selectedOptions = [];
    } else {
      selectedOptions = allIds;
    }

    this.stateService.updateElement(element.id, { selectedOptions });
    this.cdr.markForCheck();
    console.log('✅ Todas las opciones del catálogo:', selectedOptions);
  }

  // ===== CASCADE METHODS =====

  /**
   * Cuando el usuario selecciona el campo que dispara la cascada
   */
  toggleCascadeEnabled(enabled: boolean): void {
    this.isCascadeEnabled = enabled;

    if (!enabled) {
      this.disableCascade();
    }
  }
  loadAndSaveFilterKeyAutomatically(): void {
    if (!this.isElement()) return;

    const element = this.asElement();
    const catalogId = element.catalogType;

    if (!catalogId) return;

    // Cargar metadata
    this.catalogService.getCatalogMetadata(catalogId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (metadata) => {
          if (metadata && metadata.filterFields && metadata.filterFields.length > 0) {
            // Tomar el primer filterField automáticamente
            this.selectedCascadeFilterKey = metadata.filterFields[0];

            console.log(`✅ FilterKey asignado automáticamente: ${this.selectedCascadeFilterKey}`);

            // Guardar la cascada automáticamente
            this.saveCascadeConfigAutomatically();
          } else {
            console.warn(`⚠️ No hay filterFields disponibles para ${catalogId}`);
            this.selectedCascadeFilterKey = '';
          }

          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error(`❌ Error cargando metadata:`, error);
          this.cdr.markForCheck();
        }
      });
  }

  saveCascadeConfigAutomatically(): void {
    if (!this.isElement() || !this.cascadeTriggerFieldId || !this.selectedCascadeFilterKey) {
      console.warn('⚠️ Faltan datos para guardar cascada automáticamente');
      return;
    }

    const element = this.asElement();
    const cascadeConfig = {
      enabled: true,
      triggerFieldId: this.cascadeTriggerFieldId,
      triggerFieldLabel: this.cascadeTriggerFieldLabel,
      filterKey: this.selectedCascadeFilterKey
    };

    this.stateService.updateElement(element.id, {
      cascadeConfig: cascadeConfig as any
    });

    console.log('✅ Cascada guardada automáticamente:', cascadeConfig);
    this.cdr.markForCheck();
  }

  /**
   * Cuando el usuario selecciona el campo para filtrar
   */
  onCascadeFilterKeyChange(filterKey: string): void {
    this.selectedCascadeFilterKey = filterKey;
    console.log(`✅ Filter key seleccionado: ${filterKey}`);
  }

  /**
   * Guardar la configuración de cascada
   */
  saveCascadeConfig(): void {
    if (!this.isElement() || !this.cascadeTriggerFieldId || !this.selectedCascadeFilterKey.trim()) {
      alert('Por favor completa todos los campos de cascada');
      return;
    }

    const element = this.asElement();
    const cascadeConfig = {
      enabled: true,
      triggerFieldId: this.cascadeTriggerFieldId,
      triggerFieldLabel: this.cascadeTriggerFieldLabel,
      filterKey: this.selectedCascadeFilterKey.trim()
    };

    this.stateService.updateElement(element.id, {
      cascadeConfig: cascadeConfig as any
    });

    this.cdr.markForCheck();
    console.log('✅ Cascada configurada:', cascadeConfig);
    alert('✅ Cascada guardada correctamente');
  }

  /**
   * Desabilitar cascada
   */
  disableCascade(): void {
    if (!this.isElement()) return;

    this.cascadeTriggerFieldId = '';
    this.cascadeTriggerFieldLabel = '';
    this.selectedCascadeFilterKey = '';

    const element = this.asElement();
    this.stateService.updateElement(element.id, {
      cascadeConfig: null
    });

    this.cdr.markForCheck();
    console.log('🗑️ Cascada deshabilitada');
  }

  // ===== MANUAL OPTIONS METHODS =====

  addManualOption(): void {
    if (!this.isElement() || !this.newOptionText.trim()) return;

    const element = this.asElement();
    const newOption: ManualOption = {
      id: this.manualOptionCounter++,
      nombre: this.newOptionText.trim()
    };

    this.manualOptions.push(newOption);

    this.stateService.updateElement(element.id, {
      selectedOptions: this.manualOptions as any
    });

    this.newOptionText = '';
    this.cdr.markForCheck();
    console.log('✅ Opción manual agregada:', newOption);
  }

  removeManualOption(optionId: string | number): void {
    if (!this.isElement()) return;

    const element = this.asElement();
    this.manualOptions = this.manualOptions.filter(opt => opt.id !== optionId);

    this.stateService.updateElement(element.id, {
      selectedOptions: this.manualOptions as any
    });

    this.cdr.markForCheck();
    console.log('🗑️ Opción manual eliminada:', optionId);
  }

  editManualOption(optionId: string | number, newName: string): void {
    if (!this.isElement() || !newName.trim()) return;

    const element = this.asElement();
    const option = this.manualOptions.find(opt => opt.id === optionId);

    if (option) {
      option.nombre = newName.trim();

      this.stateService.updateElement(element.id, {
        selectedOptions: this.manualOptions as any
      });

      this.cdr.markForCheck();
      console.log('✏️ Opción manual editada:', option);
    }
  }
  // Obtener selects disponibles (excluir el actual)
  getSelectFieldsForCascade(): FormElement[] {
    return this.allSelectFields.filter(f => f.id !== this.asElement().id);
  }

  updateHelpText(helpText: string): void {
    if (!this.isElement()) return;

    const element = this.asElement();
    this.stateService.updateElement(element.id, {
      helpText: helpText.trim() || undefined
    });

    console.log('✅ Help text actualizado:', helpText);
  }
}