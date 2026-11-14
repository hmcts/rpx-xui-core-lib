import { WriteLinkedCasesFieldComponent } from './linked-cases/write-linked-cases-field.component';
import { ReadLinkedCasesFieldComponent } from './linked-cases/read-linked-cases-field.component';
import { UnsupportedFieldComponent } from './unsupported-field.component';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PaletteService } from './palette.service';
import { PALETTE_PROVIDER } from './palette-provider';
import { FieldReadComponent } from './base-field/field-read.component';
import { FieldWriteComponent } from './base-field/field-write.component';

describe('palette registry provider', () => {
  for (const [name, component] of [['read', FieldReadComponent], ['write', FieldWriteComponent]] as const) {
    it(`uses a child PaletteService override for ${name} rendering`, () => {
      const override = new PaletteService();
      TestBed.configureTestingModule({ declarations: [component], providers: [PaletteService, PALETTE_PROVIDER] });
      TestBed.overrideComponent(component, { set: { template: '', providers: [{ provide: PaletteService, useValue: override }] } });
      const fixture = TestBed.createComponent(component as Type<FieldReadComponent | FieldWriteComponent>);
      expect((fixture.componentInstance as unknown as { paletteService: PaletteService }).paletteService).toBe(override);
    });
  }
  it('selects the existing linked-case read and write components and falls back for unknown launchers', () => {
    const registry = new PaletteService();
    const field = { field_type: { type: 'ComponentLauncher' }, display_context_parameter: '#ARGUMENT(LinkedCases)' } as unknown as Parameters<typeof registry.getFieldComponentClass>[0];
    expect(registry.getFieldComponentClass(field, true)).toBe(WriteLinkedCasesFieldComponent);
    expect(registry.getFieldComponentClass(field, false)).toBe(ReadLinkedCasesFieldComponent);
    field.display_context_parameter = '#ARGUMENT(Unknown)';
    expect(registry.getFieldComponentClass(field, true)).toBe(UnsupportedFieldComponent);
  });

});

export const registered = true;
