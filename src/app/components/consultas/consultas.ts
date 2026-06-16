import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, map, of } from 'rxjs';

import {
  ConsultaResponse,
  ConsultaService,
  StatusConsulta
} from '../../services/consulta.service';
import {
  ArquivoConsulta,
  ConsultaArquivoService
} from '../../services/consulta-arquivo.service';
import { DentistaResponse, DentistaService } from '../../services/dentista.service';
import { PacienteResponse, PacienteService } from '../../services/paciente.service';
import { AppLayoutComponent } from '../../shared/components/app-layout/app-layout';
import { EditModalComponent } from '../../shared/components/edit-modal/edit-modal';
import { AlertService } from '../../shared/services/alert.service';
import {
  dataFimDepoisInicioValidator,
  textoLivreValidator
} from '../../shared/validators/form-validators';

@Component({
  selector: 'app-consultas',
  imports: [ReactiveFormsModule, AppLayoutComponent, EditModalComponent],
  templateUrl: './consultas.html',
  styleUrl: './consultas.css'
})
export class Consultas implements OnInit {
  private readonly consultaService = inject(ConsultaService);
  private readonly consultaArquivoService = inject(ConsultaArquivoService);
  private readonly pacienteService = inject(PacienteService);
  private readonly dentistaService = inject(DentistaService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly alertService = inject(AlertService);
  private readonly tiposArquivoPermitidos = ['application/pdf', 'image/png', 'image/jpeg'];
  private readonly tamanhoMaximoArquivo = 10 * 1024 * 1024;

  protected readonly consultas = signal<ConsultaResponse[]>([]);
  protected readonly pacientes = signal<PacienteResponse[]>([]);
  protected readonly dentistas = signal<DentistaResponse[]>([]);
  protected readonly arquivosConsulta = signal<ArquivoConsulta[]>([]);
  protected readonly anexosPorConsulta = signal<Record<number, number>>({});
  protected readonly carregando = signal(false);
  protected readonly carregandoIndicadoresAnexos = signal(false);
  protected readonly carregandoAnexos = signal(false);
  protected readonly enviandoArquivo = signal(false);
  protected readonly arquivoSelecionado = signal<File | null>(null);
  protected readonly baixandoArquivoId = signal<number | null>(null);
  protected readonly excluindoArquivoId = signal<number | null>(null);
  protected readonly erro = signal('');
  protected readonly sucesso = signal('');
  protected readonly erroAnexos = signal('');
  protected readonly sucessoAnexos = signal('');
  protected readonly consultaEmEdicaoId = signal<number | null>(null);
  protected readonly consultaAnexosId = signal<number | null>(null);
  protected readonly consultaCancelamentoId = signal<number | null>(null);
  protected readonly motivoCancelamento = signal('');
  protected readonly statusOptions: StatusConsulta[] = ['AGENDADA', 'CANCELADA', 'FINALIZADA'];

  protected readonly form = this.formBuilder.nonNullable.group({
    pacienteId: [0, [Validators.required, Validators.min(1)]],
    dentistaId: [0, [Validators.required, Validators.min(1)]],
    descricao: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500), textoLivreValidator('descricaoInvalida')]],
    dataInicio: ['', [Validators.required]],
    dataFim: ['', [Validators.required]],
    status: ['AGENDADA' as StatusConsulta, [Validators.required]],
    motivoCancelamento: ['', [Validators.maxLength(500), textoLivreValidator('motivoInvalido')]]
  }, { validators: [dataFimDepoisInicioValidator('dataInicio', 'dataFim')] });

  ngOnInit(): void {
    this.carregarRelacionamentos();
    this.listarConsultas();
  }

  private carregarRelacionamentos(): void {
    this.pacienteService.listar().subscribe({
      next: (pacientes) =>
        this.pacientes.set([...pacientes].sort((a, b) => a.nome.localeCompare(b.nome))),
      error: () => this.erro.set('Não foi possível carregar pacientes para seleção.')
    });

    this.dentistaService.listar().subscribe({
      next: (dentistas) =>
        this.dentistas.set([...dentistas].sort((a, b) => a.nome.localeCompare(b.nome))),
      error: () => this.erro.set('Não foi possível carregar dentistas para seleção.')
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
        this.carregarIndicadoresAnexos(consultas);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected async salvar(): Promise<void> {
    if (this.motivoCancelamentoObrigatorioInvalido()) {
      this.form.controls.motivoCancelamento.markAsTouched();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const consulta = this.getConsultaDoFormulario();
    const id = this.consultaEmEdicaoId();

    if (id) {
      const confirmado = await this.alertService.confirmar(
        'Atualizar consulta?',
        'Deseja salvar as alterações desta consulta?',
        'Atualizar'
      );

      if (!confirmado) {
        return;
      }
    }

    this.carregando.set(true);
    this.limparMensagens();

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
    this.form.setValue({
      pacienteId: consulta.pacienteId,
      dentistaId: consulta.dentistaId,
      descricao: consulta.descricao,
      dataInicio: this.toDateTimeLocal(consulta.dataInicio),
      dataFim: this.toDateTimeLocal(consulta.dataFim),
      status: consulta.status,
      motivoCancelamento: consulta.motivoCancelamento ?? ''
    });
    this.fecharCancelamento();
    this.limparMensagens();
  }

  protected abrirCancelamento(consulta: ConsultaResponse): void {
    this.consultaCancelamentoId.set(consulta.id);
    this.motivoCancelamento.set(consulta.motivoCancelamento ?? '');
    this.limparMensagens();
    setTimeout(() => this.focarPainelCancelamento());
  }

  protected fecharCancelamento(): void {
    this.consultaCancelamentoId.set(null);
    this.motivoCancelamento.set('');
  }

  protected async confirmarCancelamento(): Promise<void> {
    const consultaId = this.consultaCancelamentoId();
    const motivo = this.motivoCancelamento().trim();

    if (!consultaId) {
      return;
    }

    if (motivo.length < 5) {
      this.erro.set('Motivo do cancelamento deve ter pelo menos 5 caracteres.');
      return;
    }

    if (motivo.length > 500) {
      this.erro.set('Motivo do cancelamento deve ter no máximo 500 caracteres.');
      return;
    }

    const confirmado = await this.alertService.confirmar(
      'Cancelar consulta?',
      `Deseja cancelar a consulta #${consultaId}? Esta ação registrará o motivo informado.`,
      'Cancelar consulta'
    );

    if (!confirmado) {
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

  protected async excluir(consulta: ConsultaResponse): Promise<void> {
    const confirmado = await this.alertService.confirmar(
      'Excluir consulta?',
      `Deseja excluir a consulta #${consulta.id}?`,
      'Excluir'
    );

    if (!confirmado) {
      return;
    }

    this.carregando.set(true);
    this.limparMensagens();

    this.consultaService.excluir(consulta.id).subscribe({
      next: () => {
        this.sucesso.set('Consulta excluída com sucesso.');
        this.listarConsultas(true);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected abrirAnexos(consulta: ConsultaResponse): void {
    this.consultaAnexosId.set(consulta.id);
    this.arquivoSelecionado.set(null);
    this.limparMensagensAnexos();
    this.listarAnexos(consulta.id);
  }

  protected fecharAnexos(): void {
    if (this.carregandoAnexos() || this.enviandoArquivo()) {
      return;
    }

    this.consultaAnexosId.set(null);
    this.arquivosConsulta.set([]);
    this.arquivoSelecionado.set(null);
    this.limparMensagensAnexos();
  }

  protected selecionarArquivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0] ?? null;
    this.arquivoSelecionado.set(arquivo);
    this.limparMensagensAnexos();
  }

  protected enviarArquivo(inputArquivo?: HTMLInputElement): void {
    const consultaId = this.consultaAnexosId();
    const arquivo = this.arquivoSelecionado();

    if (!consultaId) {
      return;
    }

    const mensagemValidacao = this.validarArquivo(arquivo);

    if (mensagemValidacao) {
      this.erroAnexos.set(mensagemValidacao);
      return;
    }

    this.enviandoArquivo.set(true);
    this.limparMensagensAnexos();

    this.consultaArquivoService.anexar(consultaId, arquivo as File).subscribe({
      next: () => {
        this.sucessoAnexos.set('Arquivo anexado com sucesso.');
        this.arquivoSelecionado.set(null);
        if (inputArquivo) {
          inputArquivo.value = '';
        }
        this.enviandoArquivo.set(false);
        this.listarAnexos(consultaId, true);
      },
      error: (error: HttpErrorResponse) => this.tratarErroAnexos(error)
    });
  }

  protected baixarArquivo(arquivo: ArquivoConsulta): void {
    this.baixandoArquivoId.set(arquivo.id);
    this.limparMensagensAnexos();

    this.consultaArquivoService.baixar(arquivo.id).subscribe({
      next: (blob) => {
        this.dispararDownload(blob, arquivo.nomeOriginal);
        this.baixandoArquivoId.set(null);
      },
      error: (error: HttpErrorResponse) => this.tratarErroAnexos(error)
    });
  }

  protected async excluirArquivo(arquivo: ArquivoConsulta): Promise<void> {
    const confirmado = await this.alertService.confirmar(
      'Excluir anexo?',
      `Deseja excluir o arquivo ${arquivo.nomeOriginal}?`,
      'Excluir'
    );

    if (!confirmado) {
      return;
    }

    this.excluindoArquivoId.set(arquivo.id);
    this.limparMensagensAnexos();

    this.consultaArquivoService.excluir(arquivo.id).subscribe({
      next: () => {
        this.sucessoAnexos.set('Arquivo excluído com sucesso.');
        this.excluindoArquivoId.set(null);

        const consultaId = this.consultaAnexosId();
        if (consultaId) {
          this.listarAnexos(consultaId, true);
        }
      },
      error: (error: HttpErrorResponse) => this.tratarErroAnexos(error)
    });
  }

  protected limparFormulario(): void {
    this.form.reset({
      pacienteId: 0,
      dentistaId: 0,
      descricao: '',
      dataInicio: '',
      dataFim: '',
      status: 'AGENDADA',
      motivoCancelamento: ''
    });
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

  protected atualizarMotivoCancelamento(valor: string): void {
    this.motivoCancelamento.set(valor);
  }

  private focarPainelCancelamento(): void {
    const painel = document.getElementById('cancelamento-consulta-panel');
    painel?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const input = painel?.querySelector('input');
    input?.focus({ preventScroll: true });
  }

  protected formatarTamanhoArquivo(tamanho: number): string {
    if (tamanho < 1024) {
      return `${tamanho} B`;
    }

    if (tamanho < 1024 * 1024) {
      return `${(tamanho / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB`;
    }

    return `${(tamanho / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  }

  protected formatarDataArquivo(valor: string): string {
    if (!valor) {
      return '-';
    }

    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? valor : data.toLocaleString('pt-BR');
  }

  protected getTotalAnexosConsulta(consultaId: number): number {
    return this.anexosPorConsulta()[consultaId] ?? 0;
  }

  protected consultaPossuiAnexos(consultaId: number): boolean {
    return this.getTotalAnexosConsulta(consultaId) > 0;
  }

  protected deveExibirMotivoCancelamento(): boolean {
    return this.form.controls.status.value === 'CANCELADA';
  }

  protected motivoCancelamentoObrigatorioInvalido(): boolean {
    const motivo = this.form.controls.motivoCancelamento.value.trim();

    return this.deveExibirMotivoCancelamento() && motivo.length < 5;
  }

  private getConsultaDoFormulario() {
    const consulta = this.form.getRawValue();

    const payload: {
      pacienteId: number;
      dentistaId: number;
      descricao: string;
      dataInicio: string;
      dataFim: string;
      status: StatusConsulta;
      motivoCancelamento?: string | null;
    } = {
      pacienteId: Number(consulta.pacienteId),
      dentistaId: Number(consulta.dentistaId),
      descricao: consulta.descricao.trim(),
      dataInicio: this.toIsoDateTime(consulta.dataInicio),
      dataFim: this.toIsoDateTime(consulta.dataFim),
      status: consulta.status
    };

    if (consulta.status === 'CANCELADA') {
      payload.motivoCancelamento = consulta.motivoCancelamento.trim();
    }

    return payload;
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

  private listarAnexos(consultaId: number, preservarMensagem = false): void {
    this.carregandoAnexos.set(true);

    if (!preservarMensagem) {
      this.limparMensagensAnexos();
    }

    this.consultaArquivoService.listarPorConsulta(consultaId).subscribe({
      next: (arquivos) => {
        this.arquivosConsulta.set(arquivos);
        this.atualizarTotalAnexosConsulta(consultaId, arquivos.length);
        this.carregandoAnexos.set(false);
      },
      error: (error: HttpErrorResponse) => this.tratarErroAnexos(error)
    });
  }

  private carregarIndicadoresAnexos(consultas: ConsultaResponse[]): void {
    if (consultas.length === 0) {
      this.anexosPorConsulta.set({});
      return;
    }

    this.carregandoIndicadoresAnexos.set(true);

    forkJoin(
      consultas.map((consulta) =>
        this.consultaArquivoService.listarPorConsulta(consulta.id).pipe(
          map((arquivos) => [consulta.id, arquivos.length] as const),
          catchError(() => of([consulta.id, 0] as const))
        )
      )
    ).subscribe({
      next: (totais) => {
        this.anexosPorConsulta.set(Object.fromEntries(totais));
        this.carregandoIndicadoresAnexos.set(false);
      },
      error: () => {
        this.anexosPorConsulta.set({});
        this.carregandoIndicadoresAnexos.set(false);
      }
    });
  }

  private atualizarTotalAnexosConsulta(consultaId: number, total: number): void {
    this.anexosPorConsulta.update((totais) => ({
      ...totais,
      [consultaId]: total
    }));
  }

  private validarArquivo(arquivo: File | null): string {
    if (!arquivo) {
      return 'Selecione um arquivo.';
    }

    if (!this.tiposArquivoPermitidos.includes(arquivo.type)) {
      return 'Formato inválido. Envie PDF, PNG ou JPG.';
    }

    if (arquivo.size > this.tamanhoMaximoArquivo) {
      return 'Arquivo excede o tamanho máximo de 10MB.';
    }

    return '';
  }

  private dispararDownload(blob: Blob, nomeArquivo: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo || 'arquivo-consulta';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private limparMensagensAnexos(): void {
    this.erroAnexos.set('');
    this.sucessoAnexos.set('');
  }

  private tratarErroAnexos(error: HttpErrorResponse): void {
    this.carregandoAnexos.set(false);
    this.enviandoArquivo.set(false);
    this.baixandoArquivoId.set(null);
    this.excluindoArquivoId.set(null);
    console.error('Erro nos anexos da consulta:', error);

    if (error.status === 0) {
      this.erroAnexos.set('Não foi possível conectar ao servidor. Verifique se o backend está em execução.');
      return;
    }

    if (error.status === 403) {
      this.erroAnexos.set(
        this.getMensagemErro(error) || 'Você não tem permissão para acessar os anexos desta consulta.'
      );
      return;
    }

    if (error.status === 404) {
      this.erroAnexos.set(this.getMensagemErro(error) || 'Consulta ou arquivo não encontrado.');
      return;
    }

    if (error.status === 400) {
      this.erroAnexos.set(this.getMensagemErro(error) || 'Arquivo inválido. Revise o formato e o tamanho.');
      return;
    }

    this.erroAnexos.set(this.getMensagemErro(error) || 'Não foi possível concluir a operação com o anexo.');
  }

  private tratarErro(error: HttpErrorResponse): void {
    this.carregando.set(false);
    console.error('Erro na tela de consultas:', error);

    if (error.status === 0) {
      this.erro.set(
        'Não foi possível conectar ao servidor. Verifique se o backend está em execução.'
      );
      return;
    }

    if (error.status === 404) {
      this.erro.set(
        this.getMensagemErro(error) || 'Consulta ou registro relacionado não encontrado.'
      );
      return;
    }

    if (error.status === 409) {
      this.erro.set(
        this.getMensagemErro(error) ||
          'Regra de negócio violada: conflito de horário, datas inválidas, inativos ou cancelamento sem motivo.'
      );
      return;
    }

    if (error.status === 400) {
      this.erro.set(this.getMensagemErro(error) || 'Dados inválidos. Revise os campos informados.');
      return;
    }

    if (error.status === 403) {
      this.erro.set(
        this.getMensagemErro(error) ||
          'Você não tem permissão para executar esta ação.'
      );
      return;
    }

    if (error.status >= 500) {
      this.erro.set(
        this.getMensagemErro(error) ||
          'Não foi possível concluir a operação agora. Tente novamente em alguns instantes.'
      );
      return;
    }

    this.erro.set(this.getMensagemErro(error) || 'Não foi possível concluir a operação. Tente novamente.');
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
