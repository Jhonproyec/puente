import { Component, OnDestroy, OnInit } from '@angular/core';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import { FormElement, FormRegion, PanelMode } from '../../../../core/models/form-builder.model';
import { FormBuilderStateService } from '../../../../core/services/form-builder-state.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { CommonModule } from '@angular/common';
import { ElementProperties } from './element-properties/element-properties';
import { ActionPanel } from '../action-panel/action-panel';
import { ValidationPanel } from '../validation-panel/validation-panel';
import { FormulasPanel } from '../formulas-panel/formulas-panel';

@Component({
  selector: 'app-properties-panel',
  imports: [
    CommonModule,
    ElementProperties,
    ActionPanel,
    ValidationPanel,
    FormulasPanel
  ],
  templateUrl: './properties-panel.html',
  styleUrl: './properties-panel.css'
})
export class PropertiesPanel implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  panelMode: PanelMode = 'properties';
  selectedElement: FormElement | FormRegion | null = null;
  selectedType: 'element' | 'region' | null = null;

  constructor(
    public stateService: FormBuilderStateService,
    public catalogService: CatalogService
  ) { }

  ngOnInit(): void {
    // Observar cambios en el panel mode y elemento seleccionado
    combineLatest([
      this.stateService.panelMode$,
      this.stateService.selectedElement$,
      this.stateService.selectedType$,
      this.stateService.formDefinition$
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([mode, elementId, type]: any) => {
        this.panelMode = mode;
        this.selectedType = type;
        this.selectedElement = this.stateService.getSelectedElementData();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  backToProperties(): void {
    this.stateService.setPanelMode('properties');
  }

  isElementType(): this is { selectedElement: FormElement } {
    return (
      this.selectedElement !== null &&
      'label' in this.selectedElement
    );
  }

  isRegionType(): boolean {
    return this.selectedType === 'region';
  }
}
