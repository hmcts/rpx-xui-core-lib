import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable()
export class ErrorNotifierService {
  // Preserve the Toolkit public notification contract until consumer migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public errorSource:  Subject<any> = new BehaviorSubject(null);
  public error = this.errorSource.asObservable();

  // Preserve the Toolkit public notification contract until consumer migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public announceError(error: any) {
    this.errorSource.next(error);
  }
}
