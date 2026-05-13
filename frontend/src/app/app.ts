import { CommonModule } from '@angular/common';
import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth/auth.service';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  template: '<router-outlet></router-outlet>',
  styleUrl: './app.css'
})
export class App implements OnInit {
  // private authService = inject(AuthService);
  // constructor(){
  //   this.authService.checkoutStatus();
  // }
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.authService.restoreSession().subscribe({
      error: () => {
        const currentPath = window.location.pathname;
        const isPublicRoute = currentPath === '/login';
        if (!isPublicRoute) {
          this.router.navigate(['/login']);
        }
      }
    });
  }
}
