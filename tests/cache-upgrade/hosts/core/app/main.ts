import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
@Component({selector:'cache-probe',standalone:true,imports:[RpxTranslationModule],template:`<button (click)="welsh()">Cymraeg</button><button (click)="english()">English</button><p data-testid="language">{{service.language}}</p>@if (privacy) {<p data-testid="literal-phrase">{{'%LABEL% for %NAME%: %ID% / %NAME%' | rpxTranslate: labels: undefined: literals}}</p>} @else {<p data-testid="phrase">{{'Hello world' | rpxTranslate}}</p>}`})
class CacheProbe { readonly privacy = new URLSearchParams(location.search).has('privacy'); readonly labels = { LABEL: 'Details' }; readonly literals = { NAME: 'Fictional Person', ID: 'CASE-123' }; constructor(public service:RpxTranslationService){} welsh():void{this.service.language='cy';} english():void{this.service.language='en';} }
bootstrapApplication(CacheProbe,{providers:[provideHttpClient(),importProvidersFrom(RpxTranslationModule.forRoot({baseUrl:'/translations',debounceTimeMs:5,validity:{days:1},testMode:false}))]}).catch((e:unknown)=>console.error(e));
