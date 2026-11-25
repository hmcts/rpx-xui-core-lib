import { Component, Input } from '@angular/core';

@Component({
  selector: 'exui-page-wrapper',
  templateUrl: './exui-page-wrapper.component.html',
  styleUrls: ['./exui-page-wrapper.component.scss'],
  standalone: false,
})
export class ExuiPageWrapperComponent {
  @Input() public backLink!: string;
  @Input() public title!: string;
  @Input() public fnTitle!: string;
}
