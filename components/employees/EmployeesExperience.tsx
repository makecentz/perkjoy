"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle, ArrowLeft, Award, BriefcaseBusiness, CakeSlice, CalendarDays,
  Check, ChevronLeft, ChevronRight, CircleUserRound, Download, FileSpreadsheet,
  Gift, History, ImagePlus, Import, MapPin, MoreHorizontal, Pencil, Plus, Search,
  ShieldCheck, Sparkles, Trash2, UploadCloud, UserMinus, UserRound, Users, X,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { authenticatedFetch } from "@/lib/supabase/fetch";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { employeeCsvFields, employeeFormDefaults, employeeInputFromCsv, employeeInputSchema, csvRowsFromMapping, parseCsv, type EmployeeCsvField } from "@/lib/employees";
import { nextAnniversary, nextBirthday, nextEmployeeCelebration, todayInTimeZone } from "@/lib/celebrations";
import type { Employee, Workspace } from "@/lib/types";
import styles from "./EmployeesExperience.module.css";

type MutationResult = Workspace & {
  createdEmployeeId?: string;
  importResult?: { imported: number; skipped: number };
};
type Mutate = (payload: Record<string, unknown>) => Promise<MutationResult | undefined>;
type Toast = { tone: "success" | "error"; message: string } | null;

const months = Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: format(new Date(2020, index, 1), "MMMM") }));
const avatarTones = ["coral", "sage", "gold", "plum", "ocean"] as const;

