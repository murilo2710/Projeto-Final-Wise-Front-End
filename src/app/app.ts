import { Component, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  constructor(
    protected readonly authService: AuthService,
    private readonly router: Router
  ) {}

  protected readonly title = signal('Projeto-Final-Wise-Front-End');

  protected logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
