import { ErrorNotifierService } from '../../projects/core-lib/case/editor-source/lib/shared/services/error/error-notifier.service';
import { NavigationNotifierService } from '../../projects/core-lib/case/editor-source/lib/shared/services/navigation/navigation-notifier.service';
import { ActivatedRouteSnapshot, convertToParamMap, NavigationStart } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { AlertService } from '../../projects/core-lib/case/editor-source/lib/shared/services/alert/alert.service';

import { EventTriggerResolver } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-viewer/services/event-trigger.resolver';

export const registered = true;

describe('Editor alert migration contract', () => {
  it('shows the event-trigger failure message and preserves its rejection', async () => {
    const router = { events: new Subject<NavigationStart>(), url: '/cases/case-details/TEST/Type/123', navigate: jasmine.createSpy('navigate') };
    const translations = { getTranslation$: (phrase: string) => of((phrase || '').trim()) };
    const alerts = new AlertService(router as unknown as ConstructorParameters<typeof AlertService>[0], translations as unknown as ConstructorParameters<typeof AlertService>[1]);
    const messages: string[] = [];
    const subscription = alerts.errors.subscribe(alert => { if (alert) messages.push(alert.message); });
    const failure = { status: 503, message: 'Unable to start the synthetic event' };
    const announceError = jasmine.createSpy('announceError');
    type Dependencies = ConstructorParameters<typeof EventTriggerResolver>;
    const resolver = new EventTriggerResolver(
      { getEventTrigger: () => throwError(() => failure) } as unknown as Dependencies[0],
      alerts,
      { get: () => of({}) } as unknown as Dependencies[2],
      { announceProfile: jasmine.createSpy('announceProfile') } as unknown as Dependencies[3],
      router as unknown as Dependencies[4],
      {} as Dependencies[5],
      { announceError } as unknown as Dependencies[6],
      {} as Dependencies[7],
      {} as Dependencies[8]
    );
    const route = {
      parent: { paramMap: convertToParamMap({ jurisdiction: 'TEST', caseType: 'Type', cid: '123' }) },
      paramMap: convertToParamMap({ eid: 'synthetic-event' }),
      queryParamMap: convertToParamMap({}), queryParams: {}, firstChild: null
    } as unknown as ActivatedRouteSnapshot;
    try {
      await expectAsync(resolver.resolve(route)).toBeRejectedWith(failure);
      expect(messages).toEqual([failure.message]);
      expect(alerts.preservedError).toBe(failure.message);
      expect(announceError).toHaveBeenCalledOnceWith(failure);
      expect(router.navigate).not.toHaveBeenCalled();
    } finally {
      subscription.unsubscribe();
      alerts.clear();
    }
  });

  for (const level of ['success', 'warning'] as const) {
    it(`does not replace a newer ${level} with a delayed error translation`, () => {
      const delayed = new Subject<string>();
      const service = new AlertService(
        { events: new Subject(), url: '/case' } as unknown as ConstructorParameters<typeof AlertService>[0],
        { getTranslation$: (value: string) => value === 'error' ? delayed : of(value) } as unknown as ConstructorParameters<typeof AlertService>[1]
      );
      const messages: string[] = [];
      const subscription = service.alerts.subscribe(alert => { if (alert) messages.push(`${alert.level}:${alert.message}`); });
      service.error({ phrase: 'error' });
      service[level]({ phrase: 'newer' });
      delayed.next('late error');
      expect(messages).toEqual([`${level}:newer`]);
      service.clear();
      subscription.unsubscribe();
    });
  }
  it('keeps a preserved error translated after the permitted navigation', () => {
    const events = new Subject<NavigationStart>();
    const translations = new BehaviorSubject('English');
    const service = new AlertService({ events, url: '/case' } as unknown as ConstructorParameters<typeof AlertService>[0], { getTranslation$: () => translations } as unknown as ConstructorParameters<typeof AlertService>[1]);
    service.setPreserveAlerts(true);
    service.error({ phrase: 'Error' });
    expect(service.preservedError).toBe('English');
    events.next(new NavigationStart(1, '/next'));
    translations.next('Welsh test translation');
    expect(service.preservedError).toBe('Welsh test translation');
    events.next(new NavigationStart(2, '/next-again'));
    translations.next('late translation');
    expect(service.preservedError).toBe('');
  });
  it('keeps the newer error active when an error observer replaces it synchronously', () => {
    const first = new BehaviorSubject('first');
    const second = new BehaviorSubject('second');
    const service = new AlertService({ events: new Subject(), url: '/case' } as unknown as ConstructorParameters<typeof AlertService>[0], { getTranslation$: (value: string) => value === 'first' ? first : second } as unknown as ConstructorParameters<typeof AlertService>[1]);
    const messages: string[] = [];
    const legacyMessages: string[] = [];
    const legacySubscription = service.alerts.subscribe(alert => { if (alert) legacyMessages.push(alert.message); });
    const subscription = service.errors.subscribe(alert => {
      if (!alert) return;
      messages.push(alert.message);
      if (alert.message === 'first') service.error({ phrase: 'second' });
    });
    service.error({ phrase: 'first' });
    first.next('stale');
    service.clear();
    second.next('after clear');
    expect(messages).toEqual(['first', 'second']);
    expect(legacyMessages).toEqual(['second']);
    subscription.unsubscribe();
    legacySubscription.unsubscribe();
  });
  it('ignores late translations for a replaced error', () => {
    const first = new Subject<string>();
    const second = new Subject<string>();
    const service = new AlertService({ events: new Subject(), url: '/case' } as unknown as ConstructorParameters<typeof AlertService>[0], { getTranslation$: (value: string) => value === 'first' ? first : second } as unknown as ConstructorParameters<typeof AlertService>[1]);
    const messages: string[] = [];
    const subscription = service.errors.subscribe(alert => { if (alert) messages.push(alert.message); });
    service.error({ phrase: 'first' });
    service.error({ phrase: 'second' });
    second.next('current');
    first.next('stale');
    expect(messages).toEqual(['current']);
    service.clear();
    subscription.unsubscribe();
  });
  it('updates an active error when the translation arrives and stops after navigation clears it', () => {
    const events = new Subject<NavigationStart>();
    const translations = new BehaviorSubject('Unable to load case details. Please try again.');
    const service = new AlertService({ events, url: '/case' } as unknown as ConstructorParameters<typeof AlertService>[0], { getTranslation$: () => translations } as unknown as ConstructorParameters<typeof AlertService>[1]);
    const messages: string[] = [];
    const subscription = service.errors.subscribe(alert => { if (alert) messages.push(alert.message); });
    service.error({ phrase: 'Unable to load case details. Please try again.' });
    translations.next('Welsh test translation');
    expect(messages).toEqual(['Unable to load case details. Please try again.', 'Welsh test translation']);
    events.next(new NavigationStart(1, '/next'));
    translations.next('late translation');
    expect(messages).toEqual(['Unable to load case details. Please try again.', 'Welsh test translation']);
    subscription.unsubscribe();
  });
  it('uses the replacement translation stream for errors and stops it on clear', () => {
    const translations = new Subject<string>();
    const translate = jasmine.createSpy('translate').and.returnValue(translations);
    const service = new AlertService({ events: new Subject(), url: '/case' } as unknown as ConstructorParameters<typeof AlertService>[0], { getTranslationWithReplacements$: translate } as unknown as ConstructorParameters<typeof AlertService>[1]);
    const messages: string[] = [];
    const subscription = service.errors.subscribe(alert => { if (alert) messages.push(alert.message); });
    service.error({ phrase: 'Cannot open {case}', replacements: { case: '123' } });
    expect(translate).toHaveBeenCalledOnceWith('Cannot open {case}', { case: '123' });
    translations.next('Cannot open 123');
    service.clear();
    translations.next('late');
    expect(messages).toEqual(['Cannot open 123']);
    subscription.unsubscribe();
  });
  it('preserves a success through one navigation then clears it on the next', () => {
    const events = new Subject<NavigationStart>();
    const service = new AlertService({ events, url: '/case' } as unknown as ConstructorParameters<typeof AlertService>[0], { getTranslation$: (value: string) => of(value) } as unknown as ConstructorParameters<typeof AlertService>[1]);
    service.success({ phrase: 'Saved', preserve: true });
    expect(service.preservedSuccess).toBe('Saved');
    events.next(new NavigationStart(1, '/next'));
    expect(service.preservedSuccess).toBe('Saved');
    events.next(new NavigationStart(2, '/other'));
    expect(service.preservedSuccess).toBe('');
  });
});

describe('Editor notifier migration contract', () => {
  it('replays the latest error to late subscribers without copying it', () => {
    const notifier = new ErrorNotifierService();
    const error = { status: 503 };
    notifier.announceError(error);
    let received: unknown;
    const subscription = notifier.error.subscribe(value => received = value);
    expect(received).toBe(error);
    subscription.unsubscribe();
  });
  it('replays the latest navigation to late subscribers without copying it', () => {
    const notifier = new NavigationNotifierService();
    const navigation = { action: 'open' };
    notifier.announceNavigation(navigation);
    let received: unknown;
    const subscription = notifier.navigation.subscribe(value => received = value);
    expect(received).toBe(navigation);
    subscription.unsubscribe();
  });
});
