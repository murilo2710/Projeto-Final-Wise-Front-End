import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-edit-modal',
  templateUrl: './edit-modal.html',
  styleUrl: './edit-modal.css'
})
export class EditModalComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() loading = false;

  @Output() closeModal = new EventEmitter<void>();

  protected fechar(): void {
    if (!this.loading) {
      this.closeModal.emit();
    }
  }
}
