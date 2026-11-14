import { CaseFileViewFolderComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/case-file-view/components/case-file-view-folder/case-file-view-folder.component';

export const registered = true;

describe('Document folder predicate migration contract', () => {
  it('preserves folder recognition for empty and populated child arrays', () => {
    const folder = new CaseFileViewFolderComponent({} as unknown as ConstructorParameters<typeof CaseFileViewFolderComponent>[0], {} as unknown as ConstructorParameters<typeof CaseFileViewFolderComponent>[1], {} as unknown as ConstructorParameters<typeof CaseFileViewFolderComponent>[2], {} as unknown as ConstructorParameters<typeof CaseFileViewFolderComponent>[3]);
    type Item = Parameters<typeof folder.nestedChildren>[1];
    const children: Item['children'] = [];
    const node = { children } as unknown as Item;
    expect(folder.nestedChildren(0, node)).toBe(children);
    expect(folder.hasNestedChildren(0, node)).toBeTrue();
    expect(folder.hasNestedChildren(0, { children: [{}] } as unknown as Item)).toBeTrue();
    expect(folder.nestedChildren(0, {} as unknown as Item)).toBeUndefined();
    expect(folder.hasNestedChildren(0, {} as unknown as Item)).toBeFalse();
  });
});
