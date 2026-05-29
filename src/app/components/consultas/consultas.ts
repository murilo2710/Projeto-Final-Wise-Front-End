import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  ConsultaResponse,
  ConsultaService,
  StatusConsulta
} from '../../services/consulta.service';
import { AuthService } from '../../services/auth.service';
import { DentistaResponse, DentistaService } from '../../services/dentista.service';
import { PacienteResponse, PacienteService } from '../../services/paciente.service';

@Component({
  selector: 'app-consultas',
  imports: [ReactiveFormsModule],
  templateUrl: './consultas.html',
  styleUrl: './consultas.css'
})
export class Consultas implements OnInit {
  private readonly consultaService = inject(ConsultaService);
  private readonly authService = inject(AuthService);
  private readonly pacienteService = inject(PacienteService);
  private readonly dentistaService = inject(DentistaService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly consultas = signal<ConsultaResponse[]>([]);
  protected readonly pacientes = signal<PacienteResponse[]>([]);
  protected readonly dentistas = signal<DentistaResponse[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal('');
  protected readonly sucesso = signal('');
  protected readonly consultaEmEdicaoId = signal<number | null>(null);
  protected readonly statusEdicao = signal<StatusConsulta>('AGENDADA');
  protected readonly consultaCancelamentoId = signal<number | null>(null);
  protected readonly motivoCancelamento = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    pacienteId: [0, [Validators.required, Validators.min(1)]],
    dentistaId: [0, [Validators.required, Validators.min(1)]],
    descricao: ['', [Validators.required]],
    dataInicio: ['', [Validators.required]],
    dataFim: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.carregarRelacionamentos();
    this.listarConsultas();
  }

  private carregarRelacionamentos(): void {
    this.pacienteService.listar().subscribe({
      next: (pacientes) =>
        this.pacientes.set([...pacientes].sort((a, b) => a.nome.localeCompare(b.nome))),
      error: () => this.erro.set('Nao foi possivel carregar pacientes para selecao.')
    });

    this.dentistaService.listar().subscribe({
      next: (dentistas) =>
        this.dentistas.set([...dentistas].sort((a, b) => a.nome.localeCompare(b.nome))),
      error: () => this.erro.set('Nao foi possivel carregar dentistas para selecao.')
    });
  }

  protected listarConsultas(preservarMensagem = false): void {
    this.carregando.set(true);

    if (!preservarMensagem) {
      this.limparMensagens();
    }

    this.consultaService.listar().subscribe({
      next: (consultas) => {
        this.consultas.set(consultas);
        this.carregando.set(false);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.carregando.set(true);
    this.limparMensagens();

    const consulta = this.getConsultaDoFormulario();
    const id = this.consultaEmEdicaoId();
    const requisicao = id
      ? this.consultaService.atualizar(id, consulta)
      : this.consultaService.criar(consulta);

    requisicao.subscribe({
      next: () => {
        this.sucesso.set(id ? 'Consulta atualizada com sucesso.' : 'Consulta criada com sucesso.');
        this.limparFormulario();
        this.listarConsultas(true);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected editar(consulta: ConsultaResponse): void {
    this.consultaEmEdicaoId.set(consulta.id);
    this.statusEdicao.set(consulta.status);
    this.form.setValue({
      pacienteId: consulta.pacienteId,
      dentistaId: consulta.dentistaId,
      descricao: consulta.descricao,
      dataInicio: this.toDateTimeLocal(consulta.dataInicio),
      dataFim: this.toDateTimeLocal(consulta.dataFim)
    });
    this.fecharCancelamento();
    this.limparMensagens();
  }

  protected abrirCancelamento(consulta: ConsultaResponse): void {
    this.consultaCancelamentoId.set(consulta.id);
    this.motivoCancelamento.set(consulta.motivoCancelamento ?? '');
    this.limparMensagens();
  }

  protected fecharCancelamento(): void {
    this.consultaCancelamentoId.set(null);
    this.motivoCancelamento.set('');
  }

  protected confirmarCancelamento(): void {
    const consultaId = this.consultaCancelamentoId();
    const motivo = this.motivoCancelamento().trim();

    if (!consultaId) {
      return;
    }

    if (!motivo) {
      this.erro.set('Informe o motivo do cancelamento.');
      return;
    }

    this.carregando.set(true);
    this.limparMensagens();

    this.consultaService.cancelar(consultaId, { motivoCancelamento: motivo }).subscribe({
      next: () => {
        this.sucesso.set('Consulta cancelada com sucesso.');
        this.fecharCancelamento();
        this.listarConsultas(true);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected excluir(consulta: ConsultaResponse): void {
    const confirmado = window.confirm(`Excluir a consulta #${consulta.id}?`);

    if (!confirmado) {
      return;
    }

    this.carregando.set(true);
    this.limparMensagens();

    this.consultaService.excluir(consulta.id).subscribe({
      next: () => {
        this.sucesso.set('Consulta excluida com sucesso.');
        this.listarConsultas(true);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected limparFormulario(): void {
    this.form.reset({
      pacienteId: 0,
      dentistaId: 0,
      descricao: '',
      dataInicio: '',
      dataFim: ''
    });
    this.statusEdicao.set('AGENDADA');
    this.consultaEmEdicaoId.set(null);
  }

  protected getNomePaciente(id: number): string {
    const paciente = this.pacientes().find((item) => item.id === id);
    return paciente ? `${paciente.nome} (#${paciente.id})` : `ID ${id}`;
  }

  protected getNomeDentista(id: number): string {
    const dentista = this.dentistas().find((item) => item.id === id);
    return dentista ? `${dentista.nome} (#${dentista.id})` : `ID ${id}`;
  }

  protected getUsuarioLogadoLabel(): string {
    const usuario = this.authService.usuario();
    return usuario ? `${usuario.nome} (#${usuario.id})` : 'Nao identificado';
  }

  protected getUsuarioRegistroLabel(consulta: ConsultaResponse): string {
    if (consulta.usuarioNome?.trim()) {
      return `${consulta.usuarioNome} (#${consulta.usuarioId})`;
    }

    return `ID ${consulta.usuarioId}`;
  }

  protected atualizarMotivoCancelamento(valor: string): void {
    this.motivoCancelamento.set(valor);
  }

  private getConsultaDoFormulario() {
    const consulta = this.form.getRawValue();
    const usuarioLogado = this.authService.usuario();
    const usuarioId = usuarioLogado?.id ?? 0;
    const emEdicao = this.consultaEmEdicaoId() !== null;

    return {
      pacienteId: Number(consulta.pacienteId),
      dentistaId: Number(consulta.dentistaId),
      usuarioId,
      descricao: consulta.descricao.trim(),
      dataInicio: this.toIsoDateTime(consulta.dataInicio),
      dataFim: this.toIsoDateTime(consulta.dataFim),
      status: emEdicao ? this.statusEdicao() : 'AGENDADA'
    };
  }

  private toIsoDateTime(value: string): string {
    return value.length === 16 ? `${value}:00` : value;
  }

  private toDateTimeLocal(value: string): string {
    return value ? value.slice(0, 16) : '';
  }

  private limparMensagens(): void {
    this.erro.set('');
    this.sucesso.set('');
  }

  private tratarErro(error: HttpErrorResponse): void {
    this.carregando.set(false);
    console.error('Erro na tela de consultas:', error);

    if (error.status === 0) {
      this.erro.set(
        'Nao foi possivel conectar ao backend. Verifique se ele esta rodando em http://localhost:8080.'
      );
      return;
    }

    if (error.status === 404) {
      this.erro.set(
        this.getMensagemErro(error) || 'Consulta ou registro relacionado nao encontrado.'
      );
      return;
    }

    if (error.status === 409) {
      this.erro.set(
        this.getMensagemErro(error) ||
          'Regra de negocio violada: conflito de horario, datas invalidas, inativos ou cancelamento sem motivo.'
      );
      return;
    }

    if (error.status === 400) {
      this.erro.set(this.getMensagemErro(error) || 'Dados invalidos. Revise os campos informados.');
      return;
    }

    if (error.status === 403) {
      this.erro.set(
        this.getMensagemErro(error) ||
          'Requisicao bloqueada pelo backend com 403. Verifique SecurityConfig/CSRF.'
      );
      return;
    }

    if (error.status >= 500) {
      this.erro.set(
        this.getMensagemErro(error) || 'Erro 500 ao chamar /consultas. Verifique o console do backend.'
      );
      return;
    }

    this.erro.set(this.getMensagemErro(error) || `Erro ${error.status} ao comunicar com o backend.`);
  }

  private getMensagemErro(error: HttpErrorResponse): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    const mensagens = this.extrairMensagens(error.error);

    return mensagens.join(' | ');
  }

  private extrairMensagens(valor: unknown): string[] {
    if (!valor) {
      return [];
    }

    if (typeof valor === 'string') {
      return valor.trim() ? [valor] : [];
    }

    if (Array.isArray(valor)) {
      return valor.flatMap((item) => this.extrairMensagens(item));
    }

    if (typeof valor !== 'object') {
      return [];
    }

    const objeto = valor as Record<string, unknown>;
    const camposConhecidos = [
      'message',
      'mensagem',
      'erro',
      'error',
      'detail',
      'details',
      'errors',
      'fieldErrors',
      'validationErrors',
      'violations'
    ];

    const mensagensConhecidas = camposConhecidos.flatMap((campo) =>
      this.extrairMensagens(objeto[campo])
    );

    if (mensagensConhecidas.length > 0) {
      return mensagensConhecidas;
    }

    return Object.entries(objeto).flatMap(([campo, mensagem]) =>
      this.extrairMensagens(mensagem).map((texto) => `${campo}: ${texto}`)
    );
  }
}
