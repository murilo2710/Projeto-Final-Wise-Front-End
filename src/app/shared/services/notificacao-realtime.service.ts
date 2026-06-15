import { Injectable, effect, inject } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

import { AuthService } from '../../services/auth.service';
import { NotificacaoToastService, TipoToast } from './notificacao-toast.service';

interface NotificacaoRealtimePayload {
  titulo: string;
  mensagem: string;
  tipo: TipoToast;
  recurso: string;
  recursoId: number | null;
  dataCriacao: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificacaoRealtimeService {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(NotificacaoToastService);
  private client?: Client;
  private tokenConectado = '';

  constructor() {
    effect(() => {
      const usuario = this.authService.usuario();
      const token = this.authService.getToken();

      if (!usuario || !token) {
        this.desconectar();
        return;
      }

      if (this.client?.active && this.tokenConectado === token) {
        return;
      }

      this.conectar(token);
    });
  }

  desconectar(): void {
    this.tokenConectado = '';

    if (this.client?.active) {
      void this.client.deactivate();
    }

    this.client = undefined;
  }

  private conectar(token: string): void {
    this.desconectar();
    this.tokenConectado = token;

    this.client = new Client({
      connectHeaders: {
        Authorization: `${this.authService.getTipoToken()} ${token}`
      },
      reconnectDelay: 5000,
      webSocketFactory: () => new SockJS('/ws') as WebSocket,
      onConnect: () => {
        this.client?.subscribe('/topic/notificacoes', (message) => this.receberMensagem(message));
      },
      onStompError: (frame) => {
        console.error('Erro STOMP nas notificacoes:', frame.headers['message'], frame.body);
      },
      onWebSocketError: (error) => {
        console.error('Erro WebSocket nas notificacoes:', error);
      }
    });

    this.client.activate();
  }

  private receberMensagem(message: IMessage): void {
    try {
      const payload = JSON.parse(message.body) as NotificacaoRealtimePayload;

      this.toastService.mostrar({
        titulo: payload.titulo,
        mensagem: payload.mensagem,
        tipo: this.normalizarTipo(payload.tipo),
        dataCriacao: payload.dataCriacao
      });
    } catch (error) {
      console.error('Nao foi possivel ler notificacao em tempo real:', error);
    }
  }

  private normalizarTipo(tipo: string): TipoToast {
    return tipo === 'SUCESSO' || tipo === 'ALERTA' ? tipo : 'INFO';
  }
}
