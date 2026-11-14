import { of } from 'rxjs';
import { RpxTranslationService } from '@hmcts/rpx-xui-core-lib/i18n';
import { TestBed } from '@angular/core/testing';
import { DateInputComponent as CoreDateInput, DateInputModule } from '@hmcts/rpx-xui-core-lib/case/editor-date';
import { DateInputComponent as EditorDateInput } from '../../projects/core-lib/case/editor-source/lib/components/form/date-input/date-input.component';
import { FormModule } from '../../projects/core-lib/case/editor-source/lib/components/form/form.module';

export const registered = true;

describe('Editor date input shared identity', () => {
  it('uses the existing Core component class and compiles both modules', async () => {
    expect(EditorDateInput).toBe(CoreDateInput);
    await TestBed.configureTestingModule({ imports: [FormModule, DateInputModule], providers: [{ provide: RpxTranslationService, useValue: { getTranslation$: (value: string) => of(value) } }] }).compileComponents();
    expect(TestBed.createComponent(CoreDateInput).componentInstance).toBeInstanceOf(CoreDateInput);
  });
});
