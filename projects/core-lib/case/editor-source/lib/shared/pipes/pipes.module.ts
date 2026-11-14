import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { CaseReferenceModule } from '@hmcts/rpx-xui-core-lib/case/reference';
import { CcdCaseTitlePipe } from './case-title';
import { CcdCollectionTableCaseFieldsFilterPipe, CcdCYAPageLabelFilterPipe, CcdPageFieldsPipe, CcdTabFieldsPipe, ReadFieldsFilterPipe } from './complex';
import { EnumDisplayDescriptionPipe } from './generic/enum-display-description/enum-display-description.pipe';
import { LinkCasesFromReasonValuePipe } from './link-cases-from-reason-code/ccd-link-cases-from-reason-code.pipe';
import { LinkCasesReasonValuePipe } from './link-cases-reason-code/ccd-link-cases-reason-code.pipe';
import { SortSearchResultPipe } from './search-result/sorting/sort-search-result.pipe';

const pipeDeclarations = [
  SortSearchResultPipe,
  CcdCaseTitlePipe,
  CcdCollectionTableCaseFieldsFilterPipe,
  CcdCYAPageLabelFilterPipe,
  ReadFieldsFilterPipe,
  CcdTabFieldsPipe,
  CcdPageFieldsPipe,
  LinkCasesReasonValuePipe,
  LinkCasesFromReasonValuePipe,
  EnumDisplayDescriptionPipe
];

@NgModule({
  imports: [
    CommonModule,
    CaseReferenceModule,
  ],
  declarations: [
    ...pipeDeclarations
  ],
  exports: [
    ...pipeDeclarations,
    CaseReferenceModule,
  ]
})
export class PipesModule {}