function fullName(employee: Employee) { return `${employee.firstName} ${employee.lastName}`; }
function initials(employee: Pick<Employee, "firstName" | "lastName">) { return `${employee.firstName[0] ?? ""}${employee.lastName[0] ?? ""}`.toUpperCase(); }
function hash(value: string) { return [...value].reduce((total, char) => ((total << 5) - total + char.charCodeAt(0)) | 0, 0); }
function dateValue(value?: string | null) { return value ? new Date(`${value}T12:00:00`) : null; }
function birthdayLabel(employee: Employee) { return employee.birthdayMonth && employee.birthdayDay ? format(new Date(2020, employee.birthdayMonth - 1, employee.birthdayDay), "MMMM d") : "Not set"; }
function daysLabel(days: number) { return days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days} days`; }
function daysUntil(date: Date, now: Date) { return Math.max(0, Math.round((date.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime()) / 86400000)); }
function urlParam(name: string, fallback: string) { return typeof window === "undefined" ? fallback : new URLSearchParams(window.location.search).get(name) ?? fallback; }
function activityLabel(action: string) {
  const labels: Record<string, string> = {
    "employee.created": "Employee created", "employee.imported": "Employee imported",
    "employee.updated": "Profile information updated", "employee.photo_updated": "Profile photo updated",
    "employee.photo_removed": "Profile photo removed", "employee.deactivated": "Employee deactivated",
    "employee.reactivated": "Employee reactivated", "employee.deleted": "Employee permanently deleted",
  };
  return labels[action] ?? action.replaceAll(".", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function EmployeeAvatar({ employee, size = "medium" }: { employee: Employee; size?: "small" | "medium" | "large" | "hero" }) {
  const tone = avatarTones[Math.abs(hash(employee.id || fullName(employee))) % avatarTones.length];
  return <span className={`${styles.avatar} ${styles[size]} ${styles[tone]}`} aria-label={`${fullName(employee)} profile image`}>
    {employee.avatarUrl ? <img src={employee.avatarUrl} alt="" /> : initials(employee)}
  </span>;
}

function ToastMessage({ toast, close }: { toast: Toast; close: () => void }) {
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(close, 4000); return () => window.clearTimeout(timer); }, [close, toast]);
  if (!toast) return null;
  return <div className={`${styles.toast} ${styles[toast.tone]}`} role="status"><Check /><span>{toast.message}</span><button onClick={close} aria-label="Dismiss notification"><X /></button></div>;
}

export function EmployeesExperience({ data, mutate, openRecognize }: { data: Workspace; mutate: Mutate; openRecognize: (id?: string) => void }) {
  const [query, setQuery] = useState(() => urlParam("search", ""));
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [department, setDepartment] = useState(() => urlParam("department", "all"));
  const [manager, setManager] = useState(() => urlParam("manager", "all"));
  const [status, setStatus] = useState(() => urlParam("status", "active"));
  const [upcoming, setUpcoming] = useState(() => urlParam("upcoming", "all"));
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [editor, setEditor] = useState<Employee | "new" | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ employee: Employee; type: "deactivate" | "activate" | "delete" } | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const now = useMemo(() => todayInTimeZone(data.organization.timezone), [data.organization.timezone]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (department !== "all") params.set("department", department);
    if (manager !== "all") params.set("manager", manager);
    if (status !== "all") params.set("status", status);
    if (upcoming !== "all") params.set("upcoming", upcoming);
    window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`);
  }, [department, manager, query, status, upcoming]);

  const activeEmployees = data.employees.filter((employee) => employee.status === "active");
  const birthdayCount = activeEmployees.filter((employee) => employee.birthdayMonth === now.getMonth() + 1).length;
  const anniversaryCount = activeEmployees.filter((employee) => dateValue(employee.hireDate)?.getMonth() === now.getMonth()).length;
  const newCount = data.employees.filter((employee) => { const created = employee.createdAt ? new Date(employee.createdAt) : null; return created && created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth(); }).length;
  const managers = activeEmployees.filter((employee) => data.employees.some((person) => person.managerEmployeeId === employee.id));
  const departmentNames = [...new Set([...(data.departments ?? []).map((item) => item.name), ...data.employees.map((employee) => employee.department)])].sort();

  const filtered = useMemo(() => data.employees.filter((employee) => {
    const haystack = `${employee.firstName} ${employee.lastName} ${employee.email} ${employee.department} ${employee.jobTitle}`.toLowerCase();
    const celebration = nextEmployeeCelebration(employee, now);
    const matchesUpcoming = upcoming === "all"
      || (upcoming === "birthday" && celebration?.type === "birthday" && celebration.days <= 30)
      || (upcoming === "anniversary" && celebration?.type === "anniversary" && celebration.days <= 30)
      || (upcoming === "month" && celebration?.date.getMonth() === now.getMonth() && celebration.date.getFullYear() === now.getFullYear())
      || (upcoming === "30" && Boolean(celebration && celebration.days <= 30))
      || (upcoming === "none" && !celebration);
    return (!deferredQuery || haystack.includes(deferredQuery))
      && (department === "all" || employee.department === department)
      && (manager === "all" || employee.managerEmployeeId === manager)
      && (status === "all" || employee.status === status)
      && matchesUpcoming;
  }).sort((a, b) => {
    if (sort === "birthday") return (a.birthdayMonth ?? 99) - (b.birthdayMonth ?? 99) || (a.birthdayDay ?? 99) - (b.birthdayDay ?? 99);
    if (sort === "hire") return (a.hireDate ?? "9999").localeCompare(b.hireDate ?? "9999");
    if (sort === "celebration") return (nextEmployeeCelebration(a, now)?.date.getTime() ?? Infinity) - (nextEmployeeCelebration(b, now)?.date.getTime() ?? Infinity);
    if (sort === "added") return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
    return fullName(a).localeCompare(fullName(b));
  }), [data.employees, deferredQuery, department, manager, now, sort, status, upcoming]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const filtersActive = Boolean(query || department !== "all" || manager !== "all" || status !== "all" && status !== "active" || upcoming !== "all");

  function clearFilters() { setQuery(""); setDepartment("all"); setManager("all"); setStatus("active"); setUpcoming("all"); }
  async function statusChange() {
    if (!confirm) return;
    const nextStatus = confirm.type === "activate" ? "active" : "inactive";
    const result = await mutate({ action: confirm.type === "delete" ? "deleteEmployee" : "setEmployeeStatus", employeeId: confirm.employee.id, status: nextStatus });
    if (result) { setToast({ tone: "success", message: confirm.type === "delete" ? "Employee permanently deleted." : nextStatus === "active" ? "Employee reactivated." : "Employee deactivated." }); setConfirm(null); }
  }

  return <div className={styles.experience}>
    <header className={styles.pageHeader}><div><small>PEOPLE</small><h1>Employees</h1><p>Manage your team and the moments that matter.</p></div><div><button className="button button-secondary" onClick={() => setCsvOpen(true)}><Import /> Import CSV</button><button className="button button-primary" onClick={() => setEditor("new")}><Plus /> Add Employee</button></div></header>
    <section className={styles.summaryGrid} aria-label="Employee summary">
      <SummaryCard icon={<Users />} label="Total Employees" value={activeEmployees.length} detail="Active team members" />
      <SummaryCard icon={<CakeSlice />} label="Birthdays This Month" value={birthdayCount} detail={birthdayCount === 1 ? "Birthday to celebrate" : "Birthdays to celebrate"} />
      <SummaryCard icon={<Award />} label="Anniversaries This Month" value={anniversaryCount} detail="Work milestones ahead" />
      <SummaryCard icon={<Sparkles />} label="New Employees" value={newCount} detail="Added this month" />
    </section>

    {!data.employees.length ? <EmptyEmployees add={() => setEditor("new")} csv={() => setCsvOpen(true)} /> : <>
      <section className={styles.controlPanel}>
        <label className={styles.search}><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employees..." aria-label="Search employees" /></label>
        <div className={styles.filters}>
          <select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Filter by department"><option value="all">All departments</option>{departmentNames.map((name) => <option key={name}>{name}</option>)}</select>
          <select value={manager} onChange={(event) => setManager(event.target.value)} aria-label="Filter by manager"><option value="all">All managers</option>{managers.map((employee) => <option value={employee.id} key={employee.id}>{fullName(employee)}</option>)}</select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status"><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
          <select value={upcoming} onChange={(event) => setUpcoming(event.target.value)} aria-label="Filter by upcoming celebration"><option value="all">Any celebration</option><option value="birthday">Birthday Soon</option><option value="anniversary">Anniversary Soon</option><option value="month">This Month</option><option value="30">Next 30 Days</option><option value="none">No Upcoming Celebration</option></select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort employees"><option value="name">Sort: Name</option><option value="birthday">Birthday</option><option value="hire">Hire Date</option><option value="celebration">Next Celebration</option><option value="added">Date Added</option></select>
          {filtersActive && <button className={styles.clear} onClick={clearFilters}><X /> Clear Filters</button>}
        </div>
      </section>
      <section className={styles.listCard}>
        <div className={`${styles.employeeRow} ${styles.tableHead}`}><span>Employee</span><span>Department</span><span>Job Title</span><span>Manager</span><span>Birthday</span><span>Hire Date</span><span>Next Celebration</span><span>Status</span><span>Actions</span></div>
        {rows.map((employee) => <EmployeeRow key={employee.id} employee={employee} now={now} recognize={() => openRecognize(employee.id)} edit={() => setEditor(employee)} status={() => setConfirm({ employee, type: employee.status === "active" ? "deactivate" : "activate" })} remove={() => setConfirm({ employee, type: "delete" })} />)}
        {!rows.length && <div className={styles.noResults}><Search /><b>No employees match these filters.</b><button onClick={clearFilters}>Clear filters</button></div>}
      </section>
      <footer className={styles.pagination}><span>{filtered.length ? `${(safePage - 1) * pageSize + 1}–${Math.min(safePage * pageSize, filtered.length)} of ${filtered.length}` : "0 employees"}</span><label>Rows per page <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}><option>25</option><option>50</option><option>100</option></select></label><div><button disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Previous page"><ChevronLeft /></button><span>Page {safePage} of {pageCount}</span><button disabled={safePage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} aria-label="Next page"><ChevronRight /></button></div></footer>
    </>}
    {editor && <EmployeeEditor key={editor === "new" ? "new" : editor.id} employee={editor === "new" ? undefined : editor} data={data} mutate={mutate} close={() => setEditor(null)} success={(message) => setToast({ tone: "success", message })} />}
    {csvOpen && <CsvImport data={data} mutate={mutate} close={() => setCsvOpen(false)} success={(message) => setToast({ tone: "success", message })} />}
    {confirm && <ConfirmDialog confirm={confirm} busy={false} close={() => setConfirm(null)} proceed={statusChange} />}
    <ToastMessage toast={toast} close={() => setToast(null)} />
  </div>;
}

function SummaryCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  return <article className={styles.summaryCard}><span>{icon}</span><div><small>{label}</small><b>{value}</b><p>{detail}</p></div></article>;
}

function EmptyEmployees({ add, csv }: { add: () => void; csv: () => void }) {
  return <section className={styles.emptyState}><span><Users /></span><small>BUILD YOUR TEAM</small><h2>Your team belongs here.</h2><p>Add your employees and PerkJoy will help you keep track of the moments that matter.</p><div><button className="button button-primary" onClick={add}><Plus /> Add First Employee</button><button className="button button-secondary" onClick={csv}><Import /> Import CSV</button></div></section>;
}

function EmployeeRow({ employee, now, recognize, edit, status, remove }: { employee: Employee; now: Date; recognize: () => void; edit: () => void; status: () => void; remove: () => void }) {
  const celebration = nextEmployeeCelebration(employee, now);
  const [menu, setMenu] = useState(false);
  return <article className={styles.employeeRow}>
    <span className={styles.person}><Link href={`/employees/${employee.id}`}><EmployeeAvatar employee={employee} /></Link><span><Link href={`/employees/${employee.id}`}>{fullName(employee)}</Link><small>{employee.email}</small></span></span>
    <span data-label="Department"><b>{employee.department}</b></span><span data-label="Job Title">{employee.jobTitle}</span><span data-label="Manager">{employee.managerName ?? "No manager"}</span><span data-label="Birthday">{birthdayLabel(employee)}</span><span data-label="Hire Date">{dateValue(employee.hireDate) ? format(dateValue(employee.hireDate) as Date, "MMM d, yyyy") : "Not set"}</span>
    <span data-label="Next Celebration" className={styles.celebration}>{celebration ? <><i>{celebration.type === "birthday" ? <CakeSlice /> : <Award />}</i><span><b>{celebration.label}</b><small>{daysLabel(celebration.days)}</small></span></> : <small>Not set</small>}</span>
    <span data-label="Status"><em className={`${styles.status} ${styles[employee.status]}`}><i />{employee.status}</em></span>
    <span className={styles.actions}><button onClick={recognize} aria-label={`Recognize ${fullName(employee)}`}><Award /></button><button onClick={() => setMenu((value) => !value)} aria-label={`Actions for ${fullName(employee)}`}><MoreHorizontal /></button>{menu && <div className={styles.actionMenu}><button onClick={edit}><Pencil /> Edit Employee</button><button onClick={status}><UserMinus /> {employee.status === "active" ? "Deactivate" : "Reactivate"}</button><button className={styles.destructive} onClick={remove}><Trash2 /> Delete permanently</button></div>}</span>
  </article>;
}

function Modal({ children, close, wide = false }: { children: React.ReactNode; close: () => void; wide?: boolean }) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [close]);
  return <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section className={`${styles.modal} ${wide ? styles.modalWide : ""}`} role="dialog" aria-modal="true">{children}</section>
  </div>;
}

