import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, ChangeDetectorRef, inject, signal, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth/auth.service';
import { User } from '../../core/models/user.model';
import { Router } from '@angular/router';

interface FormItem {
  id: string;
  name: string;
  responses: number;
  status: 'active' | 'inactive';
}

interface UserItem {
  id: string;
  name: string;
  role: string;
  lastAccess: string;
  status: 'online' | 'offline';
}

interface ActivityItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  time: string;
}


@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard implements OnInit{
  auth = inject(AuthService);
  currentUser = signal<User | null>(null);
  private router = inject(Router);
  canViewTotalUser = computed(() => this.auth.hasPermission('VIEW_TOTAL_USERS'));
  canViewTotalAnswer = computed(() => this.auth.hasPermission('VIEW_TOTAL_ANSWER'));
  canViewReport = computed(() => this.auth.hasPermission('VIEW_REPORT'));
  canViewUsers = computed(() => this.auth.hasPermission('VIEW_USER'));
  canCreateUser = computed(() => this.auth.hasPermission('CREATE_USER'));




  totalForms = 8;
  totalResponses = 1542;
  totalUsers = 24;
  completionRate = 87;

  recentForms: FormItem[] = [
    { id: '1', name: 'Encuesta de Satisfacción', responses: 345, status: 'active' },
    { id: '2', name: 'Formulario Feedback', responses: 128, status: 'active' },
    { id: '3', name: 'Registro de Eventos', responses: 89, status: 'inactive' }
  ];

  activeUsers: UserItem[] = [
    { id: '1', name: 'Juan Pérez', role: 'Admin', lastAccess: 'hace 2h', status: 'online' },
    { id: '2', name: 'María García', role: 'Editor', lastAccess: 'hace 4h', status: 'online' },
    { id: '3', name: 'Carlos López', role: 'Visualizador', lastAccess: 'hace 1d', status: 'offline' },
    { id: '4', name: 'Ana Martínez', role: 'Editor', lastAccess: 'hace 3d', status: 'offline' }
  ];

  recentActivity: ActivityItem[] = [
    { id: '2', icon: 'person_add', title: 'Nuevo usuario registrado', description: 'Roberto Sánchez', time: 'Hace 5 horas' },
    { id: '4', icon: 'edit', title: 'Formulario editado', description: '"Formulario Feedback"', time: 'Hace 1 día' }
  ];

  constructor() { }

  ngOnInit(): void {
    // Aquí puedes cargar los datos desde un servicio
    console.log('Dashboard inicializado');
    const user = this.auth.currentUser();
    if(user) this.currentUser.set(user)
  }

  viewAllForms(): void {
    console.log('Ver todos los formularios');
  }

  manageUsers(): void {
    this.router.navigate(['/usuarios'])
  }

  getName():string{
    const user = this.currentUser();
    return user ? `${user.firstName} ${user.lastName}` : 'Usuario'
  }

}