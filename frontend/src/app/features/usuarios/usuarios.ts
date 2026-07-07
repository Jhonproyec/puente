import { CommonModule } from '@angular/common';
import { Component, computed, Inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { User } from '../../core/models/user.model';
import { UserService } from '../../core/services/auth/user.service';
import { CreateUserDialog } from './create-user-dialog/create-user-dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';
import { AuthService } from '../../core/services/auth/auth.service';
import { Router } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { QrModal } from '../../shared/qr-modal/qr-modal';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-usuarios',
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
    MatPaginatorModule
  ],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css',
  standalone: true
})
export class Usuarios implements OnInit {
  users = signal<User[]>([]);
  isLoading = signal(false);
  displayedColumns: string[] = ['name', 'email', 'role', 'acceso_global', 'qr', 'actions'];
  totalOrders = 0;
  pageSize = 10;
  pageIndex = 0;
  canCreate = computed(() => this.authService.hasPermission('CREATE_USER'))
  canView = computed(() => this.authService.hasPermission('VIEW_USER'))
  canUpdate = computed(() => this.authService.hasPermission('UPDATE_USER'))
  canDelete = computed(() => this.authService.hasPermission('DELETE_USER'))

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private confirmationService: ConfirmDialogService,
    private authService: AuthService,
    private route: Router,
    private notificationService: NotificationService
  ) { }

  ngOnInit(): void {
    if (!this.canView()) {
      this.route.navigate(['/dashboard']);
      this.notificationService.showError('No tienes permisos para esta sección de la aplicación')
    }
    this.loadUsers();
  }

  loadUsers(page: number = 1, limit: number = this.pageSize): void {
    this.isLoading.set(true);
    this.userService.getUsers(page, limit).subscribe({
      next: (users: any) => {
        this.users.set(users.users);
        this.totalOrders = users.users.total;
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadUsers(this.pageIndex + 1, this.pageSize);
  }

  openCreateUserDialog(data: any = null): void {
    const dialogRef = this.dialog.open(CreateUserDialog, {
      width: '800px',
      maxWidth: '100vw',
      disableClose: true,
      data: data?.idUser
    });
    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      if (!data || data.idUser == null) {
        this.users.update(users => [result, ...users]);
      } else {
        this.users.update(users => {
          const idx = users.findIndex(u => u.idUser === result.idUser);
          if (idx === -1) return users;
          const updated = [...users];
          updated[idx] = result;
          return updated;
        });
      }
    });
  }


  deleteUser(user: User): void {
    this.confirmationService.confirmDelete("¿Está seguro de eliminar este usuario?").subscribe(confirmed => {
      if (confirmed) {
        this.userService.deleteUser(user.idUser).subscribe({
          next: (response) => {
            if (response) {
              this.users.set(
                this.users().filter(u => u.idUser !== user.idUser)
              );
            }
          },
          error: (error) => {
            console.log(error);
          }
        })
      }
    })
  }

  getUserInitials(user: User): string {
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  }

  abrirModalQr(user: User): void {
    const dialogRef = this.dialog.open(QrModal, {
      data: {
        qrUrl: null,
        downloadName: `QR_${user.dpi || user.idUser}.png`,
        title: 'Código QR',
        subtitle: `${user.firstName} ${user.lastName}`,
      },
      width: '420px',
      disableClose: false,
    });

    this.userService.generarQrUsuario(user.idUser).subscribe({
      next: (res) => {
        const nombreArchivo = res.qr_path.split(/[\\/]/).pop();
        const qrUrl = `${environment.BASE_URL.replace('/api/v1', '')}/public/qr/usuarios/${nombreArchivo}`;
        dialogRef.componentInstance.setQrUrl(qrUrl);
      },
      error: (error) => {
        dialogRef.close();
        this.notificationService.showError(error.error.message);
      }
    });
  }


}
