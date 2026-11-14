export interface User {
  // Retain Common Lib's open-ended public user shape for existing consumers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  routerLink?: string;
  routerLinkTitle?: string;
  fullName?: string;
  email?: string;
  status?: string;
  resendInvite?: boolean;
}
