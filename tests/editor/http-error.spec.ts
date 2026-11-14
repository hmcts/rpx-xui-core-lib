import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { HttpError } from '../../projects/core-lib/case/editor-source/lib/shared/domain/http/http-error.model';

import { HttpErrorService } from '../../projects/core-lib/case/editor-source/lib/shared/services/http/http-error.service';

export const registered = true;

describe('Editor HTTP error contract', () => {
  it('preserves varied callback error payloads by reference', () => {
    const details = { field: 'invalid' };
    const callbackErrors = ['error'];
    const callbackWarnings = { warning: 'check' };
    const result = HttpError.from(new HttpErrorResponse({ error: { details, callbackErrors, callbackWarnings } }));
    expect(result.details).toBe(details);
    expect(result.callbackErrors).toBe(callbackErrors);
    expect(result.callbackWarnings).toBe(callbackWarnings);
  });
  it('maps supplied fields and retains defaults for empty values', () => {
    const response = new HttpErrorResponse({ status: 400, error: { status: 400, error: 'Bad request', message: '' } });
    const result = HttpError.from(response);
    expect(result.status).toBe(400);
    expect(result.error).toBe('Bad request');
    expect(result.message).toBe('Sorry, there is a problem with this service. Please try again later.');
  });
  it('uses the response status for forbidden errors', () => {
    const response = new HttpErrorResponse({ status: 403, statusText: 'Forbidden', error: { status: 400, message: 'body' } });
    const result = HttpError.from(response);
    expect(result.status).toBe(403);
    expect(result.error).toBe('Forbidden');
    expect(result.message).toBe(response.message);
  });
  it('provides the rate-limit message when no body overrides it', () => {
    const result = HttpError.from(new HttpErrorResponse({ status: 429 }));
    expect(result.status).toBe(429);
    expect(result.error).toContain('rate limited');
  });
});


describe('Editor HTTP error handler contract', () => {
  let service: HttpErrorService;
  let signIn: jasmine.Spy;

  beforeEach(() => {
    signIn = jasmine.createSpy('signIn');
    service = new HttpErrorService(
      { signIn } as unknown as ConstructorParameters<typeof HttpErrorService>[0],
      { hasSharedSpinner: () => false } as unknown as ConstructorParameters<typeof HttpErrorService>[1]
    );
  });

  it('preserves a headerless network failure as status zero', () => {
    let received: HttpError;
    service.handle(new HttpErrorResponse({ status: 0 })).subscribe({ error: error => received = error });
    expect(received.status).toBe(0);
    expect(received.message).toContain('Sorry, there is a problem');
    expect(signIn).not.toHaveBeenCalled();
  });

  for (const contentType of ['absent', 'text/html', 'application/json']) {
    it(`redirects an unauthorised ${contentType} response without a body status`, () => {
      const headers = contentType === 'absent' ? new HttpHeaders() : new HttpHeaders({ 'Content-Type': contentType });
      let received: HttpError;
      service.handle(new HttpErrorResponse({ status: 401, headers, error: {} })).subscribe({ error: error => received = error });
      expect(received.status).toBe(401);
      expect(signIn).toHaveBeenCalledTimes(1);
    });
  }

  it('keeps an explicit JSON body status and callback references', () => {
    const details = { field: 'invalid' };
    const response = new HttpErrorResponse({ status: 500, headers: new HttpHeaders({ 'Content-Type': 'application/json' }), error: { status: 400, details } });
    const result = HttpErrorService.convertToHttpError(response);
    expect(result.status).toBe(400);
    expect(result.details).toBe(details);
  });

  it('retains forbidden and rate-limit mappings during conversion', () => {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const forbidden = HttpErrorService.convertToHttpError(new HttpErrorResponse({ status: 403, statusText: 'Forbidden', headers, error: { status: 400 } }));
    const limited = HttpErrorService.convertToHttpError(new HttpErrorResponse({ status: 429, headers }));
    expect(forbidden.status).toBe(403);
    expect(forbidden.error).toBe('Forbidden');
    expect(limited.status).toBe(429);
    expect(limited.error).toContain('rate limited');
  });

  it('preserves status zero on a plain error object', () => {
    const result = HttpErrorService.convertToHttpError({ status: 0, message: 'Network unavailable' });
    expect(result.status).toBe(0);
    expect(result.message).toBe('Network unavailable');
  });

  it('retains the default status for missing errors and errors without status', () => {
    expect(HttpErrorService.convertToHttpError(undefined).status).toBe(500);
    expect(HttpErrorService.convertToHttpError(null).status).toBe(500);
    const result = HttpErrorService.convertToHttpError(new Error('Unavailable'));
    expect(result.status).toBe(500);
    expect(result.message).toBe('Unavailable');
  });

  it('passes an existing HTTP error through unchanged', () => {
    const error = new HttpError();
    expect(HttpErrorService.convertToHttpError(error)).toBe(error);
  });

  it('does not redirect when authentication recovery is disabled', () => {
    let received: HttpError;
    service.handle(new HttpErrorResponse({ status: 401 }), false).subscribe({ error: error => received = error });
    expect(received.status).toBe(401);
    expect(signIn).not.toHaveBeenCalled();
  });

  it('uses the transport status when direct model conversion has no body status', () => {
    expect(HttpError.from(new HttpErrorResponse({ status: 404, error: {} })).status).toBe(404);
    expect(HttpError.from(new HttpErrorResponse({ status: 0 })).status).toBe(0);
  });
});
