import { Injectable } from '@angular/core';
import { Params, Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable()
export class ConvertHrefToRouterService {

  private readonly hrefMarkdownLinkContent = new BehaviorSubject('Default');

  constructor(private readonly router: Router) {}

  public updateHrefLink(content: string): void {
    this.hrefMarkdownLinkContent.next(content);
  }

  public getHrefMarkdownLinkContent(): Observable<string> {
    return this.hrefMarkdownLinkContent.asObservable();
  }

  public callAngularRouter(hrefMarkdownLinkContent: string): void {
    const urls = hrefMarkdownLinkContent.split('?');
    const queryParams = urls[1];
    const queryParamObj: Record<string, string> = {};

    if (queryParams) {
      const queryParam = queryParams.split('&');
      if (queryParam[0]) {
        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < queryParam.length; i++) {
          const param = queryParam[i].split('=');
          queryParamObj[param[0]] = param[1];
        }
      }
    }

    this.router.navigate([urls[0]], {
      queryParams: Object.keys(queryParamObj).length ? queryParamObj : ('' as unknown as Params)
    });
  }
}
