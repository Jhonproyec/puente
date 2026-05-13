import { CommonModule } from '@angular/common';
import { Component, input, OnInit, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { AuthService } from '../../core/services/auth/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { User } from '../../core/models/user.model';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';
import { ChangePasswordDialog } from '../../features/usuarios/change-password-dialog/change-password-dialog';
// import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatBadgeModule,
    MatIconModule
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar implements OnInit {
  isSidebarOpen = input<boolean>(false);
  toggleSidebar = output<void>();
  companyName = environment.COMPANY_NAME;

  currentUser = signal<User | null>(null);
  notifications = signal(3);

  constructor(
    private authService: AuthService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if(user){
      this.currentUser.set(user);
    }
    
    // this.authService.currentUser$.subscribe(user => {
    //   this.currentUser.set(user);
    // })
  }

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  openProfile(): void {
    // const dialogRef = this.dialog.open(ProfileDialo)
  }

  openChangePassword(): void {
    const dialogRef = this.dialog.open(ChangePasswordDialog, {
      width: '800px',
      maxWidth: '100vw',
      disableClose: true, 
      data: this.currentUser()
    })
  }

  logout(): void {
    this.authService.logout();
  }

  getUserInitials(): string {
    const user = this.currentUser();
    if (user) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    return 'U';
  }

  getUserFullName(): string {
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : 'Usuario';
  }


}
