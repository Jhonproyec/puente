import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FieldReference, FormElement, FormRegion, Formula, FormulaResultFormat, FormulaType } from '../../../../core/models/form-builder.model';
import { FormBuilderStateService } from '../../../../core/services/form-builder-state.service';
import { FormulaService } from '../../../../core/services/formula.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ExpressionEditor, ExpressionOutput } from '../expression-editor/expression-editor';
import { CatalogService } from '../../../../core/services/catalog.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-formulas-panel',
  imports: [FormsModule, CommonModule, ExpressionEditor],
  templateUrl: './formulas-panel.html',
  styleUrl: './formulas-panel.css'
})
export class FormulasPanel implements OnInit {

  @Input() target!: FormElement | FormRegion;
  @Input() targetType!: 'element' | 'region' | null;
  @Output() backToProperties = new EventEmitter<void>();
  surveyOptionsMap: { [fieldId: string]: { value: string | number; label: string }[] } = {};


  private stateService = inject(FormBuilderStateService);
  private formulaService = inject(FormulaService);
  private catalogService = inject(CatalogService);


  allNumericFields: FormElement[] = [];
  formulaMode = signal<'predefinida' | 'personalizada'>('predefinida');

  // ✅ Solo queda esto del custom
  customFormulaName = '';
  customFormulaDecimals = 2;
  customFormulaFormat: FormulaResultFormat = { type: 'number', prefix: '', suffix: '' };
  currentExpression: ExpressionOutput = {
    expression: '', displayExpression: '', sourceFields: [], isValid: false
  };

  // FÓRMULAS PREDEFINIDAS
  newFormula: Partial<Formula> = {
    name: '', formulaType: 'sum', sourceFields: [], decimals: 2,
    resultFormat: { type: 'number', prefix: '', suffix: '' }, weights: {}
  };

  formulaTypes: Array<{ value: FormulaType; label: string; description: string }> = [
    { value: 'sum', label: 'Suma', description: 'Suma todos los campos seleccionados' },
    { value: 'subtract', label: 'Resta', description: 'Resta el segundo campo del primero' },
    { value: 'multiply', label: 'Multiplicación', description: 'Multiplica todos los campos' },
    { value: 'divide', label: 'División', description: 'Divide el primer campo entre el segundo' },
    { value: 'average', label: 'Promedio', description: 'Calcula el promedio de los campos' },
    { value: 'pondering', label: 'Ponderación', description: 'Suma ponderada con pesos específicos' },
    { value: 'max', label: 'Máximo', description: 'Obtiene el valor máximo' },
    { value: 'min', label: 'Mínimo', description: 'Obtiene el valor mínimo' }
  ];

  resultFormatTypes = [
    { value: 'number', label: 'Número' },
    { value: 'percentage', label: 'Porcentaje' },
    { value: 'stars', label: 'Estrellas (Rating)' }
  ];

