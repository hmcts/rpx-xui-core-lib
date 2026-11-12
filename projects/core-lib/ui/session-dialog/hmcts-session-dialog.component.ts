import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
/*
* Gov UK Dialog Component
* Responsible for displaying dialog layout
* using ng-content to display content from parent
* */
@Component({
    selector: 'xuilib-session-dialog',
    templateUrl: './hmcts-session-dialog.component.html',
    styleUrls: ['./hmcts-session-dialog.component.scss'],
    standalone: false
})
export class HmctsSessionDialogComponent implements AfterViewInit, OnDestroy {

  @Input() public positionTop: string;
  @Output() public close = new EventEmitter();
  @ViewChild('sessionDialog', { static: true }) private sessionDialog: ElementRef<HTMLDialogElement>;
  private previousFocus: HTMLElement | null = null;
  constructor() {}

  public ngAfterViewInit(): void {
    if (typeof document !== 'undefined') {
      this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      this.sessionDialog.nativeElement.showModal();
    }
  }

  public ngOnDestroy(): void {
    if (typeof document !== 'undefined') {
      if (this.sessionDialog.nativeElement.open) this.sessionDialog.nativeElement.close();
      if (this.previousFocus?.isConnected) this.previousFocus.focus();
    }
  }

  public onCancel(event: Event): void {
    event.preventDefault();
  }

  public onClose(): void {
    this.close.emit();
  }

}
