import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormResponseService } from '../../../../core/services/form-response.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { FillFormModal } from '../../../fill-form-modal/fill-form-modal';
import { DOCENTES_FORM_KEY } from '../../../../core/constants/form-regions.constants';

export interface EvaluacionDocente {
  id_respuesta: number;
  fecha_registro: string;
  realizo_sesion: string;
  educador: string;
  especialidad: string;
  evaluador: string;
}


@Component({
  selector: 'app-form-info-docentes',
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  templateUrl: './form-info-docentes.html',
  styleUrl: './form-info-docentes.css'
})
export class FormInfoDocentes implements OnInit {
  evaluaciones = signal<EvaluacionDocente[]>([]);
  isLoading = signal(false);
  totalEvaluaciones = 0;
  pageSize = 10;
  pageIndex = 0;


  displayedColumns = [
    'educador',
    'especialidad',
    'realizo_sesion',
    'evaluador',
    'fecha_registro',
    'actions',
  ];

  constructor(
    private formResponseService: FormResponseService,
    private confirmService: ConfirmDialogService,
    private notificationService: NotificationService,
    private dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    this.loadEvaluaciones();
  }

  loadEvaluaciones(): void {
    this.isLoading.set(true);
    this.formResponseService
      .getEvaluacionesDocentes({ page: this.pageIndex + 1, limit: this.pageSize })
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

  verEvaluacion(evaluacion: EvaluacionDocente): void {
    this.formResponseService.getResponseById(evaluacion.id_respuesta).subscribe({
      next: (data) => {
        const existingResponses = data.datos_limpios ?? {};
        this.dialog.open(FillFormModal, {
          width: '80vw',
          maxWidth: '95vw',
          disableClose: false,
          data: {
            formKey: DOCENTES_FORM_KEY,
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

  eliminarEvaluacion(evaluacion: EvaluacionDocente): void {
    this.confirmService
      .confirmDelete('¿Estás seguro de eliminar esta evaluación?')
      .subscribe((confirmed) => {
        if (!confirmed) return;
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

  getRealizoSesionColor(valor: string): string {
    return valor === 'Sí' ? 'status-si' : 'status-no';
  }

}
