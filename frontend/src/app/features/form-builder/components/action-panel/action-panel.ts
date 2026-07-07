import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { ActionType, DynamicAction, FormElement, FormRegion } from '../../../../core/models/form-builder.model';
import { FormBuilderStateService } from '../../../../core/services/form-builder-state.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { lastValueFrom, map } from 'rxjs';
import { ExpressionEditor, ExpressionOutput } from '../expression-editor/expression-editor';

@Component({
  selector: 'app-action-panel',
  imports: [CommonModule, FormsModule, ExpressionEditor],
  templateUrl: './action-panel.html',
  styleUrl: './action-panel.css'
})
export class ActionPanel implements OnInit {
  selectedCatalogBetweenOptions: (string | number)[] = [];

  @Input() target!: FormElement | FormRegion;
  @Input() targetType!: 'element' | 'region' | null;
  @Output() backToProperties = new EventEmitter<void>();

  private catalogService = inject(CatalogService);
  formulaMode = signal<'predefinida' | 'personalizada'>('predefinida');
  surveyOptionsMap: { [fieldId: string]: { value: string | number; label: string }[] } = {};


  allElements: FormElement[] = [];
  allNumericFields: FormElement[] = [];
  triggerFieldOptions = signal<{ value: string | number; label: string }[]>([]);

  // ✅ Acción predefinida
  newAction = {
    name: '',
    triggerField: '',
    operator: 'equals' as string,
    visibility: 'show' as 'show' | 'hide',
    value: '',
    betweenType: 'number' as 'number' | 'date' | 'catalog',
    valueEnd: ''
  };

  // ✅ Acción personalizada
  customActionName = '';
  customActionVisibility: 'show' | 'hide' = 'show';
  currentExpression: ExpressionOutput = {
    expression: '', displayExpression: '', sourceFields: [], isValid: false
  };

  actionTypes = [
    { value: 'equals', label: 'Igual a' },
    { value: 'not_equals', label: 'Diferente de' },
    { value: 'greater', label: 'Mayor que' },
    { value: 'less', label: 'Menor que' },
    { value: 'greater_equal', label: 'Mayor o igual que' },
    { value: 'less_equal', label: 'Menor o igual que' },
    { value: 'filled', label: 'Está lleno' },
    { value: 'empty', label: 'Está vacío' },
    { value: 'between', label: 'Entre' },
    { value: 'any_of', label: 'Alguna de las opciones' },
    { value: 'all_of', label: 'Todas las opciones' },
  ];
  editingIndex: number | null = null;
  selectedMultiValues: (string | number)[] = [];

  constructor(private stateService: FormBuilderStateService) { }

  ngOnInit(): void {
    const allElements = this.stateService.getAllElements();

    this.allElements = allElements.filter(el => {
      if (el.id === this.target.id) return false;
      if (['select', 'radio', 'checkbox'].includes(el.type)) return true;
      if (el.type === 'survey' && el.surveyConfig?.mode === 'catalog_question') return true;
      if (['number', 'text', 'date', 'email'].includes(el.type)) return true;
      return false;
    });

    this.allNumericFields = allElements.filter(el =>
      el.type === 'number' || el.type === 'rating' ||
      el.type === 'date' || el.type === 'survey'
    );

    this.loadSurveyOptions(allElements);
  }

  private loadSurveyOptions(allElements: FormElement[]): void {
    allElements
      .filter(el => el.type === 'survey' && el.id)
      .forEach(el => {
        // if (el.surveyConfig?.surveySource === 'manual' && el.surveyConfig.responses?.length) {
        //   this.surveyOptionsMap[el.id] = el.surveyConfig.responses.map(r => ({
        //     value: r.value,
        //     label: r.label
        //   }));
        //   return;
        // }
        if (el.surveyConfig?.mode === 'catalog_question' && el.surveyConfig?.catalogType) {
          this.catalogService.getCatalogData(Number(el.surveyConfig.catalogType)).pipe(
            map(items => items.map(item => ({ value: item.id, label: item.nombre })))
          ).subscribe({
            next: (options) => {
              const configuredIds = el.surveyConfig?.catalogSelectedIds || [];
              this.surveyOptionsMap[el.id] = configuredIds.length > 0
                ? options.filter(o => configuredIds.includes(String(o.value)))
                : options;
            },
            error: (err) => console.error('Error cargando opciones survey:', err)
          });
        }
      });
  }
  onBackToProperties(): void { this.backToProperties.emit(); }

  getTargetLabel(): string {
    if (this.targetType === 'region') return `Región: ${(this.target as FormRegion).title}`;
    return `Campo: ${(this.target as FormElement).label}`;
  }

  isMultiValueType(): boolean {
    return ['any_of', 'all_of'].includes(this.newAction.operator);
  }
  needsValue(): boolean {
    return !['filled', 'empty'].includes(this.newAction.operator);
  }
  isBetweenType(): boolean { return this.newAction.operator === 'between'; }

  getInputType(): string {
    if (this.newAction.operator === 'between' && this.newAction.betweenType === 'date') return 'date';
    if (this.newAction.operator === 'between' && this.newAction.betweenType === 'number') return 'number';
    return 'text';
  }

