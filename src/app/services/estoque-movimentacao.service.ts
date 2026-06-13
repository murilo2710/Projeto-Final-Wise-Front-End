import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { MaterialResponse } from './material.service';

export type TipoMovimentacaoEstoque = 'ENTRADA' | 'SAIDA' | 'AJUSTE';

export interface EstoqueMovimentacaoRequest {
  materialId: number;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  motivo: string;
}

export interface EstoqueMovimentacaoResponse {
  id: number;
  materialId: number;
  materialNome: string;
  usuarioId: number;
  usuarioNome: string;
  tipo: TipoMovimentacaoEstoque;
  quantidade: number;
  estoqueAnterior: number;
  estoqueAtual: number;
  motivo: string;
  dataMovimentacao: string;
}

export interface EstoqueDashboardResponse {
  totalMateriais: number;
  totalMateriaisAtivos: number;
  totalMateriaisInativos: number;
  totalMateriaisBaixoEstoque: number;
  totalMovimentacoes: number;
  totalEntradas: number;
  totalSaidas: number;
  totalAjustes: number;
  materiaisBaixoEstoque: MaterialResponse[];
  ultimasMovimentacoes: EstoqueMovimentacaoResponse[];
}

@Injectable({
  providedIn: 'root'
})
export class EstoqueMovimentacaoService {
  private readonly apiUrl = '/api/estoque/movimentacoes';
  private readonly dashboardUrl = '/api/estoque/dashboard';

  constructor(private readonly http: HttpClient) {}

  dashboard() {
    return this.http.get<EstoqueDashboardResponse>(this.dashboardUrl);
  }

  listar() {
    return this.http.get<EstoqueMovimentacaoResponse[]>(this.apiUrl);
  }

  registrar(movimentacao: EstoqueMovimentacaoRequest) {
    return this.http.post<EstoqueMovimentacaoResponse>(this.apiUrl, movimentacao);
  }
}
