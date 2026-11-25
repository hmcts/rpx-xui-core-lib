import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'xuilib-tc-confirm',
  templateUrl: './tc-confirm.component.html',
  standalone: false,
})
export class TcConfirmComponent {
  @Input() public buttonText!: string;
  @Output() public confirm = new EventEmitter<void>();

  public onClick(): void {
    this.confirm.emit();
  }
}
