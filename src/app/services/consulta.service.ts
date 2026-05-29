import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export type StatusConsulta = 'AGENDADA' | 'REALIZADA' | 'CANCELADA';

export interface ConsultaRequest {
  pacienteId: number;
  dentistaId: number;
  usuarioId: number;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  status: StatusConsulta;
}

export interface CancelarConsultaRequest {
  motivoCancelamento: string;
}

export interface ConsultaResponse extends ConsultaRequest {
  motivoCancelamento: string | null;
  usuarioNome?: string;
  id: number;
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
