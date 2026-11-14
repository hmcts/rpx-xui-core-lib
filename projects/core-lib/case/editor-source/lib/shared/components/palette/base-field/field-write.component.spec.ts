import { Component, DebugElement, SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { plainToClassFromExist } from 'class-transformer';
import { CaseField } from '../../../domain/definition/case-field.model';
import { FormValidatorsService } from '../../../services';
import { PaletteService } from '../palette.service';
import { PALETTE_REGISTRY } from '../palette-token';
import { FieldWriteComponent } from './field-write.component';
import createSpyObj = jasmine.createSpyObj;

const CLASS = 'person-first-name-cls';

@Component({
  template: `
    <div class="${CLASS}"></div>
  `,
  standalone: false
})
class FieldTestComponent {
  public ignoreMandatory = false;
}

describe('FieldWriteComponent', () => {
  const CASE_FIELD: CaseField = plainToClassFromExist(new CaseField(), {
    id: 'PersonFirstName',
    field_type: {
      id: 'Text',
      type: 'Text'
    },
    display_context: 'OPTIONAL',
    label: 'First name',
  });

  let fixture: ComponentFixture<FieldWriteComponent>;
  let component: FieldWriteComponent;
  let de: DebugElement;

  let paletteService: jasmine.SpyObj<PaletteService>;
  let formValidatorService: jasmine.SpyObj<FormValidatorsService>;

  let formGroup: FormGroup;
  const caseFields: CaseField[] = [CASE_FIELD];

  beforeEach(async () => {
    formValidatorService = createSpyObj<FormValidatorsService>('formValidatorService', ['addValidators']);
    paletteService = createSpyObj<PaletteService>('paletteService', [
      'getFieldComponentClass'
    ]);
    paletteService.getFieldComponentClass.and.returnValue(FieldTestComponent);

    formGroup = new FormGroup({});

    TestBed
      .configureTestingModule({
        imports: [
          ReactiveFormsModule
        ],
        declarations: [
          FieldWriteComponent,
          FieldTestComponent
        ],
        providers: [
          { provide: PaletteService, useValue: paletteService },
          { provide: PALETTE_REGISTRY, useValue: PaletteService },
          { provide: FormValidatorsService, useValue: formValidatorService },
        ]
      })
      .compileComponents();

    fixture = TestBed.createComponent(FieldWriteComponent);
    component = fixture.componentInstance;

    component.caseField = CASE_FIELD;
    component.caseFields = caseFields;
    component.formGroup = formGroup;

    de = fixture.debugElement;
    fixture.detectChanges();
  });

  it('should get field write class from PaletteService', () => {
    expect(paletteService.getFieldComponentClass).toHaveBeenCalledWith(CASE_FIELD, true);
  });

  it('should inject component instance as child', () => {
    const divWrapper = de.children[0];
    const ngContent = divWrapper.children[0];
    expect(ngContent.children.length).toBe(1);

    const fieldTestComponent = ngContent.children[0];
    expect(fieldTestComponent.attributes['class']).toEqual(CLASS);

    const fieldTest = fieldTestComponent.componentInstance;
    expect(fieldTest.caseField).toEqual(CASE_FIELD);
    expect(fieldTest.caseFields).toBe(caseFields);
    expect(fieldTest.formGroup).toBe(formGroup);
  });

  it('should refresh child inputs when host inputs change', () => {
    const divWrapper = de.children[0];
    const ngContent = divWrapper.children[0];
    const fieldTestComponent = ngContent.children[0];
    const fieldTest = fieldTestComponent.componentInstance;

    const newFormGroup = new FormGroup({});
    const newCaseFields = [plainToClassFromExist(new CaseField(), {
      id: 'AnotherField',
      field_type: {
        id: 'Text',
        type: 'Text'
      },
      display_context: 'OPTIONAL'
    })];

    component.formGroup = newFormGroup;
    component.caseFields = newCaseFields;
    component.idPrefix = 'prefix_';
    component.parent = new FormGroup({});
    component.isExpanded = true;
    component.isInSearchBlock = true;
    component.ngOnChanges({
      formGroup: new SimpleChange(formGroup, newFormGroup, false),
      caseFields: new SimpleChange(caseFields, newCaseFields, false),
      idPrefix: new SimpleChange('', 'prefix_', false),
      parent: new SimpleChange(undefined, component.parent, false),
      isExpanded: new SimpleChange(false, true, false),
      isInSearchBlock: new SimpleChange(false, true, false)
    });
    fixture.detectChanges();

    expect(fieldTest.formGroup).toBe(newFormGroup);
    expect(fieldTest.caseFields).toBe(newCaseFields);
    expect(fieldTest.idPrefix).toBe('prefix_');
    expect(fieldTest.parent).toBe(component.parent);
    expect(fieldTest.isExpanded).toBe(true);
    expect(fieldTest.isInSearchBlock).toBe(true);
  });

  it('should set ignoreMandatory on AddressGlobal child components', () => {
    const addressGlobalField = plainToClassFromExist(new CaseField(), {
      id: 'RespondentAddress',
      field_type: {
        id: 'AddressGlobal',
        type: 'Complex'
      },
      display_context: 'OPTIONAL',
      label: 'Address'
    });

    const addressFixture = TestBed.createComponent(FieldWriteComponent);
    const addressComponent = addressFixture.componentInstance;
    addressComponent.caseField = addressGlobalField;
    addressComponent.caseFields = [addressGlobalField];
    addressComponent.formGroup = new FormGroup({});
    addressFixture.detectChanges();

    const childComponent = addressFixture.debugElement.children[0].children[0].children[0].componentInstance;
    expect(childComponent.ignoreMandatory).toBe(true);
  });

  it('should ignore ngOnChanges before the child component is created', () => {
    const freshComponent = TestBed.createComponent(FieldWriteComponent).componentInstance;

    expect(() => freshComponent.ngOnChanges({
      idPrefix: new SimpleChange('', 'prefix_', true)
    })).not.toThrow();
  });


});

export const registered = true;
