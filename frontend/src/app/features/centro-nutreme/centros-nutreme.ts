import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CentroNutreme, CentroNutremeService } from '../../core/services/centro-nutreme.service';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { QrModal } from '../../shared/qr-modal/qr-modal';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { CreateCentroNutremeDialog } from './create-centro-nutreme-dialog/create-centro-nutreme-dialog';

@Component({
  selector: 'app-centro-nutreme',
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatTooltipModule,
  ],
  templateUrl: './centros-nutreme.html',
  styleUrl: './centros-nutreme.css'
})
export class CentrosNutreme implements OnInit {
  centros = signal<CentroNutreme[]>([]);
  isLoading = signal(false);
  totalCentros = 0;
  pageSize = 10;
  pageIndex = 0;

  displayedColumns = ['codigo', 'nombre', 'comunidad', 'usuario', 'coordenadas', 'qr', 'actions'];

  canCreate = computed(() => this.authService.hasPermission('CREATE_USER'));
  canUpdate = computed(() => this.authService.hasPermission('UPDATE_USER'));
  canDelete = computed(() => this.authService.hasPermission('DELETE_USER'));

  constructor(
    private centroService: CentroNutremeService,
    private dialog: MatDialog,
    private confirmService: ConfirmDialogService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.loadCentros();
  }

  loadCentros(): void {
    this.isLoading.set(true);
    this.centroService.getAll({ page: this.pageIndex + 1, limit: this.pageSize }).subscribe({
      next: (data) => {
        this.centros.set(data.data);
        this.totalCentros = data.pagination.total;
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.notificationService.showError('Error al cargar los centros Nútreme');
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadCentros();
  }

  openDialog(centro: CentroNutreme | null = null): void {
    console.log("Abriendo");
    const dialogRef = this.dialog.open(CreateCentroNutremeDialog, {
      width: '1000px',
      maxWidth: '100vw',
      disableClose: true,
      data: centro,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      if (!centro) {
        this.centros.update(list => [result, ...list]);
        this.totalCentros++;
      } else {
        this.centros.update(list => {
          const idx = list.findIndex(c => c.id_centro_nutreme === result.id_centro_nutreme);
          if (idx === -1) return list;
          const updated = [...list];
          updated[idx] = result;
          return updated;
        });
      }
    });
  }

  deleteCentro(centro: CentroNutreme): void {
    this.confirmService.confirmDelete('¿Estás seguro de eliminar este centro Nútreme?').subscribe(confirmed => {
      if (!confirmed) return;
      this.centroService.delete(centro.id_centro_nutreme).subscribe({
        next: () => {
          this.centros.update(list => list.filter(c => c.id_centro_nutreme !== centro.id_centro_nutreme));
          this.totalCentros--;
          this.notificationService.showSuccess('Centro Nútreme eliminado');
        },
        error: () => this.notificationService.showError('Error al eliminar el centro')
      });
    });
  }

  abrirModalQr(centro: CentroNutreme): void {
    const dialogRef = this.dialog.open(QrModal, {
      data: {
        qrUrl: null,
        downloadName: `QR_${centro.codigo}.png`,
        title: 'Código QR',
        subtitle: centro.nombre,
      },
      width: '420px',
      disableClose: false,
    });

    this.centroService.generarQr(centro.id_centro_nutreme).subscribe({
      next: (res) => {
        const nombreArchivo = res.qr_path.split(/[\\/]/).pop();
        const qrUrl = `${environment.BASE_URL.replace('/api/v1', '')}/public/qr/centros_nutreme/${nombreArchivo}`;
        dialogRef.componentInstance.setQrUrl(qrUrl);
      },
      error: (error) => {
        dialogRef.close();
        this.notificationService.showError(error?.error?.message || 'Error al generar QR');
      }
    });
  }

  getUsuarioLabel(centro: CentroNutreme): string {
    if (!centro.usuario) return '—';
    return `${centro.usuario.nombres} ${centro.usuario.apellidos}`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

}
