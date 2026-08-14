export type OrganizationRole = "OWNER" | "ADMIN" | "MANAGER" | "VIEWER";

export type PerkJoyRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CLIENT"
  | "VENDOR"
  | "EMPLOYEE";

export type AccessContext = {
  primaryRole: PerkJoyRole;
  roles: PerkJoyRole[];
  organizationRole: OrganizationRole | null;
};

const ROLE_PRIORITY: PerkJoyRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "CLIENT",
  "VENDOR",
  "EMPLOYEE",
];

export function resolveAccessContext(input: {
  isSuperAdmin?: boolean;
  organizationRole?: OrganizationRole | null;
  isVendor?: boolean;
  isEmployee?: boolean;
}): AccessContext {
  const roles = new Set<PerkJoyRole>();

  if (input.isSuperAdmin) roles.add("SUPER_ADMIN");
  if (input.organizationRole === "OWNER" || input.organizationRole === "ADMIN") {
    roles.add("ADMIN");
  } else if (input.organizationRole) {
    roles.add("CLIENT");
  }
  if (input.isVendor) roles.add("VENDOR");
  if (input.isEmployee) roles.add("EMPLOYEE");

  const orderedRoles = ROLE_PRIORITY.filter((role) => roles.has(role));
  return {
    primaryRole: orderedRoles[0] ?? "CLIENT",
    roles: orderedRoles.length ? orderedRoles : ["CLIENT"],
    organizationRole: input.organizationRole ?? null,
  };
}