function EmployeeEditor({ employee, data, mutate, close, success }: { employee?: Employee; data: Workspace; mutate: Mutate; close: () => void; success: (message: string) => void }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Record<string, string | boolean>>({ defaultValues: employeeFormDefaults(employee) });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [progress, setProgress] = useState(0);
  const uploadRef = useRef<HTMLInputElement>(null);
  const deliverySame = Boolean(watch("deliverySameAsWork"));
  const preview = avatar ? URL.createObjectURL(avatar) : !removeAvatar ? employee?.avatarUrl : null;

  function chooseAvatar(file?: File) {
    if (!file) return;
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) { setFormError("Use a JPG, PNG, or WebP image."); return; }
    if (file.size > 5 * 1024 * 1024) { setFormError("Profile photos must be 5 MB or smaller."); return; }
    setAvatar(file); setRemoveAvatar(false); setFormError("");
  }

  async function submit(values: Record<string, string | boolean>) {
    setBusy(true); setFormError("");
    try {
      const input = employeeInputSchema.parse({ ...values, employeeId: employee?.id });
      const result = await mutate({ action: employee ? "updateEmployee" : "addEmployee", ...input });
      if (!result) throw new Error("The employee could not be saved.");
      const employeeId = employee?.id ?? result.createdEmployeeId;
      if (!employeeId) throw new Error("The employee was saved, but the photo could not be linked.");
      if (avatar) {
        setProgress(25);
        const extension = avatar.name.split(".").pop()?.toLowerCase() || "jpg";
        const avatarPath = `${data.organization.id}/${employeeId}/${crypto.randomUUID()}.${extension}`;
        const supabase = createBrowserSupabaseClient();
        const upload = await supabase.storage.from("employee-avatars").upload(avatarPath, avatar, { contentType: avatar.type, upsert: false });
        if (upload.error) throw upload.error;
        setProgress(80);
        const linked = await mutate({ action: "updateEmployeeAvatar", employeeId, avatarPath });
        if (!linked) throw new Error("The photo uploaded but could not be linked to this employee.");
      } else if (removeAvatar && employee?.avatarPath) {
        await mutate({ action: "updateEmployeeAvatar", employeeId, avatarPath: null });
      }
      setProgress(100);
      success(employee ? "Employee profile updated." : "Employee added to your team.");
      close();
    } catch (reason) {
      const issue = reason && typeof reason === "object" && "issues" in reason ? (reason as { issues?: { message: string }[] }).issues?.[0]?.message : undefined;
      setFormError(issue ?? (reason instanceof Error ? reason.message : "We couldn't save this employee."));
    } finally { setBusy(false); }
  }

  const managers = data.employees.filter((item) => item.status === "active" && item.id !== employee?.id);
  const departments = [...new Set([...(data.departments ?? []).map((item) => item.name), ...data.employees.map((item) => item.department), "General"])].sort();
  const locations = data.organizationLocations.filter((item) => item.active);
  return <Modal close={close} wide>
    <form onSubmit={handleSubmit(submit)} className={styles.editorForm}>
      <header className={styles.modalHeader}><div><small>EMPLOYEE RECORD</small><h2>{employee ? "Edit employee" : "Add an employee"}</h2><p>Build a useful profile now; optional details can always be added later.</p></div><button type="button" onClick={close} aria-label="Close"><X /></button></header>
      <div className={styles.modalBody}>
        {formError && <p className={styles.formError}><AlertCircle /> {formError}</p>}
        <section className={styles.avatarEditor} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseAvatar(event.dataTransfer.files[0]); }}>
          <span className={`${styles.avatarPreview} ${preview ? styles.hasPreview : ""}`}>{preview ? <img src={preview} alt="Profile preview" /> : <CircleUserRound />}</span>
          <div><h3>Profile photo</h3><p>JPG, PNG, or WebP. Maximum 5 MB.</p><span><button type="button" className="button button-secondary" onClick={() => uploadRef.current?.click()}><ImagePlus /> {preview ? "Replace photo" : "Upload photo"}</button>{preview && <button type="button" className={styles.textDanger} onClick={() => { setAvatar(null); setRemoveAvatar(true); }}>Remove</button>}</span><input ref={uploadRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseAvatar(event.target.files?.[0])} /></div>
        </section>
        <FormSection title="Personal information" description="Core identity and celebration dates.">
          <Field label="First name" required error={errors.firstName?.message as string}><input {...register("firstName", { required: "First name is required." })} /></Field>
          <Field label="Last name" required error={errors.lastName?.message as string}><input {...register("lastName", { required: "Last name is required." })} /></Field>
          <Field label="Work email" required error={errors.email?.message as string}><input type="email" autoComplete="email" {...register("email", { required: "Work email is required." })} /></Field>
          <Field label="Phone"><input type="tel" {...register("phone")} /></Field>
          <Field label="Birthday month"><select {...register("birthdayMonth")}><option value="">Not set</option>{months.map((month) => <option value={month.value} key={month.value}>{month.label}</option>)}</select></Field>
          <Field label="Birthday day"><input type="number" min="1" max="31" {...register("birthdayDay")} /></Field>
        </FormSection>
        <FormSection title="Work information" description="Role, reporting line, and tenure.">
          <Field label="Job title"><input {...register("jobTitle")} /></Field>
          <Field label="Department"><input list="employee-departments" {...register("department")} /><datalist id="employee-departments">{departments.map((name) => <option key={name} value={name} />)}</datalist></Field>
          <Field label="Manager"><select {...register("managerEmployeeId")}><option value="">No manager</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{fullName(manager)}</option>)}</select></Field>
          <Field label="Employee ID"><input {...register("employeeNumber")} /></Field>
          <Field label="Hire date"><input type="date" {...register("hireDate")} /></Field>
          <Field label="Status"><select {...register("status")}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
        </FormSection>
        <FormSection title="Location & delivery" description="Used for local recommendations and reliable fulfillment.">
          <Field label="Work mode"><select {...register("workMode")}><option value="office">Office</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option></select></Field>
          <Field label="Office location"><select {...register("organizationLocationId")}><option value="">Not assigned</option>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></Field>
          <Field label="Work location"><input placeholder="e.g. Atlanta HQ" {...register("workLocation")} /></Field>
          <Field label="Preferred delivery"><select {...register("preferredDelivery")}><option value="workplace">Workplace</option><option value="home">Home</option><option value="digital_only">Digital only</option></select></Field>
          <Field label="Work address" wide><input placeholder="Address line 1" {...register("addressLine1")} /><input placeholder="Address line 2" {...register("addressLine2")} /></Field>
          <Field label="City"><input {...register("city")} /></Field><Field label="State"><input {...register("state")} /></Field><Field label="Postal code"><input {...register("postalCode")} /></Field>
          <label className={styles.checkboxField}><input type="checkbox" {...register("deliverySameAsWork")} /><span><b>Delivery address is the same as work</b><small>Use the work address for physical gifts.</small></span></label>
          {!deliverySame && <><Field label="Delivery address" wide><input placeholder="Address line 1" {...register("deliveryAddressLine1")} /><input placeholder="Address line 2" {...register("deliveryAddressLine2")} /></Field><Field label="Delivery city"><input {...register("deliveryCity")} /></Field><Field label="Delivery state"><input {...register("deliveryState")} /></Field><Field label="Delivery postal code"><input {...register("deliveryPostalCode")} /></Field></>}
        </FormSection>
      </div>
      <footer className={styles.modalFooter}>{progress > 0 && progress < 100 && <span className={styles.progress}><i style={{ width: `${progress}%` }} /></span>}<button type="button" className="button button-secondary" onClick={close}>Cancel</button><button disabled={busy} className="button button-primary">{busy ? "Saving…" : employee ? "Save changes" : "Add employee"}</button></footer>
    </form>
  </Modal>;
}

