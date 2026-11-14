import type { ErrorMessage } from '../../../../domain/error-message.model';
import { FlagDetailDisplayWithFormGroupPath } from './case-flag.model';

export interface CaseFlagState {
  currentCaseFlagFieldState: number;
  isParentFlagType?: boolean;
  errorMessages: ErrorMessage[];
  selectedFlag?: FlagDetailDisplayWithFormGroupPath;
}
