import { Injectable } from '@angular/core';
import { FieldReference, Formula, FormulaResult, FormulaToken, FormulaValidation } from '../models/form-builder.model';

@Injectable({
  providedIn: 'root'
})
export class FormulaService {

  // Palabras reservadas permitidas en fórmulas
  private readonly RESERVED_WORDS: Record<string, string> = {
    // Funciones aritméticas
    'SUMA': 'sum',
    'SUM': 'sum',
    'RESTA': 'subtract',
    'SUB': 'subtract',
    'MULTIPLICACIÓN': 'multiply',
    'MULT': 'multiply',
    'DIVISIÓN': 'divide',
    'DIV': 'divide',
    'PROMEDIO': 'average',
    'AVG': 'average',
    'MEDIA': 'average',
    'MÁXIMO': 'max',
    'MAX': 'max',
    'MÍNIMO': 'min',
    'MIN': 'min',
    'POTENCIA': 'power',
    'POW': 'power',
    'RAÍZ': 'sqrt',
    'SQRT': 'sqrt',
    'VALOR_ABSOLUTO': 'abs',
    'ABS': 'abs',
    'REDONDEAR': 'round',
    'ROUND': 'round',
    'TRUNCAR': 'trunc',
    'PISO': 'floor',
    'FLOOR': 'floor',
    'TECHO': 'ceil',
    'CEIL': 'ceil',

    // Funciones condicionales
    'SI': 'if',
    'IF': 'if',

    // Lógicos
    'Y': 'and',
    'AND': 'and',
    'O': 'or',
    'OR': 'or',
    'NO': 'not',
    'NOT': 'not',
    'EDAD_AÑOS': 'ageYears',
    'EDAD_ANIOS': 'ageYears',
    'EDAD_MESES': 'ageMonths',
    'EDAD_DIAS': 'ageDays',
    'DIAS_ENTRE': 'daysBetween',
    'DIAS_DESDE_HOY': 'daysFromToday',
    'MES': 'month',
    'AÑO': 'year',
    'ANIO': 'year',
    'DIA': 'day',
    'HOY': 'today',
  };

  // Operadores válidos y su precedencia
  private readonly OPERATORS = {
    '+': { precedence: 1, associativity: 'left' },
    '-': { precedence: 1, associativity: 'left' },
    '*': { precedence: 2, associativity: 'left' },
    '/': { precedence: 2, associativity: 'left' },
    '%': { precedence: 2, associativity: 'left' },
    '^': { precedence: 3, associativity: 'right' },
    '=': { precedence: 0, associativity: 'left' },
    '<': { precedence: 0, associativity: 'left' },
    '>': { precedence: 0, associativity: 'left' },
    '<=': { precedence: 0, associativity: 'left' },
    '>=': { precedence: 0, associativity: 'left' },
    '<>': { precedence: 0, associativity: 'left' },
    '==': { precedence: 0, associativity: 'left' }
  };

  constructor() { }

  /**
   * Tokeniza una expresión de fórmula
   * Ejemplo: "SUMA(campo1, campo2) * 2" → array de tokens
   */
  tokenizeExpression(expression: string): FormulaToken[] {
    const tokens: FormulaToken[] = [];
    let current = '';
    let position = 0;



    for (let i = 0; i < expression.length; i++) {
      const char = expression[i];
      const nextChar = expression[i + 1];

      if (char === '"') {
        if (current) {
          tokens.push(...this.parseToken(current, position));
          current = '';
        }
        let str = '"';
        i++;
        while (i < expression.length && expression[i] !== '"') {
          str += expression[i];
          i++;
        }
        str += '"';
        tokens.push({ type: 'string', value: str, position });
        position = i + 1;
        continue;
      }

      // Ignorar espacios
      if (char === ' ') {
        if (current) {
          tokens.push(...this.parseToken(current, position));
          current = '';
        }
        position = i + 1;
        continue;
      }

      // Detectar operadores de dos caracteres
      const twoCharOp = char + (nextChar || '');
      if (['<=', '>=', '<>', '=='].includes(twoCharOp)) {
        if (current) {
          tokens.push(...this.parseToken(current, position));
          current = '';
        }
        tokens.push({ type: 'operator', value: twoCharOp, position: i });
        i++;
        position = i + 1;
        continue;
      }

      // Detectar operadores y paréntesis
      if (['+', '-', '*', '/', '%', '^', '=', '<', '>', '(', ')', ','].includes(char)) {
        if (current) {
          tokens.push(...this.parseToken(current, position));
          current = '';
        }

        if (char === '(' || char === ')') {
          tokens.push({ type: 'parenthesis', value: char, position: i });
        } else if (char === ',') {
          tokens.push({ type: 'comma', value: char, position: i });
        } else {
          tokens.push({ type: 'operator', value: char, position: i });
        }
        position = i + 1;
        continue;
      }

      current += char;
    }

    if (current) {
      tokens.push(...this.parseToken(current, position));
    }

    return tokens;
  }

