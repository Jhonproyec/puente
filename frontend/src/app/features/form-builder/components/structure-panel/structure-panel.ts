import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';
import { FormBuilderStateService } from '../../../../core/services/form-builder-state.service';
import { FormDefinition, FormElement, FormRegion, ViewMode } from '../../../../core/models/form-builder.model';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-structure-panel',
  standalone: true,
  imports: [CommonModule, DragDropModule, MatIconModule],
  templateUrl: './structure-panel.html',
  styleUrl: './structure-panel.css'
})
export class StructurePanel implements OnInit, OnDestroy {

  @Input() currentView: ViewMode = 'structure';
  @Output() viewChange = new EventEmitter<ViewMode>();

  private destroy$ = new Subject<void>();

  formDefinition: FormDefinition | null = null;
  selectedRegionId: string | null = null;
  selectedElementId: string | null = null;

  constructor(public stateService: FormBuilderStateService) { }

  ngOnInit(): void {
    this.stateService.formDefinition$
      .pipe(takeUntil(this.destroy$))
      .subscribe(f => {
        this.formDefinition = f;
      });

    this.stateService.selectedRegion$
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => this.selectedRegionId = id);

    this.stateService.selectedElement$
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => this.selectedElementId = id);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // =================== VIEW ===================

  onChangeView(view: ViewMode): void {
    this.viewChange.emit(view);
  }

  // =================== CRUD ===================

  onAddRegion(): void {
    const region = this.stateService.addRegion();
    this.stateService.selectRegion(region.id);
  }

  onAddElement(): void {
    const element = this.stateService.addElement();
    if (!element) {
      alert('Primero crea una región');
    }
  }

  onSelectRegion(regionId: string): void {
    this.stateService.selectRegion(regionId);
  }

  onSelectElement(elementId: string, regionId: string): void {
    this.stateService.selectElement(elementId, regionId);
  }

  onDeleteRegion(regionId: string): void {
    if (confirm('¿Eliminar región?')) {
      this.stateService.deleteRegion(regionId);
    }
  }

  onDeleteElement(elementId: string): void {
    if (confirm('¿Eliminar campo?')) {
      this.stateService.deleteElement(elementId);
    }
  }
  onDeleteElementSafe(element: FormElement): void {
    if (this.isPersonIdentifier(element)) return;
    this.onDeleteElement(element.id);
  }

  // =================== PROPERTIES / ACTIONS ===================

  onOpenProperties(targetId: string, targetType: 'element' | 'region', regionId?: string): void {
    if (targetType === 'element' && regionId) {
      this.stateService.selectElement(targetId, regionId);
    } else {
      this.stateService.selectRegion(targetId);
    }
    this.stateService.setPanelMode('properties');
  }

  onOpenActions(targetId: string, targetType: 'element' | 'region', regionId?: string): void {
    if (targetType === 'element' && regionId) {
      this.stateService.selectElement(targetId, regionId);
    } else {
      this.stateService.selectRegion(targetId);
    }
    this.stateService.setPanelMode('actions');
  }

  onOpenValidations(elementId: string, regionId: string): void {
    this.stateService.selectElement(elementId, regionId);
    this.stateService.setPanelMode('validations');
  }

  onOpenFormulas(elementId: string, regionId: string): void {
    this.stateService.selectElement(elementId, regionId);
    this.stateService.setPanelMode('formulas');
  }

  addSurveyField(): void {
    const newField = this.stateService.addSurveyField();
    if (newField) {
      this.stateService.selectElement(newField.id, this.stateService.selectedRegion || '');
      this.stateService.setPanelMode('properties');
    }
  }

  // =================== SELECTION CHECKS ===================

  isElementSelected(elementId: string): boolean {
    return this.selectedElementId === elementId;
  }

  isRegionSelected(regionId: string): boolean {
    return this.selectedRegionId === regionId;
  }

  hasActions(item: FormRegion | FormElement): boolean {
    return item.actions && item.actions.length > 0;
  }

  hasValidations(element: FormElement): boolean {
    return element.validations && element.validations.length > 0;
  }

  // =================== DRAG & DROP ===================

  dropRegion(event: CdkDragDrop<FormRegion[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    moveItemInArray(
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );

    // 🔑 Actualizar el estado
    this.stateService.updateFormDefinition({ ...this.formDefinition! });
  }

  dropElement(event: CdkDragDrop<FormElement[]>): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    // 🔑 Actualizar el estado
    this.stateService.updateFormDefinition({ ...this.formDefinition! });
  }

  // =================== ACTIONS & VALIDATIONS VIEW ===================

  getAllActions(): Array<{ region?: FormRegion; element?: FormElement; actions: any[] }> {
    if (!this.formDefinition) return [];

    const result: Array<{ region?: FormRegion; element?: FormElement; actions: any[] }> = [];

    this.formDefinition.regions.forEach(region => {
      if (region.actions && region.actions.length > 0) {
        result.push({ region, actions: region.actions });
      }

      region.elements.forEach(element => {
        if (element.actions && element.actions.length > 0) {
          result.push({ element, actions: element.actions });
        }
      });
    });

    return result;
  }

  getAllValidations(): Array<{ element: FormElement; validations: any[] }> {
    if (!this.formDefinition) return [];

    const result: Array<{ element: FormElement; validations: any[] }> = [];

    this.formDefinition.regions.forEach(region => {
      region.elements.forEach(element => {
        if (element.validations && element.validations.length > 0) {
          result.push({ element, validations: element.validations });
        }
      });
    });

    return result;
  }

  getActionDescription(action: any): string {
    const descriptions: Record<string, string> = {
      'show_if_equals': `Mostrar si ${action.triggerLabel} es igual a "${action.value}"`,
      'show_if_not_equals': `Mostrar si ${action.triggerLabel} es diferente de "${action.value}"`,
      'show_if_filled': `Mostrar si ${action.triggerLabel} tiene valor`,
      'show_if_empty': `Mostrar si ${action.triggerLabel} está vacío`,
      'show_if_greater': `Mostrar si ${action.triggerLabel} es mayor que ${action.value}`,
      'show_if_less': `Mostrar si ${action.triggerLabel} es menor que ${action.value}`,
      'hide_if_equals': `Ocultar si ${action.triggerLabel} es igual a "${action.value}"`,
      'hide_if_not_equals': `Ocultar si ${action.triggerLabel} es diferente de "${action.value}"`
    };
    return descriptions[action.type] || 'Acción desconocida';
  }

  getValidationDescription(validation: any): string {
    const descriptions: Record<string, string> = {
      'min_length': `Mínimo ${validation.value} caracteres`,
      'max_length': `Máximo ${validation.value} caracteres`,
      'pattern': `Patrón: ${validation.value}`,
      'no_special_chars': `Sin caracteres especiales`,
      'only_letters': `Solo letras`,
      'only_numbers': `Solo números`,
      'min_value': `Valor mínimo: ${validation.value}`,
      'max_value': `Valor máximo: ${validation.value}`,
      'integer_only': `Solo números enteros`,
      'positive_only': `Solo números positivos`,
      'email_format': `Formato de email válido`,
      'email_domain': `Dominio: ${validation.value}`,
      'min_date': `Fecha mínima: ${validation.value}`,
      'max_date': `Fecha máxima: ${validation.value}`,
      'date_today': `Fecha máxima: hoy`,
      'date_future': `Solo fechas futuras`,
      'date_past': `Solo fechas pasadas`,
      'age_min': `Edad mínima: ${validation.value} años`,
      'age_max': `Edad máxima: ${validation.value} años`,
      'min_selections': `Mínimo ${validation.value} opciones`,
      'max_selections': `Máximo ${validation.value} opciones`,
      'max_file_size': `Máximo ${validation.value} MB`,
      'image_dimensions': `Dimensiones mínimas: ${validation.value}`
    };
    return descriptions[validation.type] || 'Validación desconocida';
  }


  onAddPersonRegion(): void {
    if (!this.stateService.formDefinition) return;

    const regionId = `region_persona_${Date.now()}`;
    const cuiId = `persona_cui_${Date.now()}_0`;
    const esHijoId = `persona_es_hijo_${Date.now()}_1`;
    const cuiMadreId = `persona_cui_madre_${Date.now()}_2`;

    const personRegion: FormRegion = {
      id: regionId,
      type: 'region',
      regionType: 'persona',          // ✅ Identificador interno
      title: 'Datos de la Persona',
      actions: [],
      validations: [],
      repeatConfig: '',
      elements: [
        {
          id: cuiId,
          type: 'number',
          label: 'CUI',
          placeholder: 'Ingrese el CUI',
          required: true,
          fieldRole: 'cui',
          isPersonIdentifier: true,
          multipleSelecction: false,
          options: [],
          selectedOptions: [],
          catalogType: null,
          actions: [],
          validations: [
            { type: 'min_length', value: '13', message: 'El CUI debe tener al menos 13 dígitos' },
            { type: 'max_length', value: '15', message: 'El CUI debe tener al menos 13 dígitos' },
            { type: 'only_numbers', value: '', message: 'El CUI solo debe contener números' }
          ],
          formulas: []
        },
        {
          id: `persona_nombres_${Date.now()}_3`,
          type: 'text',
          label: 'Nombres',
          placeholder: 'Ingrese los nombres',
          required: true,
          fieldRole: 'nombres',
          multipleSelecction: false,
          options: [],
          selectedOptions: [],
          catalogType: null,
          actions: [],
          validations: [],
          formulas: []
        },
        {
          id: `persona_apellidos_${Date.now()}_4`,
          type: 'text',
          label: 'Apellidos',
          placeholder: 'Ingrese los apellidos',
          required: true,
          fieldRole: 'apellidos',
          multipleSelecction: false,
          options: [],
          selectedOptions: [],
          catalogType: null,
          actions: [],
          validations: [],
          formulas: []
        },
        {
          id: `persona_fecha_nac_${Date.now()}_5`,
          type: 'date',
          label: 'Fecha de Nacimiento',
          placeholder: '',
          required: true,
          fieldRole: 'fecha_nacimiento',
          multipleSelecction: false,
          options: [],
          selectedOptions: [],
          catalogType: null,
          actions: [],
          validations: [],
          formulas: []
        },
        {
          id: `persona_direccion_${Date.now()}_6`,
          type: 'text',
          label: 'Dirección',
          placeholder: 'Ingrese la dirección',
          required: false,
          fieldRole: 'direccion',
          multipleSelecction: false,
          options: [],
          selectedOptions: [],
          catalogType: null,
          actions: [],
          validations: [],
          formulas: []
        },
        {
          id: `persona_sexo_${Date.now()}_7`,
          type: 'select',
          label: 'Sexo',
          placeholder: '',
          required: true,
          fieldRole: 'sexo',
          multipleSelecction: false,
          options: [],
          selectedOptions: [
            { id: 1, nombre: 'Masculino' },
            { id: 2, nombre: 'Femenino' }
          ],
          catalogType: null,
          actions: [],
          validations: [],
          formulas: []
        },
        {
          id: `persona_fecha_programa_${Date.now()}_8`,
          type: 'date',
          label: 'Fecha de ingreso al programa',
          placeholder: '',
          required: true,
          fieldRole: 'fecha_ingreso_programa',
          multipleSelecction: false,
          options: [],
          selectedOptions: [],
          catalogType: null,
          actions: [],
          validations: [],
          formulas: []
        },
        {
          id: esHijoId,
          type: 'select',
          label: '¿Es hijo/a?',
          placeholder: '',
          required: true,
          fieldRole: 'es_hijo',
          multipleSelecction: false,
          options: [],
          selectedOptions: [
            "23",
            "24"
          ],
          catalogType: "6",
          actions: [],
          validations: [],
          formulas: []
        },
        {
          id: cuiMadreId,
          type: 'number',
          label: 'CUI de la Madre',
          placeholder: 'Ingrese el CUI de la madre',
          required: true,
          fieldRole: 'cui_madre',
          multipleSelecction: false,
          options: [],
          selectedOptions: [],
          catalogType: null,
          actions: [
            {
              name: 'Mostrar si es hijo',
              triggerField: esHijoId,
              triggerLabel: '¿Es hijo/a?',
              type: "show_if_equals",
              value: '23',
              betweenType: "number",
            }
          ],
          validations: [
            { type: 'min_length', value: '13', message: 'El CUI de la madre debe tener al menos 13 dígitos' },
            { type: 'max_length', value: '15', message: 'El CUI de la madre debe tener al menos 13 o 15 dígitos' },
            { type: 'only_numbers', value: '', message: 'El CUI solo debe contener números' }
          ],
          formulas: []
        },
        // {
        //   id: `persona_nombres_madre_${Date.now()}_9`,
        //   type: 'text',
        //   label: 'Nombres de la Madre',
        //   placeholder: 'Ingrese los nombres de la madre',
        //   required: false,
        //   fieldRole: 'nombres_madre',
        //   multipleSelecction: false,
        //   options: [],
        //   selectedOptions: [],
        //   catalogType: null,
        //   actions: [
        //     {
        //       name: 'Mostrar si es hijo',
        //       triggerField: esHijoId,
        //       triggerLabel: '¿Es hijo/a?',
        //       type: "show_if_equals",
        //       value: '23',
        //       betweenType: "number",
        //     }
        //   ],
        //   validations: [],
        //   formulas: []
        // },
        // {
        //   id: `persona_apellidos_madre_${Date.now()}_10`,
        //   type: 'text',
        //   label: 'Apellidos de la Madre',
        //   placeholder: 'Ingrese los apellidos de la madre',
        //   required: false,
        //   fieldRole: 'apellidos_madre',
        //   multipleSelecction: false,
        //   options: [],
        //   selectedOptions: [],
        //   catalogType: null,
        //   actions: [
        //     {
        //       name: 'Mostrar si es hijo',
        //       triggerField: esHijoId,
        //       triggerLabel: '¿Es hijo/a?',
        //       type: "show_if_equals",
        //       value: '23',
        //       betweenType: "number",
        //     }
        //   ],
        //   validations: [],
        //   formulas: []
        // }
      ]
    };

    // ✅ Agregar al formDefinition
    this.stateService.formDefinition.regions.push(personRegion);
    this.stateService.updateFormDefinition({ ...this.stateService.formDefinition });
    this.stateService.selectRegion(regionId);
  }

  isPersonIdentifier(element: FormElement): boolean {
    return (element as any).isPersonIdentifier === true;
  }

  isPersonRegion(region: FormRegion): boolean {
    return (region as any).regionType === 'persona';
  }

  expandedRegions: Set<string> = new Set();

  toggleRegion(regionId: string): void {
    if (this.expandedRegions.has(regionId)) {
      this.expandedRegions.delete(regionId);
    } else {
      this.expandedRegions.add(regionId);
    }
  }

  isRegionExpanded(regionId: string): boolean {
    return this.expandedRegions.has(regionId);
  }
}