import { Component, Optional, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth/auth.service';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

@Component({
  selector: 'app-forgot-password-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
],
  templateUrl: './forgot-password-dialog.html',
  styleUrl: './forgot-password-dialog.css'
})
export class ForgotPasswordDialog {
  forgotPasswordForm: FormGroup;
  isLoading = signal(false);
  isSuccess = signal(false);
  error = signal<string>('');

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    @Optional() private dialogRef?: MatDialogRef<ForgotPasswordDialog> 
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.forgotPasswordForm.valid) {
      this.isLoading.set(true);
      this.error.set('');

      const request = { email: this.forgotPasswordForm.get('email')?.value };

      this.authService.forgotPassword(request).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.isSuccess.set(true);

        },
        error: () => {
          this.isLoading.set(false);
          this.error.set('Error al enviar el correo. Intenta nuevamente.');
        }
      });
    }
  }

  onClose(): void {
    this.dialogRef?.close(); 
  }

  getEmailError(): string {
    const emailField = this.forgotPasswordForm.get('email');
    if (emailField?.errors && emailField.touched) {
      if (emailField.errors['required']) {
        return 'El correo electrónico es requerido';
      }
      if (emailField.errors['email']) {
        return 'Ingresa un correo electrónico válido';
      }
    }
    return '';
  }
}