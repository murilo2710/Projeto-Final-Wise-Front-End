import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();
  const tipoToken = authService.getTipoToken() || 'Bearer';
  const isAuthRequest = request.url.includes('/api/auth/');

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
        authService.limparSessao();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};
