import { CommonModule } from '@angular/common';
import { Component, OnInit, Output, EventEmitter, computed, signal, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth/auth.service';
import { filter, firstValueFrom } from 'rxjs';
import { FormService } from '../../core/services/form.service';
import { NotificationService } from '../../core/services/notification.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { ConfirmDialogService } from '../../core/services/confirm-dialog.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  active?: boolean;
  id?: string;
  isDynamic?: boolean;
  showActions?: boolean;
  isEditing?: boolean;
  editingLabel?: string;
  permission: string | null;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatInputModule,
    FormsModule,
    MatProgressSpinner
  ],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css']
})
export class Sidebar implements OnInit {
  private auth = inject(AuthService);

  @Output() menuItemSelected = new EventEmitter<void>();

  canCreate = computed(() => this.auth.hasPermission('CREATE_FORM'))
  cancUpdate = computed(() => this.auth.hasPermission('UPDATE_FORM'))
  canDelete = computed(() => this.auth.hasPermission('DELETE_FORM'))
  canViewForm = computed(() => this.auth.hasPermission('VIEW_FORM'))
  isSaving = signal(false);
  isDeleting = signal(false);

  showAddMenuItem = false;
  newMenuItemLabel = '';
  activeRoute = signal<string>('');

  // Items dinámicos (formularios) — mutables
  dynamicItems = signal<MenuItem[]>([]);

