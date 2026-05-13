import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RoleService } from '../../../core/services/role.service';
import { ModuleInterface, RolesInterface } from '../../../core/models/rol.model';
import { NotificationService } from '../../../core/services/notification.service';


interface DynamicForm {
  id: string;
  name: string;
  slug: number;
  route: string;
  totalFields: number;
  totalResponses: number;
}



@Component({
  selector: 'app-create-rol-dialog',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './create-rol-dialog.html',
  styleUrl: './create-rol-dialog.css'
})
export class CreateRolDialog implements OnInit {
  constructor(
    private fb: FormBuilder,
    private roleService: RoleService,
    private dialogRef: MatDialogRef<CreateRolDialog>,
    private notificationService: NotificationService,
    @Inject(MAT_DIALOG_DATA) public role: any,
    private cdr: ChangeDetectorRef,
  ) {
    this.createRoleForm = this.fb.group({
      roleName: ['', [Validators.required, Validators.minLength(3)]],
      permissions: [[], [Validators.required]],
    });
  }

  createRoleForm: FormGroup;
  isLoading = signal(false);
  error = signal<string>('');
  selectAllForms = signal(false);

  // Permisos organizados por categorías
  permissions: ModuleInterface[] = [];

  dynamicForms: DynamicForm[] = [];

  ngOnInit(): void {
    // this.loadDynamicForms();
    this.loadPermissions();
    if (this.role != null && this.role != undefined) {
      this.setForm();
    }
  }

  loadPermissions() {
    this.roleService.getAllPermissions().subscribe({
      next: (response: ModuleInterface[]) => {
        if (response != null) {
          this.permissions = response;
        } else {
          this.notificationService.showError('Error al obtener los permisos')
        }
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error(`Error al obtener los permisos:`, error);
        this.notificationService.showError('Error al obtener los permisos');
      }
    })
  }

  loadDynamicForms(): void {
    try {
      const formsData = localStorage.getItem('dynamicMenuForms');
      if (formsData) {
        this.dynamicForms = JSON.parse(formsData);
      }
    } catch (error) {
      console.error('Error loading dynamic forms from localStorage:', error);
      this.error.set('Error al cargar los formularios disponibles');
    }
  }

  togglePermission(permissionId: any): void {
    const permissionsControl = this.createRoleForm.get('permissions');
    if (permissionsControl) {
      const currentPermissions = permissionsControl.value as string[];
      const isChecked = currentPermissions.includes(permissionId); // ← variable, no string

      if (isChecked) {
        const filtered = currentPermissions.filter(p => p !== permissionId);
        permissionsControl.setValue(filtered);
      } else {
        permissionsControl.setValue([...currentPermissions, permissionId]);
      }
    }
  }

  isPermissionChecked(permissionId: any): boolean {
    const permissionsControl = this.createRoleForm.get('permissions');
    if (permissionsControl) {
      return (permissionsControl.value as string[]).includes(permissionId); // ← variable, no string
    }
    return false;
  }

  toggleFormSelection(formId: string): void {
    const formsControl = this.createRoleForm.get('allowedForms');
    if (formsControl) {
      const currentForms = formsControl.value as string[];
      const isChecked = currentForms.includes(formId);

      if (isChecked) {
        const filtered = currentForms.filter(f => f !== formId);
        formsControl.setValue(filtered);
      } else {
        formsControl.setValue([...currentForms, formId]);
      }
    }
  }

  isFormSelected(formId: string): boolean {
    const formsControl = this.createRoleForm.get('allowedForms');
    console.log(formsControl);
    if (formsControl) {
      return (formsControl.value as string[]).includes(formId);
    }
    return false;
  }

  toggleSelectAllForms(): void {
    const formsControl = this.createRoleForm.get('allowedForms');
    if (formsControl) {
      if (this.selectAllForms()) {
        formsControl.setValue([]);
        this.selectAllForms.set(false);
      } else {
        const allFormIds = this.dynamicForms.map(form => form.id);
        formsControl.setValue(allFormIds);
        this.selectAllForms.set(true);
      }
    }
  }

  onSubmit(): void {
    if (this.createRoleForm.valid) {
      this.isLoading.set(true);

      const roleData = this.createRoleForm.value;
      if (this.role == null || this.role == undefined) {
        this.roleService.createRol(roleData).subscribe({
          next: (response) => {
            this.dialogRef.close({
              success: true,
              data: response
            });
          },
          error: (error) => {
            console.error("Error al guardar el rol", error);
            this.notificationService.showError("Error al guardar el rol");
          },
          complete: () => {
            this.isLoading.set(false);
          }
        })
      } else {
        const data: RolesInterface = {
          id_rol: this.role.id_rol,
          name: roleData.roleName,
          permissions: roleData.permissions,
          count_permissions: 0
        };
        this.roleService.updateRole(data).subscribe({
          next: (response) => {
            if (response != null) {
              this.dialogRef.close({
                success: true,
                data: response
              });
            } else {
              this.notificationService.showError("Error al editar el rol")
            }
          },
          error: (error) => {
            console.error("Error al editar el rol", error);
            this.notificationService.showError("Error al editar el rol")
          },
          complete: () => {
            this.isLoading.set(false);
          }
        })
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getFieldError(fieldName: string): string {
    const field = this.createRoleForm.get(fieldName);
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

  setForm(): void {
    this.createRoleForm.patchValue({
      roleName: this.role.name,
      permissions: this.role.permissions
    });
  }
}
