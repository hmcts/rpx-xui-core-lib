import { TestBed } from '@angular/core/testing';
import { Params, provideRouter, Router } from '@angular/router';
import { ConvertHrefToRouterService } from '../../projects/core-lib/case/editor-source/lib/shared/components/case-editor/services/convert-href-to-router.service';

export const registered = true;

describe('Editor link navigation', () => {
  it('preserves the legacy no-query navigation argument', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    new ConvertHrefToRouterService(router).callAngularRouter('/cases');
    expect(navigate).toHaveBeenCalledWith(['/cases'], { queryParams: '' as unknown as Params });
    // Angular normalizes the old empty-string fallback and null to the same URL.
    const oldTree = router.createUrlTree(['/cases'], { queryParams: '' as unknown as Params });
    const newTree = router.createUrlTree(['/cases'], { queryParams: null });
    expect(router.serializeUrl(newTree)).toBe(router.serializeUrl(oldTree));
  });

  it('preserves parsed query parameters', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const router = TestBed.inject(Router);
    const navigate = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    new ConvertHrefToRouterService(router).callAngularRouter('/cases?state=open&page=2');
    expect(navigate).toHaveBeenCalledWith(['/cases'], { queryParams: { state: 'open', page: '2' } });
  });
});
