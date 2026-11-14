import { DocumentManagementService } from '../../projects/core-lib/case/editor-source/lib/shared/services/document-management/document-management.service';
import { DocumentTreeNode } from '../../projects/core-lib/case/editor-source/lib/shared/domain/case-file-view/document-tree-node/document-tree-node.model';
import { DocumentTreeNodeType } from '../../projects/core-lib/case/editor-source/lib/shared/domain/case-file-view/document-tree-node/document-tree-node-type.model';
import { CaseFileViewSortColumns } from '../../projects/core-lib/case/editor-source/lib/shared/domain/case-file-view/case-file-view-sort-columns.enum';
import { SortOrder } from '../../projects/core-lib/case/editor-source/lib/shared/domain/sort-order.enum';

export const registered = true;

describe('Document tree migration contract', () => {
  it('sorts document children recursively and retains document counts', () => {
    const root = new DocumentTreeNode();
    const folder = new DocumentTreeNode();
    folder.type = DocumentTreeNodeType.FOLDER;
    const a = Object.assign(new DocumentTreeNode(), { name: 'A', type: DocumentTreeNodeType.DOCUMENT });
    const b = Object.assign(new DocumentTreeNode(), { name: 'B', type: DocumentTreeNodeType.DOCUMENT });
    folder.children = [b, a];
    root.children = [folder];
    expect(root.childDocumentCount).toBe(2);
    root.sortChildrenAscending(CaseFileViewSortColumns.DOCUMENT_NAME, SortOrder.ASCENDING);
    expect(folder.children.map(item => item.name)).toEqual(['A', 'B']);
    root.sortChildrenDescending(CaseFileViewSortColumns.DOCUMENT_NAME, SortOrder.DESCENDING);
    expect(folder.children.map(item => item.name)).toEqual(['B', 'A']);
    expect(root.childDocumentCount).toBe(2);
  });
});

describe('Document type migration contract', () => {
  it('recognises HTML only by the allowed MIME type or missing-MIME extension fallback', () => {
    const service = Object.create(DocumentManagementService.prototype) as DocumentManagementService;
    expect(service.isHtmlDocument({ content_type: ' Text/HTML; charset=utf-8', document_filename: 'file.pdf' })).toBeTrue();
    expect(service.isHtmlDocument({ document_filename: 'file.HTML' })).toBeTrue();
    expect(service.isHtmlDocument({ content_type: 'application/pdf', document_filename: 'file.html' })).toBeFalse();
    expect(service.isHtmlDocument({ content_type: 'application/xhtml+xml', document_filename: 'file.html' })).toBeFalse();
    expect(service.isHtmlDocument({ document_filename: 'file.pdf' })).toBeFalse();
  });
});
