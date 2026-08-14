import assert from "node:assert/strict";
import test from "node:test";
import { resolveAccessContext } from "../lib/access-control";

test("prioritizes a server-managed super admin assignment", () => {
  assert.deepEqual(resolveAccessContext({
    isSuperAdmin: true,
    organizationRole: "OWNER",
  }), {
    primaryRole: "SUPER_ADMIN",
    roles: ["SUPER_ADMIN", "ADMIN"],
    organizationRole: "OWNER",
  });
});

test("maps organization administrators and clients to product roles", () => {
  assert.equal(resolveAccessContext({ organizationRole: "ADMIN" }).primaryRole, "ADMIN");
  assert.equal(resolveAccessContext({ organizationRole: "MANAGER" }).primaryRole, "CLIENT");
  assert.equal(resolveAccessContext({ organizationRole: "VIEWER" }).primaryRole, "CLIENT");
});

test("supports vendor and employee portal identities without metadata authorization", () => {
  assert.deepEqual(resolveAccessContext({ isVendor: true }).roles, ["VENDOR"]);
  assert.deepEqual(resolveAccessContext({ isEmployee: true }).roles, ["EMPLOYEE"]);
});
