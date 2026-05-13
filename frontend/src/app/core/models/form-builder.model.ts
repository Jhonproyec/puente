export interface CascadeConfig {
  enabled: boolean;
  triggerFieldId: string;
  triggerFieldLabel: string;
  filterKey: string;
}
export interface FormElement {
  id: string;
  type: ElementType;
  label: string;
  placeholder: string;
  required: boolean;
  multipleSelecction: boolean;
  options: string[];
  selectedOptions: (string | { id: string | number; nombre: string })[];
  catalogType: string | null;
  actions: DynamicAction[];
  validations: ValidationRule[];
  formulas?: Formula[];
  image?: ImageConfig;
  ratingConfig?: RatingConfig;
  cameraConfig?: CameraConfig;
  surveyConfig?: SurveyConfig;
  isSurveyField?: boolean;
  enableSpecificOptions?: boolean;
  cascadeConfig?: CascadeConfig | null;
  helpText?: string;
  fieldRole?: string;
  isPersonIdentifier?: boolean;
}

export interface FormRegion {
  id: string;
  type: 'region';
  title: string;
  elements: FormElement[];
  actions: DynamicAction[];
  validations: ValidationRule[];
  image?: ImageConfig;
  repeatConfig?: any;
  regionType?: 'persona' | 'default';

}

export interface FormDefinition {
  name: string;
  regions: FormRegion[];
  globalFormulas?: Formula[];
}

export type ElementType =
  | 'text'
  | 'number'
  | 'email'
  | 'date'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'camera'
  | 'rating'
  | 'survey'
  | 'time' | 'phone' | 'coordinates' | 'heading';

export interface DynamicAction {
  triggerField: string;
  triggerLabel: string;
  type: ActionType;
  value: string;
  valueEnd?: string;
  name?: string;
  formulaExpression?: string;
  sourceFields?: string[];
  betweenType?: 'number' | 'date' | 'catalog';
}

export type ActionType =
  | 'show_if_equals'
  | 'show_if_not_equals'
  | 'show_if_greater'
  | 'show_if_less'
  | 'show_if_greater_equal'
  | 'show_if_less_equal'
  | 'show_if_filled'
  | 'show_if_empty'
  | 'show_if_between'
  | 'show_if_custom'
  | 'hide_if_equals'
  | 'hide_if_not_equals'
  | 'hide_if_greater'
  | 'hide_if_less'
  | 'hide_if_greater_equal'
  | 'hide_if_less_equal'
  | 'hide_if_filled'
  | 'hide_if_empty'
  | 'hide_if_between'
  | 'hide_if_custom';

export interface ValidationRule {
  type: ValidationType;
  value?: string;
  valueTo?: string;
  useTodayAsMax?: boolean;
  message: string;
  expression?: string;
  sourceFields?: string[];
}

export type ValidationType =
  | 'min_length'
  | 'max_length'
  | 'pattern'
  | 'no_special_chars'
  | 'only_letters'
  | 'only_numbers'
  | 'min_value'
  | 'max_value'
  | 'integer_only'
  | 'positive_only'
  | 'email_format'
  | 'email_domain'
  | 'min_date'
  | 'max_date'
  | 'date_today'
  | 'date_future'
  | 'date_past'
  | 'age_min'
  | 'age_max'
  | 'min_selections'
  | 'max_selections'
  | 'max_file_size'
  | 'image_dimensions'
  | 'custom_formula';

export interface CatalogOption {
  value: string | number;
  label: string;
  image?: string;
}

export interface Catalog {
  id: string;
  name: string;
  options: CatalogOption[];
}

export type ViewMode = 'structure' | 'actions' | 'validations' | 'formulas';  // ← AGREGAR 'formulas'
export type PanelMode = 'properties' | 'actions' | 'validations' | 'formulas' | 'images';  // ← AGREGAR 'formulas' e 'images'



// Sistema de Fórmulas
export interface Formula {
  id: string;
  name: string;
  targetField: string;  // Campo que muestra el resultado
  formulaType: FormulaType;
  sourceFields: string[];  // Campos de origen
  operation?: MathOperation;  // Para operaciones simples
  weights?: { [fieldId: string]: number };  // Para ponderaciones
  customExpression?: string;  // Para fórmulas personalizadas
  resultFormat: FormulaResultFormat;
  decimals: number;
  conditions?: FormulaCondition[];  // Para fórmulas condicionales
}

