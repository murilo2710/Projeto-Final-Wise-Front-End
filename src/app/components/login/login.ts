import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly carregando = signal(false);
  protected readonly erro = signal('');
  protected readonly sucesso = signal('');

  private readonly tituloCompleto = 'Gestão inteligente\npara sua clínica.';
  protected readonly tituloDigitado = signal('');
  private temporizador?: ReturnType<typeof setInterval>;

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required]]
  });

  ngOnInit(): void {
    let posicao = 0;

    this.temporizador = setInterval(() => {
      posicao += 1;
      this.tituloDigitado.set(this.tituloCompleto.slice(0, posicao));

      if (posicao >= this.tituloCompleto.length) {
        this.pararDigitacao();
      }
    }, 75);
  }

  ngOnDestroy(): void {
    this.pararDigitacao();
  }

  private pararDigitacao(): void {
    if (this.temporizador) {
      clearInterval(this.temporizador);
      this.temporizador = undefined;
    }
  }

  protected entrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.carregando.set(true);
    this.erro.set('');
    this.sucesso.set('');

    const credenciais = this.form.getRawValue();

    this.authService.login({
      email: credenciais.email.trim(),
      senha: credenciais.senha
    }).subscribe({
      next: () => {
        this.carregando.set(false);
        this.sucesso.set('Login realizado com sucesso');
        this.router.navigate(['/dashboard']);
      },
      error: (error: HttpErrorResponse) => {
        this.carregando.set(false);
        console.error('Erro no login:', error);

        if (error.status === 0) {
          this.erro.set('Não foi possível conectar ao servidor. Verifique se o backend está em execução.');
          return;
        }

        if (error.status >= 500) {
          this.erro.set('Não foi possível entrar agora. Tente novamente em alguns instantes.');
          return;
        }

        this.erro.set(this.getMensagemErro(error));
      }
    });
  }

  private getMensagemErro(error: HttpErrorResponse): string {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }

    if (error.error?.message) {
      return error.error.message;
    }

    if (error.error?.erro) {
      return error.error.erro;
    }

    return 'E-mail ou senha inválidos.';
  }
}
