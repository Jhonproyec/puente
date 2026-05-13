import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmationDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger' | 'info';
}

@Component({
  selector: 'app-confirmation-dialog',
  imports: [
    MatDialogModule, MatButtonModule, MatIconModule
  ],
  templateUrl: './confirmation-dialog.html',
  styleUrl: './confirmation-dialog.css',
  standalone: true
})
export class ConfirmationDialog {
  public dialogRef = inject(MatDialogRef<ConfirmationDialog>);
  public data = inject<ConfirmationDialogData>(MAT_DIALOG_DATA);

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getIcon(): string {
    switch (this.data.type) {
      case 'warning':
        return 'warning';
      case 'danger':
        return 'dangerous';
      case 'info':
        return 'info';
      default:
        return 'help_outline';
    }
  }

  getIconClass(): string {
    return this.data.type || 'info';
  }

  getConfirmButtonClass(): string {
    return `confirm-button ${this.data.type || 'info'}`;
  }

}
