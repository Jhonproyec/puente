import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
// import {
//   CdkDragDrop,
//   DragDropModule,
//   moveItemInArray,
//   transferArrayItem
// } from '@angular/cdk/drag-drop';
import { Subject, takeUntil } from 'rxjs';
import { FormBuilderStateService } from '../../../../core/services/form-builder-state.service';
import { FormDefinition, FormElement, FormRegion, ViewMode } from '../../../../core/models/form-builder.model';
import { MatIconModule } from '@angular/material/icon';
import { SortableDirective, SortableDropEvent } from '../../../../shared/directives/sortable.directive';

@Component({
  selector: 'app-structure-panel',
  standalone: true,
  imports: [CommonModule, SortableDirective, MatIconModule],
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
  openSubRegionDropdown: string | null = null;

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openSubRegionDropdown = null;
  }

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

    document.addEventListener('click', () => {
      this.openSubRegionDropdown = null;
    });
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

  // dropRegion(event: CdkDragDrop<FormRegion[]>): void {
  //   if (event.previousIndex === event.currentIndex) return;

  //   moveItemInArray(
  //     event.container.data,
  //     event.previousIndex,
  //     event.currentIndex
  //   );

  //   // 🔑 Actualizar el estado
  //   this.stateService.updateFormDefinition({ ...this.formDefinition! });
  // }
  // ── Drag & Drop para anidar regiones ──────────────────────
  // isDraggingRegion = false;
  // draggingRegionId: string | null = null;

  // onRegionDragStarted(regionId: string): void {
  //   this.isDraggingRegion = true;
  //   this.draggingRegionId = regionId;
  // }

  // onRegionDragEnded(): void {
  //   this.isDraggingRegion = false;
  //   this.draggingRegionId = null;
  // }

  // onDropIntoRegion(event: DragEvent, parentRegionId: string): void {
  //   event.stopPropagation();
  //   if (!this.draggingRegionId) return;
  //   if (this.draggingRegionId === parentRegionId) return;
  //   this.stateService.nestRegionInto(this.draggingRegionId, parentRegionId);
  //   this.expandedRegions.add(parentRegionId);
  //   this.isDraggingRegion = false;
  //   this.draggingRegionId = null;
  // }

  // canDropInto(parentRegionId: string): boolean {
  //   if (!this.isDraggingRegion || !this.draggingRegionId) return false;
  //   if (this.draggingRegionId === parentRegionId) return false;
  //   const dragging = this.stateService.findRegionById(this.draggingRegionId);
  //   if (!dragging) return false;
  //   // Evitar ciclos: buscar en los hijos que sean regiones
  //   const draggingSubRegions = dragging.children.filter(c => this.stateService.isRegion(c)) as FormRegion[];
  //   return !this.stateService.findRegionById(parentRegionId, draggingSubRegions);
  // }

  onUnnestRegion(regionId: string): void {
    this.stateService.unnestRegion(regionId);
  }

  // dropChild(event: CdkDragDrop<(FormElement | FormRegion)[]>, region: FormRegion): void {
  //   if (event.previousContainer === event.container) {
  //     moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
  //   } else {
  //     transferArrayItem(
  //       event.previousContainer.data,
  //       event.container.data,
  //       event.previousIndex,
  //       event.currentIndex
  //     );
  //   }
  //   this.stateService.updateFormDefinition({ ...this.formDefinition! });
  // }



  // =================== ACTIONS & VALIDATIONS VIEW ===================

  getAllActions(): Array<{ region?: FormRegion; element?: FormElement; actions: any[] }> {
    if (!this.formDefinition) return [];
    const result: Array<{ region?: FormRegion; element?: FormElement; actions: any[] }> = [];

    const processRegion = (region: FormRegion) => {
      if (region.actions?.length) result.push({ region, actions: region.actions });
      region.children.forEach(c => {
        if (this.stateService.isRegion(c)) {
          processRegion(c);
        } else if (c.actions?.length) {
          result.push({ element: c, actions: c.actions });
        }
      });
    };

    this.formDefinition.regions.forEach(processRegion);
    return result;
  }

  getAllValidations(): Array<{ element: FormElement; validations: any[] }> {
    if (!this.formDefinition) return [];
    const result: Array<{ element: FormElement; validations: any[] }> = [];

    const processRegion = (region: FormRegion) => {
      region.children.forEach(c => {
        if (this.stateService.isRegion(c)) {
          processRegion(c);
        } else if (c.validations?.length) {
          result.push({ element: c, validations: c.validations });
        }
      });
    };

    this.formDefinition.regions.forEach(processRegion);
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
    const personRegion = this.stateService.buildPersonRegion();
    this.stateService.formDefinition.regions.push(personRegion);
    this.stateService.updateFormDefinition({ ...this.stateService.formDefinition });
    this.stateService.selectRegion(personRegion.id);
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


  toggleSubRegionDropdown(regionId: string, event: Event): void {
    event.stopPropagation();
    this.openSubRegionDropdown = this.openSubRegionDropdown === regionId ? null : regionId;
  }

  onAddNewSubRegion(parentRegionId: string): void {
    this.openSubRegionDropdown = null;
    const subRegion = this.stateService.addSubRegion(parentRegionId);
    if (subRegion) {
      this.expandedRegions.add(parentRegionId);
      this.stateService.selectRegion(subRegion.id);
    }
  }

  onNestExistingRegion(regionId: string, parentRegionId: string): void {
    this.openSubRegionDropdown = null;
    this.stateService.nestRegionInto(regionId, parentRegionId);
    this.expandedRegions.add(parentRegionId);
  }

  getAvailableRegionsToNest(parentRegionId: string): FormRegion[] {
    if (!this.formDefinition) return [];
    return this.formDefinition.regions.filter(r =>
      r.id !== parentRegionId &&
      !r.parentRegionId &&
      !r.children.some(c => this.stateService.isRegion(c))
    );
  }

  getElementCount(region: FormRegion): number {
    return region.children.filter(c => !this.stateService.isRegion(c)).length;
  }

  getSubRegionCount(region: FormRegion): number {
    return region.children.filter(c => this.stateService.isRegion(c)).length;
  }

  hasSubRegions(region: FormRegion): boolean {
    return region.children.some(c => this.stateService.isRegion(c));
  }

  onSortableDrop(event: SortableDropEvent): void {
    const { fromContainerId, toContainerId, oldIndex, newIndex } = event;
    if (fromContainerId === toContainerId && oldIndex === newIndex) return;

    const form = this.stateService.formDefinition;
    const cloned: FormDefinition = JSON.parse(JSON.stringify(form));

    const fromList = this.findChildrenById(cloned.regions, fromContainerId);
    const toList = this.findChildrenById(cloned.regions, toContainerId);
    if (!fromList || !toList) return;

    const [moved] = fromList.splice(oldIndex, 1);
    if (!moved) return;

    if (this.stateService.isRegion(moved as any)) {
      const targetIsRegion = this.stateService.findRegionById(toContainerId, cloned.regions);
      (moved as any).parentRegionId = targetIsRegion ? toContainerId : undefined;
    }

    toList.splice(newIndex, 0, moved);
    this.stateService.updateFormDefinition(cloned);
  }
  private findChildrenById(
    regions: FormRegion[],
    containerId: string
  ): (FormElement | FormRegion)[] | null {
    if (containerId === 'root') return regions as any;
    for (const region of regions) {
      if (region.id === containerId) return region.children;
      const subRegions = region.children.filter(
        c => this.stateService.isRegion(c)
      ) as FormRegion[];
      const found = this.findChildrenById(subRegions, containerId);
      if (found) return found;
    }
    return null;
  }

  onAddEvaluationTable(): void {
    const element = this.stateService.addEvaluationTable();
    if (!element) {
      alert('Primero crea una región');
      return;
    }
    const regionId = this.stateService.selectedRegion || '';
    this.stateService.selectElement(element.id, regionId);
    this.stateService.setPanelMode('properties');
  }

  /**
 * Filtro para el contenedor raíz: solo permite soltar regiones,
 * nunca elementos sueltos (deben vivir siempre dentro de una región).
 */
  rootPutFilter = (dragEl: HTMLElement): boolean => {
    return !dragEl.classList.contains('element-item');
  };

  // StructurePanel
trackById(index: number, item: FormElement | FormRegion): string {
  return item.id;
}


}