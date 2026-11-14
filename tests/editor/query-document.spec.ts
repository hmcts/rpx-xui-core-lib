import { QueryManagementUtils } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/query-management/utils/query-management.utils';
import { QueryAttachmentsReadComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/query-management/components/query-attachments-read/query-attachments-read.component';

export const registered = true;

describe('Query attachment migration contract', () => {
  it('preserves document links and filename in the CCD collection format', () => {
    const result = QueryManagementUtils.documentToCollectionFormDocument({ originalDocumentName: 'file.pdf', _links: { self: { href: '/doc' }, binary: { href: '/binary' } } } as unknown as Parameters<typeof QueryManagementUtils.documentToCollectionFormDocument>[0]);
    expect(result).toEqual({ id: null, value: { document_filename: 'file.pdf', document_url: '/doc', document_binary_url: '/binary' } });
  });
  it('passes collection entries unchanged to the read field', () => {
    const component = new QueryAttachmentsReadComponent();
    const attachments = [QueryManagementUtils.documentToCollectionFormDocument({ originalDocumentName: 'file.pdf', _links: { self: { href: '/doc' }, binary: { href: '/binary' } } } as unknown as Parameters<typeof QueryManagementUtils.documentToCollectionFormDocument>[0])];
    component.attachments = attachments;
    component.ngOnChanges();
    expect(component.caseFieldWithAttachments.value).toBe(attachments);
  });
});
