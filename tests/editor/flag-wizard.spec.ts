import { describe, expect, it } from 'vitest';
import { createFlagWriterFixture } from './flag-writer-host';

describe('Case flag writer rendered journey', () => {
  it('preserves persisted details through the real writer location type and comment stages', async () => {
    const { fixture, flags, refdata, reviewRequested } = await createFlagWriterFixture();
    expect(fixture.nativeElement.querySelector('ccd-select-flag-location')).not.toBeNull();
    expect(fixture.componentInstance.formGroup.errors).toEqual({ notAllCaseFlagStagesCompleted: true });
    const selectRadio = (): void => {
      const input = fixture.nativeElement.querySelector('input[type="radio"]') as HTMLInputElement;
      expect(input).not.toBeNull();
      input.click();
      fixture.detectChanges();
    };
    selectRadio();
    fixture.componentInstance.next();
    fixture.detectChanges();
    refdata.next([{ name: 'Root', childFlags: [{ name: 'New concern', flagCode: 'NEW', isParent: false, flagComment: true, Path: ['Root', 'New concern'] }] }]);
    fixture.detectChanges();
    selectRadio();
    fixture.componentInstance.next();
    fixture.detectChanges();
    expect(flags.value.details).toHaveLength(1);
    expect(flags.formatted_value.details).toHaveLength(1);
    const comment = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
    expect(comment).not.toBeNull();
    comment.value = 'Synthetic safety concern';
    comment.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    fixture.componentInstance.next();
    fixture.detectChanges();
    expect(reviewRequested()).toBe(true);
    expect(flags.value.details).toHaveLength(2);
    expect(flags.value.details[0].id).toBe('existing');
    expect(flags.value.details[1].value.name).toBe('New concern');
    expect(fixture.componentInstance.formGroup.valid).toBe(true);
    fixture.destroy();
  });
});
