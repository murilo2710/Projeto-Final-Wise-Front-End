import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { DentistaResponse, DentistaService } from '../../services/dentista.service';

@Component({
  selector: 'app-dentistas',
  imports: [ReactiveFormsModule],
  templateUrl: './dentistas.html',
  styleUrl: './dentistas.css'
})
export class Dentistas implements OnInit {
  private readonly dentistaService = inject(DentistaService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly dentistas = signal<DentistaResponse[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal('');
  protected readonly sucesso = signal('');
  protected readonly dentistaEmEdicaoId = signal<number | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    cpf: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    cro: ['', [Validators.required]],
    ativo: [true]
  });

  ngOnInit(): void {
    this.listarDentistas();
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
      ativo: dentista.ativo
    });
    this.limparMensagens();
  }

  protected excluir(dentista: DentistaResponse): void {
    const confirmado = window.confirm(`Excluir o dentista ${dentista.nome}?`);

    if (!confirmado) {
      return;
    }

    this.carregando.set(true);
    this.limparMensagens();

    this.dentistaService.excluir(dentista.id).subscribe({
      next: () => {
        this.sucesso.set('Dentista excluido com sucesso.');
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
      ativo: true
    });
    this.dentistaEmEdicaoId.set(null);
  }

  private getDentistaDoFormulario() {
    const dentista = this.form.getRawValue();

    return {
      nome: dentista.nome.trim(),
      cpf: dentista.cpf.trim(),
      email: dentista.email.trim(),
      cro: dentista.cro.trim(),
      ativo: dentista.ativo
    };
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
