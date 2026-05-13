import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormElement } from '../../../../core/models/form-builder.model';
import { SurveyAnswersService } from '../../../../core/services/survey-answers.service';
import { FormBuilderStateService } from '../../../../core/services/form-builder-state.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { lastValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { CatalogSurveyAnswerService } from '../../../../core/services/catalog-survey-answer.service';

interface CatalogOption {
  value: string | number;
  label: string;
  isNone: boolean;
}

@Component({
  selector: 'app-survey-field',
  imports: [CommonModule],
  templateUrl: './survey-field.html',
  styleUrl: './survey-field.css',
  standalone: true
})
export class SurveyField implements OnInit {
  @Input() element!: FormElement;

  // Manual
  selectedAnswer: 1 | 2 | 3 | 4 | 5 | null = null;
  allElements: FormElement[] = [];

  // Catálogo
  catalogOptions: CatalogOption[] = [];
  selectedCatalogIds: (string | number)[] = [];
  loadingOptions = false;
  subtotalScore = 0;
  starsScore = 0;
  subtotalScoresMap = new Map<string, number>();

  constructor(
    private surveyAnswersService: SurveyAnswersService,
    private catalogSurveyAnswersService: CatalogSurveyAnswerService,
    private stateService: FormBuilderStateService,
    private catalogService: CatalogService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.allElements = this.stateService.getAllElements();
    const mode = this.element.surveyConfig?.mode;

    // if (mode === 'question') {
    //   // Manual - comportamiento existente
    //   this.selectedAnswer = this.surveyAnswersService.getSurveyAnswer(this.element.id);

    // } else 
    if (mode === 'catalog_question') {
      // Cargar opciones del catálogo
      this.loadCatalogOptions();
      // Restaurar selección previa si existe
      this.selectedCatalogIds = this.catalogSurveyAnswersService.getSelectedIds(this.element.id);

    } else if (mode === 'catalog_subtotal') {
      // Calcular subtotal inicial
      this.recalculateSubtotal();

    } else if (mode === 'catalog_stars') {
      // Calcular estrellas inicial
      this.recalculateStars();
    }
  }

  // =================== CATALOG QUESTION ===================

  private async loadCatalogOptions(): Promise<void> {
    const config = this.element.surveyConfig;
    if (!config?.catalogType) return;

    this.loadingOptions = true;

    try {
      const data = await lastValueFrom(
        this.catalogService.getCatalogData(Number(config.catalogType)).pipe(
          map(items => items.map(item => ({
            value: item.id,
            label: item.nombre,
            isNone: this.catalogSurveyAnswersService.isNoneOption(item.nombre)
          })))
        ),
        { defaultValue: [] }
      );

      // Filtrar si tiene opciones específicas
      const selectedIds = config.catalogSelectedIds || [];
      if (selectedIds.length > 0) {
        this.catalogOptions = data.filter(opt =>
          selectedIds.includes(String(opt.value))
        );
      } else {
        this.catalogOptions = data;
      }

      // ✅ Si no hay selección previa, seleccionar todas automáticamente
      // excluyendo las opciones "ninguno"
      const existingSelection = this.catalogSurveyAnswersService.getSelectedIds(this.element.id);

      if (existingSelection.length === 0) {
        this.selectedCatalogIds = this.catalogOptions
          .filter(opt => !opt.isNone)
          .map(opt => opt.value);

        // Guardar el score inicial con todas seleccionadas
        const noneIds = this.catalogOptions
          .filter(o => o.isNone)
          .map(o => o.value);

        this.catalogSurveyAnswersService.saveAnswer(
          this.element.id,
          this.selectedCatalogIds,
          this.catalogOptions.length,
          noneIds
        );
      } else {
        // Restaurar selección previa
        this.selectedCatalogIds = existingSelection;
      }

    } catch (error) {
      console.error('Error cargando opciones del catálogo:', error);
      this.catalogOptions = [];
    }

    this.loadingOptions = false;
    this.cdr.markForCheck();
  }

  isCatalogOptionSelected(optionValue: string | number): boolean {
    return this.selectedCatalogIds.some(id => String(id) === String(optionValue));
  }

  isCatalogOptionDisabled(option: CatalogOption): boolean {
    if (option.isNone) return false;
    // Deshabilitar si hay un "ninguno" seleccionado
    return this.selectedCatalogIds.some(id => {
      const selected = this.catalogOptions.find(o => String(o.value) === String(id));
      return selected?.isNone;
    });
  }

