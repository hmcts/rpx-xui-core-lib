import { AfterContentInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Observable, of, Subject } from 'rxjs';
import { catchError, debounceTime, switchMap, takeUntil } from 'rxjs/operators';
import { LocationByEPIMMSModel, LocationService } from '@hmcts/rpx-xui-core-lib/reference/locations';

@Component({
  selector: 'xuilib-search-venue',
  templateUrl: './search-venue.component.html',
  styleUrls: ['./search-venue.component.scss'],
  standalone: false,
})
export class SearchVenueComponent implements OnInit, OnDestroy, AfterContentInit {
  @Input() public control: AbstractControl | null = null;
  @Input() public disabled: boolean | null = null;
  @Input() public locationType = '';
  @Input() public selectedLocations: LocationByEPIMMSModel[] = [];
  @Input() public serviceIds = '';
  @Input() public submitted = true;
  @Input() public inputId = 'searchVenueLocation';
  @Input() public accessibleLabel: string | null = null;
  @ViewChild('inputSelectedLocation', { read: ElementRef }) public autoCompleteInputBox!: ElementRef<HTMLInputElement>;
  @Input() public showAutocomplete = false;
  @Input() public displayedLocations: LocationByEPIMMSModel[] = [];
  @Output() public locationChanged = new EventEmitter<LocationByEPIMMSModel>();
  public findLocationFormGroup: FormGroup;
  public selectedLocation: LocationByEPIMMSModel | undefined;
  public readonly keyUpSubject$ = new Subject<string>();
  public readyAfterContent = false;
  public searchInProgress = false;
  private readonly minimumSearchCharacters = 3;
  private readonly destroy$ = new Subject<void>();
  private readonly searchRequests$ = new Subject<string | null>();
  private latestSearchTerm = '';

  constructor(private readonly locationService: LocationService, formBuilder: FormBuilder) {
    this.findLocationFormGroup = formBuilder.group({
      findLocationFormControl: [''],
      locationSelectedFormControl: [null],
    });
  }

  public ngAfterContentInit(): void {
    this.readyAfterContent = true;
  }

  public ngOnInit(): void {
    this.displayedLocations = [];
    if (this.control) {
      this.findLocationFormGroup.controls.locationSelectedFormControl = this.control;
      this.findLocationFormGroup.controls.findLocationFormControl.setValue(this.getControlCourtNameValue(), { emitEvent: false });
      this.control.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.findLocationFormGroup.controls.findLocationFormControl.setValue(this.getControlCourtNameValue(), { emitEvent: false });
      });
    }
    this.keyUpSubject$.pipe(debounceTime(500), takeUntil(this.destroy$)).subscribe(value => this.search(value));
    this.searchRequests$.pipe(
      switchMap(term => term
        ? this.searchLocations(term).pipe(catchError(() => of([])))
        : of([])),
      takeUntil(this.destroy$),
    ).subscribe(locations => {
      this.displayedLocations = locations.filter(location =>
        location.court_name && !this.selectedLocations.some(selected => selected.epimms_id === location.epimms_id));
      const exactMatches = this.displayedLocations.filter(location => this.latestSearchTerm === location.court_name);
      if (exactMatches.length === 1) {
        const [exactMatch] = exactMatches;
        this.setSelectedValue(exactMatch);
        this.findLocationFormGroup.controls.findLocationFormControl.setValue(this.getDisplayName(exactMatch), { emitEvent: false });
        this.displayedLocations = [];
        this.locationChanged.emit(exactMatch);
        this.showAutocomplete = false;
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
    this.locationChanged.emit();
  }

  public onKeyUp(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    if (!input || typeof input.value !== 'string') return;
    // Cancel the active request at input time, not after the debounce window.
    this.searchRequests$.next(null);
    this.displayedLocations = [];
    this.searchInProgress = false;
    this.showAutocomplete = false;
    this.keyUpSubject$.next(input.value);
  }

  public get displayedLocationsDuplicationFiltered(): LocationByEPIMMSModel[] {
    return (this.displayedLocations ?? []).filter(location =>
      location.court_name && !this.selectedLocations.some(selected => selected.epimms_id === location.epimms_id));
  }

  public filter(term: string): void {
    this.searchRequests$.next(term);
  }

  public onSelectionChange(selection?: LocationByEPIMMSModel): void {
    if (!selection) return;
    this.setSelectedValue(selection);
    this.findLocationFormGroup.controls.findLocationFormControl.setValue(this.getDisplayName(selection), { emitEvent: false });
    this.displayedLocations = [];
    this.searchRequests$.next(null);
    this.searchInProgress = false;
    this.showAutocomplete = false;
    this.locationChanged.emit(selection);
  }

  public search(currentValue: string): void {
    const term = currentValue ?? '';
    this.latestSearchTerm = term;
    this.searchInProgress = term.length >= this.minimumSearchCharacters;
    this.showAutocomplete = this.searchInProgress;
    const selectedControl = this.findLocationFormGroup.controls.locationSelectedFormControl as AbstractControl;
    if (term) {
      selectedControl.markAsDirty();
    } else {
      selectedControl.reset();
    }
    if (this.searchInProgress) {
      this.filter(term);
    } else {
      this.displayedLocations = [];
      this.searchRequests$.next(null);
    }
  }

  public getDisplayName(location: LocationByEPIMMSModel | string | null): string {
    if (typeof location === 'string') return location;
    if (!location) return '';
    return location.court_name ?? '';
  }

  public searchLocations(term: string): Observable<LocationByEPIMMSModel[]> {
    return this.locationService.searchLocations(this.serviceIds, this.locationType, term);
  }

  public getControlCourtNameValue(): string {
    const value = this.findLocationFormGroup?.controls.locationSelectedFormControl?.value as LocationByEPIMMSModel | null;
    return value?.court_name ?? '';
  }

  private setSelectedValue(selection: LocationByEPIMMSModel): void {
    const selectedControl = this.findLocationFormGroup.controls.locationSelectedFormControl as AbstractControl;
    if (selectedControl instanceof FormArray) {
      selectedControl.push(new FormControl(selection.epimms_id));
    } else {
      selectedControl.setValue(selection);
    }
  }

  public get searchControl(): FormControl {
    return this.findLocationFormGroup.controls.findLocationFormControl as FormControl;
  }
}
