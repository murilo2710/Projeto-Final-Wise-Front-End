import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

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

@Component({
  selector: 'app-relatorios',
  imports: [ReactiveFormsModule],
  templateUrl: './relatorios.html',
  styleUrl: './relatorios.css'
})
export class Relatorios implements OnInit {
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
  protected readonly statusOptions: StatusConsulta[] = ['AGENDADA', 'CANCELADA', 'FINALIZADA'];

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

  private carregarFiltros(): void {
    this.pacienteService.listar().subscribe({
      next: (pacientes) =>
        this.pacientes.set([...pacientes].sort((a, b) => a.nome.localeCompare(b.nome))),
      error: () => this.erro.set('Nao foi possivel carregar pacientes.')
    });

    this.dentistaService.listar().subscribe({
      next: (dentistas) =>
        this.dentistas.set([...dentistas].sort((a, b) => a.nome.localeCompare(b.nome))),
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
