import { z } from "zod";
import type { Employee } from "./types";

const emptyStringToNull = (value: unknown) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text ? text : null;
};

const nullableText = (maximum = 200) => z.preprocess(emptyStringToNull, z.string().max(maximum).nullable());
const nullableDate = z.preprocess(emptyStringToNull, z.string().date().nullable());
const nullableUuid = z.preprocess(emptyStringToNull, z.string().uuid().nullable());
const nullableInteger = z.preprocess((value) => {
  const text = emptyStringToNull(value);
  return text === null ? null : Number(text);
}, z.number().int().nullable());

export const employeeInputSchema = z.object({
  employeeId: z.string().uuid().optional(),
  firstName: z.string().trim().min(1, "Please enter the employee's first name.").max(100),
  lastName: z.string().trim().min(1, "Please enter the employee's last name.").max(100),
  email: z.string().trim().toLowerCase().email("Please enter a valid work email.").max(320),
  phone: nullableText(40),
  jobTitle: nullableText(160),
  department: nullableText(160),
  managerEmployeeId: nullableUuid,
  managerEmail: nullableText(320),
  employeeNumber: nullableText(80),
  birthdayMonth: nullableInteger,
  birthdayDay: nullableInteger,
  hireDate: nullableDate,
  status: z.enum(["active", "inactive"]).default("active"),
  workMode: z.enum(["office", "remote", "hybrid"]).default("office"),
  preferredDelivery: z.enum(["workplace", "home", "digital_only"]).default("workplace"),
  organizationLocationId: nullableUuid,
  workLocation: nullableText(160),
  addressLine1: nullableText(200),
  addressLine2: nullableText(200),
  city: nullableText(120),
  state: nullableText(80),
  postalCode: nullableText(20),
  deliverySameAsWork: z.preprocess((value) => value === true || value === "true" || value === "on", z.boolean()).default(true),
  deliveryAddressLine1: nullableText(200),
  deliveryAddressLine2: nullableText(200),
  deliveryCity: nullableText(120),
  deliveryState: nullableText(80),
  deliveryPostalCode: nullableText(20),
}).superRefine((value, context) => {
  if ((value.birthdayMonth === null) !== (value.birthdayDay === null)) {
    context.addIssue({ code: "custom", path: [value.birthdayMonth === null ? "birthdayMonth" : "birthdayDay"], message: "Choose both a birthday month and day." });
    return;
  }
  if (value.birthdayMonth !== null && value.birthdayDay !== null) {
    const days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (value.birthdayMonth < 1 || value.birthdayMonth > 12 || value.birthdayDay < 1 || value.birthdayDay > days[value.birthdayMonth - 1]) {
      context.addIssue({ code: "custom", path: ["birthdayDay"], message: "Choose a valid birthday." });
    }
  }
  if (value.employeeId && value.managerEmployeeId === value.employeeId) {
    context.addIssue({ code: "custom", path: ["managerEmployeeId"], message: "An employee cannot be their own manager." });
  }
});

export type EmployeeInput = z.infer<typeof employeeInputSchema>;

export const employeeCsvFields = [
  "first_name", "last_name", "email", "phone", "birthday_month", "birthday_day",
  "hire_date", "department", "job_title", "manager_email", "employee_id",
  "work_location", "address_line_1", "address_line_2", "city", "state", "postal_code",
] as const;

export type EmployeeCsvField = typeof employeeCsvFields[number];
export type EmployeeCsvRow = Record<EmployeeCsvField, string> & { sourceRow: number };

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell.trim()); cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function csvRowsFromMapping(rows: string[][], mapping: Record<EmployeeCsvField, number | null>) {
  return rows.slice(1).map((values, index) => Object.assign(
    Object.fromEntries(employeeCsvFields.map((field) => [field, mapping[field] === null ? "" : (values[mapping[field] as number] ?? "").trim()])),
    { sourceRow: index + 2 },
  ) as unknown as EmployeeCsvRow);
}

export function employeeInputFromCsv(row: EmployeeCsvRow): EmployeeInput {
  return employeeInputSchema.parse({
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    birthdayMonth: row.birthday_month,
    birthdayDay: row.birthday_day,
    hireDate: row.hire_date,
    department: row.department,
    jobTitle: row.job_title,
    employeeNumber: row.employee_id,
    workLocation: row.work_location,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    managerEmployeeId: null,
    managerEmail: row.manager_email,
    status: "active",
    workMode: "office",
    preferredDelivery: "workplace",
    organizationLocationId: null,
    deliverySameAsWork: true,
  });
}

export function employeeFormDefaults(employee?: Employee): Record<string, string | boolean> {
  return {
    firstName: employee?.firstName ?? "",
    lastName: employee?.lastName ?? "",
    email: employee?.email ?? "",
    phone: employee?.phone ?? "",
    jobTitle: employee?.jobTitle ?? "",
    department: employee?.department ?? "General",
    managerEmployeeId: employee?.managerEmployeeId ?? "",
    employeeNumber: employee?.employeeNumber ?? "",
    birthdayMonth: employee?.birthdayMonth ? String(employee.birthdayMonth) : "",
    birthdayDay: employee?.birthdayDay ? String(employee.birthdayDay) : "",
    hireDate: employee?.hireDate ?? "",
    status: employee?.status ?? "active",
    workMode: employee?.workMode ?? "office",
    preferredDelivery: employee?.preferredDelivery ?? "workplace",
    organizationLocationId: employee?.locationId ?? "",
    workLocation: employee?.workLocation ?? "",
    addressLine1: employee?.addressLine1 ?? "",
    addressLine2: employee?.addressLine2 ?? "",
    city: employee?.city ?? "",
    state: employee?.state ?? "",
    postalCode: employee?.postalCode ?? "",
    deliverySameAsWork: employee?.deliverySameAsWork !== false,
    deliveryAddressLine1: employee?.deliveryAddressLine1 ?? "",
    deliveryAddressLine2: employee?.deliveryAddressLine2 ?? "",
    deliveryCity: employee?.deliveryCity ?? "",
    deliveryState: employee?.deliveryState ?? "",
    deliveryPostalCode: employee?.deliveryPostalCode ?? "",
  };
}
