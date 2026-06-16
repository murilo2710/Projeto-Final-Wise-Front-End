import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable, finalize, shareReplay, tap, throwError } from 'rxjs';

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
  accessToken: string;
  refreshToken: string;
  tipoToken: string;
  expiresInMs?: number;
  refreshExpiresInMs?: number;
}

interface AuthResponse {
  id?: number;
  nome?: string;
  email?: string;
  perfil?: PerfilUsuario;
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  tipoToken?: string;
  expiresInMs?: number;
  refreshExpiresInMs?: number;
}

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
  private readonly refreshTokenStorageKey = 'sistemaodonto.refreshToken';
  private readonly tokenTypeStorageKey = 'sistemaodonto.tipoToken';
  private refreshRequest$?: Observable<AuthResponse>;

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
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      this.limparSessao();
      return;
    }

    this.http.post<void>(`${this.apiUrl}/logout`, { refreshToken }).pipe(
      finalize(() => this.limparSessao())
    ).subscribe({
      error: () => undefined
    });
  }

  limparSessao(): void {
    this.usuario.set(null);
    this.limparStorage();
  }

  estaLogado(): boolean {
    return !!this.getToken();
  }

  getToken(): string {
    return this.getAccessToken();
  }

  getAccessToken(): string {
    return localStorage.getItem(this.tokenStorageKey) ?? this.usuario()?.accessToken ?? this.usuario()?.token ?? '';
  }

  getRefreshToken(): string {
    return localStorage.getItem(this.refreshTokenStorageKey) ?? this.usuario()?.refreshToken ?? '';
  }

  getTipoToken(): string {
    return localStorage.getItem(this.tokenTypeStorageKey) ?? this.usuario()?.tipoToken ?? 'Bearer';
  }

  temPerfil(perfil: PerfilUsuario): boolean {
    return this.usuario()?.perfil === perfil;
  }

  renovarToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      return throwError(() => new Error('Refresh token não encontrado.'));
    }

    if (!this.refreshRequest$) {
      this.refreshRequest$ = this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
        tap((response) => this.atualizarTokens(response)),
        finalize(() => {
          this.refreshRequest$ = undefined;
        }),
        shareReplay(1)
      );
    }

    return this.refreshRequest$;
  }

  private salvarSessao(response: AuthResponse): void {
    const accessToken = response.accessToken ?? response.token ?? '';
    const refreshToken = response.refreshToken ?? '';

    const usuario: UsuarioLogado = {
      id: response.id ?? 0,
      nome: response.nome ?? '',
      email: response.email ?? '',
      perfil: response.perfil ?? 'DENTISTA',
      token: accessToken,
      accessToken,
      refreshToken,
      tipoToken: response.tipoToken || 'Bearer',
      expiresInMs: response.expiresInMs,
      refreshExpiresInMs: response.refreshExpiresInMs
    };

    localStorage.setItem(this.storageKey, JSON.stringify(usuario));
    localStorage.setItem(this.tokenStorageKey, usuario.accessToken);
    localStorage.setItem(this.refreshTokenStorageKey, usuario.refreshToken);
    localStorage.setItem(this.tokenTypeStorageKey, usuario.tipoToken);
    this.usuario.set(usuario);
  }

  private atualizarTokens(response: AuthResponse): void {
    const usuarioAtual = this.usuario();
    const accessToken = response.accessToken ?? response.token ?? '';
    const refreshToken = response.refreshToken ?? this.getRefreshToken();

    if (!usuarioAtual || !accessToken || !refreshToken) {
      this.limparSessao();
      return;
    }

    const usuarioAtualizado: UsuarioLogado = {
      ...usuarioAtual,
      token: accessToken,
      accessToken,
      refreshToken,
      tipoToken: response.tipoToken || usuarioAtual.tipoToken || 'Bearer',
      expiresInMs: response.expiresInMs ?? usuarioAtual.expiresInMs,
      refreshExpiresInMs: response.refreshExpiresInMs ?? usuarioAtual.refreshExpiresInMs
    };

    localStorage.setItem(this.storageKey, JSON.stringify(usuarioAtualizado));
    localStorage.setItem(this.tokenStorageKey, usuarioAtualizado.accessToken);
    localStorage.setItem(this.refreshTokenStorageKey, usuarioAtualizado.refreshToken);
    localStorage.setItem(this.tokenTypeStorageKey, usuarioAtualizado.tipoToken);
    this.usuario.set(usuarioAtualizado);
  }

  private getUsuarioFromStorage(): UsuarioLogado | null {
    const usuarioSalvo = localStorage.getItem(this.storageKey);

    if (!usuarioSalvo) {
      return null;
    }

    try {
      const usuario = JSON.parse(usuarioSalvo) as UsuarioLogado;
      const token = localStorage.getItem(this.tokenStorageKey) ?? usuario.token;
      const refreshToken = localStorage.getItem(this.refreshTokenStorageKey) ?? usuario.refreshToken;

      if (!token || !refreshToken) {
        this.limparStorage();
        return null;
      }

      return {
        ...usuario,
        token,
        accessToken: token,
        refreshToken,
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
    localStorage.removeItem(this.refreshTokenStorageKey);
    localStorage.removeItem(this.tokenTypeStorageKey);
  }
}
