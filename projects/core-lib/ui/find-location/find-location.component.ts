import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import type { LocationByEPIMMSModel } from '@hmcts/rpx-xui-core-lib/reference/locations';
import { SearchLocationComponent, type FilterConfigOption, type FilterFieldConfig } from '@hmcts/rpx-xui-core-lib/ui/search-location';

function selectedServiceIds(options: FilterConfigOption[], values: readonly unknown[]): string {
  return options.filter((option, index) => values[index] && option.key !== 'services_all')
    .map(option => option.key).join(',');
}

@Component({
  selector: 'xuilib-find-location',
  templateUrl: './find-location.component.html',
  styleUrls: ['./find-location.component.scss'],
  standalone: false
})
export class FindLocationComponent implements OnInit, OnDestroy {
  @Output() public locationFieldChanged = new EventEmitter<void>();
  @Input() public submitted: boolean = true;
  @Input() public enableAddLocationButton: boolean = true;
  @Input() public form: FormGroup;
  @Input() public field: FilterFieldConfig;
  @Input() public fields: FilterFieldConfig[];
  @Input() public locationTitle = 'Search for a location by name';
  @Input() public disableInputField = false;
  @Input() public formSubmissionEvent$: Subject<void>;
  public tempSelectedLocation: LocationByEPIMMSModel = null;
  public serviceIds: string = 'SSCS,IA';
  @ViewChild(SearchLocationComponent, { static: true }) public searchLocationComponent: SearchLocationComponent;
  private pServices: string | readonly unknown[] = [];
  private formSubmissionEventSubscription: Subscription;

  public get disabled(): true | null {
    // SearchLocation binds the disabled attribute, so an enabled input needs null.
    return this.disableInputField === true ? true : null;
  }

  @Input()
  public set disabled(value: boolean | null | undefined) {
    if (value) {
      this.searchLocationComponent.resetSearchTerm();
      this.removeSelectedValues();
    }
  }

  public get services(): string | readonly unknown[] {
    return this.pServices;
  }

  @Input()
  public set services(value: string | readonly unknown[]) {
    this.pServices = value;
    const field = this.fields.find(field => field.name === this.field?.findLocationField);

    if (field) {
      if (typeof value === 'string') {
        this.serviceIds = value;
      } else {
        this.serviceIds = selectedServiceIds(field.options, value);
      }
    }
  }

  public get selectedLocations() {
    return (this.form.get(this.field.name)?.value as LocationByEPIMMSModel[])?.filter(location => location.epimms_id);
  }

  public get propertyNameFilter(): keyof LocationByEPIMMSModel {
    const DEFAULT_PROPERTY_NAME = 'site_name';
    return this.field.propertyNameFilter ? this.field.propertyNameFilter as keyof LocationByEPIMMSModel
      : DEFAULT_PROPERTY_NAME;
  }

  public ngOnInit(): void {
    if (this.formSubmissionEvent$) {
      this.formSubmissionEventSubscription = this.formSubmissionEvent$.subscribe(() => {
        // Shouldn't reset search term if single mode and already has selected
        const oneSelectedAndMaxSelectedOne = this.selectedLocations.length === 1 && this.field.maxSelected === 1;
        if (!oneSelectedAndMaxSelectedOne) {
          this.searchLocationComponent.resetSearchTerm();
        }
      });
    }
  }

  public addLocation(): void {
    if (this.tempSelectedLocation) {
      this.addSelectedLocationsToForm([this.tempSelectedLocation]);
      this.tempSelectedLocation = null;
      this.searchLocationComponent.resetSearchTerm();
    }
  }

  public removeLocation(location: LocationByEPIMMSModel): void {
    if (location.epimms_id) {
      const formArray = this.form.get(this.field.name) as FormArray;
      const index = (formArray.value as LocationByEPIMMSModel[]).findIndex(selectedLocation => selectedLocation.epimms_id === location.epimms_id);
      if (index > -1) {
        formArray.removeAt(index);
      }
    }
  }

  public onInputChanged(term: string): void {
    // if the filter is in single mode clear the selected locations
    if (typeof term === 'string' && this.field.maxSelected === 1) {
        this.removeSelectedValues();
    }
  }

  public onSearchInputChanged(): void {
    this.locationFieldChanged.emit();
  }

  public onLocationSelected(location: LocationByEPIMMSModel): void {
    if (this.field.maxSelected === 1) {
      this.removeSelectedValues();
      this.addSelectedLocationsToForm([location]);
    } else {
      if (!this.selectedLocations.find(x => x.epimms_id === location.epimms_id)) {
        if (location.epimms_id) {
          this.tempSelectedLocation = location;
        }
      }
    }
  }

  private removeSelectedValues(): void {
    const formArray = this.form.get(this.field?.name) as FormArray | null;
    formArray?.clear();
  }

  private addSelectedLocationsToForm(locations: LocationByEPIMMSModel[]): void {
    const formArray = this.form.get(this.field.name) as FormArray;
    for (const location of locations) {
      formArray.push(new FormControl(location));
    }
  }

  public ngOnDestroy() {
    this.formSubmissionEventSubscription?.unsubscribe();
  }
}
