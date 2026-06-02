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
  token: string;
  tipoToken: string;
}

interface AuthResponse extends UsuarioLogado {}

export interface RegisterRequest {
  nome: string;
  cpf: string;
  email: string;
  senha: string;
  perfil: PerfilUsuario;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = '/api/auth';
  private readonly storageKey = 'sistemaodonto.usuario';
  private readonly tokenStorageKey = 'sistemaodonto.token';
  private readonly tokenTypeStorageKey = 'sistemaodonto.tipoToken';

  readonly usuario = signal<UsuarioLogado | null>(this.getUsuarioFromStorage());

  constructor(private readonly http: HttpClient) {}

  login(credenciais: LoginRequest) {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credenciais).pipe(
      tap((usuario) => {
        this.salvarSessao(usuario);
      })
    );
  }

  register(dados: RegisterRequest) {
    return this.http.post<UsuarioLogado>(`${this.apiUrl}/register`, dados);
  }

  logout(): void {
    this.limparSessao();
  }

  limparSessao(): void {
    this.usuario.set(null);
    this.limparStorage();
  }

  estaLogado(): boolean {
    return !!this.getToken();
  }

  getToken(): string {
    return localStorage.getItem(this.tokenStorageKey) ?? this.usuario()?.token ?? '';
  }

  getTipoToken(): string {
    return localStorage.getItem(this.tokenTypeStorageKey) ?? this.usuario()?.tipoToken ?? 'Bearer';
  }

  temPerfil(perfil: PerfilUsuario): boolean {
    return this.usuario()?.perfil === perfil;
  }

  private salvarSessao(response: AuthResponse): void {
    const usuario: UsuarioLogado = {
      id: response.id,
      nome: response.nome,
      email: response.email,
      perfil: response.perfil,
      token: response.token,
      tipoToken: response.tipoToken || 'Bearer'
    };

    localStorage.setItem(this.storageKey, JSON.stringify(usuario));
    localStorage.setItem(this.tokenStorageKey, usuario.token);
    localStorage.setItem(this.tokenTypeStorageKey, usuario.tipoToken);
    this.usuario.set(usuario);
  }

  private getUsuarioFromStorage(): UsuarioLogado | null {
    const usuarioSalvo = localStorage.getItem(this.storageKey);

    if (!usuarioSalvo) {
      return null;
    }

    try {
      const usuario = JSON.parse(usuarioSalvo) as UsuarioLogado;
      const token = localStorage.getItem(this.tokenStorageKey) ?? usuario.token;

      if (!token) {
        this.limparStorage();
        return null;
      }

      return {
        ...usuario,
        token,
        tipoToken: localStorage.getItem(this.tokenTypeStorageKey) ?? usuario.tipoToken ?? 'Bearer'
      };
    } catch {
      this.limparStorage();
      return null;
    }
  }

  private limparStorage(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.tokenStorageKey);
    localStorage.removeItem(this.tokenTypeStorageKey);
  }
}
