import { Injectable, signal } from '@angular/core';

export type TipoToast = 'SUCESSO' | 'INFO' | 'ALERTA';

export interface NotificacaoToast {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: TipoToast;
  dataCriacao?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacaoToastService {
  readonly notificacoes = signal<NotificacaoToast[]>([]);
  private proximoId = 1;

  mostrar(notificacao: Omit<NotificacaoToast, 'id'>): void {
    const id = this.proximoId++;

    this.notificacoes.update((notificacoes) => [
      {
        id,
        ...notificacao
      },
      ...notificacoes
    ]);

    window.setTimeout(() => this.remover(id), 6000);
  }

  remover(id: number): void {
    this.notificacoes.update((notificacoes) =>
      notificacoes.filter((notificacao) => notificacao.id !== id)
    );
  }
}
