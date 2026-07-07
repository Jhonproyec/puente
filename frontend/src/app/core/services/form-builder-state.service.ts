import { Injectable } from '@angular/core';
import { FormDefinition, FormElement, FormRegion, PanelMode, SurveyConfig, SurveyResponse } from '../models/form-builder.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FormBuilderStateService {
  private elementCounter = 0;

  private formDefinitionSubject = new BehaviorSubject<FormDefinition>({
    name: 'Nuevo Formulario',
    regions: []
  });

  isRegion(child: FormElement | FormRegion): child is FormRegion {
    return (child as FormRegion).type === 'region';
  }

  isElement(child: FormElement | FormRegion): child is FormElement {
    return (child as FormRegion).type !== 'region';
  }

  private selectedElementSubject = new BehaviorSubject<string | null>(null);
  private selectedTypeSubject = new BehaviorSubject<'element' | 'region' | null>(null);
  private selectedRegionSubject = new BehaviorSubject<string | null>(null);
  private panelModeSubject = new BehaviorSubject<PanelMode>('properties');

  formDefinition$ = this.formDefinitionSubject.asObservable();
  selectedElement$ = this.selectedElementSubject.asObservable();
  selectedType$ = this.selectedTypeSubject.asObservable();
  selectedRegion$ = this.selectedRegionSubject.asObservable();
  panelMode$ = this.panelModeSubject.asObservable();

  get formDefinition(): FormDefinition { return this.formDefinitionSubject.value; }
  get selectedElement(): string | null { return this.selectedElementSubject.value; }
  get selectedType(): 'element' | 'region' | null { return this.selectedTypeSubject.value; }
  get selectedRegion(): string | null { return this.selectedRegionSubject.value; }
  get panelMode(): PanelMode { return this.panelModeSubject.value; }

  // ══════════════════════════════════════════════════════════
  // HELPERS RECURSIVOS (base de todo lo demás)
  // ══════════════════════════════════════════════════════════

  /** Busca una región por ID de forma recursiva */
  findRegionById(regionId: string, regions: FormRegion[] = this.formDefinition.regions): FormRegion | null {
    for (const region of regions) {
      if (region.id === regionId) return region;
      const subRegions = region.children.filter(c => this.isRegion(c)) as FormRegion[];
      const found = this.findRegionById(regionId, subRegions);
      if (found) return found;
    }
    return null;
  }

  /** Busca el padre de una región por ID de forma recursiva */
  findParentRegion(regionId: string, regions: FormRegion[] = this.formDefinition.regions): FormRegion | null {
    for (const region of regions) {
      const subRegions = region.children.filter(c => this.isRegion(c)) as FormRegion[];
      if (subRegions.some(sr => sr.id === regionId)) return region;
      const found = this.findParentRegion(regionId, subRegions);
      if (found) return found;
    }
    return null;
  }

  /** Busca el elemento que contiene un elementId de forma recursiva */
  findRegionByElementId(elementId: string, regions: FormRegion[] = this.formDefinition.regions): FormRegion | null {
    for (const region of regions) {
      if (region.children.some(c => this.isElement(c) && c.id === elementId)) return region;
      const subRegions = region.children.filter(c => this.isRegion(c)) as FormRegion[];
      const found = this.findRegionByElementId(elementId, subRegions);
      if (found) return found;
    }
    return null;
  }

  /** Aplica una función de transformación a todas las regiones recursivamente */
  private mapRegionsRecursive(
    regions: FormRegion[],
    transform: (region: FormRegion) => FormRegion
  ): FormRegion[] {
    return regions.map(region => {
      const transformed = transform(region);
      return {
        ...transformed,
        children: transformed.children.map(child =>
          this.isRegion(child)
            ? this.mapRegionsRecursive([child as FormRegion], transform)[0]
            : child
        )
      };
    });
  }

  /** Filtra regiones recursivamente (para delete) */
  private filterRegionsRecursive(
    regions: FormRegion[],
    predicate: (region: FormRegion) => boolean
  ): FormRegion[] {
    return regions
      .filter(predicate)
      .map(region => {
        const subRegions = region.children.filter(c => this.isRegion(c)) as FormRegion[];
        const elements = region.children.filter(c => this.isElement(c));
        return {
          ...region,
          children: [
            ...elements,
            ...this.filterRegionsRecursive(subRegions, predicate)
          ]
        };
      });
  }
  /** Obtiene todos los elementos del árbol completo de regiones */
  private getAllElementsRecursive(regions: FormRegion[]): FormElement[] {
    return regions.flatMap(region => {
      const elements = region.children.filter(c => this.isElement(c)) as FormElement[];
      const subRegions = region.children.filter(c => this.isRegion(c)) as FormRegion[];
      return [...elements, ...this.getAllElementsRecursive(subRegions)];
    });
  }

  // ══════════════════════════════════════════════════════════
  // FORM DEFINITION
  // ══════════════════════════════════════════════════════════

  updateFormName(name: string): void {
    this.formDefinitionSubject.next({ ...this.formDefinition, name });
  }

  updateFormDefinition(formDefinition: FormDefinition): void {
    this.formDefinitionSubject.next(formDefinition);
  }

  loadFormDefinition(formDefinition: FormDefinition): void {
    if (!formDefinition) { console.error('❌ FormDefinition no puede ser null'); return; }
    try {
      // 👇 Migrar formularios viejos que tienen elements[] en lugar de children[]
      const migrated = this.migrateFormDefinition(formDefinition);

      this.formDefinitionSubject.next({ ...migrated });
      this.selectedElementSubject.next(null);
      this.selectedTypeSubject.next(null);
      this.selectedRegionSubject.next(null);
      this.panelModeSubject.next('properties');
      this.elementCounter = 0;
    } catch (error) {
      console.error('❌ Error al cargar FormDefinition:', error);
    }
  }

  private migrateFormDefinition(formDefinition: FormDefinition): FormDefinition {
    return {
      ...formDefinition,
      regions: this.migrateRegions(formDefinition.regions ?? [])
    };
  }

  private migrateRegions(regions: any[]): FormRegion[] {
    return regions.map(region => {
      if (Array.isArray(region.children)) {
        return {
          ...region,
          // 👇 respetar el orden original, solo migrar recursivamente las subregiones
          children: region.children.map((c: any) =>
            c.type === 'region' ? this.migrateRegions([c])[0] : c
          )
        } as FormRegion;
      }

      // Migrar de elements[] + subRegions[] a children[]
      const elements = Array.isArray(region.elements) ? region.elements : [];
      const subRegions = Array.isArray(region.subRegions)
        ? this.migrateRegions(region.subRegions)
        : [];

      return {
        ...region,
        children: [...elements, ...subRegions],
        elements: undefined,
        subRegions: undefined,
      } as FormRegion;
    });
  }
  resetForm(): void {
    this.formDefinitionSubject.next({ name: 'Nuevo Formulario', regions: [] });
    this.clearSelection();
    this.elementCounter = 0;
  }

  // ══════════════════════════════════════════════════════════
  // REGIONES (con soporte recursivo de subRegions)
  // ══════════════════════════════════════════════════════════

  addRegion(): FormRegion {
    const currentForm = this.formDefinition;
    const regionId = `region_${Date.now()}`;

    const newRegion: FormRegion = {
      id: regionId,
      type: 'region',
      title: `Nueva Región ${currentForm.regions.length + 1}`,
      children: [],
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

  /**
   * Agrega una subregión dentro de una región existente (cualquier nivel)
   */
  addSubRegion(parentRegionId: string): FormRegion | null {
    const currentForm = this.formDefinition;
    const parent = this.findRegionById(parentRegionId);
    if (!parent) return null;

    const subRegionId = `region_${Date.now()}`;
    const newSubRegion: FormRegion = {
      id: subRegionId,
      type: 'region',
      title: 'Nueva Subregión',
      children: [],
      actions: [],
      validations: [],
      repeatConfig: '',
      parentRegionId
    };

    const updatedRegions = this.mapRegionsRecursive(currentForm.regions, region =>
      region.id === parentRegionId
        ? { ...region, children: [...region.children, newSubRegion] }
        : region
    );

    this.formDefinitionSubject.next({ ...currentForm, regions: updatedRegions });
    return newSubRegion;
  }

  /**
   * Mueve una región para convertirla en subregión de otra (drag & drop anidado)
   */
  nestRegionInto(regionId: string, parentRegionId: string): void {
    if (regionId === parentRegionId) return;
    const regionToMove = this.findRegionById(regionId);
    if (!regionToMove) return;
    const subRegions = regionToMove.children.filter(c => this.isRegion(c)) as FormRegion[];
    if (this.findRegionById(parentRegionId, subRegions)) return;

    const currentForm = this.formDefinition;
    let extracted: FormRegion | null = null;

    const extractRegion = (regions: FormRegion[]): FormRegion[] =>
      regions
        .map(region => {
          if (region.id === regionId) {
            extracted = { ...region, parentRegionId };
            return null;
          }
          const subR = region.children.filter(c => this.isRegion(c)) as FormRegion[];
          const els = region.children.filter(c => this.isElement(c));
          return {
            ...region,
            children: [...els, ...extractRegion(subR).filter(Boolean)] as (FormElement | FormRegion)[]
          };
        })
        .filter(Boolean) as FormRegion[];

    const regionsWithoutMoved = extractRegion(currentForm.regions);
    if (!extracted) return;

    const insertRegion = (regions: FormRegion[]): FormRegion[] =>
      regions.map(region => {
        if (region.id === parentRegionId) {
          return { ...region, children: [...region.children, extracted!] };
        }
        const subR = region.children.filter(c => this.isRegion(c)) as FormRegion[];
        const els = region.children.filter(c => this.isElement(c));
        return {
          ...region,
          children: [...els, ...insertRegion(subR)] as (FormElement | FormRegion)[]
        };
      });

    this.formDefinitionSubject.next({
      ...currentForm,
      regions: insertRegion(regionsWithoutMoved)
    });
  }

  /**
   * Saca una subregión de su padre y la pone en el nivel raíz
   */
  unnestRegion(regionId: string): void {
    const currentForm = this.formDefinition;
    let extracted: FormRegion | null = null;

    const extractRegion = (regions: FormRegion[]): FormRegion[] =>
      regions.map(region => {
        const subR = region.children.filter(c => this.isRegion(c)) as FormRegion[];
        const els = region.children.filter(c => this.isElement(c));
        const filteredSubR = subR
          .map(sr => {
            if (sr.id === regionId) {
              extracted = { ...sr, parentRegionId: undefined };
              return null;
            }
            return sr;
          })
          .filter(Boolean) as FormRegion[];
        return {
          ...region,
          children: [...els, ...filteredSubR] as (FormElement | FormRegion)[]
        };
      });

    const updatedRegions = extractRegion(currentForm.regions);
    if (!extracted) return;

    this.formDefinitionSubject.next({
      ...currentForm,
      regions: [...updatedRegions, extracted]
    });
  }

  deleteRegion(regionId: string): void {
    const currentForm = this.formDefinition;
    const updatedRegions = this.filterRegionsRecursive(
      currentForm.regions,
      r => r.id !== regionId
    );
    this.formDefinitionSubject.next({ ...currentForm, regions: updatedRegions });
    if (this.selectedElement === regionId) this.clearSelection();
  }

  updateRegionTitle(regionId: string, title: string): void {
    const currentForm = this.formDefinition;
    const updatedRegions = this.mapRegionsRecursive(currentForm.regions, region =>
      region.id === regionId ? { ...region, title } : region
    );
    this.formDefinitionSubject.next({ ...currentForm, regions: updatedRegions });
  }

  updateRegionTriggerField(regionId: string, triggerFieldId: string, triggerFieldLabel: string): void {
    const currentForm = this.formDefinition;
    const updatedRegions = this.mapRegionsRecursive(currentForm.regions, region =>
      region.id === regionId
        ? { ...region, repeatConfig: { ...region.repeatConfig, enabled: true, triggerFieldId, triggerFieldLabel } }
        : region
    );
    this.formDefinitionSubject.next({ ...currentForm, regions: updatedRegions });
  }

  // ══════════════════════════════════════════════════════════
  // ELEMENTOS (con soporte recursivo de subRegions)
  // ══════════════════════════════════════════════════════════

  addElement(): FormElement | null {
    const currentForm = this.formDefinition;
    if (currentForm.regions.length === 0) return null;

    const elementId = `element_${Date.now()}_${this.elementCounter++}`;
    const newElement: FormElement = {
      id: elementId,
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
      formulas: []
    };

    let targetRegionId: string | null = null;
    if (this.selectedRegion) {
      targetRegionId = this.findRegionById(this.selectedRegion)
        ? this.selectedRegion
        : currentForm.regions[currentForm.regions.length - 1].id;
    } else {
      targetRegionId = currentForm.regions[currentForm.regions.length - 1].id;
    }

    if (!targetRegionId) return null;
    this.selectedRegionSubject.next(targetRegionId);

    const updatedRegions = this.mapRegionsRecursive(currentForm.regions, region =>
      region.id === targetRegionId
        ? { ...region, children: [...region.children, newElement] }
        : region
    );

    this.formDefinitionSubject.next({ ...currentForm, regions: updatedRegions });
    return newElement;
  }

  deleteElement(elementId: string): void {
    const updatedRegions = this.mapRegionsRecursive(this.formDefinition.regions, region => ({
      ...region,
      children: region.children.filter(c => this.isRegion(c) || c.id !== elementId)
    }));
    this.formDefinitionSubject.next({ ...this.formDefinition, regions: updatedRegions });
    if (this.selectedElement === elementId) this.clearSelection();
  }

  updateElement(elementId: string, updates: Partial<FormElement>): void {
    const updatedRegions = this.mapRegionsRecursive(this.formDefinition.regions, region => ({
      ...region,
      children: region.children.map(c =>
        this.isElement(c) && c.id === elementId ? { ...c, ...updates } : c
      )
    }));
    this.formDefinitionSubject.next({ ...this.formDefinition, regions: updatedRegions });
  }

  // ══════════════════════════════════════════════════════════
  // SELECCIÓN
  // ══════════════════════════════════════════════════════════

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

  // ══════════════════════════════════════════════════════════
  // HELPERS PÚBLICOS
  // ══════════════════════════════════════════════════════════

  getSelectedElementData(): FormElement | FormRegion | null {
    const elementId = this.selectedElement;
    const type = this.selectedType;
    if (!elementId || !type) return null;

    if (type === 'region') {
      return this.findRegionById(elementId);
    } else {
      const region = this.findRegionByElementId(elementId);
      return region?.children.find(c => this.isElement(c) && c.id === elementId) as FormElement ?? null;
    }
  }

  getAllElements(): FormElement[] {
    return this.getAllElementsRecursive(this.formDefinition.regions);
  }

  getRegionByElementId(elementId: string): FormRegion | null {
    return this.findRegionByElementId(elementId);
  }

  // ══════════════════════════════════════════════════════════
  // DRAG & DROP
  // ══════════════════════════════════════════════════════════

  reorderElements(sourceElementId: string, targetElementId: string): void {
    const currentForm = this.formDefinition;

    const sourceRegion = this.findRegionByElementId(sourceElementId);
    const targetRegion = this.findRegionByElementId(targetElementId);

    if (!sourceRegion || !targetRegion) return;

    const sourceElement = sourceRegion.children.find(c => this.isElement(c) && c.id === sourceElementId) as FormElement;
    const targetIndex = targetRegion.children.findIndex(c => this.isElement(c) && c.id === targetElementId);

    if (!sourceElement || targetIndex === -1) return;

    let updatedRegions = this.mapRegionsRecursive(currentForm.regions, region =>
      region.id === sourceRegion.id
        ? { ...region, children: region.children.filter(c => !(this.isElement(c) && c.id === sourceElementId)) }
        : region
    );

    updatedRegions = this.mapRegionsRecursive(updatedRegions, region => {
      if (region.id === targetRegion.id) {
        const newChildren = [...region.children];
        newChildren.splice(targetIndex, 0, sourceElement);
        return { ...region, children: newChildren };
      }
      return region;
    });

    this.formDefinitionSubject.next({ ...currentForm, regions: updatedRegions });
  }
  // ══════════════════════════════════════════════════════════
  // IMÁGENES DE ELEMENTOS
  // ══════════════════════════════════════════════════════════

  public setElementImage(elementId: string, imageUrl: string, altText: string): void {
    const updatedRegions = this.mapRegionsRecursive(this.formDefinition.regions, region => ({
      ...region,
      children: region.children.map(c =>
        this.isElement(c) && c.id === elementId
          ? { ...c, image: { url: imageUrl, position: 'above' as const, size: 'medium' as const, altText, caption: undefined } }
          : c
      )
    }));
    this.formDefinitionSubject.next({ ...this.formDefinition, regions: updatedRegions });
  }

  public removeElementImage(elementId: string): void {
    const updatedRegions = this.mapRegionsRecursive(this.formDefinition.regions, region => ({
      ...region,
      children: region.children.map(c =>
        this.isElement(c) && c.id === elementId ? { ...c, image: undefined } : c
      )
    }));
    this.formDefinitionSubject.next({ ...this.formDefinition, regions: updatedRegions });
  }

  public getElementImage(elementId: string): any {
    const region = this.findRegionByElementId(elementId);
    return (region?.children.find(c => this.isElement(c) && c.id === elementId) as FormElement)?.image;
  }

  public hasElementImage(elementId: string): boolean {
    const region = this.findRegionByElementId(elementId);
    const element = region?.children.find(c => this.isElement(c) && c.id === elementId) as FormElement;
    return !!(element?.image?.url);
  }

  public updateElementImageUrl(elementId: string, newImageUrl: string): void {
    const updatedRegions = this.mapRegionsRecursive(this.formDefinition.regions, region => ({
      ...region,
      children: region.children.map(c =>
        this.isElement(c) && c.id === elementId && c.image
          ? { ...c, image: { ...c.image, url: newImageUrl } }
          : c
      )
    }));
    this.formDefinitionSubject.next({ ...this.formDefinition, regions: updatedRegions });
  }

  public updateElementImageAlt(elementId: string, newAltText: string): void {
    const updatedRegions = this.mapRegionsRecursive(this.formDefinition.regions, region => ({
      ...region,
      children: region.children.map(c =>
        this.isElement(c) && c.id === elementId && c.image
          ? { ...c, image: { ...c.image, altText: newAltText } }
          : c
      )
    }));
    this.formDefinitionSubject.next({ ...this.formDefinition, regions: updatedRegions });
  }

  // ══════════════════════════════════════════════════════════
  // SURVEY
  // ══════════════════════════════════════════════════════════

  public addSurveyField(): FormElement | null {
    const currentForm = this.formDefinition;
    if (currentForm.regions.length === 0) return null;

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

    let targetRegionId: string | null = null;
    if (this.selectedRegion) {
      targetRegionId = this.findRegionById(this.selectedRegion)
        ? this.selectedRegion
        : currentForm.regions[currentForm.regions.length - 1].id;
    } else {
      targetRegionId = currentForm.regions[currentForm.regions.length - 1].id;
    }

    if (!targetRegionId) return null;
    this.selectedRegionSubject.next(targetRegionId);

    const updatedRegions = this.mapRegionsRecursive(currentForm.regions, region =>
      region.id === targetRegionId
        ? { ...region, children: [...region.children, newSurveyField] }
        : region
    );

    this.formDefinitionSubject.next({ ...currentForm, regions: updatedRegions });
    return newSurveyField;
  }

  public updateSurveyConfig(elementId: string, config: Partial<SurveyConfig>): void {
    const updatedRegions = this.mapRegionsRecursive(this.formDefinition.regions, region => ({
      ...region,
      children: region.children.map(c =>
        this.isElement(c) && c.id === elementId && c.surveyConfig
          ? { ...c, surveyConfig: { ...c.surveyConfig, ...config } }
          : c
      )
    }));
    this.formDefinitionSubject.next({ ...this.formDefinition, regions: updatedRegions });
  }

  public getSurveyConfig(elementId: string): SurveyConfig | undefined {
    const region = this.findRegionByElementId(elementId);
    return (region?.children.find(c => this.isElement(c) && c.id === elementId) as FormElement)?.surveyConfig;
  }

  public getAllSurveyFields(): FormElement[] {
    return this.getAllElements().filter(el => el.type === 'survey' && el.isSurveyField);
  }

  public getSurveyQuestionFields(): FormElement[] {
    return this.getAllSurveyFields().filter(el => el.surveyConfig?.mode === 'catalog_question');
  }

  public getSurveyResultFields(): FormElement[] {
    return this.getAllSurveyFields().filter(el => el.surveyConfig?.mode === 'result');
  }

  // ══════════════════════════════════════════════════════════
  // PERSONA REGION
  // ══════════════════════════════════════════════════════════
  buildPersonRegion(): FormRegion {
    const regionId = `region_persona_${Date.now()}`;
    const cuiId = `persona_cui_${Date.now()}_0`;
    const esHijoId = `persona_es_hijo_${Date.now()}_1`;
    const cuiMadreId = `persona_cui_madre_${Date.now()}_2`;
    const tieneCuiId = `persona_tiene_cui_${Date.now()}_9`;

    const personRegion: FormRegion = {
      id: regionId,
      type: 'region',
      regionType: 'persona',
      title: 'Datos de la Persona',
      actions: [],
      validations: [],
      repeatConfig: '',
      children: [
        {
          id: tieneCuiId,
          type: 'select',
          label: '¿Tiene CUI?',
          placeholder: '',
          required: true,
          fieldRole: 'tiene_cui',
          multipleSelecction: false,
          enableSpecificOptions: true,
          options: [],
          catalogType: '',
          selectedOptions: [],
          actions: [],
          validations: [],
          formulas: []
        },
        {
          id: cuiId,
          type: 'number',
          label: 'CUI',
          placeholder: 'Ingrese el CUI',
          required: true,
          fieldRole: 'cui',
          isPersonIdentifier: true,
          multipleSelecction: false,
          options: [],
          selectedOptions: [],
          catalogType: null,
          actions: [],
          validations: [
            { type: 'min_length', value: '13', message: 'El CUI debe tener al menos 13 dígitos' },
            { type: 'max_length', value: '15', message: 'El CUI debe tener al menos 13 dígitos' },
            { type: 'only_numbers', value: '', message: 'El CUI solo debe contener números' }
          ],
          formulas: []
        },
        {
          id: `persona_codigo_temporal_${Date.now()}_10`,
          type: 'text',
          label: 'Código de identificación',
          placeholder: 'Genera o ingresa el código',
          required: true,
          fieldRole: 'cui',
          generateTempCode: true,
          multipleSelecction: false,
          options: [],
          selectedOptions: [],
          catalogType: null,
          actions: [],
          validations: [],
          formulas: []
        },
        {
          id: `persona_nombres_${Date.now()}_3`,
          type: 'text',
          label: 'Nombres',
          placeholder: 'Ingrese los nombres',
          required: true,
          fieldRole: 'nombres',
          multipleSelecction: false,
          options: [],
          selectedOptions: [],
          catalogType: null,
          actions: [],
          validations: [],
          formulas: []
        },
        {
          id: `persona_apellidos_${Date.now()}_4`,
          type: 'text',
          label: 'Apellidos',
          placeholder: 'Ingrese los apellidos',
          required: true,
          fieldRole: 'apellidos',
          multipleSelecction: false,
          options: [],
          selectedOptions: [],
          catalogType: null,
          actions: [],
          validations: [],
          formulas: []
        },
        {
          id: `persona_fecha_nac_${Date.now()}_5`,
          type: 'date',
          label: 'Fecha de Nacimiento',
          placeholder: '',
          required: true,
          fieldRole: 'fecha_nacimiento',
          multipleSelecction: false,
          options: [],
          selectedOptions: [],
          catalogType: null,
          actions: [],
          validations: [],
          formulas: []
        },
        {
          id: `persona_direccion_${Date.now()}_6`,
          type: 'text',
          label: 'Dirección',
          placeholder: 'Ingrese la dirección',
          required: false,
          fieldRole: 'direccion',
          multipleSelecction: false,
          options: [],
          selectedOptions: [],
          catalogType: null,
          actions: [],
          validations: [],
          formulas: []
        },
        {
          id: `persona_sexo_${Date.now()}_7`,
          type: 'select',
          label: 'Sexo',
          placeholder: '',
          required: true,
          fieldRole: 'sexo',
          multipleSelecction: false,
          options: [],
          selectedOptions: [
            { id: 1, nombre: 'Masculino' },
            { id: 2, nombre: 'Femenino' }
          ],
          catalogType: null,
          actions: [],
          validations: [],
          formulas: []
        },
        {
          id: `persona_fecha_programa_${Date.now()}_8`,
          type: 'date',
          label: 'Fecha de ingreso al programa',
          placeholder: '',
          required: true,
          fieldRole: 'fecha_ingreso_programa',
          multipleSelecction: false,
          options: [],
          selectedOptions: [],
          catalogType: null,
          actions: [],
          validations: [],
          formulas: []
        },
        {
          id: esHijoId,
          type: 'select',
          label: '¿Es hijo/a?',
          placeholder: '',
          required: true,
          fieldRole: 'es_hijo',
          multipleSelecction: false,
          options: [],
          selectedOptions: ['23', '24'],
          catalogType: '6',
          actions: [],
          validations: [],
          formulas: []
        },
        {
          id: cuiMadreId,
          type: 'number',
          label: 'CUI de la Madre',
          placeholder: 'Ingrese el CUI de la madre',
          required: true,
          fieldRole: 'cui_madre',
          multipleSelecction: false,
          options: [],
          selectedOptions: [],
          catalogType: null,
          actions: [
            {
              name: 'Mostrar si es hijo',
              triggerField: esHijoId,
              triggerLabel: '¿Es hijo/a?',
              type: 'show_if_equals',
              value: '23',
              betweenType: 'number',
            }
          ],
          validations: [
            { type: 'min_length', value: '13', message: 'El CUI de la madre debe tener al menos 13 dígitos' },
            { type: 'max_length', value: '15', message: 'El CUI de la madre debe tener al menos 13 o 15 dígitos' },
            { type: 'only_numbers', value: '', message: 'El CUI solo debe contener números' }
          ],
          formulas: []
        }
      ]
    };

    return personRegion;
  }

  // ══════════════════════════════════════════════════════════
  // STATS / EXPORT / IMPORT
  // ══════════════════════════════════════════════════════════

  isFormEmpty(): boolean {
    return !this.formDefinition.regions || this.formDefinition.regions.length === 0;
  }

  getFormDefinitionCopy(): FormDefinition {
    return JSON.parse(JSON.stringify(this.formDefinition));
  }

  getTotalRegions(): number {
    const countRegions = (regions: FormRegion[]): number =>
      regions.reduce((total, r) => {
        const subRegions = r.children.filter(c => this.isRegion(c)) as FormRegion[];
        return total + 1 + countRegions(subRegions);
      }, 0);
    return countRegions(this.formDefinition.regions);
  }

  getTotalElements(): number {
    return this.getAllElements().length;
  }

  exportFormDefinition(): string {
    return JSON.stringify(this.formDefinition, null, 2);
  }

  exportFormWithMetadata(): string {
    return JSON.stringify({
      definition: this.formDefinition,
      metadata: {
        totalRegions: this.getTotalRegions(),
        totalElements: this.getTotalElements(),
        exportedAt: new Date().toISOString()
      }
    }, null, 2);
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

  importFormFromJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      const formDefinition = data.definition || data;
      this.loadFormDefinition(formDefinition);
      return true;
    } catch (error) {
      console.error('❌ Error al importar formulario:', error);
      return false;
    }
  }

  addEvaluationTable(): FormElement | null {
    const currentForm = this.formDefinition;
    if (currentForm.regions.length === 0) return null;

    const elementId = `table_${Date.now()}_${this.elementCounter++}`;
    const newTable: FormElement = {
      id: elementId,
      type: 'evaluation-table',
      label: 'Tabla de Evaluación',
      placeholder: '',
      required: false,
      multipleSelecction: false,
      options: [],
      selectedOptions: [],
      catalogType: null,
      actions: [],
      validations: [],
      formulas: [],
      evaluationTableConfig: {
        descriptionSource: 'manual',
        rows: [],
        simpleColumns: [],  
        columnGroups: [
          {
            id: `group_${Date.now()}`,
            label: 'Grupo 1',
            selectionType: 'single',
            optionSource: 'manual',  
            columns: [
              { id: `col_${Date.now()}_1`, label: 'Opción 1' },
              { id: `col_${Date.now()}_2`, label: 'Opción 2' },
            ]
          }
        ]
      }
    };

    let targetRegionId: string | null = null;
    if (this.selectedRegion) {
      targetRegionId = this.findRegionById(this.selectedRegion)
        ? this.selectedRegion
        : currentForm.regions[currentForm.regions.length - 1].id;
    } else {
      targetRegionId = currentForm.regions[currentForm.regions.length - 1].id;
    }

    if (!targetRegionId) return null;
    this.selectedRegionSubject.next(targetRegionId);

    const updatedRegions = this.mapRegionsRecursive(currentForm.regions, region =>
      region.id === targetRegionId
        ? { ...region, children: [...region.children, newTable] }
        : region
    );

    this.formDefinitionSubject.next({ ...currentForm, regions: updatedRegions });
    return newTable;
  }
}