export type FormulaType =
  | 'sum'           // Suma
  | 'subtract'      // Resta
  | 'multiply'      // Multiplicación
  | 'divide'        // División
  | 'average'       // Promedio
  | 'pondering'     // Ponderación con pesos
  | 'max'           // Máximo
  | 'min'           // Mínimo
  | 'conditional'   // Condicional (IF)
  | 'custom';       // Expresión personalizada

export type MathOperation = '+' | '-' | '*' | '/' | 'avg';

export interface FormulaResultFormat {
  type: 'number' | 'percentage' | 'currency' | 'stars';
  prefix?: string;  // Ej: "Q. " para moneda
  suffix?: string;  // Ej: "%" para porcentaje
  separator?: string;  // Separador de miles
}

export interface FormulaCondition {
  field: string;
  operator: 'equals' | 'greater' | 'less' | 'greater_equal' | 'less_equal';
  value: string | number;
  thenFormula: string;  // Expresión si se cumple
  elseFormula?: string;  // Expresión si no se cumple
}

// Resultado de una fórmula (en runtime)
export interface FormulaResult {
  formulaId: string;
  value: number;
  formattedValue: string;
  timestamp: Date;
  sourceValues: { [fieldId: string]: any };
}

// Campo de Rating (Estrellas)
export interface RatingConfig {
  maxStars: number;  // Default: 5
  allowHalf: boolean;  // Permitir medias estrellas
  readOnly: boolean;  // Solo lectura (para resultados)
  icon: 'star' | 'heart' | 'thumb';
  size: 'small' | 'medium' | 'large';
  color: string;  // Color de las estrellas
  sourceFormula?: string;  // ID de fórmula que lo calcula
}

// Configuración de Imágenes
export interface ImageConfig {
  url: string;
  position: 'above' | 'below' | 'left' | 'right';
  size: 'small' | 'medium' | 'large' | 'full';
  altText: string;
  caption?: string;
}

// Interfaz simplificada para imagen de elemento
export interface ElementImage {
  url: string;
  altText: string;
}

export interface ElementImageConfig {
  url: string;
  altText: string;
  isOptional: boolean;  // true = la imagen es opcional
}

// Configuración de Cámara Mejorada
export interface CameraConfig {
  source: 'camera' | 'gallery' | 'both';
  maxPhotos: number;
  compression: boolean;
  maxSizeMB: number;
  requireTimestamp: boolean;
  watermark?: string;
  quality: number;  // 0-100
}

/**
 * Interfaz para el token de la fórmula
 */
export interface FormulaToken {
  type: 'function' | 'field' | 'number' | 'operator' | 'parenthesis' | 'comma' | 'string';
  value: string;
  position: number;
}

/**
 * Interfaz para validación de fórmulas
 */
export interface FormulaValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  tokens?: FormulaToken[];
}

/**
 * Interfaz para referencia de campo
 */
export interface FieldReference {
  fieldId: string;
  fieldLabel: string;
  position: number;
  value: number;
}

export interface SurveyResponse {
  value: 1 | 2 | 3 | 4 | 5;
  label: string;
  imageUrl?: string;
}

export interface SurveyConfig {
mode: 'catalog_question' | 'catalog_subtotal' | 'catalog_stars' | 'result';
  displayType: 'text' | 'images';       
  multipleSelection: boolean;           
  catalogOptions?: CatalogSurveyOption[]; 
  linkedFieldIds?: string[];
  catalogType?: string;
  catalogSelectedIds?: string[];
}

export interface CatalogSurveyOption {
  catalogId: string | number;
  imageUrl?: string;
}
export interface SurveyAnswerData {
  surveyFieldId: string;
  value: 1 | 2 | 3 | 4 | 5;
}

export interface SurveyAnswers {
  formDefinitionId: string;
  respondentId: string;
  answers: SurveyAnswerData[];
  timestamp: Date;
}

export function createDefaultSurveyConfig(): SurveyConfig {
  return {
    mode: 'catalog_question',
    displayType: 'text',
    multipleSelection: true,
    catalogOptions: [],
    linkedFieldIds: [],
    catalogType: undefined,
    catalogSelectedIds: []
  };
}