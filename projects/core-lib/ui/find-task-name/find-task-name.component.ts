import {ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {defer, EMPTY, Observable, Subject, Subscription, timer} from 'rxjs';
import {catchError, filter, map, switchMap, takeUntil, tap} from 'rxjs/operators';
import type { PersonRole } from '@hmcts/rpx-xui-core-lib/ui/find-person';
import { TaskService, type TaskNameModel } from '@hmcts/rpx-xui-core-lib/ui/task-data';

const defaultPersonRole: `${PersonRole.ALL}` = 'All';

@Component({
    selector: 'xuilib-find-task-name',
    templateUrl: './find-task-name.component.html',
    styleUrls: ['./find-task-name.component.scss'],
    standalone: false
})

export class FindTaskNameComponent implements OnInit, OnDestroy {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Preserve the published CommonLib public declaration.
  @Output() public taskNameSelected = new EventEmitter<any>();
  @Output() public taskNameFieldChanged = new EventEmitter<void>();
  @Input() public title: string;
  @Input() public boldTitle = 'Find the task name';
  @Input() public subTitle = 'Type the name of the task name and select them.';
  @Input() public domain: PersonRole = defaultPersonRole as PersonRole;
  @Input() public findTaskNameGroup: FormGroup = new FormGroup({});
  @Input() public selectedTaskName: string;
  @Input() public submitted: boolean = true;
  @Input() public assignedUser?: string;
  @Input() public placeholderContent: string = '';
  @Input() public isNoResultsShown: boolean = true;
  @Input() public showUpdatedColor: boolean = false;
  @Input() public selectedTaskNames: TaskNameModel[] = [];
  @Input() public errorMessage: string = 'You must select a name';
  @Input() public idValue: string = '';
  private currentServices = 'IA';
  private readonly servicesChanged = new Subject<void>();
  @Input() public set services(value: string) {
    if (this.currentServices !== value) {
      this.currentServices = value;
      this.servicesChanged.next();
      this.showAutocomplete = false;
      this.lookupFailed = false;
      this.filteredOptions = [];
    }
  }
  public get services(): string { return this.currentServices; }
  @Input() public disabled: boolean = null;
  public showAutocomplete: boolean = false;
  public lookupFailed: boolean = false;
  public findTaskNameControl: FormControl;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Preserve the published CommonLib public declaration.
  public filteredOptions: any[] = [];
  public readonly minSearchCharacters = 1;
  private sub: Subscription;
  private readonly uncachedServices = new Set<string>();
  public searchTerm: string = '';

  constructor(private readonly cd: ChangeDetectorRef, private readonly taskService: TaskService) {}

  public ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  public ngOnInit(): void {
    const existingControl = this.findTaskNameGroup.get('findTaskNameControl');
    this.findTaskNameControl = existingControl instanceof FormControl ? existingControl : new FormControl(this.selectedTaskName);
    this.findTaskNameGroup.addControl('findTaskNameControl', this.findTaskNameControl);
    this.sub = this.findTaskNameControl.valueChanges
    .pipe(
      tap(() => { this.showAutocomplete = false; this.lookupFailed = false; this.filteredOptions = []; }),
      switchMap((searchTerm) => timer(300).pipe(
        tap(() => this.searchTerm = searchTerm),
        tap(() => typeof searchTerm === 'string' ? this.taskNameSelected.emit('null') : void 0),
        filter(() => searchTerm && searchTerm.length >= this.minSearchCharacters),
        switchMap(() => {
          const service = this.services;
          return defer(() => {
            try {
              return this.uncachedServices.has(service) ? this.taskService.getTaskNameUncached(service) : this.getTaskName();
            } catch (error) {
              if (error instanceof SyntaxError) this.uncachedServices.add(service);
              throw error;
            }
          }).pipe(
          map((result) => {
            const records: unknown = result;
            if (!Array.isArray(records) || !records.every((record) =>
              record && typeof record === 'object' && record.task_type && typeof record.task_type.task_type_name === 'string')) {
              this.uncachedServices.add(service);
              throw new TypeError('Invalid task-name response');
            }
            return records.filter((record) => record.task_type.task_type_name.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase()));
          }),
          catchError(() => {
            this.lookupFailed = true;
            this.cd.detectChanges();
            return EMPTY;
          })
        );
        }),
        takeUntil(this.servicesChanged)
      )),
    ).subscribe((taskNameModel: TaskNameModel[]) => {
      this.lookupFailed = false;
      this.showAutocomplete = true;
      this.filteredOptions = taskNameModel;
      this.cd.detectChanges();
    });
  }

  public getTaskName(): Observable<TaskNameModel[]> {
    return this.taskService.getTaskName(this.services);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Preserve the published CommonLib public declaration.
  public onSelectionChange(selectedTaskTypeName: any): void {
    if (selectedTaskTypeName) {
      this.taskNameSelected.emit(selectedTaskTypeName);
      this.findTaskNameControl.setValue(this.getTaskTypeName(selectedTaskTypeName), {emitEvent: false, onlySelf: true});
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Preserve the published CommonLib public declaration.
  public getTaskTypeName(selectedTaskType: any): string {
    if (!selectedTaskType) {
      return '';
    }
    return selectedTaskType.task_type.task_type_name;
  }

  public onInput(): void {
    this.taskNameFieldChanged.emit();
  }
}
