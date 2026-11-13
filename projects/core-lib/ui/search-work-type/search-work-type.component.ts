import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { defer, Observable, of, timer } from 'rxjs';
import { catchError, map, startWith, switchMap, tap } from 'rxjs/operators';
import type { FilterFieldConfig } from '@hmcts/rpx-xui-core-lib/ui/search-location';
import { TaskService, type WorkType } from '@hmcts/rpx-xui-core-lib/ui/task-data';

@Component({
  selector: 'exui-search-work-type',
  templateUrl: './search-work-type.component.html',
  styleUrls: ['./search-work-type.component.scss'],
  standalone: false
})
export class SearchWorkTypeComponent implements OnInit {
  @Input() public label = 'Search for a work type by name';
  @Input() public showLabel = true;
  @Input() public form: FormGroup;
  @Input() public field: FilterFieldConfig;
  @Input() public disabled: boolean = null;
  @Input() public singleMode: boolean = false;
  @Input() public workType: string = '';
  @Input() public serviceIds: string = '';
  @Input() public submitted?: boolean = true;
  @Input() public selectedWorkTypes: WorkType[] = [];
  @Input() public delay?: number = 500;
  @Output() public workTypeSelected = new EventEmitter<WorkType>();
  @Output() public workTypeTermSearchInputChanged: EventEmitter<string> = new EventEmitter<string>();
  @Output() public searchWorkTypeChanged: EventEmitter<void> = new EventEmitter<void>();
  public searchTermFormControl = new FormControl('');
  public readonly minSearchCharacters = 3;
  public term: string = '';
  private pReset: boolean = true;
  public filteredList$: Observable<WorkType[] | null>;
  public lookupFailed = false;
  private readonly debounceTimeInput = 300;
  public previousValue = '';

  public get reset(): boolean {
    return this.pReset;
  }

  @Input()
  public set reset(value: boolean) {
    this.pReset = value;
    this.resetSearchTerm();
  }

  constructor(private readonly taskService: TaskService) { }

  public ngOnInit(): void {
    const cachedService = Boolean(this.field && this.field.servicesField);
    this.filteredList$ = this.searchTermFormControl.valueChanges.pipe(
      tap(term => { this.lookupFailed = false; this.workTypeTermSearchInputChanged.emit(term); }),
      switchMap((term: string) => (cachedService ? of(term) : timer(this.debounceTimeInput).pipe(map(() => term))).pipe(
        switchMap(value => value && (cachedService || value.length >= this.minSearchCharacters)
          ? defer(() => this.taskService.searchWorkTypes(value)).pipe(
            map(workTypes => this.filterUnselectedWorkTypes(workTypes, this.selectedWorkTypes, this.singleMode)),
            catchError(() => { this.lookupFailed = true; return of(null); })
          )
          : of(null)),
        startWith(null)
      ))
    );
  }

  public onSelectedWorkType(workType: WorkType): void {
    this.searchTermFormControl.patchValue(workType.label);
    this.workTypeSelected.emit(workType);
  }

  public onInput(): void {
    this.searchWorkTypeChanged.emit();
  }

  public resetSearchTerm(): void {
    this.searchTermFormControl.setValue('');
  }

  private filterUnselectedWorkTypes(
    workTypes: WorkType[],
    selectedWorkTypes: WorkType[],
    singleMode: boolean
  ): WorkType[] {
    if (singleMode) {
      return workTypes;
    }
    return workTypes.filter(
      workType => !selectedWorkTypes.map(selectedWorkType => selectedWorkType.key).includes(workType.key)
    );
  }

  public removeInvalidString(formInputValue: KeyboardEvent) {
    if (!this.isCharacterValid(formInputValue)) {
      formInputValue.preventDefault();
    }
  }

  public isCharacterValid(event: KeyboardEvent): boolean {
    let pressed = undefined
    if (event.key !== undefined) {
      pressed = event.key;
      if (pressed.length > 1) {
        switch (pressed) {
          case 'Tab':
            return true;
          case 'ArrowRight':
            return true;
          case 'ArrowLeft':
            return true;
          case 'Backspace':
            return true;
          case 'Enter':
            return true;
          default: return false;
        }
      }
    } else if (event.keyCode !== undefined) {
      pressed = String.fromCharCode(event.keyCode);
    }
    return pressed && (/[a-zA-Z \s'-]/).test(pressed);
  }

}
