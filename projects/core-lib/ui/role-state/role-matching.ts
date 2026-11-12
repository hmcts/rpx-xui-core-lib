import type { Roles } from './role.service';

/** The matching modes used by the legacy role guard. */
export enum RoleMatching {
  ALL,
  ANY
}

/** Evaluate role patterns using the same ordering and regex semantics as the legacy guard. */
export function matchRoles(roles: Roles, neededRoles: string[], matching?: RoleMatching): boolean {
  const check = (roleRegEx: string) => {
    const regex = new RegExp(roleRegEx);
    return roles.some(role => regex.test(role));
  };
  return matching === RoleMatching.ALL ? neededRoles.every(check) : neededRoles.some(check);
}
