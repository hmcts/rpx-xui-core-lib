import { Component, importProvidersFrom } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { bootstrapApplication } from '@angular/platform-browser';
import { of, Subject } from 'rxjs';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { FindAPersonService, FindPersonModule, Person, PersonRole } from '@hmcts/rpx-xui-core-lib/ui/find-person';

const requests: Subject<Person[]>[] = [];
declare global { interface Window { reuseProbe: { requestCount(): number } } }
window.reuseProbe = { requestCount: () => requests.length };
@Component({
  selector: 'core-reuse-person-host',
  imports: [FindPersonModule],
  template: `<main><h1>Retained control</h1>
    @if (visible) {
      <xuilib-find-person idValue="reuse" [domain]="role" [findPersonGroup]="group" selectedPerson="different initial value" (personSelected)="onSelected($event)"></xuilib-find-person>
    }
    <button type="button" (click)="visible = !visible">Toggle component</button>
    <button type="button" (click)="control.disable({emitEvent: false})">Disable control</button>
    <button type="button" (click)="control.enable({emitEvent: false})">Enable control</button>
    <p data-testid="value">{{control.value}}</p>
    <p data-testid="disabled">{{control.disabled}}</p>
    <p data-testid="required">{{control.hasValidator(required)}}</p>
    <p data-testid="clears">{{clears}}</p>
  </main>`
})
class ReusePersonHost {
  readonly required = Validators.required;
  readonly control = new FormControl('retained', this.required);
  readonly group = new FormGroup({findPersonControl: this.control});
  readonly role = PersonRole.ADMIN;
  visible = true;
  clears = 0;
  onSelected(person: Person | null) { if (!person) this.clears++; }
}
export function startReusePersonHost() {
  return bootstrapApplication(ReusePersonHost, { providers: [
    importProvidersFrom(RpxTranslationModule.forRoot({baseUrl:'/translations', debounceTimeMs:20, validity:{days:1}, testMode:false})),
    {provide:FindAPersonService, useValue:{find:() => of([]), findCaseworkers:() => { const request = new Subject<Person[]>(); requests.push(request); return request; }}}
  ] });
}
