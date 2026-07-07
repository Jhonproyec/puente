import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NotificationService } from '../../core/services/notification.service';

export interface QrModalData {
  /** URL completa de la imagen QR (ya resuelta) */
  qrUrl: string;
  /** Nombre del archivo al descargar, ej: "QR_1234567890123.png" */
  downloadName: string;
  /** Título que se muestra en el header del modal */
  title?: string;
  /** Subtítulo opcional, ej: nombre de la persona */
  subtitle?: string;
}

@Component({
  selector: 'app-qr-modal',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './qr-modal.html',
  styleUrl: './qr-modal.css'
})
export class QrModal {
  qrUrl: string | null = null;
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: QrModalData,
    private dialogRef: MatDialogRef<QrModal>,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private notificaciones: NotificationService
  ) {
    this.qrUrl = data.qrUrl;
  }

  cerrar(): void {
    this.dialogRef.close();
  }

async descargar(): Promise<void> {
  if (!this.qrUrl) return;
  try {
    const response = await fetch(this.qrUrl, { mode: 'cors' });
    if (!response.ok) throw new Error('Error al obtener la imagen');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.data.downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.notificaciones.showSuccess("QR Descargado correctamente");
  } catch {
    this.notificaciones.showError('Error al descargar el QR');
  }
}

onImageError(): void {
    this.notificaciones.showError('No se pudo cargar la imagen del QR');
  }

  setQrUrl(url: string): void {
    this.qrUrl = url;
    this.cdr.markForCheck();
  }

}
