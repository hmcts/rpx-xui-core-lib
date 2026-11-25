import { Pipe, PipeTransform, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { DeleteOrCancelDialogComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/dialogs/delete-or-cancel-dialog/delete-or-cancel-dialog.component';
import { DocumentDialogComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/dialogs/document-dialog/document-dialog.component';
import { RemoveDialogComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/dialogs/remove-dialog/remove-dialog.component';
import { SaveOrDiscardDialogComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/dialogs/save-or-discard-dialog/save-or-discard-dialog.component';

@Pipe({ name: 'rpxTranslate', standalone: false })
export class TranslateStub implements PipeTransform { transform(value: string) { return value; } }

export const dialogs: Type<{ cancel(): void }>[] = [DeleteOrCancelDialogComponent, DocumentDialogComponent, RemoveDialogComponent, SaveOrDiscardDialogComponent];

export async function createDialog(index: number) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({ declarations: [...dialogs, TranslateStub], providers: [{ provide: MatDialogRef, useValue: { close: (value: string) => { document.body.dataset.dialogResult = value; } } }] }).compileComponents();
  const fixture = TestBed.createComponent(dialogs[index]);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  return fixture;
}
