import { Component, inject, signal } from '@angular/core';
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
export class Login {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly carregando = signal(false);
  protected readonly erro = signal('');
  protected readonly sucesso = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required]]
  });

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
          this.erro.set('Nao foi possivel conectar ao backend. Verifique se ele esta rodando em http://localhost:8080.');
          return;
        }

        if (error.status >= 500) {
          this.erro.set('Erro interno no backend ao tentar fazer login. Verifique o console do Spring Boot.');
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

    return 'Email ou senha invalidos.';
  }
}
