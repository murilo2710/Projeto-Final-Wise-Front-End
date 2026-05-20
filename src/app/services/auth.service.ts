import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';

export type PerfilUsuario = 'ADMIN' | 'DENTISTA';

export interface LoginRequest {
  email: string;
  senha: string;
}

export interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  perfil: PerfilUsuario;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = '/api/auth/login';
  private readonly storageKey = 'sistemaodonto.usuario';

  readonly usuario = signal<UsuarioLogado | null>(this.getUsuarioFromStorage());

  constructor(private readonly http: HttpClient) {}

  login(credenciais: LoginRequest) {
    return this.http.post<UsuarioLogado>(this.apiUrl, credenciais).pipe(
      tap((usuario) => {
        localStorage.setItem(this.storageKey, JSON.stringify(usuario));
        this.usuario.set(usuario);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.usuario.set(null);
  }

  estaLogado(): boolean {
    return this.usuario() !== null;
  }

  private getUsuarioFromStorage(): UsuarioLogado | null {
    const usuarioSalvo = localStorage.getItem(this.storageKey);

    if (!usuarioSalvo) {
      return null;
    }

    try {
      return JSON.parse(usuarioSalvo) as UsuarioLogado;
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }
}