  /**
   * Parsea un token individual
   */
  private parseToken(token: string, position: number): FormulaToken[] {
    const upperToken = token.toUpperCase();

    // Verificar si es palabra reservada
    if (this.RESERVED_WORDS[upperToken]) {
      return [{ type: 'function', value: upperToken, position }];
    }

    // Verificar si es un número
    if (!isNaN(parseFloat(token))) {
      return [{ type: 'number', value: token, position }];
    }

    // Si no, asumir que es una referencia a campo
    return [{ type: 'field', value: token, position }];
  }

  /**
   * Valida la sintaxis de una expresión de fórmula
   * Verifica:
   * - Paréntesis balanceados
   * - Funciones válidas
   * - Campos válidos
   * - Precedencia de operadores
   */
  validateExpression(
    expression: string,
    availableFields: { id: string; label: string }[]
  ): FormulaValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const tokens = this.tokenizeExpression(expression);

    if (!this.validateParentheses(expression)) {
      errors.push('Los paréntesis no están balanceados.');
    }

    const fieldIds = availableFields.map(f => f.id);
    tokens.forEach(token => {
      //Ignorar strings - son valores literales válidos
      if (token.type === 'string') return;

      if (token.type === 'field' && !fieldIds.includes(token.value)) {
        errors.push(`Campo no reconocido: "${token.value}"`);
      }
    });

    // ✅ Ignorar validación de operadores consecutivos si hay comparadores
    // porque = > < son válidos en condiciones
    const hasComparators = tokens.some(t =>
      t.type === 'operator' && ['=', '>', '<', '>=', '<=', '<>', '=='].includes(t.value)
    );

