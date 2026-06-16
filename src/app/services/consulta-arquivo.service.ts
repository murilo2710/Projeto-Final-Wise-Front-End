import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

export interface ArquivoConsulta {
  id: number;
  consultaId: number;
  usuarioId: number;
  usuarioNome: string;
  nomeOriginal: string;
  tipoConteudo: string;
  tamanho: number;
  dataUpload: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConsultaArquivoService {
  private readonly apiUrl = '/api/consultas';

  constructor(private readonly http: HttpClient) {}

  listarPorConsulta(consultaId: number) {
    return this.http.get<ArquivoConsulta[]>(`${this.apiUrl}/${consultaId}/arquivos`);
  }

  anexar(consultaId: number, arquivo: File) {
    const formData = new FormData();
    formData.append('arquivo', arquivo);

    return this.http.post<ArquivoConsulta>(`${this.apiUrl}/${consultaId}/arquivos`, formData);
  }

  baixar(arquivoId: number) {
    return this.http.get(`${this.apiUrl}/arquivos/${arquivoId}/download`, {
      responseType: 'blob'
    });
  }

  excluir(arquivoId: number) {
    return this.http.delete<void>(`${this.apiUrl}/arquivos/${arquivoId}`);
  }
}
