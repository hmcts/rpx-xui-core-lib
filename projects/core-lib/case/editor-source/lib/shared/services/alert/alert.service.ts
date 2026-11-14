import { Injectable } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { ConnectableObservable, Observable, Observer, Subscription } from 'rxjs';
import { publish, refCount } from 'rxjs/operators';
import { AlertLevel } from '../../domain/alert/alert-level.model';
import { AlertStatusParams } from '../../domain/alert/alert-status-params.model';
import { Alert } from '../../domain/alert/alert.model';

@Injectable()
export class AlertService {
  // the preserved messages
  public preservedError = '';
  public preservedWarning = '';
  public preservedSuccess = '';

  // TODO: Remove
  public message: string;
  public level: AlertLevel;

  public successes: ConnectableObservable<Alert>;
  public errors: ConnectableObservable<Alert>;
  public warnings: ConnectableObservable<Alert>;
  // TODO: Remove
  public alerts: ConnectableObservable<Alert>;

  private successObserver: Observer<Alert>;
  private errorObserver: Observer<Alert>;
  private errorTranslationSubscription?: Subscription;
  private warningObserver: Observer<Alert>;
  // TODO: Remove
  private alertObserver: Observer<Alert>;

  private preserveAlerts = false;

  constructor(private readonly router: Router, private readonly rpxTranslationService: RpxTranslationService) {

    this.successes = Observable
      .create((observer: Observer<Alert>) => this.successObserver = observer).pipe(
        publish(),
        refCount()
      );
    this.successes.subscribe();

    this.errors = Observable
      .create((observer: Observer<Alert>) => this.errorObserver = observer).pipe(
        publish(),
        refCount()
      );
    this.errors.subscribe();

    this.warnings = Observable
      .create((observer: Observer<Alert>) => this.warningObserver = observer).pipe(
        publish(),
        refCount()
      );
    this.warnings.subscribe();

    // TODO: Remove
    this.alerts = Observable
      .create((observer: Observer<Alert>) => this.alertObserver = observer).pipe(
        publish(),
        refCount()
      );
    this.alerts.subscribe();

    this.router
      .events
      .subscribe(event => {
        if (event instanceof NavigationStart) {
          // if there is no longer a preserve alerts setting for the page then clear all observers and preserved messages
          if (!this.preserveAlerts) {
            this.clear();
          }
          // if not, then set the preserving of alerts to false so rendering to a new page
          this.preserveAlerts = false;
        }
      });
  }

  public clear(): void {
    this.errorTranslationSubscription?.unsubscribe();
    this.successObserver.next(null);
    this.errorObserver.next(null);
    this.warningObserver.next(null);
    this.preservedError = '';
    this.preservedWarning = '';
    this.preservedSuccess = '';

    // EUI-3381.
    this.alertObserver.next(null);
    this.message = '';
  }

  public error({ phrase, replacements}: Omit<AlertStatusParams, 'preserve'>): void {
    this.errorTranslationSubscription?.unsubscribe();
    const translation = replacements
      ? this.rpxTranslationService.getTranslationWithReplacements$(phrase, replacements)
      : this.rpxTranslationService.getTranslation$(phrase);
    const subscription = new Subscription();
    const preserveOnCreation = this.preserveAlerts;
    this.errorTranslationSubscription = subscription;
    subscription.add(translation.subscribe(message => {
      this.preservedError = preserveOnCreation ? message : this.preserveMessages(message);
      const alert: Alert = { level: 'error', message };
      this.errorObserver.next(alert);
      if (!subscription.closed) this.push(alert);
    }));
  }

  public warning({ phrase, replacements}: Omit<AlertStatusParams, 'preserve'>): void {
    this.errorTranslationSubscription?.unsubscribe();
    const message = this.getTranslationWithReplacements(phrase, replacements);

    this.preservedWarning = this.preserveMessages(message);
    const alert: Alert = { level: 'warning', message };
    this.warningObserver.next(alert);

    // EUI-3381.
    this.push(alert);
  }

  public success({ preserve, phrase, replacements}: AlertStatusParams): void {
    this.errorTranslationSubscription?.unsubscribe();
    const message = this.getTranslationWithReplacements(phrase, replacements);

    this.preserveAlerts = preserve || this.preserveAlerts;
    const alert: Alert = { level: 'success', message };
    this.preservedSuccess = this.preserveMessages(message);
    this.successObserver.next(alert);

    // EUI-3381.
    this.push(alert);
  }

  private getTranslationWithReplacements(phrase: string, replacements: AlertStatusParams['replacements']): string {
    let message: string;
    if (replacements) {
      this.rpxTranslationService.getTranslationWithReplacements$(phrase, replacements).subscribe(translation => {
        message = translation;
      });
    } else {
      this.rpxTranslationService.getTranslation$(phrase).subscribe(translation => {
        message = translation;
      });
    }

    return message;
  }

  public setPreserveAlerts(preserve: boolean, urlInfo?: string[]) {
    // if there is no url setting then just preserve the messages
    if (!urlInfo) {
      this.preserveAlerts = preserve;
    } else {
      // check if the url includes the sting given
      this.preserveAlerts = this.currentUrlIncludesInfo(preserve, urlInfo);
    }
  }

  public currentUrlIncludesInfo(preserve: boolean, urlInfo: string[]): boolean {
    // loop through the list of strings and check the router includes all of them
    for (const urlSnip of urlInfo) {
      if (!this.router.url.includes(urlSnip)) {
        // return the opposite boolean value if the router does not include one of the strings
        return !preserve;
      }
    }
    // return the boolean value if all strings are in the url
    return preserve;
  }

  public isPreserveAlerts(): boolean {
    return this.preserveAlerts;
  }

  public preserveMessages(message: string): string {
    // preserve the messages if set to preserve them
    if (this.isPreserveAlerts()) {
      return message;
    } else {
      return '';
    }
  }

  // TODO: Remove
  public push(msgObject: Alert) {
    this.message = msgObject.message;
    this.level = msgObject.level;

    this.alertObserver.next({
      level: this.level,
      message: this.message
    });
  }
}