  ngOnInit(): void {
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
        // ✅ Opciones manuales
        // if (el.surveyConfig?.surveySource === 'manual' && el.surveyConfig.responses?.length) {
        //   this.surveyOptionsMap[el.id] = el.surveyConfig.responses.map(r => ({
        //     value: r.value,
        //     label: r.label
        //   }));
        //   return;
        // }
        // ✅ Opciones desde catálogo
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

  // ✅ Recibe el output del ExpressionEditorComponent
  onExpressionChanged(data: ExpressionOutput): void {
    this.currentExpression = data;
  }

  // =================== FÓRMULAS PREDEFINIDAS ===================

  toggleSourceField(fieldId: string): void {
    const index = this.newFormula.sourceFields?.indexOf(fieldId) ?? -1;
    if (index > -1) {
      this.newFormula.sourceFields?.splice(index, 1);
    } else {
      this.newFormula.sourceFields = [...(this.newFormula.sourceFields || []), fieldId];
    }
    if (this.newFormula.formulaType === 'pondering') {
      if (!this.newFormula.weights) this.newFormula.weights = {};
      if (index === -1) this.newFormula.weights[fieldId] = 1;
      else delete this.newFormula.weights[fieldId];
    }
  }

  isFieldSelected(fieldId: string): boolean {
    return this.newFormula.sourceFields?.includes(fieldId) ?? false;
  }

  updateWeight(fieldId: string, weight: number): void {
    if (!this.newFormula.weights) this.newFormula.weights = {};
    this.newFormula.weights[fieldId] = weight;
  }

  getWeight(fieldId: string): number {
    return this.newFormula.weights?.[fieldId] ?? 1;
  }

  showWeightsConfig(): boolean { return this.newFormula.formulaType === 'pondering'; }

  needsTwoFields(): boolean {
    return this.newFormula.formulaType === 'subtract' || this.newFormula.formulaType === 'divide';
  }

  addFormula(): void {
    if (!this.newFormula.name?.trim()) { alert('Ingresa un nombre para la fórmula'); return; }
    if (!this.newFormula.sourceFields?.length) { alert('Selecciona al menos un campo'); return; }
    if (this.needsTwoFields() && this.newFormula.sourceFields.length < 2) {
      alert('Esta operación requiere dos campos'); return;
    }

    const formula: Formula = {
      id: `formula_${Date.now()}`,
      name: this.newFormula.name,
      targetField: (this.target as FormElement).id || '',
      formulaType: this.newFormula.formulaType!,
      sourceFields: this.newFormula.sourceFields,
      weights: this.newFormula.weights,
      resultFormat: this.newFormula.resultFormat as FormulaResultFormat,
      decimals: this.newFormula.decimals ?? 2
    };

    const validation = this.formulaService.validateFormula(formula, this.allNumericFields.map(f => f.id || ''));
    if (!validation.valid) { alert(`Errores:\n${validation.errors.join('\n')}`); return; }

    if (this.targetType === 'element') {
      const element = this.target as FormElement;
      this.stateService.updateElement(element.id || '', {
        formulas: [...(element.formulas || []), formula]
      });
    }
    this.resetNewFormula();
  }

  removeFormula(index: number): void {
    if (this.targetType === 'element') {
      const element = this.target as FormElement;
      this.stateService.updateElement(element.id || '', {
        formulas: (element.formulas || []).filter((_, i) => i !== index)
      });
    }
  }

  // =================== FÓRMULA PERSONALIZADA ===================

  addCustomFormula(): void {
    if (!this.customFormulaName.trim()) { alert('Ingresa un nombre para la fórmula'); return; }
    if (!this.currentExpression.expression.trim()) { alert('Escribe una expresión'); return; }
    if (!this.currentExpression.isValid) { alert('La expresión tiene errores'); return; }

    const formula: Formula = {
      id: `formula_${Date.now()}`,
      name: this.customFormulaName,
      targetField: (this.target as FormElement).id || '',
      formulaType: 'custom',
      sourceFields: this.currentExpression.sourceFields,
      customExpression: this.currentExpression.expression,
      resultFormat: this.customFormulaFormat,
      decimals: this.customFormulaDecimals
    };

    if (this.targetType === 'element') {
      const element = this.target as FormElement;
      this.stateService.updateElement(element.id || '', {
        formulas: [...(element.formulas || []), formula]
      });
    }

    this.customFormulaName = '';
    this.customFormulaDecimals = 2;
    this.customFormulaFormat = { type: 'number', prefix: '', suffix: '' };
    this.currentExpression = { expression: '', displayExpression: '', sourceFields: [], isValid: false };
  }

  // =================== HELPERS ===================

  hasFormulas(): boolean {
    if (this.targetType !== 'element') return false;
    return !!((this.target as FormElement).formulas?.length);
  }

  getFormulas(): Formula[] {
    if (this.targetType !== 'element') return [];
    return (this.target as FormElement).formulas || [];
  }

  getFormulaDescription(formula: Formula): string {
    if (formula.formulaType === 'custom' && formula.customExpression) {
      // ✅ Convertir IDs a labels
      let readable = formula.customExpression;
      [...this.allNumericFields]
        .sort((a, b) => (b.id || '').length - (a.id || '').length)
        .forEach(field => {
          readable = readable.split(field.id || '').join(`${field.label}`);
        });
      return readable;
    }

    const labels: { [id: string]: string } = {};
    this.allNumericFields.forEach(f => { if (f.id) labels[f.id] = f.label; });
    return this.formulaService.getFormulaDescription(formula, labels);
  }

  getFormulaTypeLabel(type: FormulaType): string {
    return this.formulaTypes.find(t => t.value === type)?.label || type;
  }

  getSelectedFieldsCount(): number { return this.newFormula.sourceFields?.length || 0; }

  canAddFormula(): boolean {
    return !!(this.newFormula.name && this.newFormula.sourceFields?.length);
  }

  getTotalWeight(): number {
    if (!this.newFormula.weights) return 0;
    return Object.values(this.newFormula.weights).reduce((sum, w) => sum + w, 0);
  }

  normalizeWeights(): void {
    if (!this.newFormula.weights) return;
    const total = this.getTotalWeight();
    if (total === 0) return;
    const normalized: { [id: string]: number } = {};
    for (const id in this.newFormula.weights) normalized[id] = this.newFormula.weights[id] / total;
    this.newFormula.weights = normalized;
  }

  get selectedFormulaDescription(): string {
    return this.formulaTypes.find(t => t.value === this.newFormula.formulaType)?.description ?? '';
  }

  private resetNewFormula(): void {
    this.newFormula = {
      name: '', formulaType: 'sum', sourceFields: [], decimals: 2,
      resultFormat: { type: 'number', prefix: '', suffix: '' }, weights: {}
    };
  }
}