    if (!hasComparators) {
      for (let i = 0; i < tokens.length - 1; i++) {
        const current = tokens[i];
        const next = tokens[i + 1];
        if (current.type === 'operator' && next.type === 'operator' &&
          !(next.value === '(' || current.value === ')')) {
          errors.push(`Error de sintaxis: operador "${current.value}" seguido de "${next.value}"`);
        }
        if (current.type === 'field' && next.type === 'field') {
          errors.push(`Error de sintaxis: campos consecutivos sin operador`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings, tokens };
  }
  /**
   * Valida que los paréntesis estén balanceados
   */
  private validateParentheses(expression: string): boolean {
    let count = 0;
    for (const char of expression) {
      if (char === '(') count++;
      if (char === ')') count--;
      if (count < 0) return false; // Paréntesis de cierre sin apertura
    }
    return count === 0; // Todos los abiertos deben estar cerrados
  }

  /**
   * Convierte una expresión personalizada a evaluable
   * Ejemplo: "SUMA(campo1, campo2) * campo3" → "100 + 200 * 300"
   */
  preprocessExpression(
    expression: string,
    fieldValues: { [fieldId: string]: any },
    fieldMappings: { [fieldId: string]: string } = {}
  ): { evaluable: string; references: FieldReference[] } {
    let evaluable = expression;
    const references: FieldReference[] = [];
    const tokens = this.tokenizeExpression(expression);

    // Reemplazar referencias a campos con valores
    tokens.forEach((token, index) => {
      if (token.type === 'field') {
        const fieldId = token.value;
        const value = this.toNumber(fieldValues[fieldId]);
        const label = fieldMappings[fieldId] || fieldId;

        references.push({
          fieldId,
          fieldLabel: label,
          position: token.position,
          value
        });

        // Reemplazar en la expresión (usar límites de palabra)
        const regex = new RegExp(`\\b${fieldId}\\b`, 'g');
        evaluable = evaluable.replace(regex, value.toString());
      }
    });

    // Reemplazar funciones por JavaScript Math equivalentes
    evaluable = this.replaceFunctions(evaluable);

    return { evaluable, references };
  }

  /**
   * Reemplaza funciones Excel/personalizadas por equivalentes JavaScript
   */
  private replaceFunctions(expression: string): string {
    let result = expression;

    // Mapeo de funciones
    const functionMap = {
      'SUMA': 'Math.sum',
      'SUM': 'Math.sum',
      'PROMEDIO': 'Math.avg',
      'AVG': 'Math.avg',
      'MEDIA': 'Math.avg',
      'MÁXIMO': 'Math.max',
      'MAX': 'Math.max',
      'MÍNIMO': 'Math.min',
      'MIN': 'Math.min',
      'POTENCIA': 'Math.pow',
      'POW': 'Math.pow',
      'RAÍZ': 'Math.sqrt',
      'SQRT': 'Math.sqrt',
      'VALOR_ABSOLUTO': 'Math.abs',
      'ABS': 'Math.abs',
      'REDONDEAR': 'Math.round',
      'ROUND': 'Math.round',
      'TRUNCAR': 'Math.trunc',
      'PISO': 'Math.floor',
      'FLOOR': 'Math.floor',
      'TECHO': 'Math.ceil',
      'CEIL': 'Math.ceil'
    };

    for (const [key, value] of Object.entries(functionMap)) {
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      result = result.replace(regex, value);
    }

    // Convertir ^ a ** (potencia en JavaScript)
    result = result.replace(/\^/g, '**');

    return result;
  }

  /**
   * Evalúa una expresión personalizada (tipo Excel)
   */
  evaluateCustomExpression(
    expression: string,
    fieldValues: { [fieldId: string]: any },
    fieldMappings: { [fieldId: string]: string } = {}
  ): { result: number; error: string | null; references: FieldReference[] } {
    try {
      const { references } = this.preprocessExpression(expression, fieldValues, fieldMappings);

      // ✅ Reutilizar calculateCustom que ya maneja todo correctamente
      const result = this.calculateCustom(expression, fieldValues);

      return { result, error: null, references };
    } catch (error) {
      return {
        result: 0,
        error: `Error evaluando fórmula: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        references: []
      };
    }
  }
  /**
   * Resalta referencias de campos en una expresión
   * Usado para mostrar visualmente qué campos se usan
   */
  highlightFieldReferences(
    expression: string,
    fieldIds: string[]
  ): { highlighted: string; foundFields: string[] } {
    let highlighted = expression;
    const foundFields: string[] = [];

    fieldIds.forEach(fieldId => {
      const regex = new RegExp(`\\b${fieldId}\\b`, 'g');
      if (regex.test(expression)) {
        foundFields.push(fieldId);
        // Reemplazar con versión resaltada (para HTML)
        highlighted = highlighted.replace(
          new RegExp(`\\b${fieldId}\\b`, 'g'),
          `<span class="field-reference">${fieldId}</span>`
        );
      }
    });

    return { highlighted, foundFields };
  }

  /**
   * Obtiene sugerencias de campos para autocompletado
   */
  getFieldSuggestions(
    partial: string,
    availableFields: { id: string; label: string }[]
  ): { id: string; label: string }[] {
    const lowerPartial = partial.toLowerCase();
    return availableFields.filter(field =>
      field.id.toLowerCase().includes(lowerPartial) ||
      field.label.toLowerCase().includes(lowerPartial)
    );
  }

  /**
   * Obtiene sugerencias de funciones
   */
  getFunctionSuggestions(partial: string): string[] {
    const lowerPartial = partial.toLowerCase();
    return Object.keys(this.RESERVED_WORDS).filter(word =>
      word.toLowerCase().includes(lowerPartial)
    );
  }

  /**
   * MÉTODO ORIGINAL - Evalúa fórmula predefinida
   */
  evaluateFormula(formula: Formula, fieldValues: { [fieldId: string]: any }): FormulaResult {
    let numericValue = 0;
    const sourceValues: { [fieldId: string]: any } = {};

    formula.sourceFields.forEach(fieldId => {
      sourceValues[fieldId] = fieldValues[fieldId] || 0;
    });

    switch (formula.formulaType) {
      case 'sum':
        numericValue = this.calculateSum(sourceValues);
        break;
      case 'subtract':
        numericValue = this.calculateSubtract(sourceValues, formula.sourceFields);
        break;
      case 'multiply':
        numericValue = this.calculateMultiply(sourceValues);
        break;
      case 'divide':
        numericValue = this.calculateDivide(sourceValues, formula.sourceFields);
        break;
      case 'average':
        numericValue = this.calculateAverage(sourceValues);
        break;
      case 'pondering':
        numericValue = this.calculatePondering(sourceValues, formula.weights || {});
        break;
      case 'max':
        numericValue = this.calculateMax(sourceValues);
        break;
      case 'min':
        numericValue = this.calculateMin(sourceValues);
        break;
      case 'conditional':
        numericValue = this.calculateConditional(formula, fieldValues);
        break;
      case 'custom':
        numericValue = this.calculateCustom(formula.customExpression || '', fieldValues);
        break;
      default:
        numericValue = 0;
    }

    const formattedValue = this.formatResult(numericValue, formula);

    return {
      formulaId: formula.id,
      value: numericValue,
      formattedValue: formattedValue,
      timestamp: new Date(),
      sourceValues: sourceValues
    };
  }

  // =================== MÉTODOS PRIVADOS ORIGINALES ===================

  private calculateSum(values: { [fieldId: string]: any }): number {
    return Object.values(values).reduce((sum, val) => sum + this.toNumber(val), 0);
  }

  private calculateSubtract(values: { [fieldId: string]: any }, fieldIds: string[]): number {
    if (fieldIds.length < 2) return 0;
    const first = this.toNumber(values[fieldIds[0]]);
    const rest = fieldIds.slice(1).reduce((sum, id) => sum + this.toNumber(values[id]), 0);
    return first - rest;
  }

  private calculateMultiply(values: { [fieldId: string]: any }): number {
    const nums = Object.values(values).map(v => this.toNumber(v));
    if (nums.length === 0) return 0;
    return nums.reduce((product, val) => product * val, 1);
  }

  private calculateDivide(values: { [fieldId: string]: any }, fieldIds: string[]): number {
    if (fieldIds.length < 2) return 0;
    const dividend = this.toNumber(values[fieldIds[0]]);
    const divisor = this.toNumber(values[fieldIds[1]]);
    if (divisor === 0) {
      console.warn('División por cero en fórmula');
      return 0;
    }
    return dividend / divisor;
  }

  private calculateAverage(values: { [fieldId: string]: any }): number {
    const nums = Object.values(values).map(v => this.toNumber(v));
    if (nums.length === 0) return 0;
    const sum = nums.reduce((total, val) => total + val, 0);
    return sum / nums.length;
  }

  private calculatePondering(
    values: { [fieldId: string]: any },
    weights: { [fieldId: string]: number }
  ): number {
    let total = 0;
    for (const fieldId in values) {
      const value = this.toNumber(values[fieldId]);
      const weight = weights[fieldId] || 0;
      total += value * weight;
    }
    return total;
  }

  private calculateMax(values: { [fieldId: string]: any }): number {
    const nums = Object.values(values).map(v => this.toNumber(v));
    if (nums.length === 0) return 0;
    return Math.max(...nums);
  }

  private calculateMin(values: { [fieldId: string]: any }): number {
    const nums = Object.values(values).map(v => this.toNumber(v));
    if (nums.length === 0) return 0;
    return Math.min(...nums);
  }

  private calculateConditional(formula: Formula, fieldValues: { [fieldId: string]: any }): number {
    if (!formula.conditions || formula.conditions.length === 0) return 0;
    const condition = formula.conditions[0];
    const fieldValue = this.toNumber(fieldValues[condition.field]);
    const compareValue = typeof condition.value === 'number' ? condition.value : this.toNumber(condition.value);

    let conditionMet = false;
    switch (condition.operator) {
      case 'equals':
        conditionMet = fieldValue === compareValue;
        break;
      case 'greater':
        conditionMet = fieldValue > compareValue;
        break;
      case 'less':
        conditionMet = fieldValue < compareValue;
        break;
      case 'greater_equal':
        conditionMet = fieldValue >= compareValue;
        break;
      case 'less_equal':
        conditionMet = fieldValue <= compareValue;
        break;
    }

    const expression = conditionMet ? condition.thenFormula : (condition.elseFormula || '0');
    return this.calculateCustom(expression, fieldValues);
  }

  private calculateCustom(expression: string, fieldValues: { [fieldId: string]: any }): number {
    try {
      let evaluableExpression = expression;

      // ✅ PASO 0: Proteger strings entre comillas
      const stringLiterals: string[] = [];
      evaluableExpression = evaluableExpression.replace(/"([^"]*)"/g, (match) => {
        stringLiterals.push(match);
        return `__STR${stringLiterals.length - 1}__`;
      });

      // ✅ PASO 1: Normalizar operadores
      evaluableExpression = evaluableExpression
        .replace(/<>/g, '!==')
        .replace(/>=/g, '>=')
        .replace(/<=/g, '<=')
        .replace(/==/g, '===')
        .replace(/!===/g, '!==')
        .replace(/(?<![<>!=])=(?!=)/g, '===');

      // ✅ PASO 2: Reemplazar palabras reservadas
      const replacements: [RegExp, string][] = [
        // ✅ PRIMERO: funciones con caracteres especiales
        [/(?<![a-zA-Z0-9_])MULTIPLICACIÓN(?![a-zA-Z0-9_])/gi, '_multiply'],
        [/(?<![a-zA-Z0-9_])DIVISIÓN(?![a-zA-Z0-9_])/gi, '_divide'],
        [/(?<![a-zA-Z0-9_])MÁXIMO(?![a-zA-Z0-9_])/gi, '_max'],
        [/(?<![a-zA-Z0-9_])MÍNIMO(?![a-zA-Z0-9_])/gi, '_min'],
        [/(?<![a-zA-Z0-9_])RAÍZ(?![a-zA-Z0-9_])/gi, '_sqrt'],
        [/(?<![a-zA-Z0-9_])EDAD_AÑOS(?![a-zA-Z0-9_])/gi, '_ageYears'],
        [/(?<![a-zA-Z0-9_])AÑO(?![a-zA-Z0-9_])/gi, '_year'],

        // Aritméticas
        [/\bSUMA\b/gi, '_sum'],
        [/\bSUM\b/gi, '_sum'],
        [/\bRESTA\b/gi, '_subtract'],
        [/\bSUB\b/gi, '_subtract'],
        [/\bMULTIPLICACION\b/gi, '_multiply'],
        [/\bMULT\b/gi, '_multiply'],
        [/\bDIVISION\b/gi, '_divide'],
        [/\bDIV\b/gi, '_divide'],
        [/\bPROMEDIO\b/gi, '_avg'],
        [/\bAVG\b/gi, '_avg'],
        [/\bMEDIA\b/gi, '_avg'],
        [/\bMAXIMO\b/gi, '_max'],
        [/\bMAX\b/gi, '_max'],
        [/\bMINIMO\b/gi, '_min'],
        [/\bMIN\b/gi, '_min'],
        [/\bPOTENCIA\b/gi, '_pow'],
        [/\bPOW\b/gi, '_pow'],
        [/\bRAIZ\b/gi, '_sqrt'],
        [/\bSQRT\b/gi, '_sqrt'],
        [/\bVALOR_ABSOLUTO\b/gi, '_abs'],
        [/\bABS\b/gi, '_abs'],
        [/\bREDONDEAR\b/gi, '_round'],
        [/\bROUND\b/gi, '_round'],
        [/\bTRUNCAR\b/gi, '_trunc'],
        [/\bPISO\b/gi, '_floor'],
        [/\bFLOOR\b/gi, '_floor'],
        [/\bTECHO\b/gi, '_ceil'],
        [/\bCEIL\b/gi, '_ceil'],

        // Fecha
        [/\bEDAD_ANIOS\b/gi, '_ageYears'],
        [/\bEDAD_MESES\b/gi, '_ageMonths'],
        [/\bEDAD_DIAS\b/gi, '_ageDays'],
        [/\bDIAS_ENTRE\b/gi, '_daysBetween'],
        [/\bDIAS_DESDE_HOY\b/gi, '_daysFromToday'],
        [/\bMES\b/gi, '_month'],
        [/\bDIA\b/gi, '_day'],
        [/\bHOY\b/gi, '_today'],

        // Condicional
        [/\bSI\b/gi, '_if'],
        [/\bIF\b/gi, '_if'],

        // ✅ Lógicos como FUNCIÓN (cuando van seguidos de paréntesis) - PRIMERO
        [/\bY(?=\s*\()/g, '_and'],
        [/\bO(?=\s*\()/g, '_or'],
        [/\bNO(?=\s*\()/gi, '_not'],
        [/\bAND(?=\s*\()/gi, '_and'],
        [/\bOR(?=\s*\()/gi, '_or'],
        [/\bNOT(?=\s*\()/gi, '_not'],

        // ✅ Lógicos como OPERADOR infijo - DESPUÉS
        [/\bY\b/g, '&&'],
        [/\bO\b/g, '||'],
        [/\bNO\b/gi, '!'],
        [/\bAND\b/gi, '&&'],
        [/\bOR\b/gi, '||'],
        [/\bNOT\b/gi, '!'],

        [/\^/g, '**'],
      ];

      for (const [regex, replacement] of replacements) {
        evaluableExpression = evaluableExpression.replace(regex, replacement);
      }

      // ✅ PASO 3: Normalizar espacios antes de paréntesis
      evaluableExpression = evaluableExpression.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s+\(/g, '$1(');

      // ✅ PASO 4: Reemplazar IDs de campos con sus valores
      for (const fieldId in fieldValues) {
        const rawValue = fieldValues[fieldId];

        let replacement: string;
        if (Array.isArray(rawValue)) {
          replacement = JSON.stringify(rawValue);
        } else if (typeof rawValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawValue)) {
          replacement = `"${rawValue}"`;
        } else if (typeof rawValue === 'string') {
          replacement = `"${rawValue}"`;
        } else {
          const value = this.toNumber(rawValue);
          replacement = String(isNaN(value) ? 0 : value);
        }

        evaluableExpression = evaluableExpression.split(fieldId).join(replacement);
      }

      // ✅ PASO 5: Restaurar strings originales
      stringLiterals.forEach((str, i) => {
        evaluableExpression = evaluableExpression.replace(`__STR${i}__`, str);
      });

      // ✅ Funciones matemáticas
      const _sum = (...args: number[]) => args.reduce((a, b) => a + b, 0);
      const _subtract = (...args: number[]) => args.length >= 2 ? args[0] - args.slice(1).reduce((a, b) => a + b, 0) : 0;
      const _multiply = (...args: number[]) => args.reduce((a, b) => a * b, 1);
      const _divide = (...args: number[]) => args.length >= 2 && args[1] !== 0 ? args[0] / args[1] : 0;
      const _avg = (...args: number[]) => args.length > 0 ? args.reduce((a, b) => a + b, 0) / args.length : 0;
      const _max = (...args: number[]) => Math.max(...args);
      const _min = (...args: number[]) => Math.min(...args);
      const _pow = (base: number, exp: number) => Math.pow(base, exp);
      const _sqrt = (n: number) => Math.sqrt(n);
      const _abs = (n: number) => Math.abs(n);
      const _round = (n: number, d = 0) => Number(n.toFixed(d));
      const _trunc = (n: number) => Math.trunc(n);
      const _floor = (n: number) => Math.floor(n);
      const _ceil = (n: number) => Math.ceil(n);
      const _if = (condition: any, thenVal: any, elseVal: any = 0) => condition ? thenVal : elseVal;
      const _and = (...args: any[]) => args.every(Boolean) ? 1 : 0;
      const _or = (...args: any[]) => args.some(Boolean) ? 1 : 0;
      const _not = (n: any) => !n ? 1 : 0;

      // ✅ Funciones de fecha
      const _today = () => new Date().toISOString().split('T')[0];

      const _ageYears = (dateStr: string): number => {
        if (!dateStr) return 0;
        const birth = new Date(dateStr);
        const today = new Date();
        let years = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) years--;
        return years;
      };

      const _ageMonths = (dateStr: string): number => {
        if (!dateStr) return 0;
        const birth = new Date(dateStr);
        const today = new Date();
        let months = (today.getFullYear() - birth.getFullYear()) * 12;
        months += today.getMonth() - birth.getMonth();
        if (today.getDate() < birth.getDate()) months--;
        return months;
      };

      const _ageDays = (dateStr: string): number => {
        if (!dateStr) return 0;
        const birth = new Date(dateStr);
        const today = new Date();
        return Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
      };

      const _daysBetween = (dateStr1: string, dateStr2: string): number => {
        if (!dateStr1 || !dateStr2) return 0;
        const d1 = new Date(dateStr1);
        const d2 = new Date(dateStr2);
        return Math.abs(Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
      };

      const _daysFromToday = (dateStr: string): number => {
        if (!dateStr) return 0;
        const d = new Date(dateStr);
        const today = new Date();
        return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      };

      const _month = (dateStr: string): number => {
        if (!dateStr) return 0;
        return new Date(dateStr).getMonth() + 1;
      };

      const _year = (dateStr: string): number => {
        if (!dateStr) return 0;
        return new Date(dateStr).getFullYear();
      };

      const _day = (dateStr: string): number => {
        if (!dateStr) return 0;
        return new Date(dateStr).getDate();
      };

      const rawResult = Function(
        '_sum', '_subtract', '_multiply', '_divide', '_avg',
        '_max', '_min', '_pow', '_sqrt', '_abs', '_round',
        '_trunc', '_floor', '_ceil', '_if', '_and', '_or', '_not',
        '_today', '_ageYears', '_ageMonths', '_ageDays',
        '_daysBetween', '_daysFromToday', '_month', '_year', '_day',
        `"use strict"; return (${evaluableExpression});`
      )(
        _sum, _subtract, _multiply, _divide, _avg,
        _max, _min, _pow, _sqrt, _abs, _round,
        _trunc, _floor, _ceil, _if, _and, _or, _not,
        _today, _ageYears, _ageMonths, _ageDays,
        _daysBetween, _daysFromToday, _month, _year, _day
      );

      if (typeof rawResult === 'boolean') return rawResult ? 1 : 0;
      if (typeof rawResult === 'string') return rawResult as any; // ✅ permite retornar texto
      return this.toNumber(rawResult);

    } catch (error) {
      console.error('Error evaluando expresión:', error);
      return 0;
    }
  }

  private formatResult(value: number, formula: Formula): string {
    const rounded = Number(value.toFixed(formula.decimals));

    switch (formula.resultFormat.type) {
      case 'percentage':
        return `${rounded}${formula.resultFormat.suffix || '%'}`;
      case 'stars':
        return this.formatStars(rounded);
      case 'number':
      default:
        return this.formatNumber(rounded, formula.resultFormat);
    }
  }

  private formatNumber(value: number, format: any): string {
    const formatted = value.toLocaleString('es-GT');
    return `${format.prefix || ''}${formatted}${format.suffix || ''}`;
  }

  private formatStars(value: number): string {
    const stars = Math.round(value);
    return '⭐'.repeat(Math.min(Math.max(stars, 0), 5));
  }

  private toNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  validateFormula(formula: Formula, availableFields: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    formula.sourceFields.forEach(fieldId => {
      if (!availableFields.includes(fieldId)) {
        errors.push(`El campo "${fieldId}" no existe`);
      }
    });

    if (formula.sourceFields.includes(formula.targetField)) {
      errors.push('Una fórmula no puede referenciar a sí misma');
    }

    if (formula.formulaType === 'pondering') {
      if (!formula.weights || Object.keys(formula.weights).length === 0) {
        errors.push('La ponderación requiere pesos definidos');
      }
    }

    if (formula.formulaType === 'divide' && formula.sourceFields.length < 2) {
      errors.push('La división requiere al menos 2 campos');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getFormulaDescription(formula: Formula, elementLabels: { [id: string]: string }): string {
    const getLabel = (id: string) => elementLabels[id] || id;

    switch (formula.formulaType) {
      case 'sum':
        return `Suma de: ${formula.sourceFields.map(getLabel).join(' + ')}`;
      case 'subtract':
        return `${getLabel(formula.sourceFields[0])} - ${formula.sourceFields.slice(1).map(getLabel).join(' - ')}`;
      case 'multiply':
        return `Multiplicación de: ${formula.sourceFields.map(getLabel).join(' × ')}`;
      case 'divide':
        return `${getLabel(formula.sourceFields[0])} ÷ ${getLabel(formula.sourceFields[1])}`;
      case 'average':
        return `Promedio de: ${formula.sourceFields.map(getLabel).join(', ')}`;
      case 'pondering':
        return `Ponderación con pesos de: ${formula.sourceFields.map(getLabel).join(', ')}`;
      case 'max':
        return `Máximo de: ${formula.sourceFields.map(getLabel).join(', ')}`;
      case 'min':
        return `Mínimo de: ${formula.sourceFields.map(getLabel).join(', ')}`;
      case 'conditional':
        return `Fórmula condicional`;
      case 'custom':
        return `Fórmula personalizada: ${formula.customExpression}`;
      default:
        return 'Fórmula no definida';
    }
  }

}
