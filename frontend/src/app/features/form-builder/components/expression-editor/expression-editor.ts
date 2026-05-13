import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { FieldReference, FormElement, FormulaValidation } from '../../../../core/models/form-builder.model';
import { FormulaService } from '../../../../core/services/formula.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


export interface ExpressionOutput {
  expression: string;       // con IDs internos
  displayExpression: string; // con labels legibles
  sourceFields: string[];
  isValid: boolean;
}
@Component({
  selector: 'app-expression-editor',
  imports: [
    FormsModule, CommonModule
  ],
  templateUrl: './expression-editor.html',
  styleUrl: './expression-editor.css'
})
export class ExpressionEditor implements OnInit {
  @Input() mode: 'formula' | 'action' = 'formula';
  @Input() availableFields: FormElement[] = [];
  @Input() surveyOptions: { [fieldId: string]: { value: string | number; label: string }[] } = {};

  @Output() expressionChange = new EventEmitter<ExpressionOutput>();


  private formulaService = inject(FormulaService);

  // Estado interno
  displayExpression = '';      // lo que ve el usuario (con labels)
  internalExpression = '';     // lo que se guarda (con IDs)

  showIfHelper = signal(false);
  expressionValidation = signal<FormulaValidation | null>(null);
  fieldReferences = signal<FieldReference[]>([]);
  suggestionType = signal<'fields' | 'functions' | 'options' | null>(null);
  suggestions = signal<string[]>([]);

  ngOnInit(): void { }

  onExpressionInput(event: any): void {
    this.displayExpression = event.target.value;

    const upper = this.displayExpression.toUpperCase();
    this.showIfHelper.set(
      upper.includes('SI(') || upper.includes('SI (') ||
      upper.includes('IF(') || upper.includes('IF (')
    );

    if (!this.displayExpression.trim()) {
      this.expressionValidation.set(null);
      this.fieldReferences.set([]);
      this.emitChange(false);
      return;
    }

    // ✅ Ordenar por longitud descendente para reemplazar primero los labels más largos
    // y evitar reemplazos parciales
    let expressionWithIds = this.displayExpression;
    [...this.availableFields]
      .sort((a, b) => b.label.length - a.label.length)
      .forEach(field => {
        // ✅ Escapar caracteres especiales del label para usarlo en regex
        const escaped = this.escapeRegex(field.label);
        // ✅ No usar \b porque falla con ¿ ? á é etc.
        // Buscar el label exacto case-insensitive
        const regex = new RegExp(escaped, 'gi');
        expressionWithIds = expressionWithIds.replace(regex, field.id || '');
      });

    this.internalExpression = expressionWithIds;

    const fieldOptions = this.availableFields.map(f => ({ id: f.id || '', label: f.label }));
    const validation = this.formulaService.validateExpression(expressionWithIds, fieldOptions);
    this.expressionValidation.set(validation);

    const fieldValues: { [id: string]: number } = {};
    this.availableFields.forEach(f => { fieldValues[f.id || ''] = 0; });
    const { references } = this.formulaService.preprocessExpression(expressionWithIds, fieldValues);
    this.fieldReferences.set(references);

    for (const fieldId in this.surveyOptions) {
      const options = this.surveyOptions[fieldId];
      options.forEach(opt => {
        const escaped = this.escapeRegex(opt.label);
        const regex = new RegExp(`"${escaped}"`, 'gi');
        expressionWithIds = expressionWithIds.replace(regex, String(opt.value));
      });
    }

    this.emitChange(validation.valid);
  }

  onExpressionKeydown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const text = input.value;
    const cursorPos = input.selectionStart || 0;
    const beforeCursor = text.substring(0, cursorPos);

    // ✅ Detectar si estamos dentro de comillas: buscar " sin cerrar antes del cursor
    const lastQuote = beforeCursor.lastIndexOf('"');
    if (lastQuote !== -1) {
      const textInQuotes = beforeCursor.substring(lastQuote + 1);
      // Estamos dentro de comillas, buscar qué campo está antes del == o comparador
      const surveyOptions = this.getSurveyOptionsForContext(beforeCursor, textInQuotes);
      if (surveyOptions.length > 0) {
        this.suggestionType.set('options');
        this.suggestions.set(surveyOptions.map(o => String(o.value) + '||' + o.label));
        return;
      }
    }

