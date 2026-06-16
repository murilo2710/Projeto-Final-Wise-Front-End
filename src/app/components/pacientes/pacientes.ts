import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { PacienteResponse, PacienteService } from '../../services/paciente.service';
import { AppLayoutComponent } from '../../shared/components/app-layout/app-layout';
import { EditModalComponent } from '../../shared/components/edit-modal/edit-modal';
import { AlertService } from '../../shared/services/alert.service';
import {
  cpfValidator,
  nomePessoaValidator,
  telefoneValidator
} from '../../shared/validators/form-validators';
import { formatarCpf, somenteDigitosCpf } from '../../shared/utils/cpf';

@Component({
  selector: 'app-pacientes',
  imports: [ReactiveFormsModule, AppLayoutComponent, EditModalComponent],
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.css'
})
export class Pacientes implements OnInit {
  private readonly pacienteService = inject(PacienteService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly alertService = inject(AlertService);

  protected readonly pacientes = signal<PacienteResponse[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal('');
  protected readonly sucesso = signal('');
  protected readonly pacienteEmEdicaoId = signal<number | null>(null);
  protected readonly formatarCpf = formatarCpf;

  protected readonly form = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(120), nomePessoaValidator()]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
    cpf: ['', [Validators.required, cpfValidator()]],
    telefone: ['', [Validators.minLength(8), Validators.maxLength(20), telefoneValidator()]]
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

  protected async salvar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const paciente = this.getPacienteDoFormulario();
    const id = this.pacienteEmEdicaoId();

    if (id) {
      const confirmado = await this.alertService.confirmar(
        'Atualizar paciente?',
        'Deseja salvar as alterações deste paciente?',
        'Atualizar'
      );

      if (!confirmado) {
        return;
      }
    }

    this.carregando.set(true);
    this.limparMensagens();

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
      cpf: formatarCpf(paciente.cpf),
      telefone: paciente.telefone ?? ''
    });
    this.limparMensagens();
  }

  protected async excluir(paciente: PacienteResponse): Promise<void> {
    const confirmado = await this.alertService.confirmar(
      'Excluir paciente?',
      `Deseja excluir o paciente ${paciente.nome}?`,
      'Excluir'
    );

    if (!confirmado) {
      return;
    }

    this.carregando.set(true);
    this.limparMensagens();

    this.pacienteService.excluir(paciente.id).subscribe({
      next: () => {
        this.sucesso.set('Paciente excluído com sucesso.');
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
      cpf: somenteDigitosCpf(paciente.cpf),
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
      this.erro.set('Não foi possível conectar ao servidor. Verifique se o backend está em execução.');
      return;
    }

    if (error.status === 404) {
      this.erro.set('Paciente não encontrado.');
      return;
    }

    if (error.status === 409) {
      this.erro.set(this.getMensagemErro(error) || 'E-mail ou CPF já cadastrado.');
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
