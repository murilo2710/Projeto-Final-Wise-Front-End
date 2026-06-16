import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  AdminDashboardResponse,
  AdminLogResponse,
  AdminService
} from '../../services/admin.service';
import {
  PerfilUsuario,
  UsuarioRequest,
  UsuarioResponse,
  UsuarioService
} from '../../services/usuario.service';
import { AppLayoutComponent } from '../../shared/components/app-layout/app-layout';
import { EditModalComponent } from '../../shared/components/edit-modal/edit-modal';
import { AlertService } from '../../shared/services/alert.service';
import { DentistaResponse, DentistaService } from '../../services/dentista.service';

type SecaoAdmin = 'visao' | 'usuarios' | 'logs';

interface AdminLog {
  id: number;
  usuario: string;
  tipo: string;
  recurso: string;
  descricao: string;
  dataHora: string;
}

@Component({
  selector: 'app-admin',
  imports: [ReactiveFormsModule, AppLayoutComponent, EditModalComponent],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly dentistaService = inject(DentistaService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly alertService = inject(AlertService);

  protected readonly secaoAtiva = signal<SecaoAdmin>('visao');
  protected readonly usuarios = signal<UsuarioResponse[]>([]);
  protected readonly dentistas = signal<DentistaResponse[]>([]);
  protected readonly dashboard = signal<AdminDashboardResponse | null>(null);
  protected readonly logs = signal<AdminLog[]>([]);
  protected readonly carregando = signal(false);
  protected readonly carregandoLogs = signal(false);
  protected readonly erro = signal('');
  protected readonly sucesso = signal('');
  protected readonly usuarioEmEdicaoId = signal<number | null>(null);
  protected readonly filtroLogUsuario = signal('');
  protected readonly filtroLogTipo = signal('');
  protected readonly filtroLogRecurso = signal('');
  protected readonly filtroLogData = signal('');
  protected readonly perfis: PerfilUsuario[] = ['ADMIN', 'DENTISTA'];

  protected readonly form = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    cpf: ['', [Validators.required, Validators.minLength(11), Validators.maxLength(11)]],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]],
    perfil: ['ADMIN' as PerfilUsuario, [Validators.required]],
    ativo: [true]
  });

  protected readonly totalUsuarios = computed(() => this.usuarios().length);
  protected readonly usuariosAtivos = computed(
    () => this.usuarios().filter((usuario) => usuario.ativo).length
  );
  protected readonly usuariosInativos = computed(
    () => this.usuarios().filter((usuario) => !usuario.ativo).length
  );
  protected readonly totalAdmins = computed(
    () => this.usuarios().filter((usuario) => usuario.perfil === 'ADMIN').length
  );
  protected readonly totalDentistas = computed(
    () => this.usuarios().filter((usuario) => usuario.perfil === 'DENTISTA').length
  );

  protected readonly tiposLog = computed(() =>
    Array.from(new Set(this.logs().map((log) => log.tipo).filter(Boolean))).sort()
  );
  protected readonly recursosLog = computed(() =>
    Array.from(new Set(this.logs().map((log) => log.recurso).filter(Boolean))).sort()
  );

  protected readonly logsFiltrados = computed(() => {
    const usuario = this.filtroLogUsuario().trim().toLowerCase();
    const tipo = this.filtroLogTipo();
    const recurso = this.filtroLogRecurso();
    const data = this.filtroLogData();

    return this.logs().filter((log) => {
      const dataLog = log.dataHora ? log.dataHora.slice(0, 10) : '';
      const usuarioOk = !usuario || log.usuario.toLowerCase().includes(usuario);
      const tipoOk = !tipo || log.tipo === tipo;
      const recursoOk = !recurso || log.recurso === recurso;
      const dataOk = !data || dataLog === data;

      return usuarioOk && tipoOk && recursoOk && dataOk;
    });
  });

  ngOnInit(): void {
    this.carregarTudo();
  }

  protected selecionarSecao(secao: SecaoAdmin): void {
    this.secaoAtiva.set(secao);
    this.limparMensagens();
  }

  protected carregarTudo(): void {
    this.listarUsuarios();
    this.listarDentistas();
    this.carregarDashboard();
    this.carregarLogs();
  }

  protected listarUsuarios(preservarMensagem = false): void {
    this.carregando.set(true);

    if (!preservarMensagem) {
      this.limparMensagens();
    }

    this.usuarioService.listar().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.carregando.set(false);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected listarDentistas(): void {
    this.dentistaService.listar().subscribe({
      next: (dentistas) => this.dentistas.set(dentistas),
      error: (error: HttpErrorResponse) => {
        console.error('Erro ao carregar dentistas para status profissional:', error);
        this.dentistas.set([]);
      }
    });
  }

  protected carregarDashboard(): void {
    this.adminService.buscarDashboard().subscribe({
      next: (dashboard) => this.dashboard.set(dashboard),
      error: (error: HttpErrorResponse) => {
        console.error('Erro ao carregar dashboard administrativo:', error);
        this.dashboard.set(null);
      }
    });
  }

  protected carregarLogs(): void {
    this.carregandoLogs.set(true);

    this.adminService.listarLogs().subscribe({
      next: (logs) => {
        this.logs.set(logs.map((log) => this.normalizarLog(log)));
        this.carregandoLogs.set(false);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erro ao carregar logs administrativos:', error);
        this.logs.set([]);
        this.carregandoLogs.set(false);
      }
    });
  }

  protected async salvar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const usuario = this.getUsuarioDoFormulario();
    const id = this.usuarioEmEdicaoId();

    if (id) {
      const confirmado = await this.alertService.confirmar(
        'Atualizar usuário?',
        'Deseja salvar as alterações deste usuário, incluindo perfil e status?',
        'Atualizar'
      );

      if (!confirmado) {
        return;
      }
    }

    this.carregando.set(true);
    this.limparMensagens();

    const requisicao = id
      ? this.usuarioService.atualizar(id, usuario)
      : this.usuarioService.criar(usuario);

    requisicao.subscribe({
      next: () => {
        this.sucesso.set(id ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.');
        this.limparFormulario();
        this.listarUsuarios(true);
        this.listarDentistas();
        this.carregarDashboard();
        this.carregarLogs();
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected editar(usuario: UsuarioResponse): void {
    this.usuarioEmEdicaoId.set(usuario.id);
    this.form.controls.senha.clearValidators();
    this.form.controls.senha.addValidators([Validators.minLength(6)]);
    this.form.controls.senha.updateValueAndValidity();
    this.form.setValue({
      nome: usuario.nome,
      cpf: usuario.cpf,
      email: usuario.email,
      senha: '',
      perfil: usuario.perfil,
      ativo: usuario.ativo
    });
    this.secaoAtiva.set('usuarios');
    this.limparMensagens();
  }

  protected async excluir(usuario: UsuarioResponse): Promise<void> {
    const confirmado = await this.alertService.confirmar(
      'Excluir usuário?',
      `Deseja excluir o usuário ${usuario.nome}?`,
      'Excluir'
    );

    if (!confirmado) {
      return;
    }

    this.carregando.set(true);
    this.limparMensagens();

    this.usuarioService.excluir(usuario.id).subscribe({
      next: () => {
        this.sucesso.set('Usuário excluído com sucesso.');
        this.listarUsuarios(true);
        this.carregarDashboard();
        this.carregarLogs();
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected limparFormulario(): void {
    this.form.controls.senha.clearValidators();
    this.form.controls.senha.addValidators([Validators.required, Validators.minLength(6)]);
    this.form.controls.senha.updateValueAndValidity();
    this.form.reset({
      nome: '',
      cpf: '',
      email: '',
      senha: '',
      perfil: 'ADMIN',
      ativo: true
    });
    this.usuarioEmEdicaoId.set(null);
  }

  protected atualizarFiltroLogUsuario(valor: string): void {
    this.filtroLogUsuario.set(valor);
  }

  protected atualizarFiltroLogTipo(valor: string): void {
    this.filtroLogTipo.set(valor);
  }

  protected atualizarFiltroLogRecurso(valor: string): void {
    this.filtroLogRecurso.set(valor);
  }

  protected atualizarFiltroLogData(valor: string): void {
    this.filtroLogData.set(valor);
  }

  protected limparFiltrosLogs(): void {
    this.filtroLogUsuario.set('');
    this.filtroLogTipo.set('');
    this.filtroLogRecurso.set('');
    this.filtroLogData.set('');
  }

  protected formatarData(valor: string | null): string {
    if (!valor) {
      return '-';
    }

    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? valor : data.toLocaleString('pt-BR');
  }

  protected formatarNumero(valor: number | undefined): string {
    return new Intl.NumberFormat('pt-BR').format(valor ?? 0);
  }

  protected getTotalDashboard(chaves: Array<keyof AdminDashboardResponse>, fallback: number): number {
    const dashboard = this.dashboard();

    if (!dashboard) {
      return fallback;
    }

    const valor = chaves.map((chave) => dashboard[chave]).find((item) => typeof item === 'number');

    return valor ?? fallback;
  }

  protected tempoRelativo(valor: string): string {
    const data = new Date(valor).getTime();

    if (Number.isNaN(data)) {
      return valor || '-';
    }

    const minutos = Math.round((Date.now() - data) / 60000);

    if (minutos < 1) {
      return 'agora mesmo';
    }

    if (minutos < 60) {
      return `ha ${minutos} min`;
    }

    const horas = Math.round(minutos / 60);

    if (horas < 24) {
      return `ha ${horas} h`;
    }

    const dias = Math.round(horas / 24);

    return dias === 1 ? 'ha 1 dia' : `ha ${dias} dias`;
  }

  protected getLogClasse(log: AdminLog): string {
    const recurso = log.recurso.toLowerCase();

    if (recurso.includes('usuario')) {
      return 'is-usuario';
    }

    if (recurso.includes('consulta')) {
      return 'is-consulta';
    }

    if (recurso.includes('auth') || recurso.includes('login')) {
      return 'is-auth';
    }

    if (recurso.includes('estoque') || recurso.includes('material')) {
      return 'is-estoque';
    }

    return 'is-sistema';
  }

  protected getStatusProfissional(usuario: UsuarioResponse): string {
    if (usuario.perfil !== 'DENTISTA') {
      return 'Não se aplica';
    }

    return this.usuarioPossuiDentista(usuario)
      ? 'Dentista cadastrado'
      : 'Cadastro profissional pendente';
  }

  protected getStatusProfissionalClasse(usuario: UsuarioResponse): string {
    if (usuario.perfil !== 'DENTISTA') {
      return 'is-neutral';
    }

    return this.usuarioPossuiDentista(usuario) ? 'is-success' : 'is-warning';
  }

  private normalizarLog(log: AdminLogResponse): AdminLog {
    const tipo = log.tipo || log.acao || 'INFO';
    const recurso = log.recurso || log.categoria || 'SISTEMA';

    return {
      id: log.id,
      usuario: log.usuarioNome || log.usuario || (log.usuarioId ? `Usuário #${log.usuarioId}` : 'Sistema'),
      tipo,
      recurso,
      descricao: log.mensagem || log.descricao || `${tipo} em ${recurso}`,
      dataHora: log.dataCriacao || log.dataHora || ''
    };
  }

  private getUsuarioDoFormulario(): UsuarioRequest {
    const usuario = this.form.getRawValue();
    const cpfSomenteDigitos = usuario.cpf.replace(/\D/g, '');
    const senha = usuario.senha.trim();

    const payload: UsuarioRequest = {
      nome: usuario.nome.trim(),
      cpf: cpfSomenteDigitos,
      email: usuario.email.trim(),
      perfil: usuario.perfil,
      ativo: usuario.ativo
    };

    if (senha) {
      payload.senha = senha;
    }

    return payload;
  }

  private usuarioPossuiDentista(usuario: UsuarioResponse): boolean {
    return this.dentistas().some((dentista) => this.mesmoCpfOuEmail(usuario, dentista));
  }

  private mesmoCpfOuEmail(usuario: UsuarioResponse, dentista: DentistaResponse): boolean {
    const usuarioCpf = this.normalizarCpf(usuario.cpf);
    const dentistaCpf = this.normalizarCpf(dentista.cpf);
    const usuarioEmail = this.normalizarEmail(usuario.email);
    const dentistaEmail = this.normalizarEmail(dentista.email);

    return (!!usuarioCpf && usuarioCpf === dentistaCpf) || (!!usuarioEmail && usuarioEmail === dentistaEmail);
  }

  private normalizarCpf(cpf: string): string {
    return cpf.replace(/\D/g, '');
  }

  private normalizarEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private limparMensagens(): void {
    this.erro.set('');
    this.sucesso.set('');
  }

  private tratarErro(error: HttpErrorResponse): void {
    this.carregando.set(false);
    console.error('Erro no painel administrativo:', error);

    if (error.status === 0) {
      this.erro.set('Não foi possível conectar ao servidor. Verifique se o backend está em execução.');
      return;
    }

    if (error.status === 409) {
      this.erro.set(this.getMensagemErro(error) || 'E-mail ou CPF já cadastrado.');
      return;
    }

    if (error.status === 404) {
      this.erro.set(this.getMensagemErro(error) || 'Usuário não encontrado.');
      return;
    }

    if (error.status === 400) {
      this.erro.set(this.getMensagemErro(error) || 'Campos inválidos. Revise os dados informados.');
      return;
    }

    if (error.status === 403) {
      this.erro.set(this.getMensagemErro(error) || 'Você não tem permissão para executar esta ação.');
      return;
    }

    if (error.status >= 500) {
      this.erro.set(this.getMensagemErro(error) || 'Erro interno no servidor. Tente novamente.');
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
