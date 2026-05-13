import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { CatalogImage } from '../../image-catalog';
import { ImagePicker } from '../image-picker/image-picker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-image-picker-dialog',
  imports: [
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    ImagePicker,
  ],
  templateUrl: './image-picker-dialog.html',
  styleUrl: './image-picker-dialog.css'
})
export class ImagePickerDialog {
  constructor(
    private dialogRef: MatDialogRef<ImagePickerDialog, CatalogImage | null>
  ) { }

  onImageSelected(image: CatalogImage): void {
    this.dialogRef.close(image);
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