  mapOperatorToActionType(): ActionType {
    const prefix = this.newAction.visibility === 'hide' ? 'hide_if_' : 'show_if_';
    return (prefix + this.newAction.operator) as ActionType;
  }

  selectedTriggerElement: FormElement | null = null;
  async onTriggerFieldChange(field: FormElement | null) {
    if (!field) { this.triggerFieldOptions.set([]); return; }
    const options = await this.getTriggerFieldOptionsAsync(field);
    this.triggerFieldOptions.set(options);
  }

  private async getTriggerFieldOptionsAsync(field: FormElement): Promise<{ value: string | number; label: string }[]> {
    if (field.type === 'survey' && field.surveyConfig?.catalogType) {
      try {
        return await lastValueFrom(
          this.catalogService.getCatalogData(Number(field.surveyConfig.catalogType)).pipe(
            map(items => items.map(item => ({ value: item.id, label: item.nombre })))
          ), { defaultValue: [] }
        );
      } catch { return []; }
    }

    if (!['select', 'radio', 'checkbox'].includes(field.type)) return [];

    if (field.selectedOptions?.length > 0) {
      const first = field.selectedOptions[0];
      if (typeof first === 'object' && 'nombre' in first) {
        return field.selectedOptions.map(opt => ({ value: (opt as any).id, label: (opt as any).nombre }));
      }
      if (field.catalogType && (typeof first === 'string' || typeof first === 'number')) {
        try {
          return await lastValueFrom(
            this.catalogService.getCatalogOptionsFiltered(Number(field.catalogType), field.selectedOptions as (string | number)[])
          );
        } catch { return []; }
      }
    }

    if (field.catalogType) {
      try {
        return await lastValueFrom(
          this.catalogService.getCatalogData(Number(field.catalogType)).pipe(
            map(items => items.map(item => ({ value: item.id, label: item.nombre })))
          ), { defaultValue: [] }
        );
      } catch { return []; }
    }
    return [];
  }

  //Acción predefinida
  addAction(): void {
    if (!this.selectedTriggerElement) { alert('Selecciona un campo'); return; }
    this.newAction.triggerField = this.selectedTriggerElement.id;

    if (this.needsValue() && !this.isBetweenType() && !this.isMultiValueType() && !this.newAction.value) {
      alert('Ingresa un valor de comparación'); return;
    }
    if (this.isMultiValueType() && this.selectedMultiValues.length === 0) {
      alert('Selecciona al menos una opción'); return;
    }

    if (this.isBetweenType()) {
      if (this.newAction.betweenType === 'catalog' && this.selectedCatalogBetweenOptions.length === 0) {
        alert('Selecciona al menos una opción del catálogo'); return;
      }
      if (this.newAction.betweenType !== 'catalog' && !this.newAction.valueEnd) {
        alert('Ingresa el valor final para "Entre"'); return;
      }
    }
    if (this.isBetweenType()) {
      if (this.newAction.betweenType === 'catalog' && this.selectedCatalogBetweenOptions.length === 0) {
        alert('Selecciona al menos una opción del catálogo'); return;
      }
      if (this.newAction.betweenType !== 'catalog' && !this.newAction.valueEnd) {
        alert('Ingresa el valor final para "Entre"'); return;
      }
    }

    const action: DynamicAction = {
      name: this.newAction.name || 'Sin nombre',
      triggerField: this.selectedTriggerElement.id,
      triggerLabel: this.selectedTriggerElement.label,
      type: this.mapOperatorToActionType(),
      value: this.isMultiValueType()
        ? JSON.stringify(this.selectedMultiValues)
        : this.newAction.betweenType === 'catalog'
          ? JSON.stringify(this.selectedCatalogBetweenOptions)
          : this.newAction.value,
      valueEnd: this.newAction.betweenType !== 'catalog' ? this.newAction.valueEnd || undefined : undefined,
      betweenType: this.newAction.betweenType
    };

    const current = [...(this.target.actions || [])];

    if (this.editingIndex !== null) {
      current[this.editingIndex] = action; // ← reemplaza
      this.editingIndex = null;
    } else {
      current.push(action);
    }

    this.saveActions(current);
    this.resetAction();
  }

  //Acción personalizada con expresión
  onExpressionChanged(data: ExpressionOutput): void {
    this.currentExpression = data;
  }

  addCustomAction(): void {
    if (!this.currentExpression.expression.trim()) { alert('Escribe una expresión'); return; }
    if (!this.currentExpression.isValid) { alert('La expresión tiene errores'); return; }

    const actionType: ActionType = this.customActionVisibility === 'show'
      ? 'show_if_custom' : 'hide_if_custom';

    const action: DynamicAction = {
      name: this.customActionName || 'Condición personalizada',
      type: actionType,
      triggerField: '',
      triggerLabel: 'Fórmula personalizada',
      value: this.currentExpression.expression,
      formulaExpression: this.currentExpression.expression,
      sourceFields: this.currentExpression.sourceFields
    };

    const current = [...(this.target.actions || [])];

    if (this.editingIndex !== null) {
      current[this.editingIndex] = action; // ← reemplaza
      this.editingIndex = null;
    } else {
      current.push(action);
    }

    this.saveActions(current);
    this.customActionName = '';
    this.customActionVisibility = 'show';
    this.currentExpression = { expression: '', displayExpression: '', sourceFields: [], isValid: false };
  }