function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className={styles.formSection}><header><h3>{title}</h3><p>{description}</p></header><div>{children}</div></section>;
}
function Field({ label, children, required, error, wide }: { label: string; children: React.ReactNode; required?: boolean; error?: string; wide?: boolean }) {
  return <label className={`${styles.field} ${wide ? styles.fieldWide : ""}`}><span>{label}{required && <em>*</em>}</span>{children}{error && <small>{error}</small>}</label>;
}

const csvLabels: Record<EmployeeCsvField, string> = {
  first_name: "First name", last_name: "Last name", email: "Email", phone: "Phone",
  birthday_month: "Birthday month", birthday_day: "Birthday day", hire_date: "Hire date",
  department: "Department", job_title: "Job title", manager_email: "Manager email",
  employee_id: "Employee ID", work_location: "Work location", address_line_1: "Address line 1",
  address_line_2: "Address line 2", city: "City", state: "State", postal_code: "Postal code",
};

function CsvImport({ data, mutate, close, success }: { data: Workspace; mutate: Mutate; close: () => void; success: (message: string) => void }) {
  const [step, setStep] = useState(1);
  const [matrix, setMatrix] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<EmployeeCsvField, number | null>>(() => Object.fromEntries(employeeCsvFields.map((field) => [field, null])) as Record<EmployeeCsvField, number | null>);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const headers = matrix[0] ?? [];
  const mappedRows = useMemo(() => matrix.length ? csvRowsFromMapping(matrix, mapping) : [], [mapping, matrix]);
  const existingEmails = useMemo(() => new Set(data.employees.map((employee) => employee.email.toLowerCase())), [data.employees]);
  const preview = useMemo(() => {
    const seen = new Set<string>();
    return mappedRows.map((row) => {
      try {
        const value = employeeInputFromCsv(row);
        if (seen.has(value.email)) return { row, value, error: "Duplicate email in this CSV", skip: true };
        seen.add(value.email);
        if (existingEmails.has(value.email)) return { row, value, error: "Employee already exists", skip: true };
        return { row, value, error: "", skip: false };
      } catch (reason) {
        const message = reason && typeof reason === "object" && "issues" in reason ? (reason as { issues?: { message: string }[] }).issues?.[0]?.message : "Invalid row";
        return { row, value: null, error: message ?? "Invalid row", skip: false };
      }
    });
  }, [existingEmails, mappedRows]);
  const valid = preview.filter((item) => item.value && !item.skip);
  const invalid = preview.filter((item) => !item.value);
  const skipped = preview.filter((item) => item.skip);

  function loadFile(file?: File) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { setError("Choose a CSV file."); return; }
    file.text().then((text) => {
      const rows = parseCsv(text);
      if (rows.length < 2) throw new Error("The CSV needs a header and at least one employee row.");
      if (rows.length > 501) throw new Error("Import up to 500 employees at a time.");
      const normalized = rows[0].map((header) => header.toLowerCase().trim().replaceAll(" ", "_"));
      setMatrix(rows); setFileName(file.name); setError("");
      setMapping(Object.fromEntries(employeeCsvFields.map((field) => [field, normalized.indexOf(field) >= 0 ? normalized.indexOf(field) : null])) as Record<EmployeeCsvField, number | null>);
      setStep(2);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "We couldn't read that CSV."));
  }

  function downloadTemplate() {
    const sample = [employeeCsvFields.join(","), "Jordan,Lee,jordan@example.com,555-0100,6,18,2024-02-12,Marketing,Designer,manager@example.com,E-104,Atlanta HQ,100 Peachtree St,,Atlanta,GA,30303"].join("\n");
    const url = URL.createObjectURL(new Blob([sample], { type: "text/csv" }));
    const link = document.createElement("a"); link.href = url; link.download = "perkjoy-employees-template.csv"; link.click(); URL.revokeObjectURL(url);
  }

  async function importRows() {
    if (invalid.length) { setError("Fix invalid rows before importing."); return; }
    if (!valid.length) { setError("There are no new valid employees to import."); return; }
    setBusy(true); setError("");
    try {
      const result = await mutate({ action: "importEmployees", rows: valid.map((item) => item.value) });
      if (!result) throw new Error("The import could not be completed.");
      setStep(5);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "We couldn't import the employees."); }
    finally { setBusy(false); }
  }

  return <Modal close={close} wide><div className={styles.csvModal}>
    <header className={styles.modalHeader}><div><small>BULK EMPLOYEE IMPORT</small><h2>{step === 5 ? "Import complete" : "Import employees from CSV"}</h2><p>Map your columns, review every row, and import with confidence.</p></div><button onClick={close} aria-label="Close"><X /></button></header>
    <ol className={styles.steps}>{["Upload", "Map", "Preview", "Import", "Done"].map((label, index) => <li className={step >= index + 1 ? styles.stepActive : ""} key={label}><span>{step > index + 1 ? <Check /> : index + 1}</span><small>{label}</small></li>)}</ol>
    <div className={styles.modalBody}>
      {error && <p className={styles.formError}><AlertCircle /> {error}</p>}
      {step === 1 && <section className={styles.uploadPanel} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); loadFile(event.dataTransfer.files[0]); }}><span><FileSpreadsheet /></span><h3>Drop your employee CSV here</h3><p>Up to 500 rows. You will review everything before it is saved.</p><label className="button button-primary"><UploadCloud /> Choose CSV<input hidden type="file" accept=".csv,text/csv" onChange={(event) => loadFile(event.target.files?.[0])} /></label><button onClick={downloadTemplate}><Download /> Download PerkJoy template</button></section>}
      {step === 2 && <section><div className={styles.importIntro}><FileSpreadsheet /><div><b>{fileName}</b><small>{mappedRows.length} employee rows found</small></div></div><div className={styles.mappingGrid}>{employeeCsvFields.map((field) => <label key={field}><span>{csvLabels[field]}{["first_name", "last_name", "email"].includes(field) && <em>*</em>}</span><select value={mapping[field] ?? ""} onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value === "" ? null : Number(event.target.value) }))}><option value="">Do not import</option>{headers.map((header, index) => <option key={`${header}-${index}`} value={index}>{header || `Column ${index + 1}`}</option>)}</select></label>)}</div></section>}
      {step === 3 && <section><div className={styles.previewStats}><span><Check /> <b>{valid.length}</b> ready</span><span><AlertCircle /> <b>{invalid.length}</b> need attention</span><span><History /> <b>{skipped.length}</b> duplicates skipped</span></div><div className={styles.previewTable}><header><span>Row</span><span>Employee</span><span>Email</span><span>Department</span><span>Result</span></header>{preview.slice(0, 100).map((item) => <article key={item.row.sourceRow} className={item.error ? styles.rowWarning : ""}><span>{item.row.sourceRow}</span><span>{item.value ? `${item.value.firstName} ${item.value.lastName}` : `${item.row.first_name} ${item.row.last_name}`}</span><span>{item.row.email}</span><span>{item.row.department || "General"}</span><span>{item.error || "Ready"}</span></article>)}</div>{preview.length > 100 && <p className={styles.helperText}>Showing the first 100 of {preview.length} rows.</p>}</section>}
      {step === 4 && <section className={styles.importReady}><span><ShieldCheck /></span><h3>Ready to add {valid.length} employees</h3><p>{skipped.length ? `${skipped.length} existing or duplicate employees will be skipped. ` : ""}Profiles and celebration events will be created securely in your organization.</p><button disabled={busy} className="button button-primary" onClick={importRows}>{busy ? "Importing…" : `Import ${valid.length} employees`}</button></section>}
      {step === 5 && <section className={styles.importReady}><span><Check /></span><h3>{valid.length} employees added</h3><p>Your team list, profiles, and upcoming celebration records are ready.</p><button className="button button-primary" onClick={() => { success(`${valid.length} employees imported successfully.`); close(); }}>View employees</button></section>}
    </div>
    {step < 5 && <footer className={styles.modalFooter}><button className="button button-secondary" onClick={step === 1 ? close : () => setStep((value) => value - 1)}>{step === 1 ? "Cancel" : "Back"}</button>{step === 2 && <button className="button button-primary" disabled={mapping.first_name === null || mapping.last_name === null || mapping.email === null} onClick={() => setStep(3)}>Review rows</button>}{step === 3 && <button className="button button-primary" disabled={Boolean(invalid.length || !valid.length)} onClick={() => setStep(4)}>Continue to import</button>}</footer>}
  </div></Modal>;
}

