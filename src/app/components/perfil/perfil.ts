import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService, PerfilUsuario } from '../../services/auth.service';
import { PerfilResponse, PerfilService } from '../../services/perfil.service';
import { AppLayoutComponent } from '../../shared/components/app-layout/app-layout';

@Component({
  selector: 'app-perfil',
  imports: [AppLayoutComponent],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class Perfil implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly perfilService = inject(PerfilService);
  private readonly router = inject(Router);

  protected readonly usuario = this.authService.usuario;
  protected readonly detalhes = signal<PerfilResponse | null>(null);
  protected readonly carregando = signal(false);

  protected readonly iniciais = computed(() => {
    const nome = (this.detalhes()?.nome ?? this.usuario()?.nome)?.trim();

    if (!nome) {
      return '?';
    }

    const partes = nome.split(/\s+/).filter(Boolean);
    const primeira = partes[0]?.[0] ?? '';
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';

    return (primeira + ultima).toUpperCase();
  });

  ngOnInit(): void {
    const logado = this.usuario();

    if (!logado) {
      return;
    }

    this.carregando.set(true);
    this.perfilService.buscarPerfil().subscribe({
      next: (detalhes) => {
        this.detalhes.set(detalhes);
        this.carregando.set(false);
      },
      error: () => {
        this.carregando.set(false);
      }
    });
  }

  protected perfilLabel(perfil: PerfilUsuario | undefined): string {
    if (perfil === 'ADMIN') {
      return 'Administrador';
    }

    if (perfil === 'DENTISTA') {
      return 'Dentista';
    }

    return 'Usuário';
  }

  protected formatarData(valor: string | null | undefined): string {
    if (!valor) {
      return '-';
    }

    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? valor : data.toLocaleString('pt-BR');
  }

  protected logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
