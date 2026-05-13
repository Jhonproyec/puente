import { Component, EventEmitter, Input, Output, OnChanges, OnInit, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { FormElement, ValidationRule, ValidationType } from '../../../../core/models/form-builder.model';
import { FormBuilderStateService } from '../../../../core/services/form-builder-state.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { map, Subject, takeUntil } from 'rxjs';
import { ExpressionEditor, ExpressionOutput } from '../expression-editor/expression-editor';
import { CatalogService } from '../../../../core/services/catalog.service';

@Component({
  selector: 'app-validation-panel',
  imports: [CommonModule, FormsModule, ExpressionEditor],
  templateUrl: './validation-panel.html',
  styleUrl: './validation-panel.css'
})
export class ValidationPanel implements OnChanges, OnInit, OnDestroy {
  @Input() element!: FormElement;
  @Output() backToProperties = new EventEmitter<void>();
  surveyOptionsMap: { [fieldId: string]: { value: string | number; label: string }[] } = {};
  private catalogService = inject(CatalogService);


  private destroy$ = new Subject<void>();

  newValidation = {
    operator: '',
    valueFrom: '',
    valueTo: '',
    useTodayAsMax: false,
    message: ''
  };

  // Operadores disponibles según tipo de campo
  availableOperators: Array<{ value: string; label: string }> = [];

  // Todos los operadores posibles
  private allOperators = [
    { value: 'equals', label: 'Igual a', types: ['text', 'number', 'email', 'select', 'radio', 'phone'] },
    { value: 'not_equals', label: 'Diferente de', types: ['text', 'number', 'email', 'select', 'radio', 'phone'] },
    { value: 'greater', label: 'Mayor que', types: ['number'] },
    { value: 'less', label: 'Menor que', types: ['number'] },
    { value: 'greater_equal', label: 'Mayor o igual que', types: ['number'] },
    { value: 'less_equal', label: 'Menor o igual que', types: ['number'] },
    { value: 'between', label: 'Entre', types: ['number', 'date'] },
    { value: 'filled', label: 'Es requerido', types: ['text', 'number', 'email', 'date', 'select', 'radio', 'checkbox', 'textarea', 'phone', 'time', 'coordinates', 'camera'] },
    { value: 'min_length', label: 'Longitud mínima', types: ['text', 'textarea', 'phone'] },
    { value: 'max_length', label: 'Longitud máxima', types: ['text', 'textarea', 'phone'] },
    { value: 'only_numbers', label: 'Solo números', types: ['text'] },
    { value: 'only_letters', label: 'Solo letras', types: ['text'] },
    { value: 'no_special_chars', label: 'Sin caracteres especiales', types: ['text', 'textarea'] },
    { value: 'email_format', label: 'Formato de email', types: ['email'] },
    { value: 'pattern', label: 'Patrón (Regex)', types: ['text', 'textarea', 'email'] },
    { value: 'min_selections', label: 'Mínimo de selecciones', types: ['checkbox'] },
    { value: 'max_selections', label: 'Máximo de selecciones', types: ['checkbox'] },
    { value: 'max_file_size', label: 'Tamaño máximo (MB)', types: ['camera'] },
    { value: 'custom', label: 'Personalizado (Regex)', types: ['text', 'number', 'email', 'textarea'] },
    { value: 'custom_formula', label: 'Fórmula personalizada', types: ['number'] },

  ];

  constructor(private stateService: FormBuilderStateService) { }

  ngOnInit(): void {
    this.stateService.formDefinition$
      .pipe(takeUntil(this.destroy$))
      .subscribe(form => {
        if (!form || !this.element) return;
        const updated = form.regions
          .flatMap(r => r.elements)
          .find(el => el.id === this.element.id);
        if (updated) this.element = updated;
      });

    const allElements = this.stateService.getAllElements();

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
  get isCustomFormula(): boolean {
    return this.newValidation.operator === 'custom_formula';
  }
  onExpressionChanged(data: ExpressionOutput): void {
    this.currentExpression = data;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['element'] && this.element) {
      this.availableOperators = this.allOperators.filter(op =>
        op.types.includes(this.element.type)
      );
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBackToProperties(): void {
    this.backToProperties.emit();
  }

  // ===== Helpers para mostrar/ocultar campos =====

  get isBetween(): boolean {
    return this.newValidation.operator === 'between';
  }

  get isDateField(): boolean {
    return this.element?.type === 'date';
  }

  get needsValue(): boolean {
    const noValue = ['filled', 'email_format', 'only_numbers', 'only_letters', 'no_special_chars'];
    return this.newValidation.operator !== '' && !noValue.includes(this.newValidation.operator);
  }

  get valueLabel(): string {
    const labels: Record<string, string> = {
      equals: 'Valor igual a',
      not_equals: 'Valor diferente de',
      greater: 'Mayor que',
      less: 'Menor que',
      greater_equal: 'Mayor o igual que',
      less_equal: 'Menor o igual que',
      min_length: 'Cantidad mínima de caracteres',
      max_length: 'Cantidad máxima de caracteres',
      pattern: 'Expresión regular',
      custom: 'Expresión regular',
      email_domain: 'Dominio (ej: gmail.com)',
      min_selections: 'Mínimo de opciones',
      max_selections: 'Máximo de selecciones',
      max_file_size: 'Tamaño máximo en MB',
    };
    return labels[this.newValidation.operator] || 'Valor';
  }

  getValidationDescription(validation: ValidationRule): string {
    if (validation.type === 'custom_formula' && validation.expression) {
      let readable = validation.expression;
      [...this.allNumericFields, this.element]
        .sort((a, b) => (b.id || '').length - (a.id || '').length)
        .forEach(f => {
          readable = readable.split(f.id || '').join(`[${f.label}]`);
        });
      return `Fórmula: ${readable}`;
    }
    const descriptions: Record<string, (v: ValidationRule) => string> = {
      equals: v => `Debe ser igual a "${v.value}"`,
      not_equals: v => `Debe ser diferente de "${v.value}"`,
      greater: v => `Debe ser mayor que ${v.value}`,
      less: v => `Debe ser menor que ${v.value}`,
      greater_equal: v => `Debe ser mayor o igual que ${v.value}`,
      less_equal: v => `Debe ser menor o igual que ${v.value}`,
      between: v => v.useTodayAsMax
        ? `Entre ${v.value} y la fecha actual`
        : `Entre ${v.value} y ${v.valueTo}`,
      filled: () => 'Campo requerido',
      min_length: v => `Mínimo ${v.value} caracteres`,
      max_length: v => `Máximo ${v.value} caracteres`,
      only_numbers: () => 'Solo números',
      only_letters: () => 'Solo letras',
      no_special_chars: () => 'Sin caracteres especiales',
      email_format: () => 'Formato de email válido',
      pattern: v => `Patrón: ${v.value}`,
      custom: v => `Patrón personalizado: ${v.value}`,
      min_selections: v => `Mínimo ${v.value} opciones`,
      max_selections: v => `Máximo ${v.value} opciones`,
      max_file_size: v => `Máximo ${v.value} MB`,
    };
    const fn = descriptions[validation.type];
    return fn ? fn(validation) : validation.type;
  }

  addValidation(): void {
    if (!this.newValidation.operator) {
      alert('Selecciona un tipo de validación');
      return;
    }

    if (this.isCustomFormula) {
      if (!this.currentExpression.expression.trim()) { alert('Escribe una expresión'); return; }
      if (!this.currentExpression.isValid) { alert('La expresión tiene errores'); return; }
      if (!this.newValidation.message.trim()) { alert('Ingresa un mensaje de error'); return; }

      const formulaRule: ValidationRule = {  // ✅ renombrado a formulaRule
        type: 'custom_formula',
        expression: this.currentExpression.expression,
        sourceFields: this.currentExpression.sourceFields,
        message: this.newValidation.message
      };

      this.stateService.updateElement(this.element.id, {
        validations: [...(this.element.validations || []), formulaRule]
      });

      this.newValidation = { operator: '', valueFrom: '', valueTo: '', useTodayAsMax: false, message: '' };
      this.currentExpression = { expression: '', displayExpression: '', sourceFields: [], isValid: false };
      return;
    }

    if (this.needsValue && !this.isBetween && !this.newValidation.valueFrom) {
      alert('Ingresa un valor');
      return;
    }

    if (this.isBetween && !this.newValidation.valueFrom) {
      alert('Ingresa el valor inicial');
      return;
    }

    if (this.isBetween && !this.newValidation.useTodayAsMax && !this.newValidation.valueTo) {
      alert('Ingresa el valor final o marca "Fecha actual como máximo"');
      return;
    }



    const rule: ValidationRule = {
      type: this.newValidation.operator as ValidationType,
      value: this.newValidation.valueFrom,
      valueTo: this.isBetween ? this.newValidation.valueTo : undefined,
      useTodayAsMax: this.isBetween && this.isDateField ? this.newValidation.useTodayAsMax : undefined,
      message: this.newValidation.message || this.getDefaultMessage()
    };

    this.stateService.updateElement(this.element.id, {
      validations: [...(this.element.validations || []), rule]
    });

    this.newValidation = { operator: '', valueFrom: '', valueTo: '', useTodayAsMax: false, message: '' };
  }

  removeValidation(index: number): void {
    const updated = this.element.validations.filter((_, i) => i !== index);
    this.stateService.updateElement(this.element.id, { validations: updated });
  }

  private getDefaultMessage(): string {
    const op = this.newValidation.operator;
    const from = this.newValidation.valueFrom;
    const to = this.newValidation.useTodayAsMax ? 'la fecha actual' : this.newValidation.valueTo;

    const messages: Record<string, string> = {
      equals: `El valor debe ser "${from}"`,
      not_equals: `El valor no puede ser "${from}"`,
      greater: `Debe ser mayor que ${from}`,
      less: `Debe ser menor que ${from}`,
      greater_equal: `Debe ser mayor o igual que ${from}`,
      less_equal: `Debe ser menor o igual que ${from}`,
      between: `Debe estar entre ${from} y ${to}`,
      filled: 'Este campo es requerido',
      min_length: `Debe tener al menos ${from} caracteres`,
      max_length: `No puede exceder ${from} caracteres`,
      only_numbers: 'Solo se permiten números',
      only_letters: 'Solo se permiten letras',
      no_special_chars: 'No se permiten caracteres especiales',
      email_format: 'Ingresa un email válido',
      pattern: 'Formato inválido',
      custom: 'Formato inválido',
      min_selections: `Selecciona al menos ${from} opciones`,
      max_selections: `Selecciona máximo ${from} opciones`,
      max_file_size: `El archivo no puede exceder ${from} MB`,
    };

    return messages[op] || 'Valor inválido';
  }
  allNumericFields: FormElement[] = [];
  currentExpression: ExpressionOutput = {
    expression: '', displayExpression: '', sourceFields: [], isValid: false
  };
}