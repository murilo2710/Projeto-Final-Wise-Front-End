import { Component, inject } from '@angular/core';

import { NotificacaoToastService } from '../../services/notificacao-toast.service';

@Component({
  selector: 'app-notificacao-toasts',
  templateUrl: './notificacao-toasts.html',
  styleUrl: './notificacao-toasts.css'
})
export class NotificacaoToastsComponent {
  protected readonly toastService = inject(NotificacaoToastService);
}
