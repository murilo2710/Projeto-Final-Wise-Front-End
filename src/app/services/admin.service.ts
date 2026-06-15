import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface AdminDashboardResponse {
  totalUsuarios?: number;
  totalUsuariosAtivos?: number;
  totalUsuariosInativos?: number;
  totalAdministradores?: number;
  totalDentistas?: number;
  totalConsultas?: number;
  totalConsultasFinalizadas?: number;
  totalLogs?: number;
  totalAtividades?: number;
}

export interface AdminLogResponse {
  id: number;
  usuarioId?: number | null;
  usuarioNome?: string | null;
  usuario?: string | null;
  tipo?: string | null;
  acao?: string | null;
  recurso?: string | null;
  categoria?: string | null;
  descricao?: string | null;
  mensagem?: string | null;
  dataCriacao?: string | null;
  dataHora?: string | null;
}

export interface AdminLogsFiltros {
  usuario?: string;
  tipo?: string;
  recurso?: string;
  data?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly apiUrl = '/api/admin';

  constructor(private readonly http: HttpClient) {}

  buscarDashboard() {
    return this.http.get<AdminDashboardResponse>(`${this.apiUrl}/dashboard`);
  }

  listarLogs(filtros: AdminLogsFiltros = {}) {
    let params = new HttpParams();

    Object.entries(filtros).forEach(([chave, valor]) => {
      if (valor) {
        params = params.set(chave, valor);
      }
    });

    return this.http.get<AdminLogResponse[]>(`${this.apiUrl}/logs`, { params });
  }
}
