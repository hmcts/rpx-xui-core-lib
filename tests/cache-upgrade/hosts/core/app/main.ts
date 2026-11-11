import { Component, importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { RpxTranslationModule, RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
@Component({selector:'cache-probe',standalone:true,imports:[RpxTranslationModule],template:`<button (click)="welsh()">Cymraeg</button><button (click)="english()">English</button><p data-testid="language">{{service.language}}</p><p data-testid="phrase">{{'Hello world' | rpxTranslate}}</p>`})
class CacheProbe { constructor(public service:RpxTranslationService){} welsh():void{this.service.language='cy';} english():void{this.service.language='en';} }
bootstrapApplication(CacheProbe,{providers:[provideHttpClient(),importProvidersFrom(RpxTranslationModule.forRoot({baseUrl:'/translations',debounceTimeMs:5,validity:{days:1},testMode:false}))]}).catch((e:unknown)=>console.error(e));
