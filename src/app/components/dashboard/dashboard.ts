import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import {
  ConsultaResponse,
  ConsultaService,
  DashboardConsultasResponse,
  StatusConsulta
} from '../../services/consulta.service';
import { AppLayoutComponent } from '../../shared/components/app-layout/app-layout';

interface StatusSegment {
  label: string;
  valor: number;
  percentual: number;
  color: string;
  dash: number;
  offset: number;
}

interface StatusChart {
  total: number;
  segments: StatusSegment[];
}

const RAIO = 70;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

@Component({
  selector: 'app-dashboard',
  imports: [AppLayoutComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private readonly consultaService = inject(ConsultaService);

  protected readonly dashboard = signal<DashboardConsultasResponse | null>(null);
  protected readonly carregando = signal(false);
  protected readonly erro = signal('');

  protected readonly raio = RAIO;
  protected readonly circunferencia = CIRCUNFERENCIA;

  protected readonly statusChart = computed<StatusChart>(() => {
    const dados = this.dashboard();

    const base = [
      { label: 'Agendadas', valor: dados?.totalAgendadas ?? 0, color: '#f59e0b' },
      { label: 'Finalizadas', valor: dados?.totalFinalizadas ?? 0, color: '#059669' },
      { label: 'Canceladas', valor: dados?.totalCanceladas ?? 0, color: '#ef4444' }
    ];

    const total = base.reduce((soma, item) => soma + item.valor, 0);

    let acumulado = 0;
    const segments = base.map((item) => {
      const fracao = total > 0 ? item.valor / total : 0;
      const dash = fracao * CIRCUNFERENCIA;
      const offset = -acumulado;
      acumulado += dash;

      return {
        label: item.label,
        valor: item.valor,
        percentual: Math.round(fracao * 100),
        color: item.color,
        dash,
        offset
      };
    });

    return { total, segments };
  });

  protected readonly proximasConsultas = computed<ConsultaResponse[]>(() =>
    [...(this.dashboard()?.proximasConsultas ?? [])]
      .filter((consulta) => consulta.status === 'AGENDADA')
      .sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime())
      .slice(0, 5)
  );

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

  protected formatarData(valor: string): string {
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? valor : data.toLocaleString('pt-BR');
  }

  protected formatarNumero(valor: number | undefined): string {
    return new Intl.NumberFormat('pt-BR').format(valor ?? 0);
  }

  protected statusClasse(status: StatusConsulta): string {
    switch (status) {
      case 'AGENDADA':
        return 'badge-agendada';
      case 'FINALIZADA':
        return 'badge-finalizada';
      case 'CANCELADA':
        return 'badge-cancelada';
      default:
        return '';
    }
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
