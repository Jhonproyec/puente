import { inject, Inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialog, ConfirmationDialogData } from '../../layout/confirmation-dialog/confirmation-dialog';
import { Observable } from 'rxjs';
import { title } from 'process';

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {
  private dialog = inject(MatDialog);

  openConfirmationDialog(data: ConfirmationDialogData): Observable<boolean> {
    const dialogRef = this.dialog.open(ConfirmationDialog, {
      disableClose: true,
      data
    });
    return dialogRef.afterClosed();
  }
  

  confirmDelete(message:string):Observable<boolean>{
      return this.openConfirmationDialog({

        title: 'Confirmar eliminación',
        message,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        type: 'danger'
      });
  }




}
