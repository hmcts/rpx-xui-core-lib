import { Injectable } from '@angular/core';
import { SearchResultViewColumn } from '../../../domain/search/search-result-view-column.model';
import { SearchResultViewItem } from '../../../domain/search/search-result-view-item.model';
import { SearchResultViewItemComparator } from '../../../domain/search/sorting/search-result-view-item-comparator';

@Injectable()
export class SearchResultViewItemComparatorFactory {
  public createSearchResultViewItemComparator(column: SearchResultViewColumn): SearchResultViewItemComparator {
    const fieldId = column.case_field_id;
    switch (column.case_field_type.type) {
      case ('MultiSelectList'): {
        return this.textArrayComparator(fieldId);
      }
      case ('Number'):
      case ('MoneyGBP'): {
        return this.numberComparator(fieldId);
      }
      case ('Text'):
      case ('TextArea'):
      case ('RichTextArea'):
      case ('Email'):
      case ('Date'):
      case ('DateTime'):
      case ('Label'):
      case ('Postcode'):
      case ('YesOrNo'):
      case ('PhoneUK'):
      case ('FixedList'): {
        return this.stringComparator(fieldId);
      }
      default: {
        return undefined;
      }
    }
  }

  private numberComparator(fieldId: string): SearchResultViewItemComparator {
    return {
      compare(a: SearchResultViewItem, b: SearchResultViewItem) {
        let fieldA = (a.case_fields as Record<string, number>)[fieldId];
        let fieldB = (b.case_fields as Record<string, number>)[fieldId];
        fieldA = fieldA === undefined || fieldA === null ? 0 : fieldA;
        fieldB = fieldB === undefined || fieldB === null ? 0 : fieldB;
        return fieldA - fieldB;
      }
    } as SearchResultViewItemComparator;
  }

  private stringComparator(fieldId: string) {
    return {
      compare(a: SearchResultViewItem, b: SearchResultViewItem) {
        let fieldA = (a.case_fields as Record<string, string>)[fieldId];
        let fieldB = (b.case_fields as Record<string, string>)[fieldId];
        fieldA = fieldA === undefined || fieldA === null ? '' : fieldA.toLowerCase();
        fieldB = fieldB === undefined || fieldB === null ? '' : fieldB.toLowerCase();
        return fieldA === fieldB ? 0 : fieldA > fieldB ? 1 : -1;
      }
    } as SearchResultViewItemComparator;
  }

  private textArrayComparator(fieldId: string) {
    return {
      compare(a: SearchResultViewItem, b: SearchResultViewItem) {
        const valuesA = (a.case_fields as Record<string, string[]>)[fieldId];
        const valuesB = (b.case_fields as Record<string, string[]>)[fieldId];
        const fieldA = valuesA === undefined || valuesA === null ? '' : valuesA.join().toLowerCase();
        const fieldB = valuesB === undefined || valuesB === null ? '' : valuesB.join().toLowerCase();
        return fieldA === fieldB ? 0 : fieldA > fieldB ? 1 : -1;
      }
    } as SearchResultViewItemComparator;
  }
}
