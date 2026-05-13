import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms'
import { AuthService } from '../../../core/services/auth/auth.service';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ForgotPasswordDialog } from '../forgot-password-dialog/forgot-password-dialog';
import { MatCardModule } from '@angular/material/card'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  loginForm: FormGroup;
  isLoading = signal(false);
  error = signal<string>("");
  hidePassword = signal(true);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }
  onSubmit(): void {
    if (!this.loginForm.valid) {
      this.loginForm.markAllAsTouched();
      return;  // bug corregido — antes no cortaba el flujo
    }

    this.isLoading.set(true);
    this.error.set('');

    this.authService.login(this.loginForm.value).subscribe({
      error: (err) => {
        this.isLoading.set(false);
        this.error.set(err?.error?.message ?? 'Error al iniciar sesión');
      },
      complete: () => this.isLoading.set(false)
    });
    // la navegación al dashboard ya la hace el AuthService en el tap()
  }
  // onSubmit():void{
  //   if(this.loginForm.valid){
  //     this.isLoading.set(true);
  //     this.error.set("");
  //   }

  //   const credentials = this.loginForm.value;
  //   this.authService.login(credentials).subscribe({
  //     next: (response) => {
  //       console.log(response);
  //       // this.isLoading.set(false);
  //       // if(response.user.role == 'ADMIN'){
  //       //   this.router.navigate(['/dashboard']);
  //       // }else{
  //       //   this.router.navigate(['/dashboard/pedidos-pendientes']);
  //       // }
  //     },
  //     error:(error) => {
  //       this.isLoading.set(false);
  //       this.error.set(error.error.message || 'Error al iniciar sesión');
  //     }
  //   })
  // }

  openForgotPasswordDialog(): void {
    const dialogRef = this.dialog.open(ForgotPasswordDialog, {
      width: '400px',
      disableClose: false,
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Forgot password email sento to: ', result);
      }
    })
  }

  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  getFieldError(fieldName: string): string {
    const field = this.loginForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${fieldName === 'userName' ? '*Usuario' : '*Contraseña'} es requerido`;
      }
      if (field.errors['minlength']) {
        return 'La contraseña debe tener al menos 6 caracteres';
      }
    }
    return '';
  }

}
