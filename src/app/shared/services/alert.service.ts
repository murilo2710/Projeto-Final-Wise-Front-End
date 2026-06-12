import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  async confirmar(titulo: string, texto: string, textoConfirmar = 'Confirmar'): Promise<boolean> {
    const resultado = await Swal.fire({
      title: titulo,
      text: texto,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: textoConfirmar,
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      customClass: this.getCustomClass(),
      buttonsStyling: false
    });

    return resultado.isConfirmed;
  }

  sucesso(titulo: string, texto?: string): void {
    this.notificar('success', titulo, texto);
  }

  erro(titulo: string, texto?: string): void {
    this.notificar('error', titulo, texto);
  }

  private notificar(icon: SweetAlertIcon, titulo: string, texto?: string): void {
    void Swal.fire({
      title: titulo,
      text: texto,
      icon,
      confirmButtonText: 'OK',
      customClass: this.getCustomClass(),
      buttonsStyling: false
    });
  }

  private getCustomClass() {
    return {
      popup: 'odonto-alert',
      title: 'odonto-alert__title',
      htmlContainer: 'odonto-alert__text',
      confirmButton: 'odonto-alert__button odonto-alert__button--confirm',
      cancelButton: 'odonto-alert__button odonto-alert__button--cancel',
      actions: 'odonto-alert__actions'
    };
  }
}
