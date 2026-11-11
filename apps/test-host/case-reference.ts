import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { CaseReferenceModule } from '@hmcts/rpx-xui-core-lib/case/reference';

@Component({
  selector: 'core-reference-host',
  imports: [CaseReferenceModule],
  template: `<main>
    <label for="case-reference-input">Case reference</label>
    <input id="case-reference-input" [value]="reference" (input)="update($event)">
    <p data-testid="formatted-reference">{{ reference | ccdCaseReference }}</p>
  </main>`,
})
class CaseReferenceGallery {
  reference = '';
  update(event: Event) { this.reference = (event.target as HTMLInputElement).value; }
}

export function startCaseReferenceGallery() { return bootstrapApplication(CaseReferenceGallery); }
