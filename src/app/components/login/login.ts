import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

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

  protected readonly carregando = signal(false);
  protected readonly erro = signal('');
  protected readonly sucesso = signal('');

  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['admin@teste.com', [Validators.required, Validators.email]],
    senha: ['123456', [Validators.required]]
  });

  protected entrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.carregando.set(true);
    this.erro.set('');
    this.sucesso.set('');

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.carregando.set(false);
        this.sucesso.set('Login realizado com sucesso');
      },
      error: (error: HttpErrorResponse) => {
        this.carregando.set(false);
        console.error('Erro no login:', error);

        if (error.status === 0) {
          this.erro.set('Nao foi possivel conectar ao backend. Verifique se ele esta rodando e se o proxy/CORS esta configurado.');
          return;
        }

        this.erro.set('Email ou senha invalidos');
      }
    });
  }
}
