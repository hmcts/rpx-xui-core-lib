import {Component, importProvidersFrom} from '@angular/core';
import {JsonPipe} from '@angular/common';
import {bootstrapApplication} from '@angular/platform-browser';
import {FormControl,FormGroup} from '@angular/forms';
import {RpxTranslationModule} from '@hmcts/rpx-xui-core-lib/i18n';
import {GovDateModule} from '@hmcts/rpx-xui-core-lib/ui/gov-date';
import {GovSelectModule} from '@hmcts/rpx-xui-core-lib/ui/gov-select';
import type {ErrorMessagesModel,GovUiConfigModel} from '@hmcts/rpx-xui-core-lib/ui/gov-input';
@Component({selector:'core-test-host',imports:[GovDateModule,GovSelectModule,JsonPipe],template:`<main>
 <xuilib-gov-uk-date [formGroup]="date" [config]="dateConfig" [isOptional]="optional" [errorMessage]="dateError" />
 @if (secondVisible) { <xuilib-gov-uk-date [formGroup]="secondDate" [config]="secondConfig" [errorMessage]="secondError" /> }
 <button type="button" (click)="showErrors()">Show date errors</button>
 <button type="button" (click)="clearMessages()">Clear date messages</button>
 <button type="button" (click)="optional = !optional">Toggle optional</button>
 <output data-testid="date-errors">{{date.controls.date_day.errors | json}}</output>
 <output data-testid="date-status">{{date.status}}</output>
 <xuilib-gov-select [group]="selection" [config]="selectConfig" [items]="items" [errorMessage]="selectError" />
 <output data-testid="selection">{{selection.controls.service.value}}</output>
 <xuilib-gov-uk-fieldset [config]="fieldsetConfig"><span>Projected content</span></xuilib-gov-uk-fieldset>
 <button type="button" (click)="toggleHeading()">Toggle heading</button>
 </main>`})
class GovDateGallery {
 date = new FormGroup({date_day:new FormControl(''),date_month:new FormControl(''),date_year:new FormControl('')});
 secondDate = new FormGroup({other_day:new FormControl(''),other_month:new FormControl(''),other_year:new FormControl('')});
 selection = new FormGroup({service:new FormControl('one')});
 dateConfig: GovUiConfigModel = {id:'date',label:'Synthetic date',hint:'Synthetic hint'};
 secondConfig: GovUiConfigModel = {id:'other',label:'Other date',hint:'Other hint'};
 dateError: ErrorMessagesModel = {isInvalid:false,messages:[]};
 secondError: ErrorMessagesModel = {isInvalid:false,messages:[]};
 selectError: ErrorMessagesModel = {isInvalid:false,messages:[]};
 secondVisible = false;
 showErrors() { this.secondVisible = true; this.dateError = {isInvalid:true,messages:['First date error']}; this.secondError = {isInvalid:true,messages:['Second date error']}; this.selectError = {isInvalid:true,messages:['Select error']}; }
 clearMessages() { this.dateError = {isInvalid:true,messages:[]}; this.secondError = {isInvalid:true,messages:[]}; this.selectError = {isInvalid:true,messages:[]}; }
 selectConfig: GovUiConfigModel = {id:'service',name:'service',label:'Synthetic service'};
 fieldsetConfig: GovUiConfigModel = {id:'group',legend:'Synthetic group',hint:'Group hint'};
 items = [{id:'one',value:'one',label:'First'},{id:'two',value:'two',label:'Second'}];
 toggleHeading() { this.fieldsetConfig = {...this.fieldsetConfig,isPageHeading:!this.fieldsetConfig.isPageHeading}; }
 optional = false;
}
export function startGovDateGallery(){return bootstrapApplication(GovDateGallery,{providers:[importProvidersFrom(RpxTranslationModule.forRoot({baseUrl:'/translations',debounceTimeMs:20,validity:{days:1},testMode:false}))]});}
