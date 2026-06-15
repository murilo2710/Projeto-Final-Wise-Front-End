import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NotificacaoToastsComponent } from './shared/components/notificacao-toasts/notificacao-toasts';
import { NotificacaoRealtimeService } from './shared/services/notificacao-realtime.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificacaoToastsComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly notificacaoRealtimeService = inject(NotificacaoRealtimeService);
  protected readonly title = signal('Projeto-Final-Wise-Front-End');
}
