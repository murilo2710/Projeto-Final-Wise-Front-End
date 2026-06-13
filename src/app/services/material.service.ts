import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { EspecialidadeResponse } from './especialidade.service';

export interface MaterialRequest {
  nome: string;
  descricao: string;
  unidadeMedida: string;
  quantidadeAtual: number;
  quantidadeMinima: number;
  ativo: boolean;
  especialidadeIds: number[];
}

export interface MaterialResponse {
  id: number;
  nome: string;
  descricao: string;
  unidadeMedida: string;
  quantidadeAtual: number;
  quantidadeMinima: number;
  ativo: boolean;
  baixoEstoque: boolean;
  dataCriacao: string;
  especialidades: EspecialidadeResponse[];
}

export interface MaterialFiltros {
  ativo?: boolean;
  baixoEstoque?: boolean;
  especialidadeId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class MaterialService {
  private readonly apiUrl = '/api/materiais';

  constructor(private readonly http: HttpClient) {}

  listar(filtros: MaterialFiltros = {}) {
    let params = new HttpParams();

    Object.entries(filtros).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== 0) {
        params = params.set(chave, String(valor));
      }
    });

    return this.http.get<MaterialResponse[]>(this.apiUrl, { params });
  }

  buscarPorId(id: number) {
    return this.http.get<MaterialResponse>(`${this.apiUrl}/${id}`);
  }

  criar(material: MaterialRequest) {
    return this.http.post<MaterialResponse>(this.apiUrl, material);
  }

  atualizar(id: number, material: MaterialRequest) {
    return this.http.put<MaterialResponse>(`${this.apiUrl}/${id}`, material);
  }

  ativar(id: number) {
    return this.http.patch<MaterialResponse>(`${this.apiUrl}/${id}/ativar`, {});
  }

  inativar(id: number) {
    return this.http.patch<MaterialResponse>(`${this.apiUrl}/${id}/inativar`, {});
  }
}
