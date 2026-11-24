import { Component } from '@angular/core';
import { importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { of } from 'rxjs';
import { FormControl } from '@angular/forms';
import { FindAPersonService, JudicialUserModel } from '@hmcts/rpx-xui-core-lib/ui/find-person';
import { LocationByEPIMMSModel, LocationService } from '@hmcts/rpx-xui-core-lib/reference/locations';
import { SearchJudicialsModule } from '@hmcts/rpx-xui-core-lib/ui/search-judicials';
import { SearchVenueModule } from '@hmcts/rpx-xui-core-lib/ui/search-venue';
import { RpxTranslationModule } from '@hmcts/rpx-xui-core-lib/i18n';

const judges: JudicialUserModel[] = [
  { idamId: 'judge-1', fullName: 'Alex Judge', emailId: 'alex.judge@example.test', isJudge: 'Y', isMagistrate: 'N', isPanelMember: 'N', knownAs: '', personalCode: 'J1', surname: 'Judge', title: 'Judge' },
];
const duplicateJudges: JudicialUserModel[] = [
  { idamId: 'shared-judge-1', fullName: 'Shared Judge', emailId: 'first@example.test', isJudge: 'Y', isMagistrate: 'N', isPanelMember: 'N', knownAs: '', personalCode: 'SJ1', surname: 'Judge', title: 'Judge' },
  { idamId: 'shared-judge-2', fullName: 'Shared Judge', emailId: 'second@example.test', isJudge: 'Y', isMagistrate: 'N', isPanelMember: 'N', knownAs: '', personalCode: 'SJ2', surname: 'Judge', title: 'Judge' },
];
const venues: LocationByEPIMMSModel[] = [
  { epimms_id: 'venue-1', court_name: 'Synthetic Hearing Centre', site_name: 'Synthetic Hearing Centre' },
  { epimms_id: 'venue-postcode', court_name: 'SW1A Postcode Court', site_name: 'SW1A Postcode Court' },
];
const duplicateVenues: LocationByEPIMMSModel[] = [
  { epimms_id: 'shared-venue-1', court_name: 'Shared Venue', site_name: 'First Shared Venue' },
  { epimms_id: 'shared-venue-2', court_name: 'Shared Venue', site_name: 'Second Shared Venue' },
];

@Component({
  selector: 'core-hearing-lookups-host',
  imports: [SearchJudicialsModule, SearchVenueModule],
  template: `<main>
    <h1>Hearing lookups</h1>
    <section aria-labelledby="judge-heading">
      <h2 id="judge-heading">Judge</h2>
      <xuilib-search-judicials
        inputId="hearing-judge"
        accessibleLabel="Find a judge"
        serviceId="SYNTHETIC"
        [selectedJudicials]="selectedJudicials"
        (judicialChanged)="onJudgeChanged($event)"></xuilib-search-judicials>
      <xuilib-search-judicials inputId="secondary-hearing-judge" accessibleLabel="Secondary judge" serviceId="SYNTHETIC"></xuilib-search-judicials>
      <p data-testid="selected-judge">{{ selectedJudge }}</p>
    </section>
    <section aria-labelledby="venue-heading">
      <h2 id="venue-heading">Venue</h2>
      <xuilib-search-venue
        inputId="hearing-venue"
        accessibleLabel="Find a venue"
        locationType="hearing"
        serviceIds="SYNTHETIC"
        [control]="venueControl"
        (locationChanged)="onVenueChanged($event)"></xuilib-search-venue>
      <button type="button" (click)="venueControl.reset()">Add venue</button>
      <label for="secondary-hearing-venue">Secondary venue</label>
      <xuilib-search-venue inputId="secondary-hearing-venue" locationType="hearing" serviceIds="SYNTHETIC"></xuilib-search-venue>
      <p data-testid="selected-venue">{{ selectedVenue }}</p>
    </section>
  </main>`,
})
class HearingLookupsGallery {
  public selectedJudicials: JudicialUserModel[] = [];
  public venueControl = new FormControl<LocationByEPIMMSModel | null>(null);
  public selectedJudge = '';
  public selectedVenue = '';

  public onJudgeChanged(judicial?: JudicialUserModel): void {
    if (judicial) this.selectedJudge = judicial.fullName;
  }

  public onVenueChanged(location?: LocationByEPIMMSModel): void {
    if (location) this.selectedVenue = location.court_name ?? '';
  }
}

export function startHearingLookupsGallery() {
  return bootstrapApplication(HearingLookupsGallery, {
    providers: [
      importProvidersFrom(RpxTranslationModule.forRoot({ baseUrl: '/translations', debounceTimeMs: 20, validity: { days: 1 }, testMode: false })),
      { provide: FindAPersonService, useValue: { searchJudicial: (term: string) => of(term === 'Shared Judge' ? duplicateJudges : term.length >= 3 ? judges : []) } },
      { provide: LocationService, useValue: { searchLocations: (serviceIds: string, locationType: string, term: string) => of(serviceIds && locationType && term.length >= 3 ? term === 'Shared Venue' ? duplicateVenues : venues.filter(venue => venue.court_name?.toLowerCase().includes(term.toLowerCase()) || term.toLowerCase() === 'court') : []) } },
    ],
  });
}
