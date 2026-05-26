import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface PacienteRequest {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
}

export interface PacienteResponse extends PacienteRequest {
  id: number;
}

@Injectable({
  providedIn: 'root'
})
export class PacienteService {
  private readonly apiUrl = '/api/pacientes';

  constructor(private readonly http: HttpClient) {}

  listar() {
    return this.http.get<PacienteResponse[]>(this.apiUrl);
  }

  buscarPorId(id: number) {
    return this.http.get<PacienteResponse>(`${this.apiUrl}/${id}`);
  }

  criar(paciente: PacienteRequest) {
    return this.http.post<PacienteResponse>(this.apiUrl, paciente);
  }

  atualizar(id: number, paciente: PacienteRequest) {
    return this.http.put<PacienteResponse>(`${this.apiUrl}/${id}`, paciente);
  }

  excluir(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
