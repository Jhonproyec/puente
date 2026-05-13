import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { FillFormModal } from '../fill-form-modal/fill-form-modal';
import { FormInfoData, FormInfoService, FormResponse, GetResponsesFilters } from '../../core/services/form-info.service';

@Component({
  selector: 'app-form-info',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './form-info.html',
  styleUrl: './form-info.css'
})
export class FormInfo implements OnInit {

  formKey: string = '';
  formData: FormInfoData | null = null;
  isLoadingInfo = true;
  isLoadingTable = false;

  // Tabla
  responses: FormResponse[] = [];
  totalResponses = 0;
  pageSize = 10;
  pageIndex = 0;
  displayedColumns = ['fecha', 'usuario', 'departamento', 'comunidad', 'personas', 'acciones'];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private formInfoService: FormInfoService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.formKey = params['uuid'];
      this.loadFormInfo();
      this.loadResponses();
    });
  }

  loadFormInfo(): void {
    this.isLoadingInfo = true;
    this.formInfoService.getFormInfo(this.formKey).subscribe({
      next: (data) => {
        this.formData = data;
        this.isLoadingInfo = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingInfo = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadResponses(filters?: GetResponsesFilters): void {
    this.isLoadingTable = true;
    this.formInfoService.getFormResponses(this.formKey, {
      page: this.pageIndex + 1,
      limit: this.pageSize,
      ...filters
    }).subscribe({
      next: (data) => {
        this.responses = data.data;
        this.totalResponses = data.pagination.total;
        this.isLoadingTable = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingTable = false;
        this.cdr.markForCheck();
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadResponses();
  }

  onFillForm(): void {
    const dialogRef = this.dialog.open(FillFormModal, {
      width: '80vw',
      maxWidth: '95vw',
      disableClose: false,
      data: { formKey: this.formKey }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        // ✅ Invalidar cache y recargar
        this.formInfoService.invalidateInfoCache(this.formKey);
        setTimeout(() => {
          this.loadFormInfo();
          this.loadResponses();
        }, 0);
      }
    });
  }

  onDeleteResponse(id_respuesta: number): void {
    if (!confirm('¿Estás seguro de eliminar esta respuesta?')) return;

    this.formInfoService.deleteResponse(id_respuesta).subscribe({
      next: () => {
        this.formInfoService.invalidateInfoCache(this.formKey);
        this.loadFormInfo();
        this.loadResponses();
      },
      error: () => alert('❌ Error al eliminar la respuesta')
    });
  }

  onViewPreview(): void {
    window.open(`/formulario/${this.formKey}/preview`, '_blank');
  }

  onEditForm(): void {
    this.router.navigate([`/formulario/${this.formKey}/form-build`]);
  }

  getEstadoColor(): string {
    return this.formData?.estado === 'PUBLICADO' ? 'primary' : 'warn';
  }

  getPersonasLabel(response: FormResponse): string {
    if (!response.personas?.length) return 'Sin persona';
    return response.personas
      .map(p => `${p.persona.nombres} ${p.persona.apellidos}`)
      .join(', ');
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  onEditResponse(response: FormResponse): void {
    const dialogRef = this.dialog.open(FillFormModal, {
      width: '80vw',
      maxWidth: '95vw',
      disableClose: false,
      data: {
        formKey: this.formKey,
        mode: 'edit',
        id_respuesta: response.id_respuesta,
        existingResponses: response.datos_limpios  // ✅ las respuestas guardadas
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.formInfoService.invalidateInfoCache(this.formKey);
        this.loadResponses();
      }
    });
  }
}