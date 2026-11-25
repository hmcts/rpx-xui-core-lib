import { describe, expect, it } from 'vitest';
import { createRichTextHost } from './rich-text-host';

export const registered = true;
describe('Rich text migration contract', () => {
  it('renders the real editable control and formatting toolbar', async () => {
    const fixture = await createRichTextHost();
    expect(fixture.nativeElement.querySelector('[contenteditable=true]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[aria-label="Numbered List"]')).not.toBeNull();
    fixture.destroy();
  });
});
