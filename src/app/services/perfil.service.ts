import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { PerfilUsuario } from './auth.service';

export interface PerfilResponse {
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
export class PerfilService {
  private readonly apiUrl = '/api/perfil';

  constructor(private readonly http: HttpClient) {}

  buscarPerfil() {
    return this.http.get<PerfilResponse>(this.apiUrl);
  }
}
