import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import { FindAPersonService, JudicialUserModel } from '@hmcts/rpx-xui-core-lib/ui/find-person';

@Component({
  selector: 'xuilib-search-judicials',
  templateUrl: './search-judicials.component.html',
  styleUrls: ['./search-judicials.component.scss'],
  standalone: false,
})
export class SearchJudicialsComponent implements OnInit, OnDestroy {
  public formGroup: FormGroup;
  @Input() public control: AbstractControl | null = null;
  @Input() public disabled: boolean | null = null;
  @Input() public selectedJudicials: JudicialUserModel[] = [];
  @Input() public submitted = true;
  @Input() public placeholderContent = '';
  @Input() public showAutocomplete = false;
  @Input() public displayedJudicials: JudicialUserModel[] = [];
  @Output() public judicialChanged = new EventEmitter<JudicialUserModel>();
  @Input() public idValue = '';
  @Input() public inputId: string | null = null;
  @Input() public accessibleLabel: string | null = null;
  @Input() public errorMessage = 'You must select a name';
  @Input() public serviceId = '';
  @ViewChild('inputSelection', { read: ElementRef, static: true }) public autoCompleteInputBox!: ElementRef<HTMLInputElement>;
  public selectedJudicial: JudicialUserModel | undefined;
  public readonly keyUpSubject$ = new Subject<string>();
  public searchInProgress = false;
  private readonly minimumSearchCharacters = 3;
  private readonly destroy$ = new Subject<void>();
  private readonly searchRequests$ = new Subject<string | null>();
  private latestSearchTerm = '';

  constructor(private readonly judicialService: FindAPersonService, formBuilder: FormBuilder) {
    this.formGroup = formBuilder.group({
      formControl: [''],
      selectedFormControl: [null],
    });
  }

  public ngOnInit(): void {
    this.displayedJudicials = [];
    if (this.control) {
      this.formGroup.controls.selectedFormControl = this.control;
      this.formGroup.controls.formControl.setValue(this.getControlValueDisplayText(), { emitEvent: false });
      this.control.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.formGroup.controls.formControl.setValue(this.getControlValueDisplayText(), { emitEvent: false });
      });
    }

    this.keyUpSubject$.pipe(debounceTime(500), takeUntil(this.destroy$)).subscribe(value => this.search(value));
    this.searchRequests$.pipe(
      switchMap(term => term
        ? this.searchJudicials(term, this.serviceId).pipe(catchError(() => of([])))
        : of([])),
      takeUntil(this.destroy$),
    ).subscribe(judicials => {
      this.displayedJudicials = judicials.filter(judicial =>
        !this.selectedJudicials.some(selected => selected.idamId === judicial.idamId));
      const exactMatches = this.displayedJudicials.filter(judicial => this.latestSearchTerm === judicial.fullName);
      if (exactMatches.length === 1) {
        const [exactMatch] = exactMatches;
        this.setSelectedValue(exactMatch);
        this.formGroup.controls.formControl.setValue(this.getDisplayName(exactMatch), { emitEvent: false });
        this.displayedJudicials = [];
        this.showAutocomplete = false;
        this.judicialChanged.emit(exactMatch);
      }
      this.searchInProgress = false;
    });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.keyUpSubject$.complete();
    this.searchRequests$.complete();
  }

  public onKeyDown(): void {
    // Keep the source EventEmitter's no-payload keydown notification.
    this.judicialChanged.emit();
  }

  public onKeyUp(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input || typeof input.value !== 'string') return;
    // Cancel the active request at input time, not after the debounce window.
    this.searchRequests$.next(null);
    this.displayedJudicials = [];
    this.searchInProgress = false;
    this.showAutocomplete = false;
    this.keyUpSubject$.next(input.value);
  }

  public onFocus(): void {
    this.showAutocomplete = false;
  }

  public get displayedJudicialsDuplicationFiltered(): JudicialUserModel[] {
    return (this.displayedJudicials ?? []).filter(judicial =>
      !this.selectedJudicials.some(selected => selected.idamId === judicial.idamId));
  }

  public filter(term: string): void {
    this.searchRequests$.next(term);
  }

  public onSelectionChange(selection?: JudicialUserModel): void {
    if (!selection) return;
    this.setSelectedValue(selection);
    this.formGroup.controls.formControl.setValue(this.getDisplayName(selection), { emitEvent: false });
    this.displayedJudicials = [];
    this.searchRequests$.next(null);
    this.searchInProgress = false;
    this.showAutocomplete = false;
    this.judicialChanged.emit(selection);
  }

  public search(currentValue: string): void {
    const term = currentValue ?? '';
    this.latestSearchTerm = term;
    this.searchInProgress = term.length >= this.minimumSearchCharacters;
    this.showAutocomplete = this.searchInProgress;
    const selectedControl = this.formGroup.controls.selectedFormControl as AbstractControl;
    if (term) {
      selectedControl.markAsDirty();
    } else {
      selectedControl.reset();
    }
    if (this.searchInProgress) {
      this.filter(term);
    } else {
      this.displayedJudicials = [];
      this.searchRequests$.next(null);
    }
  }

  public getDisplayName(judicial: JudicialUserModel | string | null): string {
    if (typeof judicial === 'string') return judicial;
    if (!judicial) return '';
    return `${judicial.fullName} (${judicial.emailId})`;
  }

  public searchJudicials(term: string, serviceId: string): Observable<JudicialUserModel[]> {
    return this.judicialService.searchJudicial(term, serviceId);
  }

  public getControlValueDisplayText(): string {
    const value = this.formGroup?.controls.selectedFormControl?.value as JudicialUserModel | null;
    return value?.fullName ? this.getDisplayName(value) : '';
  }

  private setSelectedValue(selection: JudicialUserModel): void {
    const selectedControl = this.formGroup.controls.selectedFormControl as AbstractControl;
    if (selectedControl instanceof FormArray) {
      selectedControl.push(new FormControl(selection.idamId));
    } else {
      selectedControl.setValue(selection);
    }
  }

  public get resolvedInputId(): string {
    return this.inputId || `inputSelectPerson${this.idValue}`;
  }

  public get searchControl(): FormControl {
    return this.formGroup.controls.formControl as FormControl;
  }
}
