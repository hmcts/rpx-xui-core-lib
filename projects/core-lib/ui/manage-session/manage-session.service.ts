import { Injectable } from '@angular/core';
import { DocumentInterruptSource, Idle } from '@ng-idle/core';
import { Keepalive } from '@ng-idle/keepalive';
import { delay, distinctUntilChanged, map, Observable, Subject } from 'rxjs';

export interface IdleConfigModel {
  timeout: number;
  idleMilliseconds: number;
  keepAliveInSeconds: number;
  idleServiceName?: string;
}

export interface ManageSessionEvent {
  type: 'modal' | 'signout' | 'keepalive';
  countdown?: string;
  isVisible?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ManageSessionServices {
  private readonly appStateEmitter = new Subject<ManageSessionEvent>();

  constructor(
    private readonly idle: Idle,
    private readonly keepalive: Keepalive
  ) {}

  public init(idleConfig: IdleConfigModel): void {
    this.idle.setIdleName(idleConfig.idleServiceName);
    this.idle.setTimeout(idleConfig.timeout);
    this.idle.setInterrupts([
      new DocumentInterruptSource('mousedown keydown DOMMouseScroll mousewheel touchstart touchmove scroll')
    ]);

    this.idle.onIdleEnd.pipe(delay(250)).subscribe(() => {
      this.appStateEmitter.next({ type: 'modal', countdown: undefined, isVisible: false });
    });
    this.idle.onTimeout.subscribe(() => {
      this.appStateEmitter.next({ type: 'signout' });
    });
    this.idle.onTimeoutWarning.pipe(
      map(seconds => seconds > 60 ? `${Math.ceil(seconds / 60)} minutes` : `${seconds} seconds`),
      distinctUntilChanged()
    ).subscribe(countdown => {
      this.appStateEmitter.next({ type: 'modal', countdown, isVisible: true });
    });

    this.keepalive.interval(idleConfig.keepAliveInSeconds);
    this.keepalive.onPing.subscribe(() => {
      this.appStateEmitter.next({ type: 'keepalive' });
    });
    const idleInSeconds = Math.floor(idleConfig.idleMilliseconds / 1000) - idleConfig.timeout;
    this.idle.setIdle(idleInSeconds);
    this.idle.watch();
  }

  public appStateChanges(): Observable<ManageSessionEvent> {
    return this.appStateEmitter.asObservable();
  }
}