    const lastDelimiter = Math.max(
      beforeCursor.lastIndexOf(' '),
      beforeCursor.lastIndexOf('('),
      beforeCursor.lastIndexOf(',')
    );
    const partial = beforeCursor.substring(lastDelimiter + 1).trim();

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
    }

    if (partial.length > 0) {
      const fieldSuggestions = this.formulaService.getFieldSuggestions(
        partial,
        this.availableFields.map(f => ({ id: f.id || '', label: f.label }))
      );
      const functionSuggestions = this.formulaService.getFunctionSuggestions(partial);

      if (fieldSuggestions.length > 0) {
        this.suggestionType.set('fields');
        this.suggestions.set(fieldSuggestions.map(f => f.id));
      } else if (functionSuggestions.length > 0) {
        this.suggestionType.set('functions');
        this.suggestions.set(functionSuggestions);
      } else {
        this.clearSuggestions();
      }
    } else {
      this.clearSuggestions();
    }
  }

  private getSurveyOptionsForContext(
    beforeCursor: string,
    partial: string
  ): { value: string | number; label: string }[] {
    // Buscar el campo antes del == o comparador más cercano
    // Ejemplo: "SI(Desempeño == "Bu" → detecta Desempeño
    const comparatorMatch = beforeCursor.match(
      /([A-Za-zÀ-ÿ0-9_\s]+?)\s*(?:==|!=|<>|>=|<=|>|<)\s*"[^"]*$/
    );

    if (!comparatorMatch) return [];

    const fieldLabel = comparatorMatch[1].trim()
      .replace(/.*[\(\,]\s*/, ''); // limpiar SI( o , previos

    // Buscar el campo por label
    const field = this.availableFields.find(
      f => f.label.toLowerCase() === fieldLabel.toLowerCase()
    );

    if (!field || !field.id) return [];

    const options = this.surveyOptions[field.id] || [];

    // Filtrar por lo que ya escribió dentro de las comillas
    if (partial.length > 0) {
      return options.filter(o =>
        o.label.toLowerCase().includes(partial.toLowerCase())
      );
    }

    return options;
  }

  insertSuggestion(suggestion: string): void {
    const input = document.querySelector('app-expression-editor textarea') as HTMLTextAreaElement;
    if (!input) return;

    const text = this.displayExpression;
    const cursorPos = input.selectionStart || 0;
    const beforeCursor = text.substring(0, cursorPos);

    // ✅ Si es una opción de survey (formato "value||label")
    if (this.suggestionType() === 'options') {
      const [value, label] = suggestion.split('||');
      // Reemplazar desde la última " hasta el cursor
      const lastQuote = beforeCursor.lastIndexOf('"');
      const newExpression =
        text.substring(0, lastQuote) +
        `"${label}"` +       // muestra el label al usuario
        text.substring(cursorPos);

      this.displayExpression = newExpression;
      this.onExpressionInput({ target: { value: newExpression } });
      this.clearSuggestions();

      setTimeout(() => {
        const newPos = lastQuote + label.length + 2;
        input.selectionStart = input.selectionEnd = newPos;
        input.focus();
      }, 0);
      return;
    }

    // ✅ Lógica original para campos y funciones
    const lastWordStart = Math.max(
      beforeCursor.lastIndexOf(' ') + 1,
      beforeCursor.lastIndexOf('(') + 1,
      beforeCursor.lastIndexOf(',') + 1
    );

    const fieldLabel = this.getFieldLabelById(suggestion);
    const newExpression =
      text.substring(0, lastWordStart) +
      fieldLabel + ' ' +
      text.substring(cursorPos);

    this.displayExpression = newExpression;
    this.onExpressionInput({ target: { value: newExpression } });
    this.clearSuggestions();

    setTimeout(() => {
      input.selectionStart = input.selectionEnd = lastWordStart + fieldLabel.length + 1;
      input.focus();
    }, 0);
  }
  insertIfTemplate(type: 'simple' | 'compare' | 'nested'): void {
    const f1 = this.availableFields[0]?.label || 'Campo 1';
    const f2 = this.availableFields[1]?.label || 'Campo 2';

    const templates = {
      simple: `SI(${f1} > 10, 5, ${f1})`,
      compare: `SI(${f1} > ${f2}, ${f1}, ${f2})`,
      nested: `SI(Y(${f1} > 0, ${f2} > 0), SUMA(${f1}, ${f2}), 0)`
    };

    this.displayExpression = templates[type];
    this.onExpressionInput({ target: { value: this.displayExpression } });
  }

  getFieldLabelById(fieldId: string): string {
    return this.availableFields.find(f => f.id === fieldId)?.label || fieldId;
  }

  private clearSuggestions(): void {
    this.suggestionType.set(null);
    this.suggestions.set([]);
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private emitChange(isValid: boolean): void {
    // Convertir IDs a labels para displayExpression
    let display = this.internalExpression;
    [...this.availableFields]
      .sort((a, b) => (b.id || '').length - (a.id || '').length)
      .forEach(field => {
        display = display.split(field.id || '').join(`[${field.label}]`);
      });

    this.expressionChange.emit({
      expression: this.internalExpression,
      displayExpression: display,
      sourceFields: this.fieldReferences().map(r => r.fieldId),
      isValid
    });
  }

  reset(): void {
    this.displayExpression = '';
    this.internalExpression = '';
    this.showIfHelper.set(false);
    this.expressionValidation.set(null);
    this.fieldReferences.set([]);
    this.clearSuggestions();
  }
}
