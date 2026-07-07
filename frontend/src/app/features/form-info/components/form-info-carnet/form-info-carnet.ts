import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, Input, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CarnetPersona, CarnetService } from '../../../../core/services/carnet.service';
// import { FormInfoService } from '../../../../core/services/form-info.service';
import { FillFormModal } from '../../../fill-form-modal/fill-form-modal';
import { environment } from '../../../../../environments/environment';
import { FormResponseService } from '../../../../core/services/form-response.service';
import { FormInfoService } from '../../../../core/services/form-info.service';
import { MES_NOMBRES } from '../../../../core/constants/form-regions.constants';
import { QrModal } from '../../../../shared/qr-modal/qr-modal';

@Component({
  selector: 'app-form-info-carnet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './form-info-carnet.html',
  styleUrl: './form-info-carnet.css'
})
export class FormInfoCarnet implements OnInit {

  @Input() formKey = '';
  @Input() formId = 0;

  private carnetService = inject(CarnetService);
  private formResponseService = inject(FormResponseService);
  private formInfoService = inject(FormInfoService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  // ── Tabla ──
  personas: CarnetPersona[] = [];
  totalPersonas = 0;
  pageSize = 10;
  pageIndex = 0;
  isLoading = false;
  displayedColumns = ['cui', 'nombre', 'comunidad', 'estado', 'bimestres', 'acciones'];

  // ── Dropdown bimestres ──
  personaExpandida: number | null = null;

  // ── Modal QR ──
  mostrarModalQr = false;
  qrUrl: string | null = null;
  personaQr: CarnetPersona | null = null;

  mesNombres = MES_NOMBRES;

  ngOnInit(): void {
    this.loadPersonas();
  }

  // ══════════════════════════════════════════
  // CARGA DE DATOS
  // ══════════════════════════════════════════

  loadPersonas(): void {
    this.isLoading = true;
    this.carnetService.getCarnetPersonas(this.formId, {
      page: this.pageIndex + 1,
      limit: this.pageSize,
    }).subscribe({
      next: (res: any) => {
        this.personas = res.data.data;
        this.totalPersonas = res.data.pagination.total;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadPersonas();
  }

  // ══════════════════════════════════════════
  // DROPDOWN BIMESTRES
  // ══════════════════════════════════════════

  toggleBimestres(persona: CarnetPersona): void {
    this.personaExpandida = this.personaExpandida === persona.id_respuesta
      ? null
      : persona.id_respuesta;
    this.cdr.markForCheck();
  }

  onEditarBimestre(persona: CarnetPersona, bimestre: any): void {
    this.formResponseService.getResponseById(persona.id_respuesta).subscribe({
      next: (data) => {
        const respuestasConMes = { ...data.datos_limpios };

        //Sobrescribir el mes con el mes de la tarjeta clickeada
        respuestasConMes['element_1772753813274_1'] = bimestre.mes;

        //Limpiar cantidad de huellas y huellas anteriores
        delete respuestasConMes['element_1772754326210_9'];

        Object.keys(respuestasConMes).forEach(key => {
          if (key.startsWith('element_1772754621801_0') ||
            key.startsWith('element_1772754622252_1')) {
            delete respuestasConMes[key];
          }
        });

        // ✅ Repoblar las huellas del bimestre seleccionado
        if (bimestre.huellas?.length > 0) {
          respuestasConMes['element_1772754326210_9'] = bimestre.huellas.length;

          bimestre.huellas.forEach((huella: any, index: number) => {
            const repNum = index + 1;
            respuestasConMes[`element_1772754621801_0_rep${repNum}`] = huella.fecha;
            respuestasConMes[`element_1772754622252_1_rep${repNum}`] = huella.sesion;
          });
        }

        this.dialog.open(FillFormModal, {
          width: '80vw',
          maxWidth: '95vw',
          disableClose: false,
          data: {
            formKey: this.formKey,
            mode: 'edit',
            id_respuesta: persona.id_respuesta,
            existingResponses: respuestasConMes
          }
        }).afterClosed().subscribe(result => {
          if (result?.success) {
            this.formInfoService.invalidateInfoCache(this.formKey);
            this.loadPersonas();
          }
        });
      },
      error: () => {
        this.snackBar.open('❌ Error al cargar la respuesta', 'Cerrar', {
          duration: 3000
        });
      }
    });
  }
  // ══════════════════════════════════════════
  // MODAL QR
  // ══════════════════════════════════════════
  abrirModalQr(persona: CarnetPersona): void {
    const dialogRef = this.dialog.open(QrModal, {
      data: {
        qrUrl: null,
        downloadName: `QR_${persona.persona.cui || 'persona'}.png`,
        title: 'Código QR',
        subtitle: `${persona.persona.nombres} ${persona.persona.apellidos}`,
      },
      width: '420px',
      disableClose: false,
    });

    this.carnetService.generarQrPersona(persona.persona.id_persona).subscribe({
      next: (res) => {
        const qrPath = res.data.qr_path;
        const nombreArchivo = qrPath.split(/[\\/]/).pop();
        const qrUrl = `${environment.BASE_URL.replace('/api/v1', '')}/public/qr/${nombreArchivo}`;

        dialogRef.componentInstance.setQrUrl(qrUrl);  // 👈 aquí
      },
      error: () => {
        dialogRef.close();
        this.snackBar.open('❌ Error al generar el QR', 'Cerrar', { duration: 3000 });
      }
    });
  }
  // cerrarModalQr(): void {
  //   this.mostrarModalQr = false;
  //   this.qrUrl = null;
  //   this.personaQr = null;
  //   this.cdr.markForCheck();
  // }

  // async descargarQr(): Promise<void> {
  //   if (!this.qrUrl) return;

  //   try {
  //     const fullUrl = `${environment.BASE_URL.replace('/api/v1', '')}${this.qrUrl}`;
  //     const response = await fetch(fullUrl);
  //     const blob = await response.blob();
  //     const url = URL.createObjectURL(blob);

  //     const link = document.createElement('a');
  //     link.href = url;
  //     link.download = `QR_${this.personaQr?.persona.cui || 'persona'}.png`;
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //     URL.revokeObjectURL(url);

  //     this.snackBar.open('✅ QR descargado correctamente', 'Cerrar', {
  //       duration: 3000,
  //       horizontalPosition: 'end',
  //       verticalPosition: 'top',
  //     });
  //   } catch {
  //     this.snackBar.open('❌ Error al descargar el QR', 'Cerrar', { duration: 3000 });
  //   }
  // }

  getQrFullUrl(): string {
    if (!this.qrUrl) return '';
    return `${environment.BASE_URL.replace('/api/v1', '')}${this.qrUrl}`;
  }

  // ══════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════

  formatDate(date: string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  }

  getTotalHuellas(persona: CarnetPersona): number {
    return persona.bimestres.reduce(
      (total, b) => total + (b.huellas?.length || 0), 0
    );
  }

  onNuevoBimestre(persona: CarnetPersona): void {
    //Abrir el modal con datos base de la persona
    // pero sin mes, sin huellas ni cantidad
    this.formResponseService.getResponseById(persona.id_respuesta).subscribe({
      next: (data) => {
        //Limpiar campos de mes, asistencia y huellas
        const respuestasLimpias = { ...data.datos_limpios };

        // Limpiar mes a reportar
        delete respuestasLimpias['element_1772753813274_1'];

        // Limpiar cantidad de huellas
        delete respuestasLimpias['element_1772754326210_9'];

        // Limpiar huellas repetidas (buscar keys que tengan _rep)
        Object.keys(respuestasLimpias).forEach(key => {
          if (key.startsWith('element_1772754621801_0') ||
            key.startsWith('element_1772754622252_1')) {
            delete respuestasLimpias[key];
          }
        });

        this.dialog.open(FillFormModal, {
          width: '80vw',
          maxWidth: '95vw',
          disableClose: false,
          data: {
            formKey: this.formKey,
            mode: 'edit',
            id_respuesta: persona.id_respuesta,
            existingResponses: respuestasLimpias
          }
        }).afterClosed().subscribe(result => {
          if (result?.success) {
            this.formInfoService.invalidateInfoCache(this.formKey);
            this.loadPersonas();
          }
        });
      },
      error: () => {
        this.snackBar.open('❌ Error al cargar datos', 'Cerrar', { duration: 3000 });
      }
    });
  }

  getMesNombre(mes: number): string {
    return this.mesNombres[mes] || `Mes ${mes}`;
  }
}
