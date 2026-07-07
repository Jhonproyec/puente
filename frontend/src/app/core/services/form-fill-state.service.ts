import { computed, Injectable, signal } from '@angular/core';
import { FormDefinition } from './storage.service';
import { FormRegion } from '../models/form-builder.model';

export interface SectionStatus {
  regionId: string;
  title: string;
  isVisible: boolean;        // si la región pasa sus acciones
  isCompleted: boolean;      // todos los requeridos llenos
  isLocked: boolean;
  pendingRequired: number;
  index: number;
}

@Injectable({
  providedIn: 'root'
})
export class FormFillStateService {
  // Estado principal
  private _formDefinition = signal<FormDefinition | null>(null);
  private _responses = signal<Record<string, any>>({});
  private _visibleElements = signal<Set<string>>(new Set());
  private _visibleRegionIds = signal<string[]>([]);
  private _isDirty = signal(false);

  // Getters
  formDefinition = this._formDefinition.asReadonly();
  responses = this._responses.asReadonly();
  visibleElements = this._visibleElements.asReadonly();
  visibleRegionIds = this._visibleRegionIds.asReadonly();
  isDirty = this._isDirty.asReadonly();

  visibleSections = computed<SectionStatus[]>(() => {
    const def = this._formDefinition();
    if (!def) return [];

    const visibleIds = this._visibleRegionIds();
    const responses = this._responses();
    const visibleEls = this._visibleElements();
    let index = 0;

    return def.regions.map(region => {
      const isVisible = visibleIds.includes(region.id);

      // ✅ Una región está bloqueada si tiene acciones y no está en visibleIds
      const hasActions = region.actions && region.actions.length > 0;
      const isLocked = hasActions && !isVisible;

      // ✅ Contar campos requeridos pendientes
      const requiredElements = region.elements.filter((el: any) =>
        el.required && (visibleEls.has(el.id) || visibleEls.size === 0)
      );

      const pendingRequired = requiredElements.filter((el: any) => {
        const val = responses[el.id];
        return val === null || val === undefined || val === '' ||
          (Array.isArray(val) && val.length === 0);
      }).length;

      const isCompleted = isVisible &&
        requiredElements.length > 0 &&
        pendingRequired === 0;

      return {
        regionId: region.id,
        title: region.title,
        isVisible: isVisible || isLocked, // ✅ mostrar aunque esté bloqueada
        isCompleted,
        isLocked,
        pendingRequired,
        index: isVisible ? index++ : -1,
      };
    }).filter(s => s.isVisible);
  });

  setFormDefinition(def: FormDefinition): void {
    this._formDefinition.set(def);
  }

  setResponses(responses: Record<string, any>): void {
    this._responses.set({ ...responses });
    this._isDirty.set(true);
  }

  updateResponse(elementId: string, value: any): void {
    this._responses.update(prev => ({ ...prev, [elementId]: value }));
    this._isDirty.set(true);
  }

  private _visibleElementsByRegion = signal<Record<string, string[]>>({});

  setVisibleElementsForRegion(regionId: string, elements: Set<string>): void {
    this._visibleElementsByRegion.update(prev => ({
      ...prev,
      [regionId]: Array.from(elements)
    }));
    // Reconstruir el set completo desde todas las regiones
    const allVisible = new Set<string>();
    Object.values(this._visibleElementsByRegion()).forEach(ids => {
      ids.forEach(id => allVisible.add(id));
    });
    this._visibleElements.set(allVisible);
  }

  setVisibleRegionIds(ids: string[]): void {
    this._visibleRegionIds.set([...ids]);
  }

  markAsSaved(): void {
    this._isDirty.set(false);
  }

  clearAll(): void {
    this._formDefinition.set(null);
    this._responses.set({});
    this._visibleElements.set(new Set());
    this._visibleRegionIds.set([]);
    this._isDirty.set(false);
  }

  // private isSectionCompleted(region: FormRegion): boolean {
  //   const responses = this._responses();
  //   const visibleEls = this._visibleElements();

  //   return region.elements
  //     .filter(el => el.required && visibleEls.has(el.id))
  //     .every(el => {
  //       const val = responses[el.id];
  //       return val !== null && val !== undefined && val !== '' &&
  //         !(Array.isArray(val) && val.length === 0);
  //     });
  // }

  getBuiltPayload(formKey: string): object {
    return {
      id_formulario: formKey,
      responses: this._responses(),
      visibleElements: Array.from(this._visibleElements()),
      estructura: {
        regions: this._formDefinition()?.regions || []
      }
    };
  }

}
