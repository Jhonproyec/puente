import { CommonModule } from '@angular/common';
import { Component, signal, OnInit, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { RoleService } from '../../../core/services/role.service';
import { CreateRolDialog } from '../create-rol-dialog/create-rol-dialog';
import { RolesInterface } from '../../../core/models/rol.model';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-roles',
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatMenuModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './roles.html',
  styleUrl: './roles.css'
})
export class Roles implements OnInit {
  // Signal para almacenar roles
  roles = signal<RolesInterface[]>([]);
  isLoadingRoles = signal(false);
  displayedColumns: string[] = ['roleName', 'permissions', 'createdAt', 'actions'];

  canCreate = computed(() => this.authService.hasPermission('CREATE_ROLE'))
  canUpdate = computed(() => this.authService.hasPermission('UPDATE_ROLE'))
  canDelete = computed(() => this.authService.hasPermission('DELETE_ROLE'))
  canView = computed(() => this.authService.hasPermission('VIEW_ROLE'))

  constructor(
    private dialog: MatDialog,
    private roleService: RoleService,
    private confirmationService: ConfirmDialogService,
    private notification: NotificationService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    if (!this.canView()) {
      this.router.navigate(['/dashboard']);
      this.notification.showError("No tienes permisos para esta sección de la aplicación")
    }
    this.cargarRoles();
  }

  /**
   * Cargar todos los roles (DATOS HARDCODEADOS)
   * Los datos se cargan sin consumir del servicio
   */
  cargarRoles(): void {
    this.isLoadingRoles.set(true);
    this.roleService.getAllRoles().subscribe({
      next: (response) => {
        if (response != null) {
          this.roles.set(response);
        }
      },
      error: (error) => {
        console.error("Error al obtener los roles", error);
        this.notification.showError('Error al cargar los roles')
      },
      complete: () => {
        this.isLoadingRoles.set(false);
      }

    })

  }

  /**
   * Abre el diálogo para crear un nuevo rol
   */
  openCreateRolDialog(): void {
    if (!this.canCreate()) {
      this.notification.showError('Permisos insuficientes')
      return
    }
    const dialogRef = this.dialog.open(CreateRolDialog, {
      width: '800px',
      maxWidth: '100vw',
      disableClose: true,
      data: null
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      console.log('Modal cerrado con resultado:', result);

      if (result && result.success) {
        const rol = result.data;

        // Agregar el nuevo rol al inicio de la lista
        this.roles.update(rolesActuales => {
          return [rol, ...rolesActuales];
        });

        this.notification.showSuccess('Rol creado correctamente');
      }
    });
  }

  /**
   * Editar un rol existente
   */
  editRole(rol: any): void {
    if (!this.canUpdate()) {
      this.notification.showError('Permisos insuficientes')
      return
    }
    const dialogRef = this.dialog.open(CreateRolDialog, {
      width: '800px',
      maxWidth: '100vw',
      disableClose: true,
      data: rol
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result && result.success) {
        const rolActualizado = result.data;

        // Actualizar el rol en la lista
        this.roles.update(rolesActuales => {
          const idx = rolesActuales.findIndex(r => r.id_rol === rolActualizado.id_rol);
          if (idx !== -1) {
            const nuevosRoles = [...rolesActuales];
            nuevosRoles[idx] = rolActualizado;
            return nuevosRoles;
          } else {
            return rolesActuales;
          }
        });
        this.notification.showSuccess(`Rol ${result.name} Actualizado`);


      }
    });
  }

  /**
   * Eliminar un rol con confirmación
   */
  deleteRole(rol: any): void {
    if(!this.canDelete()){
      this.notification.showError('Permisos insuficientes')
      return
    }
    this.confirmationService.confirmDelete('Esta seguro de eliminar el rol' + rol.name + ', Los usuarios con este rol no podran acceder al sistema').subscribe(confirmed => {
      if (confirmed) {
        this.roleService.deleteRole(rol.id_rol).subscribe({
          next: (response) => {
            if (response) {
              this.roles.update(rolesActuales => {
                return rolesActuales.filter(r => r.id_rol !== rol.id_rol);
              })
            }
          },
          error: (error) => {
            console.error('Error al eliminar el rol');
            this.notification.showError('Error al eliminar el rol');
          }
        })
      }
    });
  }
}