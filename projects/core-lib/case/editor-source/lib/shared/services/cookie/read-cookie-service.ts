
import { Inject, Injectable, DOCUMENT } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ReadCookieService {
  private readonly document?: Document;

  // Preserve the Toolkit constructor type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(@Inject(DOCUMENT) doc?: any) {
    this.document = doc as Document;
  }

  public getCookie(key: string): string {
    const cookieValue = this.document.cookie
      .split('; ')
      .find(row => row.startsWith(`${key}=`))
      .split('=')[1];
    return cookieValue;
  }
}
