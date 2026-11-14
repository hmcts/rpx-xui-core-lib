import { ReadLinkedCasesFieldComponent } from '../../projects/core-lib/case/editor-source/lib/shared/components/palette/linked-cases/read-linked-cases-field.component';

export const registered = true;

describe('Linked cases display migration contract', () => {
  it('keeps incoming and outgoing lookup failures separate', () => {
    const component = new ReadLinkedCasesFieldComponent({} as unknown as ConstructorParameters<typeof ReadLinkedCasesFieldComponent>[0], {} as unknown as ConstructorParameters<typeof ReadLinkedCasesFieldComponent>[1], {} as unknown as ConstructorParameters<typeof ReadLinkedCasesFieldComponent>[2], {} as unknown as ConstructorParameters<typeof ReadLinkedCasesFieldComponent>[3], {} as unknown as ConstructorParameters<typeof ReadLinkedCasesFieldComponent>[4]);
    component.getFailureLinkedToNotification(true);
    expect(component.isServerLinkedToError).toBeTrue();
    expect(component.isServerLinkedFromError).toBeFalse();
    component.getFailureLinkedFromNotification(true);
    expect(component.isServerLinkedFromError).toBeTrue();
  });
});
