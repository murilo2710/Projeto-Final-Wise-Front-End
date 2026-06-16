import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { EspecialidadeResponse, EspecialidadeService } from '../../services/especialidade.service';
import {
  EstoqueDashboardResponse,
  EstoqueMovimentacaoResponse,
  EstoqueMovimentacaoService,
  TipoMovimentacaoEstoque
} from '../../services/estoque-movimentacao.service';
import { MaterialResponse, MaterialService } from '../../services/material.service';
import { AppLayoutComponent } from '../../shared/components/app-layout/app-layout';
import { EditModalComponent } from '../../shared/components/edit-modal/edit-modal';
import { AlertService } from '../../shared/services/alert.service';

type FiltroStatusMaterial = 'TODOS' | 'ATIVOS' | 'INATIVOS' | 'BAIXO_ESTOQUE';
type AbaEstoque = 'DASHBOARD' | 'MATERIAIS' | 'MOVIMENTACOES';

@Component({
  selector: 'app-materiais',
  imports: [ReactiveFormsModule, AppLayoutComponent, EditModalComponent],
  templateUrl: './materiais.html',
  styleUrl: './materiais.css'
})
export class Materiais implements OnInit {
  private readonly materialService = inject(MaterialService);
  private readonly estoqueMovimentacaoService = inject(EstoqueMovimentacaoService);
  private readonly especialidadeService = inject(EspecialidadeService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly alertService = inject(AlertService);

  protected readonly materiais = signal<MaterialResponse[]>([]);
  protected readonly materiaisSelect = signal<MaterialResponse[]>([]);
  protected readonly movimentacoes = signal<EstoqueMovimentacaoResponse[]>([]);
  protected readonly dashboard = signal<EstoqueDashboardResponse | null>(null);
  protected readonly especialidades = signal<EspecialidadeResponse[]>([]);
  protected readonly carregando = signal(false);
  protected readonly carregandoDashboard = signal(false);
  protected readonly carregandoMovimentacoes = signal(false);
  protected readonly erro = signal('');
  protected readonly sucesso = signal('');
  protected readonly abaAtiva = signal<AbaEstoque>('DASHBOARD');
  protected readonly materialEmEdicaoId = signal<number | null>(null);
  protected readonly filtroStatus = signal<FiltroStatusMaterial>('TODOS');
  protected readonly filtroEspecialidadeId = signal(0);
  protected readonly especialidadesDropdownAberto = signal(false);
  protected readonly filtroMovimentacaoMaterialId = signal(0);
  protected readonly filtroMovimentacaoTipo = signal<TipoMovimentacaoEstoque | ''>('');
  protected readonly unidadesMedida = ['UNIDADE', 'CAIXA', 'PACOTE', 'ML', 'L', 'G', 'KG'];
  protected readonly tiposMovimentacao: TipoMovimentacaoEstoque[] = ['ENTRADA', 'SAIDA', 'AJUSTE'];
  protected readonly movimentacoesFiltradas = computed(() => {
    const materialId = this.filtroMovimentacaoMaterialId();
    const tipo = this.filtroMovimentacaoTipo();

    return this.movimentacoes().filter((movimentacao) => {
      const correspondeMaterial = !materialId || movimentacao.materialId === materialId;
      const correspondeTipo = !tipo || movimentacao.tipo === tipo;

      return correspondeMaterial && correspondeTipo;
    });
  });
  protected readonly materiaisBaixoEstoqueDashboard = computed(
    () => this.dashboard()?.materiaisBaixoEstoque ?? []
  );
  protected readonly ultimasMovimentacoesDashboard = computed(
    () => this.dashboard()?.ultimasMovimentacoes ?? []
  );

  protected readonly form = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    descricao: ['', [Validators.required]],
    unidadeMedida: ['UNIDADE', [Validators.required]],
    quantidadeAtual: [0, [Validators.required, Validators.min(0)]],
    quantidadeMinima: [0, [Validators.required, Validators.min(0)]],
    ativo: [true],
    especialidadeIds: [[] as number[]]
  });

  protected readonly movimentacaoForm = this.formBuilder.nonNullable.group({
    materialId: [0, [Validators.required, Validators.min(1)]],
    tipo: ['ENTRADA' as TipoMovimentacaoEstoque, [Validators.required]],
    quantidade: [1, [Validators.required, Validators.min(0)]],
    motivo: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.carregarEspecialidades();
    this.carregarDashboard();
    this.carregarMateriaisSelect();
    this.listarMateriais();
    this.listarMovimentacoes();
  }

  protected alterarAba(aba: AbaEstoque): void {
    this.abaAtiva.set(aba);
  }

  protected carregarDashboard(preservarMensagem = false): void {
    this.carregandoDashboard.set(true);

    if (!preservarMensagem) {
      this.limparMensagens();
    }

    this.estoqueMovimentacaoService.dashboard().subscribe({
      next: (dashboard) => {
        this.dashboard.set(dashboard);
        this.carregandoDashboard.set(false);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  private carregarEspecialidades(): void {
    this.especialidadeService.listar().subscribe({
      next: (especialidades) =>
        this.especialidades.set([...especialidades].sort((a, b) => a.nome.localeCompare(b.nome))),
      error: () => this.erro.set('Nao foi possivel carregar especialidades para selecao.')
    });
  }

  protected listarMateriais(preservarMensagem = false): void {
    this.carregando.set(true);

    if (!preservarMensagem) {
      this.limparMensagens();
    }

    this.materialService.listar(this.getFiltros()).subscribe({
      next: (materiais) => {
        this.materiais.set(materiais);
        this.carregando.set(false);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  private carregarMateriaisSelect(): void {
    this.materialService.listar().subscribe({
      next: (materiais) => this.materiaisSelect.set(materiais),
      error: () => this.erro.set('Nao foi possivel carregar materiais para selecao.')
    });
  }

  protected listarMovimentacoes(preservarMensagem = false): void {
    this.carregandoMovimentacoes.set(true);

    if (!preservarMensagem) {
      this.limparMensagens();
    }

    this.estoqueMovimentacaoService.listar().subscribe({
      next: (movimentacoes) => {
        this.movimentacoes.set(movimentacoes);
        this.carregandoMovimentacoes.set(false);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected async salvar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const material = this.getMaterialDoFormulario();
    const id = this.materialEmEdicaoId();

    if (id) {
      const confirmado = await this.alertService.confirmar(
        'Atualizar material?',
        'Deseja salvar as alteracoes deste material, incluindo especialidades vinculadas?',
        'Atualizar'
      );

      if (!confirmado) {
        return;
      }
    }

    this.carregando.set(true);
    this.limparMensagens();

    const requisicao = id
      ? this.materialService.atualizar(id, material)
      : this.materialService.criar(material);

    requisicao.subscribe({
      next: () => {
        this.sucesso.set(id ? 'Material atualizado com sucesso.' : 'Material criado com sucesso.');
        this.limparFormulario();
        this.carregarDashboard(true);
        this.carregarMateriaisSelect();
        this.listarMateriais(true);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected registrarMovimentacao(): void {
    if (this.movimentacaoForm.invalid) {
      this.movimentacaoForm.markAllAsTouched();
      return;
    }

    this.carregandoMovimentacoes.set(true);
    this.limparMensagens();

    this.estoqueMovimentacaoService.registrar(this.getMovimentacaoDoFormulario()).subscribe({
      next: () => {
        this.sucesso.set('Movimentacao registrada com sucesso.');
        this.limparMovimentacaoFormulario();
        this.carregarDashboard(true);
        this.carregarMateriaisSelect();
        this.listarMateriais(true);
        this.listarMovimentacoes(true);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected editar(material: MaterialResponse): void {
    this.materialEmEdicaoId.set(material.id);
    this.form.setValue({
      nome: material.nome,
      descricao: material.descricao,
      unidadeMedida: material.unidadeMedida,
      quantidadeAtual: material.quantidadeAtual,
      quantidadeMinima: material.quantidadeMinima,
      ativo: material.ativo,
      especialidadeIds: this.getEspecialidadeIds(material)
    });
    this.especialidadesDropdownAberto.set(false);
    this.limparMensagens();
  }

  protected async alternarAtivo(material: MaterialResponse): Promise<void> {
    const ativar = !material.ativo;
    const confirmado = await this.alertService.confirmar(
      `${ativar ? 'Ativar' : 'Inativar'} material?`,
      `Deseja ${ativar ? 'ativar' : 'inativar'} o material ${material.nome}?`,
      ativar ? 'Ativar' : 'Inativar'
    );

    if (!confirmado) {
      return;
    }

    this.carregando.set(true);
    this.limparMensagens();

    const requisicao = ativar
      ? this.materialService.ativar(material.id)
      : this.materialService.inativar(material.id);

    requisicao.subscribe({
      next: () => {
        this.sucesso.set(ativar ? 'Material ativado com sucesso.' : 'Material inativado com sucesso.');
        this.carregarDashboard(true);
        this.carregarMateriaisSelect();
        this.listarMateriais(true);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected limparFormulario(): void {
    this.form.reset({
      nome: '',
      descricao: '',
      unidadeMedida: 'UNIDADE',
      quantidadeAtual: 0,
      quantidadeMinima: 0,
      ativo: true,
      especialidadeIds: []
    });
    this.materialEmEdicaoId.set(null);
    this.especialidadesDropdownAberto.set(false);
  }

  protected alternarEspecialidadesDropdown(): void {
    this.especialidadesDropdownAberto.update((aberto) => !aberto);
  }

  protected alternarEspecialidade(especialidadeId: number): void {
    const selecionadas = this.form.controls.especialidadeIds.value;
    const novasEspecialidades = selecionadas.includes(especialidadeId)
      ? selecionadas.filter((id) => id !== especialidadeId)
      : [...selecionadas, especialidadeId];

    this.form.controls.especialidadeIds.setValue(novasEspecialidades);
    this.form.controls.especialidadeIds.markAsDirty();
  }

  protected especialidadeSelecionada(especialidadeId: number): boolean {
    return this.form.controls.especialidadeIds.value.includes(especialidadeId);
  }

  protected getResumoEspecialidadesSelecionadas(): string {
    const selecionadas = this.form.controls.especialidadeIds.value;

    if (selecionadas.length === 0) {
      return 'Selecione uma ou mais especialidades';
    }

    const nomes = this.especialidades()
      .filter((especialidade) => selecionadas.includes(especialidade.id))
      .map((especialidade) => especialidade.nome);

    if (nomes.length <= 2) {
      return nomes.join(', ');
    }

    return `${nomes.length} especialidades selecionadas`;
  }

  protected limparMovimentacaoFormulario(): void {
    this.movimentacaoForm.reset({
      materialId: 0,
      tipo: 'ENTRADA',
      quantidade: 1,
      motivo: ''
    });
  }

  protected alterarFiltroStatus(filtro: FiltroStatusMaterial): void {
    this.filtroStatus.set(filtro);
    this.listarMateriais();
  }

  protected alterarFiltroEspecialidade(valor: string): void {
    this.filtroEspecialidadeId.set(Number(valor));
    this.listarMateriais();
  }

  protected alterarFiltroMovimentacaoMaterial(valor: string): void {
    this.filtroMovimentacaoMaterialId.set(Number(valor));
  }

  protected alterarFiltroMovimentacaoTipo(valor: string): void {
    this.filtroMovimentacaoTipo.set(valor as TipoMovimentacaoEstoque | '');
  }

  protected formatarData(valor: string): string {
    const data = new Date(valor);

    if (Number.isNaN(data.getTime())) {
      return valor || '-';
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(data);
  }

  protected getNomesEspecialidades(material: MaterialResponse): string {
    if (!material.especialidades?.length) {
      return '-';
    }

    return material.especialidades.map((especialidade) => especialidade.nome).join(', ');
  }

  private getFiltros() {
    const filtro = this.filtroStatus();

    return {
      ativo: filtro === 'ATIVOS' ? true : filtro === 'INATIVOS' ? false : undefined,
      baixoEstoque: filtro === 'BAIXO_ESTOQUE' ? true : undefined,
      especialidadeId: this.filtroEspecialidadeId() || undefined
    };
  }

  private getMaterialDoFormulario() {
    const material = this.form.getRawValue();

    return {
      nome: material.nome.trim(),
      descricao: material.descricao.trim(),
      unidadeMedida: material.unidadeMedida.trim(),
      quantidadeAtual: Number(material.quantidadeAtual),
      quantidadeMinima: Number(material.quantidadeMinima),
      ativo: material.ativo,
      especialidadeIds: material.especialidadeIds.map(Number)
    };
  }

  private getMovimentacaoDoFormulario() {
    const movimentacao = this.movimentacaoForm.getRawValue();

    return {
      materialId: Number(movimentacao.materialId),
      tipo: movimentacao.tipo,
      quantidade: Number(movimentacao.quantidade),
      motivo: movimentacao.motivo.trim()
    };
  }

  private getEspecialidadeIds(material: MaterialResponse): number[] {
    return material.especialidades?.map((especialidade) => especialidade.id) ?? [];
  }

  private limparMensagens(): void {
    this.erro.set('');
    this.sucesso.set('');
  }

  private tratarErro(error: HttpErrorResponse): void {
    this.carregando.set(false);
    this.carregandoDashboard.set(false);
    this.carregandoMovimentacoes.set(false);
    console.error('Erro na tela de materiais:', error);

    if (error.status === 0) {
      this.erro.set('Nao foi possivel conectar ao backend. Verifique se ele esta rodando em http://localhost:8080.');
      return;
    }

    if (error.status === 404) {
      this.erro.set(this.getMensagemErro(error) || 'Material nao encontrado.');
      return;
    }

    if (error.status === 409) {
      this.erro.set(this.getMensagemErro(error) || 'Conflito ao salvar material.');
      return;
    }

    if (error.status === 400) {
      this.erro.set(this.getMensagemErro(error) || 'Dados invalidos. Revise os campos informados.');
      return;
    }

    if (error.status === 403) {
      this.erro.set(this.getMensagemErro(error) || 'Voce nao tem permissao para executar esta acao.');
      return;
    }

    this.erro.set(this.getMensagemErro(error) || `Erro ${error.status} ao comunicar com o backend.`);
  }

  private getMensagemErro(error: HttpErrorResponse): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    return error.error?.message ?? error.error?.mensagem ?? error.error?.erro ?? '';
  }
}
