import { InjectionToken, Type } from '@angular/core';
import type { CaseField } from '../../domain/definition/case-field.model';

export interface PaletteRegistry {
  // Preserve the Toolkit registry type, including its broad component return type.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  getFieldComponentClass(caseField: CaseField, write: boolean): Type<{}>;
}

export const PALETTE_REGISTRY = new InjectionToken<Type<PaletteRegistry>>('Palette registry service token');
