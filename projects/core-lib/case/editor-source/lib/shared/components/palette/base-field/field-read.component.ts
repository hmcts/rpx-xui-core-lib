import { Inject, Component, ComponentFactoryResolver, Injector, Input, Type, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { plainToClassFromExist } from 'class-transformer';
import { CaseField } from '../../../domain/definition/case-field.model';
import { PALETTE_REGISTRY, PaletteRegistry } from '../palette-token';
import { AbstractFieldReadComponent } from './abstract-field-read.component';

const FIX_CASEFIELD_FOR = ['FixedList', 'DynamicList', 'DynamicMultiSelectList'];

@Component({
  selector: 'ccd-field-read',
  templateUrl: './field-read.html',
  standalone: false
})
export class FieldReadComponent extends AbstractFieldReadComponent implements OnInit {
  private readonly paletteService: PaletteRegistry;
  @Input()
  public withLabel = false;

  @Input()
  public formGroup: FormGroup = new FormGroup({});

  @Input()
  public caseFields: CaseField[] = [];


  @ViewChild('fieldContainer', { static: false, read: ViewContainerRef })
  public fieldContainer: ViewContainerRef;

  constructor(private readonly resolver: ComponentFactoryResolver, @Inject(PALETTE_REGISTRY) registryToken: Type<PaletteRegistry>, injector: Injector) {
    super();
    this.paletteService = injector.get(registryToken);
  }

  public ngOnInit(): void {
    // Ensure all field values are resolved by label interpolation before the component is fully initialised.
    Promise.resolve(null).then(() => {
      const componentClass = this.paletteService.getFieldComponentClass(this.caseField, false);
      const injector = Injector.create({
        providers: [],
        parent: this.fieldContainer?.injector
      });

      const component = this.resolver.resolveComponentFactory(componentClass).create(injector);

      // Provide component @Inputs
      // Only Fixed list use plainToClassFromExist
      // Better performance
      // TODO AW 30/12/20 figure out why FixedLists need plainToClassFromExist
      // Added a check to make sure it's NOT already a CaseField and then
      // assigning it back to this.caseField so we don't create separation.
      if (FIX_CASEFIELD_FOR.indexOf(this.caseField.field_type.type) > -1 && !(this.caseField instanceof CaseField)) {
        this.caseField = plainToClassFromExist(new CaseField(), this.caseField);
      }
      const instance = component.instance as Record<string, unknown>;
      instance['caseField'] = this.caseField;
      instance['caseFields'] = this.caseFields;
      instance['formGroup'] = this.formGroup;
      instance['topLevelFormGroup'] = this.topLevelFormGroup;
      instance['idPrefix'] = this.idPrefix;
      instance['parent'] = this.parent;
      instance['caseReference'] = this.caseReference;
      instance['context'] = this.context;
      instance['labelCanBeTranslated'] = this.labelCanBeTranslated(this.caseField);

      this.fieldContainer?.insert(component.hostView);
    });
  }

  private labelCanBeTranslated(caseField: CaseField): boolean {
    return !!(caseField.field_type.type === 'Label' && caseField.label);
  }
}
