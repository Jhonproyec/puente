import { Component, Inject } from '@angular/core';
import { CatalogImage } from '../../image-catalog';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FileSizePipe } from '../../../../core/pipes/file-size-pipe';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ImageViewerDialogData {
  image: CatalogImage;
}

export type ImageViewerDialogResult =
  | { action: 'rename'; image: CatalogImage }
  | { action: 'delete'; image: CatalogImage }
  | null;

@Component({
  selector: 'app-image-viewer-dialog',
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    FileSizePipe,
  ],
  templateUrl: './image-viewer-dialog.html',
  styleUrl: './image-viewer-dialog.css'
})
export class ImageViewerDialog {

  constructor(
    public dialogRef: MatDialogRef<ImageViewerDialog, ImageViewerDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: ImageViewerDialogData,
  ) { }

  onRename(): void {
    this.dialogRef.close({ action: 'rename', image: this.data.image });
  }

  onDelete(): void {
    this.dialogRef.close({ action: 'delete', image: this.data.image });
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
