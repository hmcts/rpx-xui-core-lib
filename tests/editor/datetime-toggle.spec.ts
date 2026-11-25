import { describe, expect, it } from 'vitest';
import { createDatetimeToggleHost } from './datetime-toggle-host';

export const registered = true;

describe('Datetime toggle integration', () => {
  it('focuses the toggle and opens the picker on click', async () => {
    const fixture = await createDatetimeToggleHost();
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('ngx-mat-datepicker-toggle button') as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.disabled).toBe(false);
    button.focus();
    expect(document.activeElement).toBe(button);
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelector('ngx-mat-calendar')).not.toBeNull();
  });
});
