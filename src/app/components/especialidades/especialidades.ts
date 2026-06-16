import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  EspecialidadeResponse,
  EspecialidadeService
} from '../../services/especialidade.service';
import { AppLayoutComponent } from '../../shared/components/app-layout/app-layout';
import { EditModalComponent } from '../../shared/components/edit-modal/edit-modal';
import { AlertService } from '../../shared/services/alert.service';
import { especialidadeValidator } from '../../shared/validators/form-validators';

@Component({
  selector: 'app-especialidades',
  imports: [ReactiveFormsModule, AppLayoutComponent, EditModalComponent],
  templateUrl: './especialidades.html',
  styleUrl: './especialidades.css'
})
export class Especialidades implements OnInit {
  private readonly especialidadeService = inject(EspecialidadeService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly alertService = inject(AlertService);

  protected readonly especialidades = signal<EspecialidadeResponse[]>([]);
  protected readonly carregando = signal(false);
  protected readonly erro = signal('');
  protected readonly sucesso = signal('');
  protected readonly especialidadeEmEdicaoId = signal<number | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100), especialidadeValidator()]]
  });

  ngOnInit(): void {
    this.listarEspecialidades();
  }

  protected listarEspecialidades(preservarMensagem = false): void {
    this.carregando.set(true);

    if (!preservarMensagem) {
      this.limparMensagens();
    }

    this.especialidadeService.listar().subscribe({
      next: (especialidades) => {
        this.especialidades.set(especialidades);
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

    const especialidade = this.getEspecialidadeDoFormulario();
    const id = this.especialidadeEmEdicaoId();

    if (id) {
      const confirmado = await this.alertService.confirmar(
        'Atualizar especialidade?',
        'Deseja salvar as alterações desta especialidade?',
        'Atualizar'
      );

      if (!confirmado) {
        return;
      }
    }

    this.carregando.set(true);
    this.limparMensagens();

    const requisicao = id
      ? this.especialidadeService.atualizar(id, especialidade)
      : this.especialidadeService.criar(especialidade);

    requisicao.subscribe({
      next: () => {
        this.sucesso.set(
          id ? 'Especialidade atualizada com sucesso.' : 'Especialidade criada com sucesso.'
        );
        this.limparFormulario();
        this.listarEspecialidades(true);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected editar(especialidade: EspecialidadeResponse): void {
    this.especialidadeEmEdicaoId.set(especialidade.id);
    this.form.setValue({
      nome: especialidade.nome
    });
    this.limparMensagens();
  }

  protected async excluir(especialidade: EspecialidadeResponse): Promise<void> {
    const confirmado = await this.alertService.confirmar(
      'Excluir especialidade?',
      `Deseja excluir a especialidade ${especialidade.nome}?`,
      'Excluir'
    );

    if (!confirmado) {
      return;
    }

    this.carregando.set(true);
    this.limparMensagens();

    this.especialidadeService.excluir(especialidade.id).subscribe({
      next: () => {
        this.sucesso.set('Especialidade excluída com sucesso.');
        this.listarEspecialidades(true);
      },
      error: (error: HttpErrorResponse) => this.tratarErro(error)
    });
  }

  protected limparFormulario(): void {
    this.form.reset({
      nome: ''
    });
    this.especialidadeEmEdicaoId.set(null);
  }

  private getEspecialidadeDoFormulario() {
    const especialidade = this.form.getRawValue();

    return {
      nome: especialidade.nome.trim()
    };
  }

  private limparMensagens(): void {
    this.erro.set('');
    this.sucesso.set('');
  }

  private tratarErro(error: HttpErrorResponse): void {
    this.carregando.set(false);
    console.error('Erro na tela de especialidades:', error);

    if (error.status === 0) {
      this.erro.set(
        'Não foi possível conectar ao servidor. Verifique se o backend está em execução.'
      );
      return;
    }

    if (error.status === 404) {
      this.erro.set('Especialidade não encontrada.');
      return;
    }

    if (error.status === 409) {
      this.erro.set(this.getMensagemErro(error) || 'Especialidade ja cadastrada.');
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
