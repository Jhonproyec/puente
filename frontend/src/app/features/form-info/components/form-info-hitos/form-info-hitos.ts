import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { HitosEncuestaResumen, HitosService } from '../../../../core/services/hitos.service';

import { FormInfoService } from '../../../../core/services/form-info.service';
import { FillFormModal } from '../../../fill-form-modal/fill-form-modal';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-form-info-hitos',
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatButtonModule
    // FillFormModal,
  ],
  templateUrl: './form-info-hitos.html',
  styleUrl: './form-info-hitos.css',
  standalone: true,
})
export class FormInfoHitos implements OnInit {
  @Input() formKey: string = '';

  isLoading = false;
  encuestas: HitosEncuestaResumen[] = [];
  totalEncuestas = 0;
  pageSize = 10;
  pageIndex = 0;

  displayedColumns = [
    'fecha',
    'usuario',
    'comunidad',
    'total_ninos',
    'con_consentimiento',
    'sin_consentimiento',
    'acciones',
  ];

  constructor(
    private hitosService: HitosService,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private formInfoService: FormInfoService,
  ) { }

  ngOnInit(): void {
    this.loadEncuestas();
  }

  loadEncuestas(): void {
    this.isLoading = true;
    this.hitosService
      .getEncuestas({ page: this.pageIndex + 1, limit: this.pageSize })
      .subscribe({
        next: (data: any) => {
          this.encuestas = data.data;
          this.totalEncuestas = data.pagination.total;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadEncuestas();
  }

  onVerEncuesta(encuesta: HitosEncuestaResumen): void {
    this.hitosService.getEncuestaComoResponses(encuesta.id_encuesta).subscribe({
      next: (responses) => {
        this.dialog.open(FillFormModal, {
          width: '80vw',
          maxWidth: '95vw',
          disableClose: false,
          data: {
            formKey: this.formKey,
            mode: 'edit',
            id_respuesta: encuesta.id_encuesta, // 👈 id_encuesta como id_respuesta
            existingResponses: responses,
          }
        }).afterClosed().subscribe(result => {
          if (result?.success) {
            this.loadEncuestas(); // 👈 recargar tabla
          }
        });
      }
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getUsuarioLabel(encuesta: HitosEncuestaResumen): string {
    if (!encuesta.usuario) return '—';
    return `${encuesta.usuario.nombres} ${encuesta.usuario.apellidos}`;
  }
}