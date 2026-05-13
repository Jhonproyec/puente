import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '../../core/services/notification.service';
import { ImageCatalogsService } from '../../core/services/image-catalogs.service';
import { FileSizePipe } from '../../core/pipes/file-size-pipe';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ImageViewerDialog, ImageViewerDialogResult } from './components/image-viewer-dialog/image-viewer-dialog';
import { ImagePicker } from './components/image-picker/image-picker';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';

export interface CatalogImage {
  id_catalogo_imagen: number;
  name: string;
  path: string;         // URL pública para mostrar
  filename: string;    // nombre físico en disco
  size: number;        // bytes
  mime_type: string;
  created_at: string;
}

interface PendingFile {
  file: File;
  preview: string;
  nombre: string;
}

@Component({
  selector: 'app-image-catalog',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    ImagePicker,
    // FileSizePipe,
  ],
  templateUrl: './image-catalog.html',
  styleUrl: './image-catalog.css'
})
export class ImageCatalog {

  // Referencia al picker para acceder a selectedImages
  @ViewChild('picker') picker!: ImagePicker;

  // ── Upload ────────────────────────────────────────────────────────
  isUploadModalOpen = false;
  isDragging = false;
  pendingFiles: PendingFile[] = [];
  isSaving = false;

  // ── Edit ──────────────────────────────────────────────────────────
  isEditModalOpen = false;
  editingImage: CatalogImage | null = null;
  editingName = '';

  constructor(
    private imageCatalogService: ImageCatalogsService,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private confirm: ConfirmDialogService
  ) { }

  // ── Visor ─────────────────────────────────────────────────────────
  openViewer(image: CatalogImage): void {
    const dialogRef = this.dialog.open(ImageViewerDialog, {
      data: { image },
      panelClass: 'image-viewer-dialog',
      maxWidth: '95vw',
      maxHeight: '95vh',
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result: ImageViewerDialogResult) => {
      if (!result) return;
      if (result.action === 'rename') this.openEditModal(result.image);
      if (result.action === 'delete') this.deleteImage(result.image);
    });
  }

  // ── Upload ────────────────────────────────────────────────────────
  openUploadModal(): void { this.pendingFiles = []; this.isUploadModalOpen = true; }
  closeUploadModal(): void { this.isUploadModalOpen = false; this.pendingFiles = []; }

  onDragOver(event: DragEvent): void { event.preventDefault(); this.isDragging = true; }
  onDragLeave(): void { this.isDragging = false; }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const files = Array.from(event.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
    this.processFiles(files);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.processFiles(Array.from(input.files || []));
    input.value = '';
  }

  private processFiles(files: File[]): void {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.pendingFiles.push({
          file,
          preview: e.target?.result as string,
          nombre: file.name.replace(/\.[^.]+$/, '')
        });
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    });
  }

  removePending(index: number): void { this.pendingFiles.splice(index, 1); this.cdr.markForCheck(); }
  clearPending(): void { this.pendingFiles = []; this.cdr.markForCheck(); }

  uploadImages(): void {
    if (this.pendingFiles.length === 0) return;
    this.isSaving = true;
    const count = this.pendingFiles.length;

    const formData = new FormData();
    this.pendingFiles.forEach((pf) => {
      formData.append('images', pf.file);
      formData.append('nombres', pf.nombre);
    });

    this.imageCatalogService.uploadImages(formData).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeUploadModal();
        this.picker.currentPage = 1;
        setTimeout(() => this.picker.loadImages());
        this.notificationService.showSuccess('Imagen o imagenes subidas exitosamente')
      },
      error: () => {
        this.isSaving = false;
        this.notificationService.showError('Error al subir imágenes');
        this.cdr.markForCheck();
      }
    });
  }

  // ── Editar nombre ─────────────────────────────────────────────────
  openEditModal(image: CatalogImage): void {
    this.editingImage = image;
    this.editingName = image.name;
    this.isEditModalOpen = true;
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editingImage = null;
    this.editingName = '';
  }

  saveEdit(): void {
    if (!this.editingImage || !this.editingName.trim()) return;
    this.isSaving = true;

    this.imageCatalogService.renameImage(this.editingImage.id_catalogo_imagen, this.editingName.trim()).subscribe({
      next: () => {
        this.isSaving = false;
        // Actualizar nombre en el picker directamente sin recargar
        const img = this.picker.images.find(i => i.id_catalogo_imagen === this.editingImage!.id_catalogo_imagen);
        if (img) img.name = this.editingName.trim();
        this.closeEditModal();
        this.notificationService.showSuccess("Imagen renombrada correctamente");
        this.picker['cdr'].markForCheck();
      },
      error: () => {
        this.isSaving = false;
        this.notificationService.showError('Error al renombrar');
        this.cdr.markForCheck();
      }
    });
  }

  // ── Eliminar ──────────────────────────────────────────────────────
  deleteImage(image: CatalogImage): void {
    this.confirm.confirmDelete(`¿Eliminar la imagen "${image.name}"?`).subscribe({
      next: (acepted) => {
        if (acepted) {
          this.imageCatalogService.deleteImage(image.id_catalogo_imagen).subscribe({
            next: () => {
              setTimeout(() => this.picker.loadImages());
              this.notificationService.showSuccess("Imagen eliminada correctamente");
            },
            error: () => {
              this.notificationService.showError("Error al eliminar la imagen")
            }
          })
        }
      },
    })
  }

  deleteSelected(): void {
    const ids = Array.from(this.picker.selectedImages);
    if (ids.length === 0) return;
    this.confirm.confirmDelete(`¿Eliminar ${ids.length} imagen(es) seleccionada(s)?`).subscribe({
      next: (confirm) => {
        if(confirm){
          this.imageCatalogService.deleteImages(ids).subscribe({
            next: () => {
              this.picker.selectedImages.clear();
              setTimeout(() => this.picker.loadImages());
            },
            error: () => this.notificationService.showError("Error al eliminar las imagenes")
          })
        }
      }
    });
  }

  // ── Utils ─────────────────────────────────────────────────────────


}
