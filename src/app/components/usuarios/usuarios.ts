import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  PerfilUsuario,
  UsuarioRequest,
  UsuarioResponse,
  UsuarioService
} from '../../services/usuario.service';
import { AppLayoutComponent } from '../../shared/components/app-layout/app-layout';

@Component({
  selector: 'app-usuarios',
  imports: [ReactiveFormsModule, AppLayoutComponent],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css'
})
export class Usuarios implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly usuarios = signal<UsuarioResponse[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal('');
  protected readonly sucesso = signal('');
  protected readonly usuarioEmEdicaoId = signal<number | null>(null);
  protected readonly perfis: PerfilUsuario[] = ['ADMIN', 'DENTISTA'];

  protected readonly form = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    cpf: ['', [Validators.required, Validators.minLength(11), Validators.maxLength(11)]],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]],
    perfil: ['ADMIN' as PerfilUsuario, [Validators.required]],
    ativo: [true]
  });

  ngOnInit(): void {
    this.listarUsuarios();
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

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.carregando.set(true);
    this.limparMensagens();

    const usuario = this.getUsuarioDoFormulario();
    const id = this.usuarioEmEdicaoId();
    const requisicao = id
      ? this.usuarioService.atualizar(id, usuario)
      : this.usuarioService.criar(usuario);

    requisicao.subscribe({
      next: () => {
        this.sucesso.set(id ? 'Usuario atualizado com sucesso.' : 'Usuario criado com sucesso.');
        this.limparFormulario();
        this.listarUsuarios(true);
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
    this.limparMensagens();
  }

  protected excluir(usuario: UsuarioResponse): void {
    const confirmado = window.confirm(`Excluir o usuario ${usuario.nome}?`);

    if (!confirmado) {
      return;
    }

    this.carregando.set(true);
    this.limparMensagens();

    this.usuarioService.excluir(usuario.id).subscribe({
      next: () => {
        this.sucesso.set('Usuario excluido com sucesso.');
        this.listarUsuarios(true);
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

  protected formatarData(valor: string | null): string {
    if (!valor) {
      return '-';
    }

    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) {
      return valor;
    }

    return data.toLocaleString('pt-BR');
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

  private limparMensagens(): void {
    this.erro.set('');
    this.sucesso.set('');
  }

  private tratarErro(error: HttpErrorResponse): void {
    this.carregando.set(false);
    console.error('Erro na tela de usuarios:', error);

    if (error.status === 0) {
      this.erro.set('Nao foi possivel conectar ao backend. Verifique se ele esta rodando em http://localhost:8080.');
      return;
    }

    if (error.status === 409) {
      this.erro.set(this.getMensagemErro(error) || 'Email ou CPF ja cadastrado.');
      return;
    }

    if (error.status === 404) {
      this.erro.set(this.getMensagemErro(error) || 'Usuario nao encontrado.');
      return;
    }

    if (error.status === 400) {
      this.erro.set(this.getMensagemErro(error) || 'Campos invalidos. Revise os dados informados.');
      return;
    }

    if (error.status >= 500) {
      this.erro.set(this.getMensagemErro(error) || 'Erro interno no servidor. Tente novamente.');
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
