import { Component, importProvidersFrom } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { bootstrapApplication } from '@angular/platform-browser';
import { of, Subject } from 'rxjs';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { FindAPersonService, FindPersonModule, Person, PersonRole } from '@hmcts/rpx-xui-core-lib/ui/find-person';

const pending: Subject<Person[]>[] = [];
declare global { interface Window { personHarness: { count(): number; answer(index: number, people: Person[]): void } } }
window.personHarness = { count: () => pending.length, answer: (index, people) => pending[index].next(people) };
@Component({
  selector: 'core-find-person-host',
  imports: [FindPersonModule],
  template: `<main><h1>Find person</h1>
    <xuilib-find-person [idValue]="firstId" [submitted]="false" [subTitle]="hint" [domain]="role" [findPersonGroup]="first" (personSelected)="select($event)"></xuilib-find-person>
    <xuilib-find-person idValue="second" [subTitle]="hint" [domain]="role" [findPersonGroup]="second"></xuilib-find-person>
    <xuilib-find-person title="First default" [subTitle]="hint" [domain]="role" [findPersonGroup]="third"></xuilib-find-person>
    @if (!singleDefault) { <xuilib-find-person title="Second default" [subTitle]="hint" [domain]="role" [findPersonGroup]="fourth"></xuilib-find-person> }
    <a [href]="singleDefault ? '/find-person?unique#inputSelectPerson' : '/find-person#inputSelectPerson'">Go to default person</a>
    <button type="button" (click)="translation.language = 'cy'">Welsh</button>
    <button type="button" (click)="translation.language = 'en'">English</button>
    <button type="button" (click)="firstId = 'renamed'">Change first ID</button>
    <button type="button" (click)="markChildren()">Mark children invalid</button>
    <button type="button" (click)="markErrors()">Show errors</button>
    <button type="button" (click)="clearErrors()">Clear errors</button>
    <button type="button" (click)="hint = ''">Hide hints</button>
    <p data-testid="selected">{{selected}}</p>
  </main>`
})
class FindPersonGallery {
  constructor(public translation: RpxTranslationService) {}
  readonly first = new FormGroup({});
  readonly second = new FormGroup({});
  readonly third = new FormGroup({});
  readonly fourth = new FormGroup({});
  readonly singleDefault = new URLSearchParams(window.location.search).has('unique');
  firstId = "first";
  hint = "Type the name of the person and select them.";
  markChildren() { for (const group of [this.first, this.second, this.third, this.fourth]) group.get("findPersonControl")?.setErrors({ required: true }); }
  markErrors() { for (const group of [this.first, this.second, this.third, this.fourth]) group.setErrors({ error: "Example error" }); }
  clearErrors() { for (const group of [this.first, this.second, this.third, this.fourth]) group.setErrors(null); }
  readonly role = PersonRole.ADMIN;
  selected = '';
  select(person: Person | null) { this.selected = person?.name ?? ''; }
}
export function startFindPersonGallery() {
  return bootstrapApplication(FindPersonGallery, { providers: [
    importProvidersFrom(RpxTranslationModule.forRoot({baseUrl:'/translations', debounceTimeMs:20, validity:{days:1}, testMode:false})),
    {provide:FindAPersonService, useValue:{find:() => of([]), findCaseworkers:() => { const result = new Subject<Person[]>(); pending.push(result); return result; }}}
  ] });
}
