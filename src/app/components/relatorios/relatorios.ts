import { HttpErrorResponse } from '@angular/common/http';
import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LinearScale,
  PolarAreaController,
  RadialLinearScale,
  Tooltip
} from 'chart.js';

import {
  ConsultaResponse,
  ConsultaService,
  RelatorioConsultasFiltros,
  StatusConsulta
} from '../../services/consulta.service';
import { AuthService } from '../../services/auth.service';
import { DentistaResponse, DentistaService } from '../../services/dentista.service';
import {
  EspecialidadeResponse,
  EspecialidadeService
} from '../../services/especialidade.service';
import { PacienteResponse, PacienteService } from '../../services/paciente.service';
import { UsuarioResponse, UsuarioService } from '../../services/usuario.service';
import { AppLayoutComponent } from '../../shared/components/app-layout/app-layout';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Legend,
  LinearScale,
  PolarAreaController,
  RadialLinearScale,
  Tooltip
);

type ModoHorasRelatorio = 'OCUPADAS' | 'REALIZADAS';
type TipoGraficoHoras = 'bar' | 'doughnut' | 'polarArea';

@Component({
  selector: 'app-relatorios',
  imports: [ReactiveFormsModule, AppLayoutComponent],
  templateUrl: './relatorios.html',
  styleUrl: './relatorios.css'
})
export class Relatorios implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('pacienteChart') private pacienteChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('dentistaChart') private dentistaChartRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('especialidadeChart') private especialidadeChartRef?: ElementRef<HTMLCanvasElement>;

  private readonly authService = inject(AuthService);
  private readonly consultaService = inject(ConsultaService);
  private readonly pacienteService = inject(PacienteService);
  private readonly dentistaService = inject(DentistaService);
  private readonly especialidadeService = inject(EspecialidadeService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly consultas = signal<ConsultaResponse[]>([]);
  protected readonly pacientes = signal<PacienteResponse[]>([]);
  protected readonly dentistas = signal<DentistaResponse[]>([]);
  protected readonly especialidades = signal<EspecialidadeResponse[]>([]);
  protected readonly usuarios = signal<UsuarioResponse[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal('');
  protected readonly sucesso = signal('');
  protected readonly modoHoras = signal<ModoHorasRelatorio>('OCUPADAS');
  protected readonly statusOptions: StatusConsulta[] = ['AGENDADA', 'CANCELADA', 'FINALIZADA'];
  private pacienteChart?: Chart;
  private dentistaChart?: Chart;
  private especialidadeChart?: Chart;
  private chartsProntos = false;
  private readonly limiteItensGrafico = 7;

  protected readonly form = this.formBuilder.nonNullable.group({
    pacienteId: [0],
    dentistaId: [0],
    especialidadeId: [0],
    usuarioId: [0],
    status: [''],
    dataInicio: [''],
    dataFim: ['']
  });

  ngOnInit(): void {
    this.carregarFiltros();
    this.buscarRelatorio();
  }

  ngAfterViewInit(): void {
    this.chartsProntos = true;
    this.atualizarGraficos();
  }

  ngOnDestroy(): void {
    this.pacienteChart?.destroy();
    this.dentistaChart?.destroy();
    this.especialidadeChart?.destroy();
  }

  protected isAdmin(): boolean {
    return this.authService.temPerfil('ADMIN');
  }

  protected buscarRelatorio(): void {
    this.carregando.set(true);
    this.limparMensagens();

    this.consultaService.buscarRelatorio(this.getFiltros()).subscribe({
      next: (consultas) => {
        this.consultas.set(consultas);
        this.sucesso.set(`${consultas.length} consulta(s) encontrada(s).`);
        this.carregando.set(false);
        this.atualizarGraficos();
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected limparFiltros(): void {
    this.form.reset({
      pacienteId: 0,
      dentistaId: 0,
      especialidadeId: 0,
      usuarioId: 0,
      status: '',
      dataInicio: '',
      dataFim: ''
    });
    this.buscarRelatorio();
  }

  protected getNomePaciente(id: number): string {
    return this.pacientes().find((item) => item.id === id)?.nome ?? `ID ${id}`;
  }

  protected getNomeDentista(id: number): string {
    return this.dentistas().find((item) => item.id === id)?.nome ?? `ID ${id}`;
  }

  protected formatarData(valor: string): string {
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? valor : data.toLocaleString('pt-BR');
  }

  protected getTotalHoras(): string {
    return this.getConsultasValidasParaGrafico()
      .reduce((total, consulta) => total + this.calcularHorasConsulta(consulta), 0)
      .toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  }

  protected alterarModoHoras(modo: ModoHorasRelatorio): void {
    this.modoHoras.set(modo);
    this.atualizarGraficos();
  }

  protected getDescricaoModoHoras(): string {
    return this.modoHoras() === 'OCUPADAS'
      ? 'Considera consultas agendadas e finalizadas. Canceladas ficam fora do calculo.'
      : 'Considera somente consultas finalizadas. Canceladas e agendadas ficam fora do calculo.';
  }

  protected getQuantidadePacientesGrafico(): number {
    return this.agruparHorasPorPaciente().length;
  }

  protected getQuantidadeDentistasGrafico(): number {
    return this.agruparHorasPorDentista().length;
  }

  protected getQuantidadeEspecialidadesGrafico(): number {
    return this.agruparHorasPorEspecialidade().length;
  }

  private carregarFiltros(): void {
    this.pacienteService.listar().subscribe({
      next: (pacientes) => {
        this.pacientes.set([...pacientes].sort((a, b) => a.nome.localeCompare(b.nome)));
        this.atualizarGraficos();
      },
      error: () => this.erro.set('Nao foi possivel carregar pacientes.')
    });

    this.dentistaService.listar().subscribe({
      next: (dentistas) => {
        this.dentistas.set([...dentistas].sort((a, b) => a.nome.localeCompare(b.nome)));
        this.atualizarGraficos();
      },
      error: () => this.erro.set('Nao foi possivel carregar dentistas.')
    });

    this.especialidadeService.listar().subscribe({
      next: (especialidades) =>
        this.especialidades.set([...especialidades].sort((a, b) => a.nome.localeCompare(b.nome))),
      error: () => this.erro.set('Nao foi possivel carregar especialidades.')
    });

    if (this.isAdmin()) {
      this.usuarioService.listar().subscribe({
        next: (usuarios) =>
          this.usuarios.set([...usuarios].sort((a, b) => a.nome.localeCompare(b.nome))),
        error: () => this.erro.set('Nao foi possivel carregar usuarios.')
      });
    }
  }

  private getFiltros(): RelatorioConsultasFiltros {
    const filtros = this.form.getRawValue();
    const status = filtros.status as StatusConsulta | '';

    return {
      pacienteId: filtros.pacienteId || undefined,
      dentistaId: filtros.dentistaId || undefined,
      especialidadeId: filtros.especialidadeId || undefined,
      usuarioId: this.isAdmin() ? filtros.usuarioId || undefined : undefined,
      status: status || undefined,
      dataInicio: this.toIsoDateTime(filtros.dataInicio),
      dataFim: this.toIsoDateTime(filtros.dataFim)
    };
  }

  private toIsoDateTime(value: string): string | undefined {
    if (!value) {
      return undefined;
    }

    return value.length === 16 ? `${value}:00` : value;
  }

  private atualizarGraficos(): void {
    if (!this.chartsProntos) {
      return;
    }

    const porPaciente = this.agruparHorasPorPaciente();
    const porDentista = this.agruparHorasPorDentista();
    const porEspecialidade = this.agruparHorasPorEspecialidade();

    this.pacienteChart = this.renderizarGrafico(
      this.pacienteChart,
      this.pacienteChartRef,
      'Horas por paciente',
      porPaciente,
      ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'],
      'bar'
    );
    this.dentistaChart = this.renderizarGrafico(
      this.dentistaChart,
      this.dentistaChartRef,
      'Horas por profissional',
      porDentista,
      ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
      'doughnut'
    );
    this.especialidadeChart = this.renderizarGrafico(
      this.especialidadeChart,
      this.especialidadeChartRef,
      'Horas por especialidade',
      porEspecialidade,
      ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a'],
      'polarArea'
    );
  }

  private renderizarGrafico(
    chart: Chart | undefined,
    ref: ElementRef<HTMLCanvasElement> | undefined,
    label: string,
    dados: Array<{ nome: string; horas: number }>,
    colors: string[],
    tipo: TipoGraficoHoras
  ): Chart | undefined {
    if (!ref) {
      return chart;
    }

    const dadosNormalizados = this.limitarDadosGrafico(dados);
    const labels = dadosNormalizados.length ? dadosNormalizados.map((item) => item.nome) : ['Sem dados'];
    const valores = dadosNormalizados.length
      ? dadosNormalizados.map((item) => Number(item.horas.toFixed(2)))
      : [0];
    const backgroundColor = this.getCoresGrafico(valores.length, colors);

    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = valores;
      chart.data.datasets[0].backgroundColor = backgroundColor;
      chart.update();
      return chart;
    }

    return new Chart(ref.nativeElement, {
      type: tipo,
      data: {
        labels,
        datasets: [
          {
            label,
            data: valores,
            backgroundColor,
            borderColor: '#ffffff',
            borderRadius: tipo === 'bar' ? 10 : 4,
            borderSkipped: false,
            borderWidth: tipo === 'bar' ? 0 : 2,
            hoverOffset: tipo === 'doughnut' ? 8 : 0,
            maxBarThickness: 28
          }
        ]
      },
      options: this.getOpcoesGrafico(tipo)
    });
  }

  private getOpcoesGrafico(tipo: TipoGraficoHoras) {
    const tooltip = {
      callbacks: {
        label: (context: { label?: string; parsed: number | { x?: number; r?: number }; raw: unknown }) => {
          const horas = this.getValorTooltip(context);
          const label = context.label ? `${context.label}: ` : '';

          return `${label}${horas.toLocaleString('pt-BR')} hora(s)`;
        }
      }
    };

    if (tipo === 'bar') {
      return {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              color: '#6b6b6b',
              callback: (value: string | number) => `${value}h`
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.06)'
            }
          },
          y: {
            ticks: {
              color: '#3f3f46',
              font: {
                weight: 600
              }
            },
            grid: {
              display: false
            }
          }
        }
      };
    }

    if (tipo === 'polarArea') {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right' as const,
            labels: {
              boxWidth: 12,
              color: '#52525b',
              font: {
                size: 11,
                weight: 600
              }
            }
          },
          tooltip
        },
        scales: {
          r: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.06)'
            },
            ticks: {
              color: '#6b6b6b',
              backdropColor: 'transparent',
              callback: (value: string | number) => `${value}h`
            }
          }
        }
      };
    }

    return {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '64%',
      plugins: {
        legend: {
          position: 'right' as const,
          labels: {
            boxWidth: 12,
            color: '#52525b',
            font: {
              size: 11,
              weight: 600
            }
          }
        },
        tooltip
      }
    };
  }

  private getValorTooltip(context: { parsed: number | { x?: number; r?: number }; raw: unknown }): number {
    if (typeof context.parsed === 'number') {
      return context.parsed;
    }

    return Number(context.parsed.x ?? context.parsed.r ?? context.raw ?? 0);
  }

  private agruparHorasPorPaciente(): Array<{ nome: string; horas: number }> {
    return this.agruparHoras((consulta) => this.getNomePaciente(consulta.pacienteId));
  }

  private agruparHorasPorDentista(): Array<{ nome: string; horas: number }> {
    return this.agruparHoras((consulta) => this.getNomeDentista(consulta.dentistaId));
  }

  private agruparHorasPorEspecialidade(): Array<{ nome: string; horas: number }> {
    const mapa = new Map<string, number>();

    this.getConsultasValidasParaGrafico().forEach((consulta) => {
      const horas = this.calcularHorasConsulta(consulta);
      const dentista = this.dentistas().find((item) => item.id === consulta.dentistaId);
      const especialidades = dentista?.especialidades?.length ? dentista.especialidades : [{ nome: 'Sem especialidade' }];
      const horasPorEspecialidade = horas / especialidades.length;

      especialidades.forEach((especialidade) => {
        mapa.set(especialidade.nome, (mapa.get(especialidade.nome) ?? 0) + horasPorEspecialidade);
      });
    });

    return this.ordenarAgrupamento(mapa);
  }

  private limitarDadosGrafico(dados: Array<{ nome: string; horas: number }>): Array<{ nome: string; horas: number }> {
    if (dados.length <= this.limiteItensGrafico) {
      return dados;
    }

    const principais = dados.slice(0, this.limiteItensGrafico);
    const outros = dados
      .slice(this.limiteItensGrafico)
      .reduce((total, item) => total + item.horas, 0);

    return [...principais, { nome: 'Outros', horas: outros }];
  }

  private getCoresGrafico(total: number, colors: string[]): string[] {
    return Array.from({ length: total }, (_, index) => colors[index % colors.length]);
  }

  private agruparHoras(getNome: (consulta: ConsultaResponse) => string): Array<{ nome: string; horas: number }> {
    const mapa = new Map<string, number>();

    this.getConsultasValidasParaGrafico().forEach((consulta) => {
      const nome = getNome(consulta);
      const horas = this.calcularHorasConsulta(consulta);

      mapa.set(nome, (mapa.get(nome) ?? 0) + horas);
    });

    return this.ordenarAgrupamento(mapa);
  }

  private getConsultasValidasParaGrafico(): ConsultaResponse[] {
    const statusValidos: StatusConsulta[] =
      this.modoHoras() === 'OCUPADAS' ? ['AGENDADA', 'FINALIZADA'] : ['FINALIZADA'];

    return this.consultas().filter((consulta) => statusValidos.includes(consulta.status));
  }

  private ordenarAgrupamento(mapa: Map<string, number>): Array<{ nome: string; horas: number }> {
    return Array.from(mapa.entries())
      .map(([nome, horas]) => ({ nome, horas }))
      .filter((item) => item.horas > 0)
      .sort((a, b) => b.horas - a.horas);
  }

  private calcularHorasConsulta(consulta: ConsultaResponse): number {
    const inicio = new Date(consulta.dataInicio).getTime();
    const fim = new Date(consulta.dataFim).getTime();

    if (Number.isNaN(inicio) || Number.isNaN(fim) || fim <= inicio) {
      return 0;
    }

    return (fim - inicio) / 3600000;
  }

  private limparMensagens(): void {
    this.erro.set('');
    this.sucesso.set('');
  }

  private tratarErro(error: HttpErrorResponse): void {
    this.carregando.set(false);

    if (error.status === 0) {
      this.erro.set('Nao foi possivel conectar ao backend. Verifique se ele esta rodando.');
      return;
    }

    if (error.status === 404) {
      this.erro.set(this.getMensagemErro(error) || 'Nenhum item encontrado para os filtros.');
      return;
    }

    if (error.status === 409) {
      this.erro.set(this.getMensagemErro(error) || 'Conflito ao gerar relatorio.');
      return;
    }

    this.erro.set(this.getMensagemErro(error) || `Erro ${error.status} ao gerar relatorio.`);
  }

  private getMensagemErro(error: HttpErrorResponse): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    return error.error?.message ?? error.error?.mensagem ?? error.error?.erro ?? '';
  }
}
