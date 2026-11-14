import { CommonModule } from '@angular/common';
import { Component, Input, Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AbstractAppConfig } from '../../projects/core-lib/case/editor-source/lib/app.config';
import { SessionStorageService } from '../../projects/core-lib/case/editor-source/lib/shared/services/session/session-storage.service';
import { CasePaymentHistoryViewerFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/payment/case-payment-history-viewer-field.component';
import { WaysToPayFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/waystopay/waystopay-field.component';

export const registered = true;
@Component({ selector: 'ccpay-payment-lib', template: '', standalone: false })
class PaymentStub {
  @Input() API_ROOT: unknown; @Input() CCD_CASE_NUMBER: unknown; @Input() BULKSCAN_API_ROOT: unknown;
  @Input() SELECTED_OPTION: unknown; @Input() ISBSENABLE: unknown; @Input() LOGGEDINUSEREMAIL: unknown;
  @Input() LOGGEDINUSERROLES: unknown; @Input() REFUNDS_API_ROOT: unknown; @Input() NOTIFICATION_API_ROOT: unknown;
  @Input() VIEW: unknown; @Input() TAKEPAYMENT: unknown; @Input() SERVICEREQUEST: unknown;
  @Input() PAYMENT_GROUP_REF: unknown; @Input() EXC_REFERENCE: unknown; @Input() DCN_NUMBER: unknown;
  @Input() ISPAYMENTSTATUSENABLED: unknown; @Input() CARDPAYMENTRETURNURL: unknown;
}
@Pipe({ name: 'rpxTranslate', standalone: false })
class TranslateStub implements PipeTransform { transform(value: string) { return value; } }

describe('Payment bindings migration contract', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule],
      declarations: [PaymentStub, TranslateStub, CasePaymentHistoryViewerFieldComponent, WaysToPayFieldComponent],
      providers: [
        { provide: AbstractAppConfig, useValue: { getPaymentsUrl: () => '/pay', getPayBulkScanBaseUrl: () => '/bulk', getRefundsUrl: () => '/refund', getNotificationUrl: () => '/notify', getPaymentReturnUrl: () => '/return' } },
        { provide: SessionStorageService, useValue: { getItem: () => JSON.stringify({ roles: ['role'], sub: 'user@example.test' }) } }
      ]
    }).compileComponents();
  });
  it('passes the existing history input values through to payment', () => {
    const fixture = TestBed.createComponent(CasePaymentHistoryViewerFieldComponent);
    fixture.componentInstance.caseField = { metadata: true } as unknown as typeof fixture.componentInstance.caseField;
    fixture.componentInstance.caseReference = '123';
    fixture.detectChanges();
    const payment = fixture.debugElement.query(By.directive(PaymentStub)).componentInstance as PaymentStub;
    expect([payment.ISBSENABLE, payment.SERVICEREQUEST, payment.ISPAYMENTSTATUSENABLED]).toEqual(['true', false, 'Enable']);
    expect(payment.CCD_CASE_NUMBER).toBe('123');
  });
  it('does not create ways-to-pay when the user has no roles', () => {
    const storage = TestBed.inject(SessionStorageService);
    spyOn(storage, 'getItem').and.returnValue(JSON.stringify({ roles: [] }));
    const fixture = TestBed.createComponent(WaysToPayFieldComponent);
    fixture.componentInstance.caseField = { metadata: true } as unknown as typeof fixture.componentInstance.caseField;
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(PaymentStub))).toBeNull();
  });
  it('passes the existing ways-to-pay input values through to payment', () => {
    const fixture = TestBed.createComponent(WaysToPayFieldComponent);
    fixture.componentInstance.caseField = { metadata: true } as unknown as typeof fixture.componentInstance.caseField;
    fixture.componentInstance.caseReference = '123';
    fixture.detectChanges();
    const payment = fixture.debugElement.query(By.directive(PaymentStub)).componentInstance as PaymentStub;
    expect([payment.SERVICEREQUEST, payment.ISPAYMENTSTATUSENABLED, payment.TAKEPAYMENT]).toEqual([true, 'Enable', false]);
    expect(payment.CARDPAYMENTRETURNURL).toBe('/return');
  });
});
