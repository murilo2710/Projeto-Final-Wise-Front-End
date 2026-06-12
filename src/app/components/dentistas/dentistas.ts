import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { DentistaResponse, DentistaService } from '../../services/dentista.service';
import {
  EspecialidadeResponse,
  EspecialidadeService
} from '../../services/especialidade.service';
import { AppLayoutComponent } from '../../shared/components/app-layout/app-layout';
import { AlertService } from '../../shared/services/alert.service';

type FiltroStatusDentista = 'ATIVOS' | 'INATIVOS' | 'TODOS';

@Component({
  selector: 'app-dentistas',
  imports: [ReactiveFormsModule, AppLayoutComponent],
  templateUrl: './dentistas.html',
  styleUrl: './dentistas.css'
})
export class Dentistas implements OnInit {
  private readonly dentistaService = inject(DentistaService);
  private readonly especialidadeService = inject(EspecialidadeService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly alertService = inject(AlertService);

  protected readonly dentistas = signal<DentistaResponse[]>([]);
  protected readonly especialidades = signal<EspecialidadeResponse[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal('');
  protected readonly sucesso = signal('');
  protected readonly dentistaEmEdicaoId = signal<number | null>(null);
  protected readonly filtroStatus = signal<FiltroStatusDentista>('ATIVOS');

  protected readonly form = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    cpf: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    cro: ['', [Validators.required]],
    ativo: [true],
    especialidadeIds: [[] as number[]]
  });

  ngOnInit(): void {
    this.carregarEspecialidades();
    this.listarDentistas();
  }

  private carregarEspecialidades(): void {
    this.especialidadeService.listar().subscribe({
      next: (especialidades) =>
        this.especialidades.set([...especialidades].sort((a, b) => a.nome.localeCompare(b.nome))),
      error: () => this.erro.set('Nao foi possivel carregar especialidades para selecao.')
    });
  }

  protected listarDentistas(preservarMensagem = false): void {
    this.carregando.set(true);

    if (!preservarMensagem) {
      this.limparMensagens();
    }

    this.dentistaService.listar().subscribe({
      next: (dentistas) => {
        this.dentistas.set(dentistas);
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

    const dentista = this.getDentistaDoFormulario();
    const id = this.dentistaEmEdicaoId();
    const requisicao = id
      ? this.dentistaService.atualizar(id, dentista)
      : this.dentistaService.criar(dentista);

    requisicao.subscribe({
      next: () => {
        this.sucesso.set(id ? 'Dentista atualizado com sucesso.' : 'Dentista criado com sucesso.');
        this.limparFormulario();
        this.listarDentistas(true);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected editar(dentista: DentistaResponse): void {
    this.dentistaEmEdicaoId.set(dentista.id);
    this.form.setValue({
      nome: dentista.nome,
      cpf: dentista.cpf,
      email: dentista.email,
      cro: dentista.cro,
      ativo: dentista.ativo,
      especialidadeIds: this.getEspecialidadeIds(dentista)
    });
    this.limparMensagens();
  }

  protected async alternarAtivo(dentista: DentistaResponse): Promise<void> {
    const novoStatus = !dentista.ativo;
    const acao = novoStatus ? 'reativar' : 'desativar';
    const confirmado = await this.alertService.confirmar(
      `${novoStatus ? 'Reativar' : 'Desativar'} dentista?`,
      `Deseja ${acao} o dentista ${dentista.nome}?`,
      novoStatus ? 'Reativar' : 'Desativar'
    );

    if (!confirmado) {
      return;
    }

    this.carregando.set(true);
    this.limparMensagens();

    this.dentistaService.atualizar(dentista.id, {
      nome: dentista.nome,
      cpf: dentista.cpf,
      email: dentista.email,
      cro: dentista.cro,
      ativo: novoStatus,
      especialidadeIds: this.getEspecialidadeIds(dentista)
    }).subscribe({
      next: () => {
        this.sucesso.set(novoStatus ? 'Dentista reativado com sucesso.' : 'Dentista desativado com sucesso.');
        this.listarDentistas(true);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected limparFormulario(): void {
    this.form.reset({
      nome: '',
      cpf: '',
      email: '',
      cro: '',
      ativo: true,
      especialidadeIds: []
    });
    this.dentistaEmEdicaoId.set(null);
  }

  protected getDentistasFiltrados(): DentistaResponse[] {
    const filtro = this.filtroStatus();

    if (filtro === 'TODOS') {
      return this.dentistas();
    }

    return this.dentistas().filter((dentista) =>
      filtro === 'ATIVOS' ? dentista.ativo : !dentista.ativo
    );
  }

  protected alterarFiltroStatus(filtro: FiltroStatusDentista): void {
    this.filtroStatus.set(filtro);
  }

  protected getTotalPorFiltro(filtro: FiltroStatusDentista): number {
    if (filtro === 'TODOS') {
      return this.dentistas().length;
    }

    return this.dentistas().filter((dentista) =>
      filtro === 'ATIVOS' ? dentista.ativo : !dentista.ativo
    ).length;
  }

  protected getNomesEspecialidades(dentista: DentistaResponse): string {
    if (!dentista.especialidades?.length) {
      return '-';
    }

    return dentista.especialidades
      .map((especialidade) => especialidade.nome)
      .join(', ');
  }

  private getDentistaDoFormulario() {
    const dentista = this.form.getRawValue();

    return {
      nome: dentista.nome.trim(),
      cpf: dentista.cpf.trim(),
      email: dentista.email.trim(),
      cro: dentista.cro.trim(),
      ativo: dentista.ativo,
      especialidadeIds: dentista.especialidadeIds.map(Number)
    };
  }

  private getEspecialidadeIds(dentista: DentistaResponse): number[] {
    return dentista.especialidades?.map((especialidade) => especialidade.id) ?? [];
  }

  private limparMensagens(): void {
    this.erro.set('');
    this.sucesso.set('');
  }

  private tratarErro(error: HttpErrorResponse): void {
    this.carregando.set(false);
    console.error('Erro na tela de dentistas:', error);

    if (error.status === 0) {
      this.erro.set('Nao foi possivel conectar ao backend. Verifique se ele esta rodando em http://localhost:8080.');
      return;
    }

    if (error.status === 404) {
      this.erro.set('Dentista nao encontrado.');
      return;
    }

    if (error.status === 409) {
      this.erro.set(this.getMensagemErro(error) || 'Email, CPF ou CRO ja cadastrado.');
      return;
    }

    if (error.status === 403) {
      this.erro.set(
        this.getMensagemErro(error) ||
          'Requisicao bloqueada pelo backend com 403. Verifique SecurityConfig/CSRF ou se o backend esta ocultando a resposta de validacao.'
      );
      return;
    }

    if (error.status >= 500) {
      this.erro.set(
        this.getMensagemErro(error) ||
          'Erro 500 ao chamar /dentistas. Verifique se o Spring Boot esta rodando em http://localhost:8080 e veja o console do backend.'
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
