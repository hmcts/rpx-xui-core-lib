import { Component, EventEmitter, Output } from '@angular/core';
import { AbstractAppConfig } from '../../../../../../../app.config';
import { CaseFileViewOverlayMenuItem } from '../../shared/case-file-view-overlay-menu/case-file-view-overlay-menu-item.model';

@Component({
  selector: "ccd-case-file-view-folder-toggle",
  templateUrl: "./case-file-view-folder-toggle.component.html",
  styleUrls: ["./case-file-view-folder-toggle.component.scss"],
  standalone: false
})
export class CaseFileViewFolderToggleComponent {
  public isOpen = false;

  @Output() public expandAll = new EventEmitter<boolean>();
  @Output() public collapseAll = new EventEmitter<boolean>();

  public overlayMenuItems: CaseFileViewOverlayMenuItem[] = [
    {
      actionText: "Expand All",
      iconSrc: "/assets/img/accordion-plus.png",
      actionFn: () => this.expandAll.emit(true),
    },
    {
      actionText: "Collapse All",
      iconSrc: "/assets/img/accordion-minus.png",
      actionFn: () => this.collapseAll.emit(true),
    },
  ];

  // Keep the Toolkit constructor dependency for Angular injection and existing callers.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_appConfig: AbstractAppConfig) {}
}
