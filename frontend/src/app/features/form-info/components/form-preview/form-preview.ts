import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormInfoService } from '../../../../core/services/form-info.service';
import { MatIconModule } from '@angular/material/icon';

interface ResolvedElement {
  id: string;
  type: string;
  previewType: string;
  label: string;
  placeholder?: string;
  required: boolean;
  resolvedOptions?: { id: number; nombre: string }[];
  cascadeLabel?: string | null;
  actions?: any[];
}

interface ResolvedRegion {
  id: string;
  title: string;
  regionType?: string;
  elements: ResolvedElement[];
  actions?: any[];
  repeatConfig?: any;
}

@Component({
  selector: 'app-form-preview',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatIconModule],
  templateUrl: './form-preview.html',
  styleUrl: './form-preview.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FormPreview implements OnInit {
  uuid = '';
  isLoading = true;
  formName = '';
  formEstado = '';
  formVersion = 1;
  regions: ResolvedRegion[] = [];

  constructor(
    private route: ActivatedRoute,
    private formInfoService: FormInfoService,
     private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.uuid = params['uuid'];
      this.loadPreview();
    });
  }

  loadPreview(): void {
    this.isLoading = true;
    this.formInfoService.getFormPreview(this.uuid).subscribe({
      next: (data) => {
        this.formName    = data.nombre;
        this.formEstado  = data.estado;
        this.formVersion = data.version;
        this.regions     = data.regions;
        this.isLoading   = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onPrint(): void {
    window.print();
  }

  isRepeating(region: ResolvedRegion): boolean {
    return region.repeatConfig?.enabled === true;
  }

  hasRegionConditions(region: ResolvedRegion): boolean {
    return (region.actions?.length || 0) > 0;
  }

  hasConditions(element: ResolvedElement): boolean {
    return (element.actions?.length || 0) > 0;
  }

  getElements(region: ResolvedRegion): ResolvedElement[] {
  return region.elements;
}
}