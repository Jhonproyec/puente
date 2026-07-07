import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, Input, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FamiliaListItem, FamiliaService, Integrante } from '../../../../core/services/familia.service';
import { FormInfoService } from '../../../../core/services/form-info.service';
import { FillFormModal } from '../../../fill-form-modal/fill-form-modal';
import { NotificationService } from '../../../../core/services/notification.service';
import { FormResponseService } from '../../../../core/services/form-response.service';

@Component({
  selector: 'app-form-info-familias',
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule,
  ],
  templateUrl: './form-info-familias.html',
  styleUrl: './form-info-familias.css'
})
export class FormInfoFamilias implements OnInit {

  @Input() formKey = '';
  familiaExpandida: number | null = null;

  private familiaService = inject(FamiliaService);
  private formInfoService = inject(FormInfoService);
  private dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);
  private notificacion = inject(NotificationService);
  private formResponseService = inject(FormResponseService)

  // ── Tabla ──
  familias: FamiliaListItem[] = [];
  totalFamilias = 0;
  pageSize = 10;
  pageIndex = 0;
  isLoadingTable = false;
  familiaColumns = [
    'cui_madre',
    'nombre_madre',
    'fecha_inscripcion',
    'miembros',
    'acciones'
  ];

  // ── Modal QR ──
  mostrarModalQr = false;
  qrUrl: string | null = null;
  qrCargando = false;
  familiaSeleccionada: FamiliaListItem | null = null;

  // ── Modal integrantes ──
  mostrarModalIntegrantes = false;
  integrantes: Integrante[] = [];
  integrantesCargando = false;
  familiaIntegrantes: FamiliaListItem | null = null;

  // ── Modal detalle integrante ──
  mostrarModalDetalleIntegrante = false;
  integranteSeleccionado: Integrante | null = null;

  ngOnInit(): void {
    this.loadFamilias();
  }

  // ══════════════════════════════════════════
  // CARGA DE DATOS
  // ══════════════════════════════════════════

  loadFamilias(): void {
    this.isLoadingTable = true;
    this.familiaService.getFamilias({
      page: this.pageIndex + 1,
      limit: this.pageSize,
    }).subscribe({
      next: (res: any) => {
        console.log(res);
        this.familias = res.data.data;
        this.totalFamilias = res.data.pagination.total;
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
    this.loadFamilias();
  }

  // ══════════════════════════════════════════
  // MODAL QR
  // ══════════════════════════════════════════

  abrirModalQr(familia: FamiliaListItem): void {
    this.familiaSeleccionada = familia;
    this.mostrarModalQr = true;
    this.qrUrl = null;
    this.qrCargando = true;
    this.cdr.markForCheck();

    this.familiaService.getQr(familia.id_familia).subscribe({
      next: (res) => {
        this.qrUrl = res.data.url;
        this.qrCargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.qrCargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  cerrarModalQr(): void {
    this.mostrarModalQr = false;
    this.qrUrl = null;
    this.familiaSeleccionada = null;
    this.cdr.markForCheck();
  }

  async descargarQr(): Promise<void> {
    if (!this.qrUrl) return;

    try {
      const fullUrl = this.getQrFullUrl();

      // Descargar como blob para forzar descarga sin abrir nueva ventana
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_${this.familiaSeleccionada?.madre.cui || 'familia'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Limpiar el objeto URL
      URL.revokeObjectURL(url);

      // ✅ Alerta de éxito
      // this.snackBar.open('✅ QR descargado correctamente', 'Cerrar', {
      //   duration: 3000,
      //   horizontalPosition: 'end',
      //   verticalPosition: 'top',
      // });
      this.notificacion.showSuccess("QR descargado correctamente")
    } catch (error) {
      this.notificacion.showError("Error al descargar el QR");
      // this.snackBar.open('❌ Error al descargar el QR', 'Cerrar', {
      //   duration: 3000,
      //   horizontalPosition: 'end',
      //   verticalPosition: 'top',
      // });
    }
  }

  // ══════════════════════════════════════════
  // MODAL INTEGRANTES
  // ══════════════════════════════════════════

  abrirModalIntegrantes(familia: FamiliaListItem): void {
    this.familiaIntegrantes = familia;
    this.mostrarModalIntegrantes = true;
    this.integrantes = [];
    this.integrantesCargando = true;
    this.cdr.markForCheck();

    this.familiaService.getIntegrantes(familia.id_familia).subscribe({
      next: (res) => {
        this.integrantes = res.data;
        this.integrantesCargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.integrantesCargando = false;
        this.cdr.markForCheck();
      }
    });
  }

  cerrarModalIntegrantes(): void {
    this.mostrarModalIntegrantes = false;
    this.integrantes = [];
    this.familiaIntegrantes = null;
    this.cdr.markForCheck();
  }

  // ══════════════════════════════════════════
  // MODAL DETALLE INTEGRANTE
  // ══════════════════════════════════════════

  abrirDetalleIntegrante(integrante: Integrante): void {
    this.integranteSeleccionado = integrante;
    this.mostrarModalDetalleIntegrante = true;
    this.cdr.markForCheck();
  }

  cerrarDetalleIntegrante(): void {
    this.mostrarModalDetalleIntegrante = false;
    this.integranteSeleccionado = null;
    this.cdr.markForCheck();
  }

  // ══════════════════════════════════════════
  // EDITAR / ELIMINAR
  // ══════════════════════════════════════════


  onEditarRespuesta(familia: FamiliaListItem): void {
    const id_respuesta = familia.respuestas?.[0]?.id_respuesta;

    if (!id_respuesta) {
      this.notificacion.showError("No hay respuesta registrada");
      return;
    }

    this.formResponseService.getResponseById(id_respuesta).subscribe({
      next: (data) => {
        this.dialog.open(FillFormModal, {
          width: '80vw',
          maxWidth: '95vw',
          disableClose: false,
          data: {
            formKey: this.formKey,
            mode: 'edit',
            id_respuesta,
            existingResponses: data.datos_limpios
          }
        }).afterClosed().subscribe(result => {
          if (result?.success) {
            this.formInfoService.invalidateInfoCache(this.formKey);

            // ✅ Si hay dropdown abierto de esta familia, recargar integrantes
            if (this.familiaExpandida === familia.id_familia) {
              this.familiaExpandida = null;
              this.integrantes = [];
            }

            // ✅ Recargar la lista completa
            this.loadFamilias();
          }
        });
      },
      error: () => {
        this.notificacion.showError("Error al cargar la respuesta");
      }
    });
  }

  onEliminarFamilia(familia: FamiliaListItem): void {
    if (!confirm(`¿Eliminar la familia ${familia.codigo}?`)) return;
    // TODO: conectar endpoint de eliminar familia
    console.log('Eliminar familia:', familia.id_familia);
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════

  getRolLabel(rol: string): string {
    const map: Record<string, string> = {
      MADRE: 'Madre',
      PADRE: 'Padre',
      NINO: 'Niño/a',
      ENCARGADO: 'Encargado',
    };
    return map[rol] || rol;
  }

  formatDate(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  }

  getQrFullUrl(): string {
    if (!this.qrUrl) return '';
    const base = (window as any).__env?.apiUrl || 'http://localhost:3000';
    return `${base}${this.qrUrl}`;
  }


  toggleIntegrantes(familia: FamiliaListItem): void {
    // Si ya está expandida, cerrar
    if (this.familiaExpandida === familia.id_familia) {
      this.familiaExpandida = null;
      this.integrantes = [];
      this.cdr.markForCheck();
      return;
    }

    // Abrir y cargar integrantes
    this.familiaExpandida = familia.id_familia;
    this.integrantes = [];
    this.integrantesCargando = true;
    this.cdr.markForCheck();

    this.familiaService.getIntegrantes(familia.id_familia).subscribe({
      next: (res) => {
        this.integrantes = res.data;
        this.integrantesCargando = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.integrantesCargando = false;
        this.cdr.markForCheck();
      }
    });
  }

}
