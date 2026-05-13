import { Injectable } from '@angular/core';
import { FormDefinition, FormElement, FormRegion, PanelMode, SurveyConfig, SurveyResponse } from '../models/form-builder.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FormBuilderStateService {
  private elementCounter = 0;

  // State observables
  private formDefinitionSubject = new BehaviorSubject<FormDefinition>({
    name: 'Nuevo Formulario',
    regions: []
  });

  private selectedElementSubject = new BehaviorSubject<string | null>(null);
  private selectedTypeSubject = new BehaviorSubject<'element' | 'region' | null>(null);
  private selectedRegionSubject = new BehaviorSubject<string | null>(null);
  private panelModeSubject = new BehaviorSubject<PanelMode>('properties');

  // Public observables
  formDefinition$ = this.formDefinitionSubject.asObservable();
  selectedElement$ = this.selectedElementSubject.asObservable();
  selectedType$ = this.selectedTypeSubject.asObservable();
  selectedRegion$ = this.selectedRegionSubject.asObservable();
  panelMode$ = this.panelModeSubject.asObservable();

  // Getters para valores síncronos
  get formDefinition(): FormDefinition {
    return this.formDefinitionSubject.value;
  }

  get selectedElement(): string | null {
    return this.selectedElementSubject.value;
  }

  get selectedType(): 'element' | 'region' | null {
    return this.selectedTypeSubject.value;
  }

  get selectedRegion(): string | null {
    return this.selectedRegionSubject.value;
  }

  get panelMode(): PanelMode {
    return this.panelModeSubject.value;
  }

  // ========== FORM DEFINITION METHODS ==========

  updateFormName(name: string): void {
    const currentForm = this.formDefinition;
    this.formDefinitionSubject.next({
      ...currentForm,
      name
    });
  }

  addRegion(): FormRegion {
    const currentForm = this.formDefinition;
    const regionId = `region_${Date.now()}`;

    const newRegion: FormRegion = {
      id: regionId,
      type: 'region',
      title: `Nueva Región ${currentForm.regions.length + 1}`,
      elements: [],
      actions: [],
      validations: [],
      repeatConfig: '',
    };

    this.formDefinitionSubject.next({
      ...currentForm,
      regions: [...currentForm.regions, newRegion]
    });

    return newRegion;
  }

  deleteRegion(regionId: string): void {
    const currentForm = this.formDefinition;
    this.formDefinitionSubject.next({
      ...currentForm,
      regions: currentForm.regions.filter(r => r.id !== regionId)
    });

    // Clear selection if deleted region was selected
    if (this.selectedElement === regionId) {
      this.clearSelection();
    }
  }

  updateRegionTitle(regionId: string, title: string): void {
    const currentForm = this.formDefinition;
    this.formDefinitionSubject.next({
      ...currentForm,
      regions: currentForm.regions.map(region =>
        region.id === regionId ? { ...region, title } : region
      )
    });
  }

  updateRegionTriggerField(
    regionId: string,
    triggerFieldId: string,
    triggerFieldLabel: string
  ): void {

    const currentForm = this.formDefinition;

    this.formDefinitionSubject.next({
      ...currentForm,
      regions: currentForm.regions.map(region =>
        region.id === regionId
          ? {
            ...region,
            repeatConfig: {
              ...region.repeatConfig,
              enabled: true,
              triggerFieldId,
              triggerFieldLabel
            }
          }
          : region
      )
    });

    console.log(currentForm);
  }


  addElement(): FormElement | null {
    const currentForm = this.formDefinition;
    if (currentForm.regions.length === 0) {
      return null;
    }

    const elementId = `element_${Date.now()}_${this.elementCounter++}`;
    const newElement: FormElement = {
      id: elementId,  // ← CAMBIO: era 'id'
      type: 'text',
      label: `Campo ${this.elementCounter}`,
      placeholder: '',
      required: false,
      multipleSelecction: false,
      options: [],
      selectedOptions: [],
      catalogType: null,
      actions: [],
      validations: [],
      formulas: []  // ← NUEVO: Agregar
    };

    // Determinar región objetivo (usar selectedRegion o última)
    let targetRegionId: string | null;

    if (this.selectedRegion) {
      const regionExists = currentForm.regions.some(r => r.id === this.selectedRegion);
      if (regionExists) {
        targetRegionId = this.selectedRegion;
      } else {
        targetRegionId = currentForm.regions[currentForm.regions.length - 1].id;
        this.selectedRegionSubject.next(targetRegionId);
      }
    } else {
      targetRegionId = currentForm.regions[currentForm.regions.length - 1].id;
      this.selectedRegionSubject.next(targetRegionId);
    }

    const updatedRegions = currentForm.regions.map(region =>
      region.id === targetRegionId  // ← CAMBIO: era 'id'
        ? { ...region, elements: [...region.elements, newElement] }
        : region
    );

    this.formDefinitionSubject.next({
      ...currentForm,
      regions: updatedRegions
    });

    return newElement;
  }

  deleteElement(elementId: string): void {
    const currentForm = this.formDefinition;
    this.formDefinitionSubject.next({
      ...currentForm,
      regions: currentForm.regions.map(region => ({
        ...region,
        elements: region.elements.filter(el => el.id !== elementId)
      }))
    });

    if (this.selectedElement === elementId) {
      this.clearSelection();
    }
  }

  updateElement(elementId: string, updates: Partial<FormElement>): void {
    const currentForm = this.formDefinition;
    this.formDefinitionSubject.next({
      ...currentForm,
      regions: currentForm.regions.map(region => ({
        ...region,
        elements: region.elements.map(element =>
          element.id === elementId ? { ...element, ...updates } : element
        )
      }))
    });
  }

  // ========== SELECTION METHODS ==========

  selectElement(elementId: string, regionId: string): void {
    this.selectedElementSubject.next(elementId);
    this.selectedTypeSubject.next('element');
    this.selectedRegionSubject.next(regionId);
    this.panelModeSubject.next('properties');
  }

  selectRegion(regionId: string): void {
    this.selectedElementSubject.next(regionId);
    this.selectedTypeSubject.next('region');
    this.selectedRegionSubject.next(regionId);
    this.panelModeSubject.next('properties');
  }

  clearSelection(): void {
    this.selectedElementSubject.next(null);
    this.selectedTypeSubject.next(null);
    this.selectedRegionSubject.next(null);
    this.panelModeSubject.next('properties');
  }

  setPanelMode(mode: PanelMode): void {
    this.panelModeSubject.next(mode);
  }

  // ========== HELPER METHODS ==========

  getSelectedElementData(): FormElement | FormRegion | null {
    const elementId = this.selectedElement;
    const type = this.selectedType;

    if (!elementId || !type) return null;

    if (type === 'region') {
      return this.formDefinition.regions.find(r => r.id === elementId) || null;
    } else {
      for (const region of this.formDefinition.regions) {
        const element = region.elements.find(el => el.id === elementId);
        if (element) return element;
      }
      return null;
    }
  }

  getAllElements(): FormElement[] {
    return this.formDefinition.regions.flatMap(region => region.elements);
  }

  getRegionByElementId(elementId: string): FormRegion | null {
    for (const region of this.formDefinition.regions) {
      if (region.elements.some(el => el.id === elementId)) {
        return region;
      }
    }
    return null;
  }

  // ========== DRAG & DROP ==========

  reorderElements(sourceElementId: string, targetElementId: string): void {
    const currentForm = this.formDefinition;
    let sourceElement: FormElement | null = null;
    let sourceRegionId: string | null = null;
    let targetRegionId: string | null = null;
    let targetIndex = -1;

    // Find source element and region
    for (const region of currentForm.regions) {
      const index = region.elements.findIndex(el => el.id === sourceElementId);
      if (index !== -1) {
        sourceElement = region.elements[index];
        sourceRegionId = region.id;
        break;
      }
    }

    // Find target position
    for (const region of currentForm.regions) {
      const index = region.elements.findIndex(el => el.id === targetElementId);
      if (index !== -1) {
        targetRegionId = region.id;
        targetIndex = index;
        break;
      }
    }

    if (!sourceElement || !sourceRegionId || !targetRegionId || targetIndex === -1) {
      return;
    }

    // Perform reorder
    const updatedRegions = currentForm.regions.map(region => {
      if (region.id === sourceRegionId) {
        return {
          ...region,
          elements: region.elements.filter(el => el.id !== sourceElementId)
        };
      }
      return region;
    }).map(region => {
      if (region.id === targetRegionId) {
        const newElements = [...region.elements];
        newElements.splice(targetIndex, 0, sourceElement!);
        return { ...region, elements: newElements };
      }
      return region;
    });

    this.formDefinitionSubject.next({
      ...currentForm,
      regions: updatedRegions
    });
  }

  // ========== EXPORT / IMPORT ==========

  exportFormDefinition(): string {
    return JSON.stringify(this.formDefinition, null, 2);
  }

  importFormDefinition(json: string): void {
    try {
      const formDefinition = JSON.parse(json) as FormDefinition;
      this.formDefinitionSubject.next(formDefinition);
      this.clearSelection();
    } catch (error) {
      console.error('Error importing form definition:', error);
      throw new Error('Invalid form definition JSON');
    }
  }

  resetForm(): void {
    this.formDefinitionSubject.next({
      name: 'Nuevo Formulario',
      regions: []
    });
    this.clearSelection();
    this.elementCounter = 0;
  }

  public setElementImage(elementId: string, imageUrl: string, altText: string): void {
    const currentForm = this.formDefinition;

    this.formDefinitionSubject.next({
      ...currentForm,
      regions: currentForm.regions.map(region => ({
        ...region,
        elements: region.elements.map(element =>
          element.id === elementId
            ? {
              ...element,
              image: {
                url: imageUrl,
                position: 'above',
                size: 'medium',
                altText: altText,
                caption: undefined
              }
            }
            : element
        )
      }))
    });
  }

  /**
   * Elimina la imagen de un elemento
   * @param elementId - ID del elemento
   */
  public removeElementImage(elementId: string): void {
    const currentForm = this.formDefinition;

    this.formDefinitionSubject.next({
      ...currentForm,
      regions: currentForm.regions.map(region => ({
        ...region,
        elements: region.elements.map(element =>
          element.id === elementId
            ? { ...element, image: undefined }
            : element
        )
      }))
    });
  }

  /**
   * Obtiene la imagen de un elemento
   * @param elementId - ID del elemento
   * @returns ImageConfig del elemento o undefined
   */
  public getElementImage(elementId: string): any {
    for (const region of this.formDefinition.regions) {
      const element = region.elements.find(el => el.id === elementId);
      if (element) {
        return element.image;
      }
    }
    return undefined;
  }

  /**
   * Comprueba si un elemento tiene imagen
   * @param elementId - ID del elemento
   * @returns true si tiene imagen
   */
  public hasElementImage(elementId: string): boolean {
    for (const region of this.formDefinition.regions) {
      const element = region.elements.find(el => el.id === elementId);
      if (element && element.image && element.image.url) {
        return true;
      }
    }
    return false;
  }

  /**
   * Actualiza la URL de la imagen de un elemento
   * @param elementId - ID del elemento
   * @param newImageUrl - Nueva URL de la imagen
   */
  public updateElementImageUrl(elementId: string, newImageUrl: string): void {
    const currentForm = this.formDefinition;

    this.formDefinitionSubject.next({
      ...currentForm,
      regions: currentForm.regions.map(region => ({
        ...region,
        elements: region.elements.map(element =>
          element.id === elementId && element.image
            ? {
              ...element,
              image: {
                ...element.image,
                url: newImageUrl
              }
            }
            : element
        )
      }))
    });
  }

  /**
   * Actualiza el texto alternativo de la imagen
   * @param elementId - ID del elemento
   * @param newAltText - Nuevo texto alternativo
   */
  public updateElementImageAlt(elementId: string, newAltText: string): void {
    const currentForm = this.formDefinition;

    this.formDefinitionSubject.next({
      ...currentForm,
      regions: currentForm.regions.map(region => ({
        ...region,
        elements: region.elements.map(element =>
          element.id === elementId && element.image
            ? {
              ...element,
              image: {
                ...element.image,
                altText: newAltText
              }
            }
            : element
        )
      }))
    });
  }

  /**
   * Agrega un campo survey a una región
   */
  public addSurveyField(): FormElement | null {
    const currentForm = this.formDefinition;
    if (currentForm.regions.length === 0) {
      return null;
    }

    const elementId = `survey_${Date.now()}_${this.elementCounter++}`;

    const newSurveyField: FormElement = {
      id: elementId,
      type: 'survey',
      label: `Pregunta Survey ${this.elementCounter}`,
      placeholder: '',
      required: false,
      multipleSelecction: false,
      options: [],
      selectedOptions: [],
      catalogType: null,
      actions: [],
      validations: [],
      formulas: [],
      isSurveyField: true,
      surveyConfig: {
        mode: 'catalog_question',
        displayType: 'text',
        multipleSelection: true,
        catalogOptions: [],
        linkedFieldIds: [],
        catalogSelectedIds: []
      }
    };

    let targetRegionId: string | null;

    if (this.selectedRegion) {
      const regionExists = currentForm.regions.some(r => r.id === this.selectedRegion);
      if (regionExists) {
        targetRegionId = this.selectedRegion;
      } else {
        targetRegionId = currentForm.regions[currentForm.regions.length - 1].id;
        this.selectedRegionSubject.next(targetRegionId);
      }
    } else {
      targetRegionId = currentForm.regions[currentForm.regions.length - 1].id;
      this.selectedRegionSubject.next(targetRegionId);
    }

    const updatedRegions = currentForm.regions.map(region =>
      region.id === targetRegionId
        ? { ...region, elements: [...region.elements, newSurveyField] }
        : region
    );

    this.formDefinitionSubject.next({
      ...currentForm,
      regions: updatedRegions
    });

    return newSurveyField;
  }

  /**
   * Actualiza la configuración survey de un elemento
   */
  public updateSurveyConfig(elementId: string, config: Partial<SurveyConfig>): void {
    const currentForm = this.formDefinition;

    this.formDefinitionSubject.next({
      ...currentForm,
      regions: currentForm.regions.map(region => ({
        ...region,
        elements: region.elements.map(element =>
          element.id === elementId && element.surveyConfig
            ? {
              ...element,
              surveyConfig: {
                ...element.surveyConfig,
                ...config
              }
            }
            : element
        )
      }))
    });
  }

  /**
   * Actualiza una respuesta específica en surveyConfig.responses
   */

  /**
   * Obtiene la configuración survey de un elemento
   */
  public getSurveyConfig(elementId: string): SurveyConfig | undefined {
    for (const region of this.formDefinition.regions) {
      const element = region.elements.find(el => el.id === elementId);
      if (element) {
        return element.surveyConfig;
      }
    }
    return undefined;
  }

  /**
   * Obtiene todos los campos survey del formulario
   */
  public getAllSurveyFields(): FormElement[] {
    return this.formDefinition.regions
      .flatMap(region => region.elements)
      .filter(el => el.type === 'survey' && el.isSurveyField);
  }

  /**
   * Obtiene solo los campos survey con mode='question'
   */
  public getSurveyQuestionFields(): FormElement[] {
    return this.getAllSurveyFields()
      .filter(el => el.surveyConfig?.mode === 'catalog_question');
  }

  /**
   * Obtiene solo los campos survey con mode='result'
   */
  public getSurveyResultFields(): FormElement[] {
    return this.getAllSurveyFields()
      .filter(el => el.surveyConfig?.mode === 'result');
  }

  updateFormDefinition(formDefinition: FormDefinition): void {
    this.formDefinitionSubject.next(formDefinition);
  }

  /**
   * Cargar una definición completa de formulario
   * Útil para cargar desde localStorage o BD
   * Sincroniza todos los observables necesarios
   * @param formDefinition Definición del formulario a cargar
   */
  loadFormDefinition(formDefinition: FormDefinition): void {
    if (!formDefinition) {
      console.error('❌ FormDefinition no puede ser null');
      return;
    }

    try {
      // Actualizar la definición principal
      this.formDefinitionSubject.next({ ...formDefinition });

      // Resetear la selección para que no haya conflictos
      this.selectedElementSubject.next(null);
      this.selectedTypeSubject.next(null);
      this.selectedRegionSubject.next(null);
      this.panelModeSubject.next('properties');

      // Resetear el contador de elementos para que IDs nuevos no se dupliquen
      this.elementCounter = 0;

      console.log('✅ FormDefinition cargada completamente:', formDefinition);
      console.log('✅ Observable sincronizados');
    } catch (error) {
      console.error('❌ Error al cargar FormDefinition:', error);
    }
  }

  /**
   * Verificar si un formulario está vacío
   * @returns true si no tiene regiones o está vacío
   */
  isFormEmpty(): boolean {
    return !this.formDefinition.regions || this.formDefinition.regions.length === 0;
  }

  /**
   * Obtener copia profunda del formulario actual
   * Útil para crear respaldos
   * @returns Copia profunda de formDefinition
   */
  getFormDefinitionCopy(): FormDefinition {
    return JSON.parse(JSON.stringify(this.formDefinition));
  }

  /**
   * Obtener total de regiones
   * @returns Cantidad de regiones
   */
  getTotalRegions(): number {
    return this.formDefinition.regions?.length || 0;
  }

  /**
   * Obtener total de elementos en todo el formulario
   * @returns Cantidad total de elementos
   */
  getTotalElements(): number {
    return this.formDefinition.regions?.reduce((total, region) => {
      return total + (region.elements?.length || 0);
    }, 0) || 0;
  }

  /**
   * Exportar formulario con metadata adicional
   * @returns JSON con formulario y metadata
   */
  exportFormWithMetadata(): string {
    const exported = {
      definition: this.formDefinition,
      metadata: {
        totalRegions: this.getTotalRegions(),
        totalElements: this.getTotalElements(),
        exportedAt: new Date().toISOString()
      }
    };
    return JSON.stringify(exported, null, 2);
  }

  /**
   * Importar formulario desde JSON con metadata
   * @param jsonString JSON con formulario y metadata
   * @returns true si se importó correctamente
   */
  importFormFromJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      const formDefinition = data.definition || data;
      this.loadFormDefinition(formDefinition);
      console.log('✅ Formulario importado exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Error al importar formulario:', error);
      return false;
    }
  }

}