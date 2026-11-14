import * as marked from 'marked';
import { MarkdownComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/markdown/markdown.component';

export const registered = true;

type Dependencies = ConstructorParameters<typeof MarkdownComponent>;
const router = {} as Dependencies[0];
const renderer = {} as Dependencies[1];
const zone = {} as Dependencies[2];

describe('Markdown rendering migration contract', () => {
  const originalRenderer = marked.defaults.renderer;
  afterEach(() => marked.setOptions({ renderer: originalRenderer }));

  it('keeps relative markdown links and their labels', () => {
    const changes = { markForCheck: jasmine.createSpy('markForCheck') };
    const component = new MarkdownComponent(router, renderer, zone, changes as unknown as Dependencies[3]);
    component.content = '[Case details](/cases/123)';
    component.ngOnInit();
    expect(marked.parse(component.content)).toContain('<a href="/cases/123">Case details</a>');
    expect(changes.markForCheck).toHaveBeenCalled();
  });

  it('leaves a bare external URL as text', () => {
    const component = new MarkdownComponent(router, renderer, zone, { markForCheck() {} } as unknown as Dependencies[3]);
    component.content = 'https://example.com/path';
    component.ngOnInit();
    expect(marked.parse(component.content)).not.toContain('<a ');
  });
});
