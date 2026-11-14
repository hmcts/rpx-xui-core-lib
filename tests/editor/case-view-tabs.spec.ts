import { Subject } from 'rxjs';
import { AlertService } from '../../projects/core-lib/case/editor-source/lib/shared/services/alert/alert.service';
import { CaseViewComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-viewer/case-view/case-view.component';
import { SimpleChange } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { EventTriggerComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/event-trigger/event-trigger.component';
import { CaseResolver } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-viewer/services/case.resolver';
import { PUI_CASE_MANAGER } from '../../projects/core-lib/case/editor-source/lib/shared/utils';
import { of } from 'rxjs';
import { CaseFullAccessViewComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-viewer/case-full-access-view/case-full-access-view.component';

export const registered = true;

describe('Case view tabs migration contract', () => {
  it('selects a URL fragment by label and scrolls the selected tab into view', () => {
    const component = Object.create(CaseFullAccessViewComponent.prototype);
    const scroll = jasmine.createSpy('scroll');
    const realign = jasmine.createSpy('realign');
    component.location = { path: () => '/cases/1#Roles%20and%20Access' };
    component.zone = { onStable: of(undefined) };
    component.tabGroup = {
      _tabs: { toArray: () => ['One', 'Two', 'Three', 'Four', 'Five', 'Roles and Access'].map(textLabel => ({ textLabel })) },
      _tabHeader: { _scrollToLabel: scroll }, realignInkBar: realign, selectedIndex: 0
    };
    component.organiseTabPosition();
    expect(component.selectedTabIndex).toBe(5);
    expect(component.tabGroup.selectedIndex).toBe(5);
    expect(scroll).toHaveBeenCalledOnceWith(5);
    expect(realign).toHaveBeenCalled();
  });
});

describe('Case resolver fallback migration contract', () => {
  it('routes restricted and missing cases without emitting a case', () => {
    const resolver = Object.create(CaseResolver.prototype);
    const navigate = jasmine.createSpy('navigate');
    resolver.router = { navigate };
    resolver.previousUrl = '/cases';
    const results: unknown[] = [];
    resolver.processErrorInCaseFetch({ status: 403 }, '123').subscribe((value: unknown) => results.push(value));
    expect(navigate).toHaveBeenCalledWith(['/cases/restricted-case-access/123']);
    resolver.processErrorInCaseFetch({ status: 404 }, '123').subscribe((value: unknown) => results.push(value));
    expect(navigate).toHaveBeenCalledWith(['/search/noresults']);
    expect(results).toEqual([null, null]);
  });
  it('prioritises case manager roles and falls back safely for malformed user details', () => {
    const resolver = Object.create(CaseResolver.prototype);
    const navigate = jasmine.createSpy('navigate');
    let stored = '';
    resolver.router = { navigate };
    resolver.sessionStorage = { getItem: () => stored };
    stored = JSON.stringify({ roles: ['caseworker-civil'] });
    resolver.goToDefaultPage();
    expect(navigate).toHaveBeenCalledWith(['/work/my-work/list']);
    stored = JSON.stringify({ roles: ['caseworker-civil', PUI_CASE_MANAGER] });
    resolver.goToDefaultPage();
    expect(navigate).toHaveBeenCalledWith(['/cases']);
    navigate.calls.reset();
    stored = '{';
    resolver.goToDefaultPage();
    expect(navigate).toHaveBeenCalledOnceWith(['/cases']);
  });
});

describe('Event trigger migration contract', () => {
  it('filters hidden triggers and selects the sole remaining event', () => {
    type Dependencies = ConstructorParameters<typeof EventTriggerComponent>;
    const component = new EventTriggerComponent(
      { getEventsToHide: () => ['hidden'] } as unknown as Dependencies[0],
      new FormBuilder(),
      { sort: (items: unknown[]) => items } as unknown as Dependencies[2]
    );
    const visible = { id: 'visible', name: 'Visible' };
    component.triggers = [visible, { id: 'hidden', name: 'Hidden' }] as typeof component.triggers;
    component.ngOnChanges({ triggers: new SimpleChange(undefined, component.triggers, true) });
    expect(component.triggers).toEqual([visible] as typeof component.triggers);
    expect(component.triggerForm.get('trigger').value).toEqual(visible);
    expect(component.triggerForm.valid).toBeTrue();
  });
});

describe('Case view alert migration contract', () => {
  it('shows a safe message for a case lookup failure and suppresses access errors', () => {
    const alerts = new AlertService({ events: new Subject(), url: '/case' } as unknown as ConstructorParameters<typeof AlertService>[0], { getTranslation$: (value: string) => of(value) } as unknown as ConstructorParameters<typeof AlertService>[1]);
    const messages: unknown[] = [];
    const subscription = alerts.errors.subscribe(alert => messages.push(alert.message));
    const component = Object.create(CaseViewComponent.prototype);
    component.alertService = alerts;
    component.checkErrorGettingCaseView({ status: 500, message: 'Lookup failed' });
    component.checkErrorGettingCaseView({ status: 401, message: 'Unauthorised' });
    component.checkErrorGettingCaseView({ status: 403, message: 'Forbidden' });
    expect(messages).toEqual(['Unable to load case details. Please try again.']);
    subscription.unsubscribe();
  });
});
