export interface Journey {
    next(): void;
    previous(): void;
    hasNext(): boolean;
    hasPrevious(): boolean;
    isFinished(): boolean;
    isStart(): boolean;
    onPageChange(): void;
    journeyId: string;
    journeyPageNumber: number;
    journeyStartPageNumber: number;
    journeyEndPageNumber: number;
    journeyPreviousPageNumber: number;
    childJourney: Journey;
    fieldState?: number;
    linkedCasesPage?: number;
    // Preserve the Toolkit public type until consumers migrate.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    searchLanguageInterpreterHint?: any;
}
