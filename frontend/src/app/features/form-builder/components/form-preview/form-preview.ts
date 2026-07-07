import { Component } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { FormDefinition, FormElement, FormRegion } from '../../../../core/models/form-builder.model';
import { FormBuilderStateService } from '../../../../core/services/form-builder-state.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-preview',
  imports: [
    CommonModule,
  ],
  templateUrl: './form-preview.html',
  styleUrl: './form-preview.css'
})
export class FormPreview {
  private destroy$ = new Subject<void>();

  formDefinition: FormDefinition | null = null;

  constructor(private stateService: FormBuilderStateService) { }

  ngOnInit(): void {
    this.stateService.formDefinition$
      .pipe(takeUntil(this.destroy$))
      .subscribe(form => {
        this.formDefinition = form;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  hasActions(item: FormRegion | FormElement): boolean {
    return item.actions && item.actions.length > 0;
  }

  getPlaceholder(element: FormElement): string {
    if (element.type === 'select') {
      return element.placeholder || 'Seleccione una opción';
    }
    return element.placeholder;
  }

  getRegionDependency(region: FormRegion): string | null {
    if (!region.repeatConfig?.enabled) return null;

    if (!region.repeatConfig.triggerFieldLabel) return null;

    return region.repeatConfig.triggerFieldLabel;
  }

  getOptionsForDisplay(element: FormElement): string[] {
    if (!element.selectedOptions || element.selectedOptions.length === 0) {
      return [];
    }

    // ✅ SI TIENE CATÁLOGO: Mostrar solo UN ejemplo
    if (element.catalogType) {
      // Mostrar solo el primer elemento como ejemplo
      const firstOpt = element.selectedOptions[0];

      if (typeof firstOpt === 'string' || typeof firstOpt === 'number') {
        // Si es ID (string/number), mostrar: "opción del catálogo"
        return ['Opción del catálogo'];
      } else if (typeof firstOpt === 'object' && 'nombre' in firstOpt) {
        // Si es objeto con nombre, mostrar ese nombre
        return [(firstOpt as any).nombre];
      }

      return ['Opción del catálogo'];
    }

    // ✅ SIN CATÁLOGO (MANUAL): Mostrar todas las opciones ingresadas
    return element.selectedOptions.map(opt => {
      // Si es string o número, devolver directamente
      if (typeof opt === 'string' || typeof opt === 'number') {
        return String(opt);
      }

      // Si es objeto con 'nombre', devolver ese
      if (typeof opt === 'object' && 'nombre' in opt) {
        return (opt as any).nombre;
      }

      // Si es objeto con 'label', devolver ese
      if (typeof opt === 'object' && 'label' in opt) {
        return (opt as any).label;
      }

      return String(opt);
    });
  }

  getRegionElements(region: FormRegion): FormElement[] {
    return region.children.filter(
      c => (c as FormRegion).type !== 'region'
    ) as FormElement[];
  }
}
