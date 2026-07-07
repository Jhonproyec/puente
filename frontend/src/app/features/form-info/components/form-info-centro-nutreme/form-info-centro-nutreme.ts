import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CentroNutremeService, EvaluacionCentroNutreme } from '../../../../core/services/centro-nutreme.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { CENTRO_NUTREME_FORM_UUID } from '../../../../core/constants/form-regions.constants';
import { FormResponseService } from '../../../../core/services/form-response.service';
import { FillFormModal } from '../../../fill-form-modal/fill-form-modal';

@Component({
  selector: 'app-form-info-centro-nutreme',
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatTooltipModule,
  ],
  templateUrl: './form-info-centro-nutreme.html',
  styleUrl: './form-info-centro-nutreme.css'
})
export class FormInfoCentroNutreme implements OnInit {
  evaluaciones = signal<EvaluacionCentroNutreme[]>([]);
  isLoading = signal(false);
  totalEvaluaciones = 0;
  pageSize = 10;
  pageIndex = 0;

  displayedColumns = [
    'centro',
    'comunidad',
    'personal_a_cargo',
    'evaluador',
    'fecha_registro',
    'actions',
  ];

  constructor(
    private centroNutremeService: CentroNutremeService,
    private confirmService: ConfirmDialogService,
    private notificationService: NotificationService,
    private formResponseService: FormResponseService,
    private dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    this.loadEvaluaciones();
  }

  loadEvaluaciones(): void {
    this.isLoading.set(true);
    this.centroNutremeService
      .getEvaluaciones({ page: this.pageIndex + 1, limit: this.pageSize })
      .subscribe({
        next: (data) => {
          this.evaluaciones.set(data.data);
          this.totalEvaluaciones = data.pagination.total;
          this.isLoading.set(false);
        },
        error: () => {
          this.notificationService.showError('Error al cargar las evaluaciones');
          this.isLoading.set(false);
        },
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadEvaluaciones();
  }

  verEvaluacion(evaluacion: EvaluacionCentroNutreme): void {
    this.formResponseService.getResponseById(evaluacion.id_respuesta).subscribe({
      next: (data) => {
        const existingResponses = data.datos_limpios ?? {};  // 👈 extraer datos_limpios

        this.dialog.open(FillFormModal, {
          width: '80vw',
          maxWidth: '95vw',
          disableClose: false,
          data: {
            formKey: CENTRO_NUTREME_FORM_UUID,
            mode: 'edit',
            id_respuesta: evaluacion.id_respuesta,
            existingResponses,
          }
        }).afterClosed().subscribe(result => {
          if (result?.success) {
            this.loadEvaluaciones();
          }
        });
      },
      error: () => this.notificationService.showError('Error al cargar la evaluación')
    });
  }

  eliminarEvaluacion(evaluacion: EvaluacionCentroNutreme): void {
    this.confirmService
      .confirmDelete('¿Estás seguro de eliminar esta evaluación?')
      .subscribe((confirmed) => {
        if (!confirmed) return;
        // TODO: llamar endpoint de eliminación
        this.evaluaciones.update((list) =>
          list.filter((e) => e.id_respuesta !== evaluacion.id_respuesta)
        );
        this.totalEvaluaciones--;
        this.notificationService.showSuccess('Evaluación eliminada');
      });
  }

  formatFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getNombreCentro(evaluacion: EvaluacionCentroNutreme): string {
    return evaluacion.centro?.nombre ?? '—';
  }

  getComunidad(evaluacion: EvaluacionCentroNutreme): string {
    return evaluacion.centro?.comunidad ?? '—';
  }

  getPersonalACargo(evaluacion: EvaluacionCentroNutreme): string {
    return evaluacion.centro?.personal_a_cargo ?? '—';
  }
}
