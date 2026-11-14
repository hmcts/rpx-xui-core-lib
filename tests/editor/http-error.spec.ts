import { HttpErrorResponse } from '@angular/common/http';
import { HttpError } from '../../projects/core-lib/case/editor-source/lib/shared/domain/http/http-error.model';

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
