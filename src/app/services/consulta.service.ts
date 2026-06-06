import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

export type StatusConsulta = 'AGENDADA' | 'CANCELADA' | 'FINALIZADA';

export interface ConsultaRequest {
  pacienteId: number;
  dentistaId: number;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  status: StatusConsulta;
  motivoCancelamento?: string | null;
}

export interface CancelarConsultaRequest {
  motivoCancelamento: string;
}

export interface ConsultaResponse extends ConsultaRequest {
  motivoCancelamento: string | null;
  usuarioNome?: string;
  usuarioId?: number;
  id: number;
}

export interface DashboardConsultasResponse {
  totalConsultas: number;
  totalAgendadas: number;
  totalCanceladas: number;
  totalFinalizadas: number;
  totalPacientesComConsulta: number;
  totalDentistasComConsulta: number;
  proximasConsultas: ConsultaResponse[];
}

export interface RelatorioConsultasFiltros {
  pacienteId?: number;
  dentistaId?: number;
  usuarioId?: number;
  especialidadeId?: number;
  status?: StatusConsulta;
  dataInicio?: string;
  dataFim?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConsultaService {
  private readonly apiUrl = '/api/consultas';

  constructor(private readonly http: HttpClient) {}

  listar() {
    return this.http.get<ConsultaResponse[]>(this.apiUrl);
  }

  buscarDashboard() {
    return this.http.get<DashboardConsultasResponse>(`${this.apiUrl}/dashboard`);
  }

  buscarRelatorio(filtros: RelatorioConsultasFiltros) {
    let params = new HttpParams();

    Object.entries(filtros).forEach(([chave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '') {
        params = params.set(chave, String(valor));
      }
    });

    return this.http.get<ConsultaResponse[]>(`${this.apiUrl}/relatorio`, { params });
  }

  buscarPorId(id: number) {
    return this.http.get<ConsultaResponse>(`${this.apiUrl}/${id}`);
  }

  criar(consulta: ConsultaRequest) {
    return this.http.post<ConsultaResponse>(this.apiUrl, consulta);
  }

  atualizar(id: number, consulta: ConsultaRequest) {
    return this.http.put<ConsultaResponse>(`${this.apiUrl}/${id}`, consulta);
  }

  cancelar(id: number, payload: CancelarConsultaRequest) {
    return this.http.patch<ConsultaResponse>(`${this.apiUrl}/${id}/cancelar`, payload);
  }

  excluir(id: number) {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
