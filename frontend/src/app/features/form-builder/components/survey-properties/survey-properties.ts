import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FormElement, SurveyConfig } from '../../../../core/models/form-builder.model';
import { FormBuilderStateService } from '../../../../core/services/form-builder-state.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { takeUntil } from 'rxjs';
import { Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ImagePickerDialog } from '../../../image-catalog/components/image-picker-dialog/image-picker-dialog';
import { CatalogImage } from '../../../image-catalog/image-catalog';

interface CatalogOption {
  value: string | number;
  label: string;
}

@Component({
  selector: 'app-survey-properties',
  imports: [CommonModule, FormsModule],
  templateUrl: './survey-properties.html',
  styleUrl: './survey-properties.css',
  standalone: true
})
export class SurveyProperties implements OnInit, OnChanges {
  @Input() element!: FormElement;

  surveyConfig: SurveyConfig | undefined;
  availableCatalogQuestions: FormElement[] = [];
  availableSubtotals: FormElement[] = [];
  availableCatalogs: Array<{ id: number; name: string }> = [];
  catalogOptions: CatalogOption[] = [];
  loadingCatalog = false;
  enableSpecificOptions = false;

  private destroy$ = new Subject<void>();

  constructor(
    private stateService: FormBuilderStateService,
    private catalogService: CatalogService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    this.surveyConfig = this.element.surveyConfig;
    this.loadAvailableSurveyQuestions();
    this.loadAvailableCatalogs();

    if (this.surveyConfig?.catalogSelectedIds?.length) {
      this.enableSpecificOptions = true;
      if (this.surveyConfig.catalogType) {
        this.loadCatalogOptions(this.surveyConfig.catalogType);
      }
    }

    // ✅ Cargar opciones si ya tiene catálogo para mostrar imágenes
    if (this.surveyConfig?.catalogType) {
      this.loadCatalogOptions(this.surveyConfig.catalogType);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['element'] && !changes['element'].firstChange) {
      this.surveyConfig = this.element.surveyConfig;
      this.loadAvailableSurveyQuestions();
      if (this.surveyConfig?.catalogType) {
        this.loadCatalogOptions(this.surveyConfig.catalogType);
      }
    }
  }

  trackByResponseIndex(index: number): number {
    return index;
  }

  // =================== LOADERS ===================

  loadAvailableSurveyQuestions(): void {
    const allElements = this.stateService.getAllElements();
    this.availableCatalogQuestions = allElements.filter(el =>
      el.type === 'survey' &&
      el.surveyConfig?.mode === 'catalog_question' &&
      el.id !== this.element.id
    );
    this.availableSubtotals = allElements.filter(el =>
      el.type === 'survey' &&
      el.surveyConfig?.mode === 'catalog_subtotal' &&
      el.id !== this.element.id
    );
  }