  // Items estáticos filtrados por permisos — solo lectura
  staticItems = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return [];
    return this.ALL_MENU_ITEMS.filter(item =>
      item.permission === null || this.authService.hasPermission(item.permission)
    );
  });

  // Items dinámicos filtrados por permisos
  filteredDynamicItems = computed(() => {
    return this.dynamicItems().filter(item =>
      this.authService.hasPermission('VIEW_FORM')
    );
  });

  private readonly ALL_MENU_ITEMS: MenuItem[] = [
    { label: 'Inicio', icon: 'home', route: '/dashboard', permission: null },
    { label: 'Centros Nútreme', icon: 'account_balance', route: '/centro-nutreme', permission: 'CREATE_CATALOG' },
    { label: 'Catalogos', icon: 'library_books', route: '/catalogos', permission: 'CREATE_CATALOG' },
    { label: 'Imágenes', icon: 'crop_original', route: '/images', permission: 'CREATE_CATALOG' },
    { label: 'Roles', icon: 'vpn_key', route: '/roles', permission: 'CREATE_ROLE' },
    { label: 'Usuarios', icon: 'people', route: '/usuarios', permission: 'CREATE_USER' },
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private formService: FormService,
    private notificationService: NotificationService,
    private confirmationService: ConfirmDialogService,
  ) { }

  ngOnInit(): void {
    this.loadDynamicMenuItems();
    this.updateActiveRoute();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => this.updateActiveRoute());
  }

  private updateActiveRoute(): void {
    this.activeRoute.set(this.router.url);
  }

  isActive(item: MenuItem): boolean {
    return item.isDynamic
      ? this.activeRoute().startsWith(item.route)
      : this.activeRoute() === item.route;
  }

  private loadDynamicMenuItems(): void {
    const forms = this.authService.forms();
    const items: MenuItem[] = forms.map((form, index) => ({
      label: form.nombre,
      icon: 'description',
      route: `/formulario/${form.uuid}`,
      id: form.uuid,
      isDynamic: true,
      showActions: false,
      isEditing: false,
      editingLabel: form.nombre,
      permission: 'VIEW_FORM'
    }));
    this.dynamicItems.set(items);
  }

  addNewMenuItem(): void {
    this.isSaving.set(true);
    if (!this.newMenuItemLabel.trim()) return;
    const index = this.dynamicItems().length + 1;
    const data = {
      name: this.newMenuItemLabel,
      idUser: this.auth.currentUser()?.idUser
    }
    this.formService.createNewForm(data).subscribe({
      next: ((response: any) => {
        if (response != null) {
          const newItem: MenuItem = {
            label: this.newMenuItemLabel,
            icon: 'description',
            route: `/formulario/${response.uuid}`,
            isDynamic: true,
            id: response.uuid,
            showActions: false,
            isEditing: false,
            editingLabel: this.newMenuItemLabel,
            permission: 'VIEW_FORM'
          }
          this.dynamicItems.update(items => [...items, newItem]);
          this.newMenuItemLabel = '';
          this.showAddMenuItem = false;
        }
      }),
      error: (error => {
        console.error("Error al crear desde el sidebar", error);
        this.notificationService.showError("Error al crear el formulario");
      }),
      complete: () => {
        this.isSaving.set(false);
      }
    })
  }

  deleteItem(item: MenuItem, event: Event): void {
    this.isDeleting.set(true);
    this.confirmationService.confirmDelete("¿Está seguro de eliminar este formulario?").subscribe(confirmed => {
      if (confirmed) {
        this.formService.deleteForm(
          item.id!,
          this.auth.currentUser()?.idUser!
        ).subscribe({
          next: (response: any) => {
            if (response) {
              this.dynamicItems.update(items => items.filter(i => i.id !== item.id));
            }
          },
          error: (error => {
            this.notificationService.showError(error);
          }),
          complete: () => {
            this.isDeleting.set(false);
          }
        })
      }
    })



    // event.stopPropagation();
    // if (confirm(`¿Estás seguro de eliminar "${item.label}"?`)) {
    //   this.dynamicItems.update(items => items.filter(i => i.id !== item.id));
    // }
  }

  toggleItemActions(item: MenuItem, event: Event): void {
    event.stopPropagation();
    this.dynamicItems.update(items =>
      items.map(i => ({ ...i, showActions: i.id === item.id ? !i.showActions : false }))
    );
  }

  startEditItem(item: MenuItem, event: Event): void {
    event.stopPropagation();
    this.dynamicItems.update((items) =>
      items.map(i => ({ ...i, isEditing: i.id === item.id, editingLabel: i.label }))
    );
  }

  saveEditItem(item: MenuItem, event: Event): void {
    if (!item.editingLabel?.trim()) return;
    this.isSaving.set(true);
    const data = {
      uuid: item.id,
      nombre: item.editingLabel,
      id_usuario: this.authService.currentUser()?.idUser
    }
    this.formService.updateName(data).subscribe({
      next: ((response: any) => {
        this.dynamicItems.update(items =>
          items.map(i => i.id === item.id
            ? { ...i, label: response.name!.trim(), isEditing: false }
            : i
          )
        )
      }),
      error: (error => {
        this.notificationService.showError(error);
        console.error("Error en el sidebar");
      }),
      complete: () => {
        this.isSaving.set(false);
      }
    })
  }

  cancelEditItem(item?: MenuItem): void {
    this.dynamicItems.update(items =>
      items.map(i => ({ ...i, isEditing: false, editingLabel: i.label }))
    );
  }

  editForm(item: MenuItem, event: Event): void {
    console.log("ITEM:", item);
    event.stopPropagation();
    this.router.navigate([`/formulario/${item.id}/form-build`]);
    this.dynamicItems.update(items =>
      items.map(i => ({ ...i, showActions: false }))
    );
  }

  navigateTo(route: string): void {
    console.log(route);
    this.router.navigate([route]);
    this.menuItemSelected.emit();
  }

  onMenuItemClick(item: MenuItem, event: Event): void {
    if (item.isDynamic && (event.target as HTMLElement).closest('.item-actions')) return;
    this.navigateTo(item.route);
  }

  toggleAddMenuItem(): void {
    this.showAddMenuItem = !this.showAddMenuItem;
    this.newMenuItemLabel = '';
    this.cancelEditItem();
  }

  logout(): void {
    this.authService.logout();
  }

  handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.addNewMenuItem();
  }
}