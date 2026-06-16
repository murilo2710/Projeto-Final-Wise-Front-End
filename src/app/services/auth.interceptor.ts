import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { NotificacaoToastService } from '../shared/services/notificacao-toast.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const toastService = inject(NotificacaoToastService);
  const token = authService.getToken();
  const tipoToken = authService.getTipoToken() || 'Bearer';
  const isLoginRequest = isAuthEndpoint(request.url, '/login');
  const isRefreshRequest = isAuthEndpoint(request.url, '/refresh');
  const isLogoutRequest = isAuthEndpoint(request.url, '/logout');
  const isAuthRequest = isLoginRequest || isRefreshRequest || isLogoutRequest;

  const authenticatedRequest =
    token && !isAuthRequest
      ? request.clone({
          setHeaders: {
            Authorization: `${tipoToken} ${token}`
          }
        })
      : request;

  return next(authenticatedRequest).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && !isAuthRequest) {
        return authService.renovarToken().pipe(
          switchMap(() => {
            const novoToken = authService.getToken();
            const novoTipoToken = authService.getTipoToken() || 'Bearer';
            const retryRequest = request.clone({
              setHeaders: {
                Authorization: `${novoTipoToken} ${novoToken}`
              }
            });

            return next(retryRequest);
          }),
          catchError((refreshError: unknown) => {
            authService.limparSessao();
            toastService.mostrar({
              titulo: 'Sessão expirada',
              mensagem: 'Sua sessão expirou. Faça login novamente.',
              tipo: 'ALERTA'
            });
            router.navigate(['/login']);

            return throwError(() => refreshError);
          })
        );
      }

      if (error instanceof HttpErrorResponse && !isAuthRequest) {
        notificarErroBackend(error, toastService);
      }

      return throwError(() => error);
    })
  );
};

function isAuthEndpoint(url: string, endpoint: '/login' | '/refresh' | '/logout'): boolean {
  return url.includes(`/auth${endpoint}`) || url.includes(`/api/auth${endpoint}`);
}

function notificarErroBackend(
  error: HttpErrorResponse,
  toastService: NotificacaoToastService
): void {
  const config = getConfigNotificacaoErro(error.status);

  if (!config) {
    return;
  }

  toastService.mostrar({
    titulo: config.titulo,
    mensagem: getMensagemErro(error) || config.mensagemPadrao,
    tipo: 'ALERTA'
  });
}

function getConfigNotificacaoErro(status: number): { titulo: string; mensagemPadrao: string } | null {
  if (status === 409) {
    return {
      titulo: 'Conflito de regra de negócio',
      mensagemPadrao: 'A operação não pode ser concluída por uma regra do sistema.'
    };
  }

  if (status === 400) {
    return {
      titulo: 'Dados inválidos',
      mensagemPadrao: 'Revise os campos informados e tente novamente.'
    };
  }

  if (status === 403) {
    return {
      titulo: 'Acao bloqueada',
      mensagemPadrao: 'Seu usuário não tem permissão para executar esta ação.'
    };
  }

  return null;
}

function getMensagemErro(error: HttpErrorResponse): string {
  if (typeof error.error === 'string' && error.error.trim()) {
    return error.error;
  }

  const mensagens = extrairMensagens(error.error);

  return mensagens.join(' | ');
}

function extrairMensagens(valor: unknown): string[] {
  if (!valor) {
    return [];
  }

  if (typeof valor === 'string') {
    return valor.trim() ? [valor] : [];
  }

  if (Array.isArray(valor)) {
    return valor.flatMap((item) => extrairMensagens(item));
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
    extrairMensagens(objeto[campo])
  );

  if (mensagensConhecidas.length > 0) {
    return mensagensConhecidas;
  }

  return Object.entries(objeto).flatMap(([campo, mensagem]) =>
    extrairMensagens(mensagem).map((texto) => `${campo}: ${texto}`)
  );
}
