import { Component, Input } from '@angular/core';

export interface SubNavigation {
  text: string;
  href: string;
  active: boolean;
  total?: number;
  roundel?: number;
}

@Component({
  selector: 'xuilib-hmcts-sub-navigation',
  styleUrls: ['./hmcts-sub-navigation.component.scss'],
  templateUrl: './hmcts-sub-navigation.component.html',
  standalone: false,
})
export class HmctsSubNavigationComponent {
  @Input() label = '';
  @Input() items: SubNavigation[] | null = null;
}
