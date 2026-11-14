import { EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { AlertService } from '../../../services/alert/alert.service';
import { Task } from '../../../domain/work-allocation/Task';
import { SessionStorageService } from '../../../services/session/session-storage.service';
import { WorkAllocationService } from '../services/work-allocation.service';

export interface EventCompletionComponentEmitter {
  eventCanBeCompleted: EventEmitter<boolean>;
  // Preserve the Toolkit contract until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setTaskState(taskState: number): any;
}

export interface EventCompletionStateMachineContext {
  task: Task;
  caseId: string;
  eventId: string;
  reassignedTask: Task;
  router: Router;
  route: ActivatedRoute;
  sessionStorageService: SessionStorageService;
  workAllocationService: WorkAllocationService;
  alertService: AlertService;
  canBeCompleted: boolean;
  component: EventCompletionComponentEmitter;
}
