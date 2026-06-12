import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PacienteResponse, PacienteService } from '../../services/paciente.service';
import { AppLayoutComponent } from '../../shared/components/app-layout/app-layout';

@Component({
  selector: 'app-pacientes',
  imports: [ReactiveFormsModule, AppLayoutComponent],
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.css'
})
export class Pacientes implements OnInit {
  private readonly pacienteService = inject(PacienteService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly pacientes = signal<PacienteResponse[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal('');
  protected readonly sucesso = signal('');
  protected readonly pacienteEmEdicaoId = signal<number | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    cpf: ['', [Validators.required, Validators.maxLength(14)]],
    telefone: ['']
  });

  ngOnInit(): void {
    this.listarPacientes();
  }

  protected listarPacientes(preservarMensagem = false): void {
    this.carregando.set(true);

    if (!preservarMensagem) {
      this.limparMensagens();
    }

    this.pacienteService.listar().subscribe({
      next: (pacientes) => {
        this.pacientes.set(pacientes);
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

    const paciente = this.getPacienteDoFormulario();
    const id = this.pacienteEmEdicaoId();
    const requisicao = id
      ? this.pacienteService.atualizar(id, paciente)
      : this.pacienteService.criar(paciente);

    requisicao.subscribe({
      next: () => {
        this.sucesso.set(id ? 'Paciente atualizado com sucesso.' : 'Paciente criado com sucesso.');
        this.limparFormulario();
        this.listarPacientes(true);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected editar(paciente: PacienteResponse): void {
    this.pacienteEmEdicaoId.set(paciente.id);
    this.form.setValue({
      nome: paciente.nome,
      email: paciente.email,
      cpf: paciente.cpf,
      telefone: paciente.telefone ?? ''
    });
    this.limparMensagens();
  }

  protected excluir(paciente: PacienteResponse): void {
    const confirmado = window.confirm(`Excluir o paciente ${paciente.nome}?`);

    if (!confirmado) {
      return;
    }

    this.carregando.set(true);
    this.limparMensagens();

    this.pacienteService.excluir(paciente.id).subscribe({
      next: () => {
        this.sucesso.set('Paciente excluido com sucesso.');
        this.listarPacientes(true);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected limparFormulario(): void {
    this.form.reset({
      nome: '',
      email: '',
      cpf: '',
      telefone: ''
    });
    this.pacienteEmEdicaoId.set(null);
  }

  private getPacienteDoFormulario() {
    const paciente = this.form.getRawValue();

    return {
      nome: paciente.nome.trim(),
      email: paciente.email.trim(),
      cpf: paciente.cpf.trim(),
      telefone: paciente.telefone.trim()
    };
  }

  private limparMensagens(): void {
    this.erro.set('');
    this.sucesso.set('');
  }

  private tratarErro(error: HttpErrorResponse): void {
    this.carregando.set(false);
    console.error('Erro na tela de pacientes:', error);

    if (error.status === 0) {
      this.erro.set('Nao foi possivel conectar ao backend. Verifique se ele esta rodando em http://localhost:8080.');
      return;
    }

    if (error.status === 404) {
      this.erro.set('Paciente nao encontrado.');
      return;
    }

    if (error.status === 409) {
      this.erro.set(this.getMensagemErro(error) || 'Email ou CPF ja cadastrado.');
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
          'Erro 500 ao chamar /pacientes. Verifique se o Spring Boot esta rodando em http://localhost:8080 e veja o console do backend.'
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
