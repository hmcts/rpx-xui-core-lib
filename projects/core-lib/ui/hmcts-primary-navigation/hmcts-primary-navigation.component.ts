import { Component, Input } from '@angular/core';

@Component({
  selector: 'xuilib-hmcts-primary-navigation',
  templateUrl: './hmcts-primary-navigation.component.html',
  styleUrls: ['./hmcts-primary-navigation.component.scss'],
  standalone: false,
})
export class HmctsPrimaryNavigationComponent {
  @Input() set userLoggedIn(value: boolean | null | undefined) {
    this.isUserLoggedIn = value;
  }

  @Input() label: string | undefined;
  @Input() items: { active: boolean; href: string; text: string }[] | null | undefined;
  @Input() isBrandedHeader = false;

  isUserLoggedIn: boolean | null | undefined;
}
