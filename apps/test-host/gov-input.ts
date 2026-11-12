import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { FormControl, FormGroup } from '@angular/forms';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { GovInputModule } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
import type { ErrorMessagesModel, GovUiConfigModel } from '@hmcts/rpx-xui-core-lib/ui/gov-input';
@Component({selector:'core-test-host', imports:[GovInputModule], template:`
 <main><button type="button" (click)="translations.language = 'cy'">Cymraeg</button><button type="button" (click)="invalid()">Show error</button><button type="button" (click)="multiple()">Show two errors</button><button type="button" (click)="emptyError()">Show empty error</button><button type="button" (click)="hideHint()">Hide hint</button><button type="button" (click)="clear()">Clear error</button>
 <xuilib-gov-uk-input [config]="config" [group]="form" [errorMessage]="error" />
 <output data-testid="form-value">{{form.controls.name.value}}</output></main>`})
class GovInputGallery {
 form = new FormGroup({name: new FormControl('', {nonNullable:true})});
 config: GovUiConfigModel = {id:'synthetic-name',name:'name',label:'Synthetic name',hint:'Synthetic hint',type:'text',isPageHeading:false};
 error: ErrorMessagesModel = {isInvalid:false,messages:[]};
 constructor(public translations: RpxTranslationService) {}
 invalid() { this.error = {isInvalid:true,messages:['Synthetic error']}; }
 hideHint() { this.config = {...this.config, hint: ''}; }
 emptyError() { this.error = {isInvalid:true,messages:[]}; }
 multiple() { this.error = {isInvalid:true,messages:['Synthetic error','Second error']}; }
 clear() { this.error = {isInvalid:false,messages:[]}; }
}
export function startGovInputGallery() { return bootstrapApplication(GovInputGallery, {providers:[importProvidersFrom(RpxTranslationModule.forRoot({baseUrl:'/translations',debounceTimeMs:20,validity:{days:1},testMode:false}))]}); }
