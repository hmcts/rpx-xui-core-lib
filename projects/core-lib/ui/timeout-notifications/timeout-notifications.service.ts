import { Injectable } from '@angular/core';
import { DocumentInterruptSource, Idle, WindowInterruptSource } from '@ng-idle/core';
import { Keepalive } from '@ng-idle/keepalive';
import { distinctUntilChanged, map, Observable, Subject, Subscription } from 'rxjs';

export interface TimeoutNotificationConfig {
  idleModalDisplayTime: number;
  totalIdleTime: number;
  idleServiceName?: string;
  keepAliveInSeconds?: number;
}

export interface TimeoutNotificationEvent {
  eventType: 'sign-out' | 'countdown' | 'keep-alive';
  readableCountdown?: string;
}

@Injectable({ providedIn: 'root' })
export class TimeoutNotificationsService {
  private readonly subs: Subscription[] = [];
  private readonly eventEmitter = new Subject<TimeoutNotificationEvent>();

  constructor(
    private readonly idle: Idle,
    private readonly keepalive: Keepalive
  ) {}

  public millisecondsToSeconds = (milliseconds: number): number => milliseconds / 1000;

  public initialise(config: TimeoutNotificationConfig): void {
    const documentInterrupts = 'mousedown keydown DOMMouseScroll mousewheel touchstart touchmove scroll';
    const { idleServiceName, idleModalDisplayTime, totalIdleTime } = config;
    const idleModalDisplayTimeInSeconds = this.millisecondsToSeconds(idleModalDisplayTime);
    const totalIdleTimeInSeconds = this.millisecondsToSeconds(totalIdleTime);

    this.idle.setIdleName(idleServiceName);
    this.idle.setTimeout(idleModalDisplayTimeInSeconds);
    this.idle.setInterrupts([
      new DocumentInterruptSource(documentInterrupts),
      new WindowInterruptSource(documentInterrupts)
    ]);

    this.subs.push(
      this.idle.onTimeout.subscribe(() => {
        this.eventEmitter.next({ eventType: 'sign-out' });
      }),
      this.idle.onTimeoutWarning.pipe(
        map(seconds => seconds > 60 ? `${Math.ceil(seconds / 60)} minutes` : `${seconds} seconds`),
        distinctUntilChanged()
      ).subscribe(readableCountdown => {
        this.eventEmitter.next({ eventType: 'countdown', readableCountdown });
      }),
      this.idle.onIdleStart.subscribe(() => console.log('You\'ve gone idle!')),
      this.idle.onIdleEnd.subscribe(() => console.log('You\'re no longer idle!')),
    );

    this.keepalive.interval(config.keepAliveInSeconds || 600);
    this.subs.push(this.keepalive.onPing.subscribe(() => {
      this.eventEmitter.next({ eventType: 'keep-alive' });
    }));

    const idleInSeconds = Math.floor(totalIdleTimeInSeconds) - idleModalDisplayTimeInSeconds;
    this.idle.setIdle(idleInSeconds);
    this.idle.watch();
  }

  public reset(): void {
    this.idle.watch();
  }

  public close(): void {
    this.subs.forEach(subscription => subscription.unsubscribe());
    this.idle.stop();
    this.idle.clearInterrupts();
  }

  public notificationOnChange(): Observable<TimeoutNotificationEvent> {
    return this.eventEmitter.asObservable();
  }
}
