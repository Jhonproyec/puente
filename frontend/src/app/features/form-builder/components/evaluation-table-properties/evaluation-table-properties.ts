import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  EvaluationTableConfig,
  FormElement,
  TableColumnGroup,
  TableSimpleColumn,
  TableRow
} from '../../../../core/models/form-builder.model';
import { FormBuilderStateService } from '../../../../core/services/form-builder-state.service';
import { CatalogService } from '../../../../core/services/catalog.service';

interface CatalogOption { id: number; nombre: string; }
interface AvailableCatalog { id: number; name: string; totalItems: number; }

@Component({
  selector: 'app-evaluation-table-properties',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './evaluation-table-properties.html',
  styleUrl: './evaluation-table-properties.css'
})
export class EvaluationTableProperties implements OnChanges {
  @Input() element!: FormElement;

  config!: EvaluationTableConfig;
  availableCatalogs: AvailableCatalog[] = [];
  catalogItems: CatalogOption[] = [];
  groupCatalogItems: Map<string, CatalogOption[]> = new Map();
  newRowLabel = '';
  newSimpleColLabel = '';

  constructor(
    private stateService: FormBuilderStateService,
    private catalogService: CatalogService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['element'] && this.element?.evaluationTableConfig) {
      this.config = JSON.parse(JSON.stringify(this.element.evaluationTableConfig));
      // Asegurar que simpleColumns existe (migración)
      if (!this.config.simpleColumns) this.config.simpleColumns = [];
      if (this.config.descriptionSource === 'catalog' && this.config.catalogType) {
        this.loadCatalogItems(Number(this.config.catalogType));
      }
      // Cargar catálogos de grupos existentes
      this.config.columnGroups.forEach(group => {
        if (group.optionSource === 'catalog' && group.catalogType) {
          this.loadGroupCatalogItems(group);
        }
      });
    }
    this.loadAvailableCatalogs();
  }

  private loadAvailableCatalogs(): void {
    this.catalogService.getAvailableCatalogs().subscribe({
      next: (catalogs) => this.availableCatalogs = catalogs
    });
  }

  // ── Filas ────────────────────────────────────────────────

  onSourceChange(): void {
    this.config.rows = [];
    this.config.catalogType = undefined;
    this.catalogItems = [];
    this.save();
  }

  onCatalogTypeChange(): void {
    this.config.rows = [];
    if (this.config.catalogType) {
      this.loadCatalogItems(Number(this.config.catalogType));
    }
    this.save();
  }

  private loadCatalogItems(catalogId: number): void {
    this.catalogService.getCatalogData(catalogId).subscribe({
      next: (items) => this.catalogItems = items.map(i => ({ id: i.id, nombre: i.nombre }))
    });
  }

  isRowSelected(itemId: string): boolean {
    return this.config.rows.some(r => r.id === itemId);
  }

  toggleCatalogRow(item: CatalogOption): void {
    const exists = this.config.rows.findIndex(r => r.id === this.toString(item.id));
    if (exists >= 0) {
      this.config.rows.splice(exists, 1);
    } else {
      this.config.rows.push({ id: this.toString(item.id), label: item.nombre });
    }
    this.save();
  }

  selectAllCatalogRows(): void {
    this.config.rows = this.catalogItems.map(i => ({ id: this.toString(i.id), label: i.nombre }));
    this.save();
  }

  clearAllCatalogRows(): void {
    this.config.rows = [];
    this.save();
  }

  addManualRow(): void {
    if (!this.newRowLabel.trim()) return;
    this.config.rows.push({ id: `row_${Date.now()}`, label: this.newRowLabel.trim() });
    this.newRowLabel = '';
    this.save();
  }

  removeRow(index: number): void {
    this.config.rows.splice(index, 1);
    this.save();
  }

  moveRow(index: number, direction: 'up' | 'down'): void {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= this.config.rows.length) return;
    [this.config.rows[index], this.config.rows[target]] =
      [this.config.rows[target], this.config.rows[index]];
    this.save();
  }

  // ── Columnas simples ──────────────────────────────────────

  addSimpleColumn(): void {
    if (!this.newSimpleColLabel.trim()) return;
    this.config.simpleColumns.push({
      id: `scol_${Date.now()}`,
      label: this.newSimpleColLabel.trim()
    });
    this.newSimpleColLabel = '';
    this.save();
  }

  removeSimpleColumn(index: number): void {
    this.config.simpleColumns.splice(index, 1);
    this.save();
  }

  moveSimpleColumn(index: number, direction: 'up' | 'down'): void {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= this.config.simpleColumns.length) return;
    [this.config.simpleColumns[index], this.config.simpleColumns[target]] =
      [this.config.simpleColumns[target], this.config.simpleColumns[index]];
    this.save();
  }

  // ── Grupos de columnas ────────────────────────────────────

  addGroup(): void {
    this.config.columnGroups.push({
      id: `group_${Date.now()}`,
      label: 'Nuevo Grupo',
      selectionType: 'single',
      optionSource: 'manual',
      columns: [
        { id: `col_${Date.now()}_1`, label: 'Opción 1' },
        { id: `col_${Date.now()}_2`, label: 'Opción 2' },
      ]
    });
    this.save();
  }

  removeGroup(index: number): void {
    this.config.columnGroups.splice(index, 1);
    this.save();
  }

  moveGroup(index: number, direction: 'up' | 'down'): void {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= this.config.columnGroups.length) return;
    [this.config.columnGroups[index], this.config.columnGroups[target]] =
      [this.config.columnGroups[target], this.config.columnGroups[index]];
    this.save();
  }

  onGroupSourceChange(group: TableColumnGroup): void {
    group.columns = [];
    group.catalogType = undefined;
    this.groupCatalogItems.delete(group.id);
    this.save();
  }

  onGroupCatalogChange(group: TableColumnGroup): void {
    group.columns = [];
    if (group.catalogType) {
      this.loadGroupCatalogItems(group);
    }
    this.save();
  }

  private loadGroupCatalogItems(group: TableColumnGroup): void {
    if (!group.catalogType) return;
    this.catalogService.getCatalogData(Number(group.catalogType)).subscribe({
      next: (items) => {
        this.groupCatalogItems.set(group.id, items.map(i => ({ id: i.id, nombre: i.nombre })));
      }
    });
  }

  getGroupCatalogItems(group: TableColumnGroup): CatalogOption[] {
    return this.groupCatalogItems.get(group.id) ?? [];
  }

  isGroupColSelected(group: TableColumnGroup, itemId: number): boolean {
    return group.columns.some(c => c.id === this.toString(itemId));
  }

  toggleGroupCatalogCol(group: TableColumnGroup, item: CatalogOption): void {
    const exists = group.columns.findIndex(c => c.id === this.toString(item.id));
    if (exists >= 0) {
      group.columns.splice(exists, 1);
    } else {
      group.columns.push({ id: this.toString(item.id), label: item.nombre });
    }
    this.save();
  }

  selectAllGroupCols(group: TableColumnGroup): void {
    const items = this.getGroupCatalogItems(group);
    group.columns = items.map(i => ({ id: this.toString(i.id), label: i.nombre }));
    this.save();
  }

  clearGroupCols(group: TableColumnGroup): void {
    group.columns = [];
    this.save();
  }

  addManualColumn(group: TableColumnGroup): void {
    group.columns.push({ id: `col_${Date.now()}`, label: 'Nueva columna' });
    this.save();
  }

  removeColumn(group: TableColumnGroup, colIndex: number): void {
    group.columns.splice(colIndex, 1);
    this.save();
  }

  // ── Utils ─────────────────────────────────────────────────

  toString(value: any): string { return String(value); }

  save(): void {
    this.stateService.updateElement(this.element.id, {
      evaluationTableConfig: { ...this.config }
    });
  }
}