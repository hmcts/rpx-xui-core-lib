import { AddressModel } from './address.model';

export class AddressOption {
  public description: string;
  public value?: AddressModel;

  constructor(addressModel: AddressModel | undefined, description: string | null) {
    if (description === null && addressModel) {
      this.value = addressModel;
      this.description = this.getDescription();
    } else {
      this.description = description ?? '';
    }
  }

  private getDescription(): string {
    const address = this.value;
    return `${address?.addressLine1 ?? ''}${address?.addressLine2 ? `, ${address.addressLine2}` : ''}${address?.addressLine3 ? `, ${address.addressLine3}` : ''}, ${address?.postTown ?? ''}`.replace(/^, /, '');
  }
}
