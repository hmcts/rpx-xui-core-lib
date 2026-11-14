import { PaymentLibComponent } from '@hmcts/ccpay-web-component';

export const registered = true;

describe('Installed payment component input contract', () => {
  it('retains legacy wrapper values when initialising the payment component', () => {
    const service = { setApiRootUrl() {}, setBulkScanApiRootUrl() {}, setRefundndsApiRootUrl() {}, setNoticationApiRootUrl() {}, setCardPaymentReturnUrl() {} };
    const payment = new PaymentLibComponent(service as unknown as ConstructorParameters<typeof PaymentLibComponent>[0], { detectChanges() {} } as unknown as ConstructorParameters<typeof PaymentLibComponent>[1], { setUserRolesList() {} } as unknown as ConstructorParameters<typeof PaymentLibComponent>[2]);
    Object.assign(payment, { API_ROOT: '/pay', VIEW: 'case-transactions', LOGGEDINUSERROLES: ['role'], ISBSENABLE: 'true', SERVICEREQUEST: false, ISPAYMENTSTATUSENABLED: 'Enable' });
    payment.ngOnInit();
    expect(payment.viewName).toBe('case-transactions');
    expect([payment.ISBSENABLE, payment.SERVICEREQUEST, payment.ISPAYMENTSTATUSENABLED]).toEqual(['true', false, 'Enable']);
  });
  it('retains ways-to-pay inputs and configures the real payment component', () => {
    const paymentService = {
      setApiRootUrl: jasmine.createSpy('api'),
      setBulkScanApiRootUrl: jasmine.createSpy('bulk'),
      setRefundndsApiRootUrl: jasmine.createSpy('refunds'),
      setNoticationApiRootUrl: jasmine.createSpy('notifications'),
      setCardPaymentReturnUrl: jasmine.createSpy('return')
    };
    const roles = { setUserRolesList: jasmine.createSpy('roles') };
    const payment = new PaymentLibComponent(paymentService as unknown as ConstructorParameters<typeof PaymentLibComponent>[0], { detectChanges() {} } as unknown as ConstructorParameters<typeof PaymentLibComponent>[1], roles as unknown as ConstructorParameters<typeof PaymentLibComponent>[2]);
    Object.assign(payment, { API_ROOT: '/pay', BULKSCAN_API_ROOT: '/bulk', REFUNDS_API_ROOT: '/refund', NOTIFICATION_API_ROOT: '/notify', CARDPAYMENTRETURNURL: '/return', VIEW: 'case-transactions', LOGGEDINUSERROLES: ['role'], SERVICEREQUEST: true, ISPAYMENTSTATUSENABLED: 'Enable' });
    payment.ngOnInit();
    expect(paymentService.setApiRootUrl).toHaveBeenCalledWith('/pay');
    expect(paymentService.setCardPaymentReturnUrl).toHaveBeenCalledWith('/return');
    expect(roles.setUserRolesList).toHaveBeenCalledWith(['role']);
    expect(payment.SERVICEREQUEST as unknown as boolean).toBe(true);
    expect(payment.ISPAYMENTSTATUSENABLED as unknown as string).toBe('Enable');
  });
});
