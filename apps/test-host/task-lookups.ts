import { CommonModule } from '@angular/common';
import { Component, importProvidersFrom, ViewChild } from '@angular/core';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { bootstrapApplication } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';
import { TaskService } from '@hmcts/rpx-xui-core-lib/ui/task-data';
import { FindTaskNameComponent, FindTaskNameModule } from '@hmcts/rpx-xui-core-lib/ui/find-task-name';
import { SearchWorkTypeModule } from '@hmcts/rpx-xui-core-lib/ui/search-work-type';
import { FindWorkTypeModule } from '@hmcts/rpx-xui-core-lib/ui/find-work-type';

const tasks: Subject<unknown[]>[] = [];
const workTypes: Subject<unknown[]>[] = [];
declare global { interface Window { lookupHarness: { counts(): number[]; taskOptions(): unknown[]; answerTask(index: number, label: string): void; emptyTask(index: number): void; malformedTask(index: number): void; failTask(index: number): void; answerWork(index: number, label: string): void; failWork(index: number): void } } }
window.lookupHarness = {
  counts: () => [tasks.length, workTypes.length],
  taskOptions: () => [],
  answerTask: (index, label) => tasks[index].next([{ task_type: { task_type_name: label } }]),
  emptyTask: index => tasks[index].next([]),
  malformedTask: index => tasks[index].next([{ taskId: 1, taskName: 'Flat' }]),
  failTask: index => tasks[index].error(new Error('synthetic lookup failure')),
  answerWork: (index, label) => workTypes[index].next([{ key: label, label }]),
  failWork: index => workTypes[index].error(new Error('synthetic lookup failure'))
};
@Component({
  selector: 'core-task-lookups-host',
  imports: [CommonModule, FindTaskNameModule, SearchWorkTypeModule, FindWorkTypeModule],
  template: `<main><h1>Task and work lookups</h1>
    @if (showTask) { <xuilib-find-task-name [services]="taskServices" [findTaskNameGroup]="taskForm" (taskNameSelected)="selectTask($event)"></xuilib-find-task-name> }
    <button type="button" (click)="taskServices = 'B'">Change task service</button>
    @if (retained) { <button type="button" (click)="showTask = !showTask">Toggle task component</button> }
    @if (parentMode) {
      <xuilib-find-work-type [form]="workForm" [fields]="fields" [field]="field" [services]="services"
        [formSubmissionEvent$]="submitEvent" [disabled]="workDisabled"></xuilib-find-work-type>
      <button type="button" (click)="workDisabled = !workDisabled">Toggle work disabled</button>
      <button type="button" (click)="submitEvent.next()">Submit work form</button>
      <pre data-testid="work-form">{{ workForm.value | json }}</pre>
    } @else {
      <label for="inputWorkTypeSearch">Search work types</label>
      <exui-search-work-type [form]="workForm" [field]="field"></exui-search-work-type>
    }
    @if (duplicates) {
      <xuilib-find-task-name [findTaskNameGroup]="secondTaskForm"></xuilib-find-task-name>
      <exui-search-work-type [form]="workForm" [field]="field"></exui-search-work-type>
    }
    <p data-testid="task-selected">{{ taskSelected }}</p>
  </main>`
})
class TaskLookupsGallery {
  @ViewChild(FindTaskNameComponent) taskPicker?: FindTaskNameComponent;
  readonly taskForm: FormGroup = new FormGroup({});
  readonly secondTaskForm = new FormGroup({});
  readonly retained = new URLSearchParams(window.location.search).has('retained');
  readonly parentMode = new URLSearchParams(window.location.search).has('parent');
  readonly duplicates = new URLSearchParams(window.location.search).has('duplicates');
  readonly workForm = new FormGroup({ workTypes: new FormArray([]) });
  readonly submitEvent = new Subject<void>();
  readonly services = ['ia'];
  readonly fields = [{ name: 'services', options: [{ key: 'ia', label: 'IA' }], minSelected: 0, maxSelected: 1, type: 'checkbox' as const }];
  readonly field = { name: 'workTypes', options: [], minSelected: 0, maxSelected: 2, type: 'find-work-type' as const, findLocationField: 'services', servicesField: new URLSearchParams(window.location.search).has('cached') ? 'services' : undefined };
  taskServices = 'IA';
  workDisabled = new URLSearchParams(window.location.search).has('disabled');
  showTask = true;
  taskSelected = '';
  constructor() { if (this.retained) this.taskForm.addControl('findTaskNameControl', new FormControl('Retained', Validators.required)); }
  ngAfterViewInit() { window.lookupHarness.taskOptions = () => this.taskPicker?.filteredOptions ?? []; }
  selectTask(value: { task_type?: { task_type_name: string } } | string) { this.taskSelected = typeof value === 'string' ? value : value?.task_type?.task_type_name ?? ''; }
}
export function startTaskLookupsGallery() {
  return bootstrapApplication(TaskLookupsGallery, { providers: [
    importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false })),
    { provide: TaskService, useValue: {
      getTaskName() { const subject = new Subject<unknown[]>(); tasks.push(subject); return subject; },
      getTaskNameUncached() { const subject = new Subject<unknown[]>(); tasks.push(subject); return subject; },
      searchWorkTypes() { const subject = new Subject<unknown[]>(); workTypes.push(subject); return subject; }
    } }
  ] });
}
