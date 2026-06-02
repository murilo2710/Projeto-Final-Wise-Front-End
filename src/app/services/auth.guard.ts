import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService, PerfilUsuario } from './auth.service';

export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.estaLogado()) {
    return router.createUrlTree(['/login']);
  }

  const perfisPermitidos = route.data?.['perfis'] as PerfilUsuario[] | undefined;

  if (perfisPermitidos?.length && !perfisPermitidos.includes(authService.usuario()?.perfil as PerfilUsuario)) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
