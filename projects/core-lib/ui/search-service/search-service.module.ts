import { NgModule } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { SearchServiceComponent } from './search-service.component';

@NgModule({ declarations: [SearchServiceComponent], imports: [MatAutocompleteModule], exports: [SearchServiceComponent] })
export class SearchServiceModule {}