  loadAvailableCatalogs(): void {
    this.catalogService.getAvailableCatalogs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (catalogs) => { this.availableCatalogs = catalogs; this.cdr.markForCheck(); },
        error: (err) => console.error('Error cargando catálogos:', err)
      });
  }

  loadCatalogOptions(catalogId: string): void {
    this.loadingCatalog = true;
    this.catalogService.getCatalogData(Number(catalogId))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.catalogOptions = data.map(item => ({ value: item.id, label: item.nombre }));
          this.loadingCatalog = false;
          this.cdr.markForCheck();
        },
        error: (err) => { console.error('Error:', err); this.loadingCatalog = false; }
      });
  }

  // =================== SOURCE ===================

  // onSourceChange(source: 'manual' | 'catalog'): void {
  //   this.stateService.updateSurveyConfig(this.element.id, {
  //     surveySource: source,
  //     // Resetear modo según fuente
  //     mode: source === 'catalog' ? 'catalog_question' : 'question',
  //     catalogType: undefined,
  //     catalogSelectedIds: []
  //   });
  //   this.catalogOptions = [];
  //   this.surveyConfig = this.stateService.getSurveyConfig(this.element.id);
  //   this.cdr.markForCheck();
  // }

  // =================== MODE ===================

  onModeChange(mode: string): void {
    this.stateService.updateSurveyConfig(this.element.id, { mode: mode as any });
    this.surveyConfig = this.stateService.getSurveyConfig(this.element.id);
    this.loadAvailableSurveyQuestions();
    this.cdr.markForCheck();
  }

  // =================== CATALOG QUESTION ===================

  onCatalogChange(catalogId: string): void {
    if (!catalogId) return;
    this.enableSpecificOptions = false;
    this.catalogOptions = [];
    this.stateService.updateSurveyConfig(this.element.id, {
      catalogType: catalogId,
      catalogSelectedIds: [],
      catalogOptions: []
    });
    this.surveyConfig = this.stateService.getSurveyConfig(this.element.id);
    this.loadCatalogOptions(catalogId);
    this.cdr.markForCheck();
  }

  isCatalogOptionSelected(optionId: string | number): boolean {
    return (this.surveyConfig?.catalogSelectedIds || []).includes(String(optionId));
  }

  toggleCatalogOption(optionId: string | number, checked: boolean): void {
    const current = [...(this.surveyConfig?.catalogSelectedIds || [])];
    const idStr = String(optionId);
    if (checked) { if (!current.includes(idStr)) current.push(idStr); }
    else { const idx = current.indexOf(idStr); if (idx > -1) current.splice(idx, 1); }
    this.stateService.updateSurveyConfig(this.element.id, { catalogSelectedIds: current });
    this.surveyConfig = this.stateService.getSurveyConfig(this.element.id);
    this.cdr.markForCheck();
  }

  toggleEnableSpecificOptions(): void {
    this.enableSpecificOptions = !this.enableSpecificOptions;
    if (this.enableSpecificOptions) {
      if (this.surveyConfig?.catalogType) this.loadCatalogOptions(this.surveyConfig.catalogType);
    } else {
      this.catalogOptions = [];
      this.stateService.updateSurveyConfig(this.element.id, { catalogSelectedIds: [] });
      this.surveyConfig = this.stateService.getSurveyConfig(this.element.id);
    }
    this.cdr.markForCheck();
  }

  toggleAllCatalogOptions(): void {
    const allIds = this.catalogOptions.map(o => String(o.value));
    const current = this.surveyConfig?.catalogSelectedIds || [];
    const newSelected = current.length === allIds.length ? [] : allIds;
    this.stateService.updateSurveyConfig(this.element.id, { catalogSelectedIds: newSelected });
    this.surveyConfig = this.stateService.getSurveyConfig(this.element.id);
    this.cdr.markForCheck();
  }

  // =================== LINKED FIELDS ===================

  isFieldLinked(fieldId: string): boolean {
    return (this.surveyConfig?.linkedFieldIds || []).includes(fieldId);
  }

  toggleLinkedField(fieldId: string, checked: boolean): void {
    const linked = [...(this.surveyConfig?.linkedFieldIds || [])];
    if (checked) { if (!linked.includes(fieldId)) linked.push(fieldId); }
    else { const idx = linked.indexOf(fieldId); if (idx > -1) linked.splice(idx, 1); }
    this.stateService.updateSurveyConfig(this.element.id, { linkedFieldIds: linked });
    this.surveyConfig = this.stateService.getSurveyConfig(this.element.id);
  }

  // =================== MANUAL (existente) ===================

  updateLabel(newLabel: string): void {
    this.stateService.updateElement(this.element.id, { label: newLabel });
  }

  onDisplayTypeChange(newType: 'text' | 'images'): void {
    this.stateService.updateSurveyConfig(this.element.id, { displayType: newType });
    this.surveyConfig = this.stateService.getSurveyConfig(this.element.id);
    this.cdr.markForCheck();
  }
  onMultipleSelectionChange(value: boolean): void {
    this.stateService.updateSurveyConfig(this.element.id, { multipleSelection: value });
    this.surveyConfig = this.stateService.getSurveyConfig(this.element.id);
    this.cdr.markForCheck();
  }

  updateResponseLabel(index: number, newLabel: string): void {
    // this.stateService.updateSurveyResponse(this.element.id, index as 0 | 1 | 2 | 3 | 4, { label: newLabel });
    this.surveyConfig = this.stateService.getSurveyConfig(this.element.id);
  }

  onImageSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    input.value = '';

    this.dialog.open(ImagePickerDialog, {
      width: '900px',
      maxHeight: '90vh',
      autoFocus: false,
    }).afterClosed().subscribe((image: CatalogImage | null) => {
      if (!image) return;
      // usar image.path según tu lógica de stateService
    });
  }

  removeResponseImage(index: number): void {
    // this.stateService.updateSurveyResponse(this.element.id, index as 0 | 1 | 2 | 3 | 4, { imageUrl: undefined });
    this.surveyConfig = this.stateService.getSurveyConfig(this.element.id);
  }

  getImageFileName(imageUrl: string): string {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('blob:')) return 'Imagen cargada';
    return imageUrl.split('/').pop() || '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getCatalogOptionImage(catalogId: string | number): string {
    return this.surveyConfig?.catalogOptions?.find(
      o => String(o.catalogId) === String(catalogId)
    )?.imageUrl || '';
  }
  onOptionImageSelected(event: Event, catalogId: string | number): void {
    // Ignorar el input file, abrir el picker
    const input = event.target as HTMLInputElement;
    input.value = '';

    this.dialog.open(ImagePickerDialog, {
      width: '900px',
      maxHeight: '90vh',
      autoFocus: false,
    }).afterClosed().subscribe((image: CatalogImage | null) => {
      if (!image) return;

      const current = [...(this.surveyConfig?.catalogOptions || [])];
      const idx = current.findIndex(o => String(o.catalogId) === String(catalogId));

      if (idx > -1) current[idx] = { ...current[idx], imageUrl: image.path };
      else current.push({ catalogId, imageUrl: image.path });

      this.stateService.updateSurveyConfig(this.element.id, { catalogOptions: current });
      this.surveyConfig = this.stateService.getSurveyConfig(this.element.id);
      this.cdr.markForCheck();
    });
  }

  removeOptionImage(catalogId: string | number): void {
    const current = (this.surveyConfig?.catalogOptions || [])
      .map(o => String(o.catalogId) === String(catalogId) ? { ...o, imageUrl: undefined } : o);
    this.stateService.updateSurveyConfig(this.element.id, { catalogOptions: current });
    this.surveyConfig = this.stateService.getSurveyConfig(this.element.id);
    this.cdr.markForCheck();
  }

  updateHelpText(helpText: string): void {
    this.stateService.updateElement(this.element.id, { helpText });
  }

  updateRequired(required: boolean): void {
    this.stateService.updateElement(this.element.id, { required });
  }
}