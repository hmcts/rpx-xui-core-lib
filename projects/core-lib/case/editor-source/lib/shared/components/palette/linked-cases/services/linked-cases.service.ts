import { Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { CaseView } from '../../../../domain/case-view';
import { Jurisdiction } from '../../../../domain/definition/jurisdiction.model';
import { JurisdictionService, SearchService } from '../../../../services';
import { LovRefDataModel } from '../../../../services/common-data-service/common-data-service';
import { CaseLink, ESQueryType, LinkReason } from '../domain';

@Injectable()
export class LinkedCasesService {
  private static readonly CASE_NAME_MISSING_TEXT = 'Case name missing';

  // Preserve the Toolkit public type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public caseFieldValue: any[] = [];
  public isLinkedCasesEventTrigger = false;
  public caseDetails: CaseView;
  public caseId: string;
  public caseName: string;
  public linkCaseReasons: LovRefDataModel[] = [];
  public linkedCases: CaseLink[] = [];
  public initialCaseLinks: CaseLink[] = [];
  public editMode = false;
  public jurisdictionsResponse: Jurisdiction[] = [];
  public serverJurisdictionError: boolean;
  public serverError: { id: string, message: string } = null;
  public serverLinkedApiError: { id: string, message: string } = null;
  public isServerReasonCodeError = false;
  // Preserve the Toolkit public type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public caseJurisdictionID: any = null;
  public storedCaseNumber = '';
  public cameFromFinalStep = false;
  public hasNavigatedInJourney = false;
  public hasContinuedFromStart = false;
  // Preserve the Toolkit public type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public cachedFieldValues: any;
  public initialCaseLinkRefs: string[] = [];
  public casesToUnlink: string[] = [];

  constructor(private readonly jurisdictionService: JurisdictionService,
              private readonly searchService: SearchService) {
    this.jurisdictionService.getJurisdictions().subscribe((jurisdictions) => {
      this.jurisdictionsResponse = jurisdictions;
    }, () => {
      this.serverJurisdictionError = true;
    });
  }

  // Preserve the Toolkit public type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public groupLinkedCasesByCaseType = (arrObj: any[], key: string) => {
    return arrObj.reduce((rv: Record<string, string[]>, x: { value: Record<string, string> }) => {
      (rv[x.value[key]] = rv[x.value[key]] || []).push(x.value['CaseReference']);
      return rv;
    }, {});
  }

  // Preserve the Toolkit public type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public constructElasticSearchQuery(caseIds: any[], size: number): ESQueryType {
    return {
      query: {
        terms: {
          reference: caseIds,
        },
      },
      size,
    };
  }

  public resetLinkedCaseData(): void {
    //remove the newly added linked case using the linked case
    this.caseFieldValue = [];
    this.linkedCases = [];
    this.initialCaseLinks = [];
    this.initialCaseLinkRefs = [];
    this.storedCaseNumber = '';
    this.cameFromFinalStep = false;
    this.hasNavigatedInJourney = false;
    this.caseDetails = null;
    this.hasContinuedFromStart = false;
    this.casesToUnlink = [];
    this.cachedFieldValues = null;
  }

  // Preserve the Toolkit public type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public mapResponse(esSearchCasesResponse: any): any {
    const caseInfo = this.caseFieldValue.find(item => item.value && item.value.CaseReference === esSearchCasesResponse.case_id);
    return caseInfo && {
      caseReference: esSearchCasesResponse.case_id,
      caseName: esSearchCasesResponse.case_fields.caseNameHmctsInternal || LinkedCasesService.CASE_NAME_MISSING_TEXT,
      caseType: this.mapLookupIDToValueFromJurisdictions('CASE_TYPE', esSearchCasesResponse.case_fields['[CASE_TYPE]']),
      service: this.mapLookupIDToValueFromJurisdictions('JURISDICTION', esSearchCasesResponse.case_fields['[JURISDICTION]']),
      state: this.mapLookupIDToValueFromJurisdictions('STATE', esSearchCasesResponse.case_fields['[STATE]']),
      reasons: caseInfo?.value?.ReasonForLink
    };
  }

  // Preserve the Toolkit public type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public searchCasesByCaseIds(searchCasesResponse: any[]): Observable<unknown[]> {
    return forkJoin(searchCasesResponse);
  }

  public getAllLinkedCaseInformation(): void {
    const searchCasesResponse: unknown[] = [];
    const linkedCaseIds = this.groupLinkedCasesByCaseType(this.caseFieldValue, 'CaseType');
    const caseTypeId = this.caseDetails.case_type.id;
    Object.keys(linkedCaseIds).forEach(key => {
      const esQuery = this.constructElasticSearchQuery(linkedCaseIds[key], 100);
      const query = this.searchService.searchCasesByIds(caseTypeId, esQuery, SearchService.VIEW_WORKBASKET);
      searchCasesResponse.push(query);
    });
    if (searchCasesResponse.length) {
      this.searchCasesByCaseIds(searchCasesResponse).subscribe((searchCases: unknown[]) => {
        const casesResponse: { caseReference: string; caseName: string; service: string; caseType: string; reasons?: string[] }[] = [];
        searchCases.forEach((response: unknown) => {
          (response as { results: unknown[] }).results.forEach((result: unknown) => {
            casesResponse.push(this.mapResponse(result));
          });
        });
        this.linkedCases = casesResponse.map(item => {
          return {
            caseReference: item.caseReference,
            caseName: item.caseName,
            caseService: item.service,
            caseType: item.caseType,
            unlink: false,
            reasons: item.reasons && item.reasons.map((reason: string) => {
              return {
                Reason: reason
              } as LinkReason;
            }),
          } as CaseLink;
        });
        this.initialCaseLinks = this.linkedCases;
        this.serverLinkedApiError = null;
      },
      () => {
        this.serverLinkedApiError = {
          id: 'backendError', message: 'Some case information is not available at the moment'
        };
      });
    }
  }

  // Preserve the Toolkit public type until consumers migrate.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public mapLookupIDToValueFromJurisdictions(fieldName: string, fieldValue: any): string {
    const selectedJurisdiction = this.jurisdictionsResponse &&
      this.jurisdictionsResponse.find(item => item.id === this.caseDetails.case_type.jurisdiction.id);
    const selectedCaseType = selectedJurisdiction && selectedJurisdiction.caseTypes.find(item => item.id === this.caseDetails.case_type.id);
    const state = selectedCaseType && selectedCaseType.states.find(item => item.id === fieldValue);
    switch (fieldName) {
      case 'JURISDICTION':
        return selectedJurisdiction && selectedJurisdiction.description;
      case 'CASE_TYPE':
        return selectedCaseType && selectedCaseType.name;
      case 'CASE_TYPE_DESCRIPTION':
        return selectedCaseType && selectedCaseType.description;
      case 'STATE':
        return state && state.name || fieldValue;
      case 'STATE_DESCRIPTION':
        return state && state.description || fieldValue;
      default:
        break;
    }
  }

  public getCaseName(searchCasesResponse: CaseView): string {
    let caseName = LinkedCasesService.CASE_NAME_MISSING_TEXT;
    searchCasesResponse.tabs.filter(tab => {
      const caseNameHmctsInternalField = tab.fields.find(field => field.id === 'caseNameHmctsInternal');
      if (caseNameHmctsInternalField) {
        caseName = caseNameHmctsInternalField.value;
      }
    });
    return caseName;
  }
}