  removeAction(index: number): void {
    this.saveActions(this.target.actions.filter((_, i) => i !== index));
  }

  private saveActions(actions: DynamicAction[]): void {
    if (this.targetType === 'region') {
      const region = this.target as FormRegion;
      const currentForm = this.stateService.formDefinition;
      const updatedRegions = this.mapRegionsRecursive(currentForm.regions, r =>
        r.id === region.id ? { ...r, actions } : r
      );
      this.stateService.updateFormDefinition({ ...currentForm, regions: updatedRegions });
    } else {
      this.stateService.updateElement((this.target as FormElement).id, { actions });
    }
  }

  private mapRegionsRecursive(
    regions: FormRegion[],
    transform: (r: FormRegion) => FormRegion
  ): FormRegion[] {
    return regions.map(region => {
      const transformed = transform(region);
      return {
        ...transformed,
        children: transformed.children.map(child =>
          this.stateService.isRegion(child)
            ? this.mapRegionsRecursive([child as FormRegion], transform)[0]
            : child
        )
      };
    });
  }

  private resetAction(): void {
    this.newAction = { name: '', triggerField: '', operator: 'equals', visibility: 'show', value: '', betweenType: 'number', valueEnd: '' };
    this.selectedTriggerElement = null;
    this.selectedCatalogBetweenOptions = [];
    this.triggerFieldOptions.set([]);
    this.selectedMultiValues = [];
  }

  isCatalogOptionInBetween(value: string | number): boolean {
    return this.selectedCatalogBetweenOptions.some(v => String(v) === String(value));
  }

  toggleCatalogBetweenOption(value: string | number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedCatalogBetweenOptions.some(v => String(v) === String(value)))
        this.selectedCatalogBetweenOptions = [...this.selectedCatalogBetweenOptions, value];
    } else {
      this.selectedCatalogBetweenOptions = this.selectedCatalogBetweenOptions.filter(v => String(v) !== String(value));
    }
  }

  selectActionForEdit(action: DynamicAction, index: number): void {
    this.editingIndex = index;
    const isCustom = action.type === 'show_if_custom' || action.type === 'hide_if_custom';

    if (isCustom) {
      this.formulaMode.set('personalizada');
      this.customActionName = action.name!;
      this.customActionVisibility = action.type.startsWith('show') ? 'show' : 'hide';
      this.currentExpression = {
        expression: action.formulaExpression || action.value || '',
        displayExpression: action.formulaExpression || action.value || '',
        sourceFields: action.sourceFields || [],
        isValid: true
      };
    } else {
      this.formulaMode.set('predefinida');

      // Detectar visibility desde el type
      const visibility: 'show' | 'hide' = action.type.startsWith('show') ? 'show' : 'hide';

      // Detectar operator desde el type (quita el prefijo show_if_ o hide_if_)
      const operator = action.type.replace('show_if_', '').replace('hide_if_', '');

      this.newAction = {
        name: action.name!,
        triggerField: action.triggerField,
        operator,
        visibility,
        value: action.value || '',
        betweenType: action.betweenType || 'number',
        valueEnd: action.valueEnd || ''
      };

      // Pre-seleccionar el elemento disparador
      const triggerEl = this.allElements.find(el => el.id === action.triggerField) || null;
      this.selectedTriggerElement = triggerEl;
      if (triggerEl) {
        this.onTriggerFieldChange(triggerEl).then(() => {
          // Si es catalog between, restaurar opciones seleccionadas
          if (operator === 'between' && action.betweenType === 'catalog' && action.value) {
            try {
              this.selectedCatalogBetweenOptions = JSON.parse(action.value);
            } catch { this.selectedCatalogBetweenOptions = []; }
          }
        });
      }
      if ((operator === 'any_of' || operator === 'all_of') && action.value) {
        try {
          this.selectedMultiValues = JSON.parse(action.value);
        } catch { this.selectedMultiValues = []; }
      }
    }

    // Scroll suave al formulario
    setTimeout(() => {
      document.querySelector('.add-action-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }

  cancelEdit(): void {
    this.editingIndex = null;
    this.resetAction();
    this.customActionName = '';
    this.customActionVisibility = 'show';
    this.currentExpression = { expression: '', displayExpression: '', sourceFields: [], isValid: false };
  }

  isMultiValueSelected(value: string | number): boolean {
    return this.selectedMultiValues.some(v => String(v) === String(value));
  }

  toggleMultiValue(value: string | number, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedMultiValues.some(v => String(v) === String(value))) {
        this.selectedMultiValues = [...this.selectedMultiValues, value];
      }
    } else {
      this.selectedMultiValues = this.selectedMultiValues.filter(v => String(v) !== String(value));
    }
  }
}