import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class NavigationNotifierService {
  // Preserve the Toolkit public notification contract until consumer migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public navigationSource: BehaviorSubject<any> = new BehaviorSubject<any>({});
  public navigation = this.navigationSource.asObservable();

  // Preserve the Toolkit public notification contract until consumer migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public announceNavigation(origin: any) {
    this.navigationSource.next(origin);
  }
}
