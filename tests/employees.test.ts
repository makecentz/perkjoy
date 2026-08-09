import assert from "node:assert/strict";
import test from "node:test";
import { csvRowsFromMapping, employeeCsvFields, employeeInputFromCsv, employeeInputSchema, parseCsv } from "../lib/employees";

test("parses quoted CSV fields and maps PerkJoy employee columns", () => {
  const rows = parseCsv('first_name,last_name,email,department\n"Jordan","Lee","JORDAN@example.com","People, Culture"');
  const mapping = Object.fromEntries(employeeCsvFields.map((field) => [field, rows[0].indexOf(field)]).map(([field, index]) => [field, Number(index) < 0 ? null : index])) as Record<(typeof employeeCsvFields)[number], number | null>;
  const mapped = csvRowsFromMapping(rows, mapping);
  const employee = employeeInputFromCsv(mapped[0]);
  assert.equal(employee.email, "jordan@example.com");
  assert.equal(employee.department, "People, Culture");
  assert.equal(mapped[0].sourceRow, 2);
});

test("rejects incomplete or invalid birthday values", () => {
  const base = { firstName: "Jordan", lastName: "Lee", email: "jordan@example.com" };
  assert.equal(employeeInputSchema.safeParse({ ...base, birthdayMonth: 2, birthdayDay: "" }).success, false);
  assert.equal(employeeInputSchema.safeParse({ ...base, birthdayMonth: 2, birthdayDay: 30 }).success, false);
  assert.equal(employeeInputSchema.safeParse({ ...base, birthdayMonth: 2, birthdayDay: 29 }).success, true);
});

test("prevents an employee from being assigned as their own manager", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const result = employeeInputSchema.safeParse({ firstName: "Jordan", lastName: "Lee", email: "jordan@example.com", employeeId: id, managerEmployeeId: id });
  assert.equal(result.success, false);
});
