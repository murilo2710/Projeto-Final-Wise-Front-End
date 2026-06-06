import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface DentistaRequest {
  nome: string;
  cpf: string;
  email: string;
  cro: string;
  ativo: boolean;
  especialidadeIds: number[];
}

export interface DentistaResponse extends DentistaRequest {
  id: number;
}

@Injectable({
  providedIn: 'root'
})
export class DentistaService {
  private readonly apiUrl = '/api/dentistas';

  constructor(private readonly http: HttpClient) {}

  listar() {
    return this.http.get<DentistaResponse[]>(this.apiUrl);
  }

  buscarPorId(id: number) {
    return this.http.get<DentistaResponse>(`${this.apiUrl}/${id}`);
  }

  criar(dentista: DentistaRequest) {
    return this.http.post<DentistaResponse>(this.apiUrl, dentista);
  }

  atualizar(id: number, dentista: DentistaRequest) {
    return this.http.put<DentistaResponse>(`${this.apiUrl}/${id}`, dentista);
  }

  excluir(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
