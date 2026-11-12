export class AnonymousFeatureUser {
  public anonymous: true;
}

export class LoggedInFeatureUser {
  public key: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Preserve the published legacy feature user index signature for existing consumers.
  [key: string]: any;
  public roles: string[];
  public orgId: string;
}

export type FeatureUser = AnonymousFeatureUser | LoggedInFeatureUser;
