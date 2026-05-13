import { Component, Input, OnInit } from '@angular/core';
import { FormElement } from '../../../../../core/models/form-builder.model';
import { FormBuilderStateService } from '../../../../../core/services/form-builder-state.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CatalogImage } from '../../../../image-catalog/image-catalog';
import { ImagePickerDialog } from '../../../../image-catalog/components/image-picker-dialog/image-picker-dialog';

@Component({
  selector: 'app-element-image-editor',
  imports: [
    FormsModule,
    CommonModule,
    MatDialogModule
  ],
  templateUrl: './element-image-editor.html',
  styleUrl: './element-image-editor.css',
  standalone: true
})
export class ElementImageEditor implements OnInit {
  @Input() element!: FormElement;

  uploadMethod: 'file' | 'url' = 'file';
  imageUrl = '';
  altText = '';
  selectedFile: File | null = null;
  selectedFileName = '';
  editMode = false;
  editAltText = '';

  constructor(private stateService: FormBuilderStateService, private dialog: MatDialog) { }

  ngOnInit(): void {
    if (this.element.image && this.element.image.url) {
      this.editAltText = this.element.image.altText || '';
    }
  }

  /**
   * Cuando el usuario selecciona un archivo
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validar que sea imagen
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido');
        return;
      }

      // Validar tamaño (máximo 5 MB)
      const maxSizeInBytes = 5 * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        alert('El archivo es demasiado grande. Máximo 5 MB');
        return;
      }

      this.selectedFile = file;
      this.selectedFileName = file.name;
    }
  }

  openImagePicker(): void {
    const dialogRef = this.dialog.open(ImagePickerDialog, {
      width: '1000px',
      maxHeight: '90vh',
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((image: CatalogImage | null) => {
      if (!image) return;

      this.stateService.setElementImage(
        this.element.id,
        image.path,           // ← URL del servidor
        image.name            // ← nombre como altText
      );
    });
  }

  /**
   * Agrega imagen desde URL
   */
  addImage(): void {
    if (!this.imageUrl) return;

    this.stateService.setElementImage(
      this.element.id,
      this.imageUrl,
      this.altText || 'Imagen del campo'
    );

    this.imageUrl = '';
    this.altText = '';
  }

  /**
   * Elimina la imagen
   */
  removeImage(): void {
    this.stateService.removeElementImage(this.element.id);
  }

  /**
   * Actualiza el texto alternativo
   */
  updateAltText(): void {
    if (!this.editAltText) return;

    this.stateService.updateElementImageAlt(
      this.element.id,
      this.editAltText
    );

    this.editMode = false;
  }

}
