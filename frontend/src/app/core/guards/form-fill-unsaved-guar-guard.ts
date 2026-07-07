import { CanDeactivateFn } from '@angular/router';
// import { FormFillIndex } from '../../features/form-fill/form-fill-index/form-fill-index';

export const formFillUnsavedGuarGuard: CanDeactivateFn<any> = (component) => {

  return true;
};