function ConfirmDialog({ confirm, busy, close, proceed }: { confirm: { employee: Employee; type: "deactivate" | "activate" | "delete" }; busy: boolean; close: () => void; proceed: () => void }) {
  const deleting = confirm.type === "delete";
  return <Modal close={close}><div className={styles.confirmDialog}><span className={deleting ? styles.confirmDanger : ""}>{deleting ? <Trash2 /> : <UserMinus />}</span><h2>{deleting ? "Permanently delete employee?" : confirm.type === "activate" ? "Reactivate employee?" : "Deactivate employee?"}</h2><p>{deleting ? `${fullName(confirm.employee)} will be removed. Employees with recognition history cannot be deleted and should be deactivated instead.` : `${fullName(confirm.employee)} ${confirm.type === "activate" ? "will appear in active workflows again" : "will be removed from active celebration workflows without losing history"}.`}</p><div><button className="button button-secondary" onClick={close}>Cancel</button><button disabled={busy} className={deleting ? styles.dangerButton : "button button-primary"} onClick={proceed}>{deleting ? "Delete permanently" : confirm.type === "activate" ? "Reactivate" : "Deactivate"}</button></div></div></Modal>;
}

function money(cents: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100); }

export function EmployeeProfileExperience() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Workspace | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"overview" | "celebrations" | "rewards" | "activity">("overview");
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<{ employee: Employee; type: "deactivate" | "activate" | "delete" } | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const load = () => authenticatedFetch("/api/workspace", { cache: "no-store" }).then(async (response) => {
    const json = await response.json() as Workspace & { error?: string };
    if (!response.ok) throw new Error(json.error || "Unable to load this profile.");
    setData(json);
  });
  useEffect(() => { load().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load this profile.")); }, []);

  async function mutate(payload: Record<string, unknown>) {
    const response = await authenticatedFetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = await response.json() as MutationResult & { error?: string };
    if (!response.ok) { setToast({ tone: "error", message: json.error || "We couldn't complete that request." }); return undefined; }
    setData(json); return json;
  }

  if (!data && !error) return <main className={styles.profileLoading}><Sparkles /><span /><span /><p>Gathering this employee&apos;s story…</p></main>;
  const employee = data?.employees.find((item) => item.id === params.id);
  if (!data || error || !employee) return <main className={styles.profilePage}><ProfileNav /><section className={styles.profileNotFound}><UserRound /><h1>Employee profile unavailable.</h1><p>{error || "This employee may have been removed or is outside your organization."}</p><Link className="button button-primary" href="/employees">Back to employees</Link></section></main>;
  const now = todayInTimeZone(data.organization.timezone);
  const birthday = nextBirthday(employee, now);
  const anniversary = nextAnniversary(employee, now);
  const next = nextEmployeeCelebration(employee, now);
  const profile = data.profiles.find((item) => item.employeeId === employee.id);
  const events = data.events.filter((item) => item.employeeId === employee.id).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const rewards = data.rewards.filter((item) => item.employeeId === employee.id);
  const gifts = data.giftHistory.filter((item) => item.employeeId === employee.id);
  const activity = (data.employeeActivity ?? []).filter((item) => item.employeeId === employee.id);
  const canSeeSensitive = data.currentUserRole === "OWNER" || data.currentUserRole === "ADMIN";
  const tenure = employee.hireDate ? Math.max(0, now.getFullYear() - new Date(`${employee.hireDate}T12:00:00`).getFullYear()) : null;

  async function statusChange() {
    if (!confirm) return;
    const result = await mutate({ action: confirm.type === "delete" ? "deleteEmployee" : "setEmployeeStatus", employeeId: confirm.employee.id, status: confirm.type === "activate" ? "active" : "inactive" });
    if (result) {
      if (confirm.type === "delete") { window.location.href = "/employees"; return; }
      setConfirm(null); setToast({ tone: "success", message: confirm.type === "activate" ? "Employee reactivated." : "Employee deactivated." });
    }
  }

  return <main className={styles.profilePage}>
    <ProfileNav />
    <div className={styles.profileShell}>
      <header className={styles.profileHero}>
        <EmployeeAvatar employee={employee} size="hero" />
        <div className={styles.profileIdentity}><small>EMPLOYEE PROFILE</small><h1>{fullName(employee)}</h1><p>{employee.jobTitle || "Team member"}<i />{employee.department || "General"}</p><span><em className={`${styles.status} ${styles[employee.status]}`}><i />{employee.status}</em>{employee.workLocation && <small><MapPin />{employee.workLocation}</small>}</span></div>
        <div className={styles.profileActions}><Link className="button button-primary" href={`/dashboard?celebrate=${employee.id}`}><Award /> Recognize</Link><button className="button button-secondary" onClick={() => setEditing(true)}><Pencil /> Edit</button><button className={styles.moreButton} onClick={() => setConfirm({ employee, type: employee.status === "active" ? "deactivate" : "activate" })}><MoreHorizontal /></button></div>
      </header>
      <section className={styles.quickGrid}>
        <QuickCard icon={<CalendarDays />} label="Next celebration" value={next?.label ?? "Not set"} detail={next ? `${format(next.date, "MMM d")} · ${daysLabel(next.days)}` : "Add a birthday or hire date"} />
        <QuickCard icon={<CakeSlice />} label="Birthday" value={birthday ? format(birthday, "MMMM d") : "Not set"} detail={birthday ? daysLabel(daysUntil(birthday, now)) : "No birth year is stored"} />
        <QuickCard icon={<BriefcaseBusiness />} label="Hire date" value={employee.hireDate ? format(dateValue(employee.hireDate) as Date, "MMM d, yyyy") : "Not set"} detail={tenure === null ? "Add a hire date" : tenure === 0 ? "First year" : `${tenure} ${tenure === 1 ? "year" : "years"} with the team`} />
        <QuickCard icon={<Gift />} label="Rewards received" value={String(rewards.length + gifts.length)} detail={`${money([...rewards, ...gifts].reduce((total, item) => total + item.amountCents, 0))} recognized`} />
      </section>
      <nav className={styles.profileTabs} aria-label="Employee profile sections">{(["overview", "celebrations", "rewards", "activity"] as const).map((item) => <button className={tab === item ? styles.selectedTab : ""} onClick={() => setTab(item)} key={item}>{item}</button>)}</nav>
      <div className={styles.tabContent}>
        {tab === "overview" && <OverviewTab employee={employee} profile={profile} canSeeSensitive={canSeeSensitive} />}
        {tab === "celebrations" && <CelebrationsTab employee={employee} events={events} birthday={birthday} anniversary={anniversary} />}
        {tab === "rewards" && <RewardsTab rewards={rewards} gifts={gifts} />}
        {tab === "activity" && <ActivityTab activity={activity} />}
      </div>
      <section className={styles.dangerZone}><div><b>Employee access</b><p>Deactivate to preserve history, or permanently delete an employee with no recognition records.</p></div><button className="button button-secondary" onClick={() => setConfirm({ employee, type: employee.status === "active" ? "deactivate" : "activate" })}>{employee.status === "active" ? "Deactivate" : "Reactivate"}</button><button className={styles.textDanger} onClick={() => setConfirm({ employee, type: "delete" })}>Delete permanently</button></section>
    </div>
    {editing && <EmployeeEditor employee={employee} data={data} mutate={mutate} close={() => setEditing(false)} success={(message) => setToast({ tone: "success", message })} />}
    {confirm && <ConfirmDialog confirm={confirm} busy={false} close={() => setConfirm(null)} proceed={statusChange} />}
    <ToastMessage toast={toast} close={() => setToast(null)} />
  </main>;
}

function ProfileNav() { return <nav className={styles.profileNav}><Link href="/dashboard"><Logo /></Link><div><Link href="/employees"><ArrowLeft /> Employees</Link><Link href="/dashboard">Dashboard</Link></div></nav>; }
function QuickCard({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) { return <article className={styles.quickCard}><span>{icon}</span><div><small>{label}</small><b>{value}</b><p>{detail}</p></div></article>; }

function OverviewTab({ employee, profile, canSeeSensitive }: { employee: Employee; profile?: Workspace["profiles"][number]; canSeeSensitive: boolean }) {
  const address = [employee.addressLine1, employee.addressLine2, employee.city, employee.state, employee.postalCode].filter(Boolean).join(", ");
  const delivery = employee.deliverySameAsWork ? "Same as work address" : [employee.deliveryAddressLine1, employee.deliveryAddressLine2, employee.deliveryCity, employee.deliveryState, employee.deliveryPostalCode].filter(Boolean).join(", ");
  return <div className={styles.overviewGrid}>
    <section className={styles.profileCard}><header><UserRound /><div><h2>Personal information</h2><p>Contact and identity details.</p></div></header><dl><Info label="Work email" value={employee.email} /><Info label="Phone" value={employee.phone || "Not set"} /><Info label="Employee ID" value={employee.employeeNumber || "Not set"} /><Info label="Birthday" value={birthdayLabel(employee)} /></dl></section>
    <section className={styles.profileCard}><header><BriefcaseBusiness /><div><h2>Work information</h2><p>Role and reporting structure.</p></div></header><dl><Info label="Department" value={employee.department || "General"} /><Info label="Job title" value={employee.jobTitle || "Not set"} /><Info label="Manager" value={employee.managerName || "No manager"} /><Info label="Work mode" value={(employee.workMode || "office").replaceAll("_", " ")} /></dl></section>
    <section className={styles.profileCard}><header><MapPin /><div><h2>Location & delivery</h2><p>{canSeeSensitive ? "Address details are restricted to admins." : "Sensitive address details are hidden for your role."}</p></div></header><dl><Info label="Work location" value={employee.workLocation || "Not assigned"} /><Info label="Preferred delivery" value={(employee.preferredDelivery || "workplace").replaceAll("_", " ")} />{canSeeSensitive && <><Info label="Work address" value={address || "Not set"} /><Info label="Delivery address" value={delivery || "Not set"} /></>}</dl></section>
    <section className={styles.profileCard}><header><ShieldCheck /><div><h2>Celebration profile</h2><p>Private preferences guide better recommendations.</p></div></header><div className={styles.profileScore}><span><b>{profile?.completeness ?? 0}%</b><small>complete</small></span><i><b style={{ width: `${profile?.completeness ?? 0}%` }} /></i></div><dl><Info label="Privacy" value={profile?.privacyMode === "share_with_hr" ? "Shared with HR" : "Recommendations only"} /><Info label="Delivery preference" value={(profile?.preferredDelivery ?? employee.preferredDelivery ?? "workplace").replaceAll("_", " ")} /></dl></section>
  </div>;
}
function Info({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }

function CelebrationsTab({ employee, events, birthday, anniversary }: { employee: Employee; events: Workspace["events"]; birthday: ReturnType<typeof nextBirthday>; anniversary: ReturnType<typeof nextAnniversary> }) {
  const today = new Date();
  return <div className={styles.profileCard}><header><CalendarDays /><div><h2>Celebration timeline</h2><p>Upcoming birthdays, anniversaries, and custom moments.</p></div></header><div className={styles.momentGrid}>{birthday && <Moment title="Birthday" date={birthday} detail={daysLabel(daysUntil(birthday, today))} icon={<CakeSlice />} />}{anniversary && <Moment title={`${anniversary.years} year anniversary`} date={anniversary.date} detail={daysLabel(daysUntil(anniversary.date, today))} icon={<Award />} />}{events.map((event) => <Moment key={event.id} title={event.title} date={new Date(`${event.eventDate}T12:00:00`)} detail={`${event.rewardSummary} · ${event.status.replaceAll("_", " ")}`} icon={<Sparkles />} />)}{!birthday && !anniversary && !events.length && <EmptyTab icon={<CalendarDays />} title={`No celebrations scheduled for ${employee.firstName}`} detail="Add a birthday or hire date to start the timeline." />}</div></div>;
}
function Moment({ title, date, detail, icon }: { title: string; date: Date; detail: string; icon: React.ReactNode }) { return <article className={styles.moment}><time><small>{format(date, "MMM")}</small><b>{format(date, "dd")}</b></time><span>{icon}</span><div><b>{title}</b><p>{detail}</p></div></article>; }
function RewardsTab({ rewards, gifts }: { rewards: Workspace["rewards"]; gifts: Workspace["giftHistory"] }) {
  const items = [...rewards.map((item) => ({ ...item, title: item.recognitionType, detail: item.message })), ...gifts.map((item) => ({ ...item, message: item.occasion, title: item.title, detail: item.occasion }))].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <div className={styles.profileCard}><header><Gift /><div><h2>Rewards & recognition</h2><p>A real record of appreciation and fulfillment.</p></div></header><div className={styles.rewardList}>{items.map((item) => <article key={item.id}><span><Gift /></span><div><small>{format(new Date(item.createdAt), "MMM d, yyyy")}</small><b>{item.title}</b><p>{item.detail}</p></div><strong>{item.amountCents ? money(item.amountCents) : "Recognition"}</strong><em>{item.status.replaceAll("_", " ")}</em></article>)}{!items.length && <EmptyTab icon={<Gift />} title="No rewards yet" detail="Recognition and gifts will appear here after they are sent or scheduled." />}</div></div>;
}
function ActivityTab({ activity }: { activity: NonNullable<Workspace["employeeActivity"]> }) { return <div className={styles.profileCard}><header><History /><div><h2>Activity</h2><p>Administrative changes recorded by PerkJoy.</p></div></header><div className={styles.activityList}>{activity.map((item) => <article key={item.id}><span><History /></span><div><b>{activityLabel(item.action)}</b><p>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</p></div></article>)}{!activity.length && <EmptyTab icon={<History />} title="No activity recorded" detail="Profile changes and status updates will appear here." />}</div></div>; }
function EmptyTab({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) { return <div className={styles.emptyTab}><span>{icon}</span><b>{title}</b><p>{detail}</p></div>; }
