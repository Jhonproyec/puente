import {  CanDeactivateFn } from '@angular/router';
import { ConfirmDialogService } from '../services/confirm-dialog.service';
import { inject } from '@angular/core';

export interface CanComponentDeactivate {
  hasUnsavedChanges: boolean;
}
export const formBuilderUnsaveGuardTsGuard: CanDeactivateFn<CanComponentDeactivate> = (component) => {
  if (!component.hasUnsavedChanges) return true;

  const confirmService = inject(ConfirmDialogService);

  return confirmService.openConfirmationDialog({
    title: 'Cambios sin guardar',
    message: 'Tienes cambios sin guardar en el formulario. ¿Deseas salir de todas formas?',
    confirmText: 'Salir sin guardar',
    cancelText: 'Quedarse',
    type: 'danger'
  });

};
