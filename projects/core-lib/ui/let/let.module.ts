import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { LetDirective } from './let.directive';

@NgModule({ declarations: [LetDirective], imports: [CommonModule], exports: [LetDirective] })
export class LetModule {}
