import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export type PerfilUsuario = 'ADMIN' | 'DENTISTA';

export interface UsuarioRequest {
  nome: string;
  cpf: string;
  email: string;
  senha?: string;
  perfil: PerfilUsuario;
  ativo: boolean;
}

export type UsuarioUpdateRequest = UsuarioRequest;

export interface UsuarioResponse {
  id: number;
  nome: string;
  cpf: string;
  email: string;
  perfil: PerfilUsuario;
  ativo: boolean;
  dataCriacao: string;
  ultimoLogin: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private readonly apiUrl = '/api/usuarios';

  constructor(private readonly http: HttpClient) {}

  listar() {
    return this.http.get<UsuarioResponse[]>(this.apiUrl);
  }

  buscarPorId(id: number) {
    return this.http.get<UsuarioResponse>(`${this.apiUrl}/${id}`);
  }

  criar(usuario: UsuarioRequest) {
    return this.http.post<UsuarioResponse>(this.apiUrl, usuario);
  }

  atualizar(id: number, usuario: UsuarioUpdateRequest) {
    return this.http.put<UsuarioResponse>(`${this.apiUrl}/${id}`, usuario);
  }

  excluir(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
