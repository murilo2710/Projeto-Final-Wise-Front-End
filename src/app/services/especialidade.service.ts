import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface EspecialidadeRequest {
  nome: string;
}

export interface EspecialidadeResponse extends EspecialidadeRequest {
  id: number;
}

@Injectable({
  providedIn: 'root'
})
export class EspecialidadeService {
  private readonly apiUrl = '/api/especialidades';

  constructor(private readonly http: HttpClient) {}

  listar() {
    return this.http.get<EspecialidadeResponse[]>(this.apiUrl);
  }

  buscarPorId(id: number) {
    return this.http.get<EspecialidadeResponse>(`${this.apiUrl}/${id}`);
  }

  criar(especialidade: EspecialidadeRequest) {
    return this.http.post<EspecialidadeResponse>(this.apiUrl, especialidade);
  }

  atualizar(id: number, especialidade: EspecialidadeRequest) {
    return this.http.put<EspecialidadeResponse>(`${this.apiUrl}/${id}`, especialidade);
  }

  excluir(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
