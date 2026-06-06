import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';

import {
  ConsultaResponse,
  ConsultaService,
  DashboardConsultasResponse
} from '../../services/consulta.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private readonly consultaService = inject(ConsultaService);

  protected readonly dashboard = signal<DashboardConsultasResponse | null>(null);
  protected readonly carregando = signal(false);
  protected readonly erro = signal('');

  ngOnInit(): void {
    this.carregarDashboard();
  }

  protected carregarDashboard(): void {
    this.carregando.set(true);
    this.erro.set('');

    this.consultaService.buscarDashboard().subscribe({
      next: (dashboard) => {
        this.dashboard.set(dashboard);
        this.carregando.set(false);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected getProximasConsultas(): ConsultaResponse[] {
    return this.dashboard()?.proximasConsultas ?? [];
  }

  protected formatarData(valor: string): string {
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? valor : data.toLocaleString('pt-BR');
  }

  private tratarErro(error: HttpErrorResponse): void {
    this.carregando.set(false);

    if (error.status === 0) {
      this.erro.set('Nao foi possivel conectar ao backend. Verifique se ele esta rodando.');
      return;
    }

    if (error.status === 404) {
      this.erro.set('Dashboard de consultas nao encontrado.');
      return;
    }

    if (error.status === 409) {
      this.erro.set(this.getMensagemErro(error) || 'Conflito ao carregar dashboard.');
      return;
    }

    this.erro.set(this.getMensagemErro(error) || `Erro ${error.status} ao carregar dashboard.`);
  }

  private getMensagemErro(error: HttpErrorResponse): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    return error.error?.message ?? error.error?.mensagem ?? error.error?.erro ?? '';
  }
}