  onCatalogOptionChange(option: CatalogOption, checked: boolean): void {
    // ✅ Si es selección simple (radio), reemplazar selección
    if (!this.element.surveyConfig?.multipleSelection) {
      this.selectedCatalogIds = checked ? [option.value] : [];
      const noneIds = this.catalogOptions.filter(o => o.isNone).map(o => o.value);
      this.catalogSurveyAnswersService.saveAnswer(
        this.element.id, this.selectedCatalogIds, this.catalogOptions.length, noneIds
      );
      this.cdr.markForCheck();
      return;
    }

    // ✅ Selección múltiple - lógica original
    if (checked) {
      if (option.isNone) {
        this.selectedCatalogIds = [option.value];
      } else {
        this.selectedCatalogIds = this.selectedCatalogIds.filter(id => {
          const opt = this.catalogOptions.find(o => String(o.value) === String(id));
          return !opt?.isNone;
        });
        this.selectedCatalogIds = [...this.selectedCatalogIds, option.value];
      }
    } else {
      this.selectedCatalogIds = this.selectedCatalogIds.filter(
        id => String(id) !== String(option.value)
      );
    }

    const noneIds = this.catalogOptions.filter(o => o.isNone).map(o => o.value);
    this.catalogSurveyAnswersService.saveAnswer(
      this.element.id, this.selectedCatalogIds, this.catalogOptions.length, noneIds
    );
    this.cdr.markForCheck();
  }

  getCurrentScore(): number {
    return this.catalogSurveyAnswersService.getScore(this.element.id);
  }

  // =================== CATALOG SUBTOTAL ===================

  recalculateSubtotal(): void {
    const linkedIds = this.element.surveyConfig?.linkedFieldIds || [];
    this.subtotalScore = this.catalogSurveyAnswersService.calculateSubtotal(linkedIds);
    this.cdr.markForCheck();
  }

  getLinkedQuestionScore(fieldId: string): number {
    return this.catalogSurveyAnswersService.getScore(fieldId);
  }

  getLinkedQuestionLabel(fieldId: string): string {
    return this.allElements.find(el => el.id === fieldId)?.label || fieldId;
  }

  // =================== CATALOG STARS ===================

  recalculateStars(): void {
    const linkedIds = this.element.surveyConfig?.linkedFieldIds || [];

    // Construir mapa de subtotales
    this.subtotalScoresMap = new Map();
    linkedIds.forEach(id => {
      const linkedElement = this.allElements.find(el => el.id === id);
      if (linkedElement) {
        const subIds = linkedElement.surveyConfig?.linkedFieldIds || [];
        const score = this.catalogSurveyAnswersService.calculateSubtotal(subIds);
        this.subtotalScoresMap.set(id, score);
      }
    });

    this.starsScore = this.catalogSurveyAnswersService.calculateStars(
      linkedIds,
      this.subtotalScoresMap
    );

    this.cdr.markForCheck();
  }

  getStarsArray(count: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  getSubtotalLabel(fieldId: string): string {
    return this.allElements.find(el => el.id === fieldId)?.label || fieldId;
  }

  getSubtotalScore(fieldId: string): number {
    return this.subtotalScoresMap.get(fieldId) || 0;
  }

  // =================== MANUAL (existente) ===================

  selectAnswer(value: 1 | 2 | 3 | 4 | 5): void {
    this.selectedAnswer = value;
    const formId = this.stateService.formDefinition.name;
    this.surveyAnswersService.saveSurveyAnswer(formId, this.element.id, value);
  }

  // getSelectedLabel(): string {
  //   if (!this.selectedAnswer || !this.element.surveyConfig) return '';
  //   const response = this.element.surveyConfig.responses.find(r => r.value === this.selectedAnswer);
  //   return response?.label || '';
  // }

  getLinkedField(fieldId: string): FormElement | undefined {
    return this.allElements.find(el => el.id === fieldId);
  }

  getAnswerValue(fieldId: string): 1 | 2 | 3 | 4 | 5 {
    return this.surveyAnswersService.getSurveyAnswer(fieldId) || 0 as any;
  }

  getLinkedFieldAnswer(fieldId: string): string {
    // Ya no aplica con catálogo - el label viene del catalogSurveyAnswersService
    const selectedIds = this.catalogSurveyAnswersService.getSelectedIds(fieldId);
    if (selectedIds.length === 0) return '';
    // Buscar label en las opciones cargadas
    const opt = this.catalogOptions.find(o => String(o.value) === String(selectedIds[0]));
    return opt?.label || '';
  }

  getLinkedFieldImageUrl(fieldId: string): string {
    const linkedField = this.getLinkedField(fieldId);
    if (!linkedField?.surveyConfig) return '';
    const selectedIds = this.catalogSurveyAnswersService.getSelectedIds(fieldId);
    if (selectedIds.length === 0) return '';
    // Buscar imagen en catalogOptions del surveyConfig
    const opt = linkedField.surveyConfig.catalogOptions?.find(
      o => String(o.catalogId) === String(selectedIds[0])
    );
    return opt?.imageUrl || '';
  }

  getAverageOfResults(): number {
    const linkedFieldIds = this.element.surveyConfig?.linkedFieldIds || [];
    if (linkedFieldIds.length === 0) return 0;
    return this.surveyAnswersService.getAverageAnswer(linkedFieldIds);
  }
  getOptionImageUrl(catalogId: string | number): string {
    return this.element.surveyConfig?.catalogOptions?.find(
      o => String(o.catalogId) === String(catalogId)
    )?.imageUrl || '';
  }
}