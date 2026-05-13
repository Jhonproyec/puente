import { Component, Inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule, MatIconButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '../../../core/services/auth/user.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './change-password-dialog.html',
  styleUrl: './change-password-dialog.css'
})
export class ChangePasswordDialog {
  changePasswordForm: FormGroup;
  error = signal<string>('');
  isLoading = signal(false);

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public user: any,
    private userService: UserService,
    private notificationService: NotificationService,
    private dialogRef: MatDialogRef<ChangePasswordDialog>,
  ) {
    this.changePasswordForm = this.fb.group({
      oldPassword: ['', [Validators.required, Validators.minLength(8)]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      repeatPassword: ['', [Validators.required, Validators.minLength(8)]],
    });

  }
  hidePassword = signal(true);


  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  onSubmit() {
    this.isLoading.set(true);
    this.error.set('');
    if (this.validatePassword()) {
      const data = {
        idUser: this.user.idUser,
        ...this.changePasswordForm.getRawValue(),
      };
      this.userService.changePassword(data).subscribe({
        next: (res:any) => {
          this.onCancel();
          this.isLoading.set(false);
        },
        error: (error: any)=> {
          if(error.error.error.details){
            this.isLoading.set(false);
              error.error.error.details.forEach((error:any) => {
                this.error.set(error.message);
              })
          }else{
            this.error.set(error.error.error.message)
          }
          this.isLoading.set(false);
        }
      });
      
    } else {
      this.isLoading.set(false);
      this.error.set("Las contraseñas no coinciden");
    }
  }

  validatePassword(): boolean {
    const password = this.changePasswordForm.get('newPassword')?.value;
    const repeatPassword = this.changePasswordForm.get('repeatPassword')?.value;
    return password === repeatPassword
  }

  getFieldError(fieldName: string): string {
    const field = this.changePasswordForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return '*Este campo es requerido';
      }
      if (field.errors['minlength']) {
        const minLength = field.errors['minlength'].requiredLength;
        return `*Debe tener al menos ${minLength} caracteres`;
      }
    }
    return '';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

}
