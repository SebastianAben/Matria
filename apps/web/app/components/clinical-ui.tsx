"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  FileSearch,
  HeartPulse,
  Home,
  ListChecks,
  LogOut,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UsersRound
} from "lucide-react";
import { apiRequest } from "../../lib/api";
import {
  formatDate,
  hasPermission,
  initials,
  scopedHref,
  type EncounterRecord,
  type PatientRecord,
  type PregnancyEpisode,
  type UserSession
} from "../../lib/clinical-api";

type Tone = "default" | "teal" | "green" | "amber" | "red" | "blue" | "gray";

const navItems = [
  { href: "/workspace/setup", label: "Home", icon: Home },
  { href: "/patients", label: "Patients", icon: UsersRound },
  { href: "/workspace", label: "Workspace", icon: Stethoscope },
  { href: "/review", label: "Review", icon: ListChecks },
  { href: "/admin", label: "Admin", icon: Settings },
  { href: "/audit", label: "Audit", icon: FileSearch }
];

const routeTitles: Record<string, string> = {
  "/patients": "Clinical Workspace - Patient Search / Registration",
  "/workspace/setup": "Clinical Workspace - Encounter Setup",
  "/workspace": "Clinical Workspace - Live Encounter",
  "/review": "Clinical Workspace - Review / Intelligence",
  "/admin": "Admin / Role Management",
  "/audit": "Clinical Workspace - Read-Only Audit",
  "/demo/06-lus": "06-LUS Mid-Consultation"
};

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";
  const isDemoRoute = pathname.startsWith("/demo/");
  const [session, setSession] = useState<UserSession | null>(null);
  const [scopeSearch, setScopeSearch] = useState("");

  useEffect(() => {
    setScopeSearch(window.location.search);
    if (isLogin) return;
    void apiRequest<{ user: UserSession | null }>("/auth/session").then((response) => {
      setSession(response.success ? response.data.user : null);
    });
  }, [isLogin, pathname]);

  async function signOut() {
    await apiRequest("/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const scopedNavItems = useMemo(() => {
    const params = new URLSearchParams(scopeSearch);
    return navItems.map((item) => ({ ...item, href: scopedHref(item.href, params) }));
  }, [scopeSearch]);

  if (isLogin) {
    return <main className="login-canvas">{children}</main>;
  }

  return (
    <div className="clinical-shell">
      <aside className="side-rail">
        <Link className="brand-mark" href="/patients" aria-label="Matria workspace">
          <span className="brand-symbol">M</span>
          <span>Matria</span>
        </Link>
        <nav className="side-nav" aria-label="Primary navigation">
          {scopedNavItems.map((item) => {
            const Icon = item.icon;
            const baseHref = item.href.split("?")[0];
            const exactActive = pathname === baseHref && !(pathname === "/workspace/setup" && item.label === "Home");
            const active =
              exactActive ||
              (pathname === "/patients" && item.label === "Patients") ||
              (pathname === "/workspace/setup" && item.label === "Patients") ||
              (baseHref !== "/workspace" && pathname.startsWith(`${baseHref}/`));
            return (
              <Link key={item.href} className={active ? "active" : ""} href={item.href}>
                <Icon size={17} strokeWidth={2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="rail-footer">
          <button type="button" onClick={signOut}>
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
      <div className="app-frame">
        <header className="top-strip">
          <h1 className="top-title">{routeTitles[pathname] ?? "Clinical Workspace"}</h1>
          <div className="global-search" role="search">
            <Search size={16} />
            <input aria-label="Search patient, encounter, or audit trace" placeholder="Search MRN, patient, encounter, trace ID" />
          </div>
          <div className="top-cluster">
            <button className="icon-button" aria-label="Notifications">
              <Bell size={17} />
            </button>
            <div className="facility-chip">
              <ShieldCheck size={16} />
              <span>{hasPermission(session, "system:config") ? "Operations" : "Clinical"}</span>
            </div>
            <div className="user-chip">
              <span className="avatar">{isDemoRoute && !session ? "D" : initials(session?.fullName)}</span>
              <span>{session?.fullName ?? (isDemoRoute ? "Demo presenter" : "Not signed in")}</span>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="header-actions">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className = ""
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`clinical-panel ${className}`}>
      {title || subtitle || actions ? (
        <div className="panel-title-row">
          <div>
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {actions ? <div className="panel-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: Tone }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function ActionButton({
  children,
  tone = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "secondary" | "ghost" | "danger" }) {
  return (
    <button {...props} className={`action-button ${tone} ${props.className ?? ""}`}>
      {children}
    </button>
  );
}

export function IconPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="icon-pill">
      {icon}
      {label}
    </span>
  );
}

export function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field-control">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function DataTable({
  columns,
  rows,
  renderCell
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
  renderCell?: (cell: React.ReactNode, index: number, rowIndex: number) => React.ReactNode;
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, index) => (
                <td key={`${rowIndex}-${index}`}>{renderCell ? renderCell(cell, index, rowIndex) : cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatTile({ label, value, detail, icon }: { label: string; value: string; detail?: string; icon?: React.ReactNode }) {
  return (
    <div className="stat-tile">
      <div className="stat-icon">{icon ?? <Activity size={16} />}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export function PatientContextBar({
  mode = "active",
  patient,
  pregnancyEpisode,
  encounter,
  unresolvedCount = 0
}: {
  mode?: "active" | "review" | "audit";
  patient: PatientRecord;
  pregnancyEpisode: PregnancyEpisode;
  encounter: EncounterRecord;
  unresolvedCount?: number;
}) {
  return (
    <div className="patient-context">
      <div className="patient-avatar">{initials(patient.fullName)}</div>
      <div className="patient-main">
        <div>
          <strong>{patient.fullName}</strong>
        </div>
        <p>MRN {patient.hospitalNumber}</p>
        <p>DOB {formatDate(patient.dateOfBirth)}</p>
      </div>
      <ContextFact label="Episode" value={pregnancyEpisode.label} detail={pregnancyEpisode.status} tone={pregnancyEpisode.status === "active" ? "green" : "gray"} />
      <ContextFact
        label="Gestational Age"
        value={pregnancyEpisode.gestationalAgeWeeks == null ? "Missing" : `${pregnancyEpisode.gestationalAgeWeeks}w`}
        detail={`EDD ${formatDate(pregnancyEpisode.estimatedDueDate)}`}
        tone={pregnancyEpisode.gestationalAgeWeeks == null ? "amber" : undefined}
      />
      <ContextFact label="Encounter" value={encounter.status} detail={mode === "review" ? "Review" : "Workspace"} tone={mode === "review" ? "blue" : encounter.status === "active" ? "green" : "amber"} />
      <ContextFact label="Visit Type" value={encounter.visitType} detail="" />
      <ContextFact label="Facility / Location" value={encounter.facilityName ?? "Not recorded"} detail="" />
      <ContextFact label={mode === "audit" ? "Encounter State" : "Unresolved Items"} value={mode === "audit" ? encounter.status : String(unresolvedCount)} detail="" tone={mode === "audit" ? "blue" : unresolvedCount > 0 ? "amber" : "green"} />
      <div className="patient-status">
        <Badge tone={mode === "audit" ? "blue" : mode === "review" ? "amber" : "green"}>
          {mode === "audit" ? "Audit Open" : mode === "review" ? "Review" : encounter.status}
        </Badge>
      </div>
    </div>
  );
}

function ContextFact({
  label,
  value,
  detail,
  tone
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: Tone;
}) {
  return (
    <div className="context-fact">
      <span>{label}</span>
      <strong>{tone ? <Badge tone={tone}>{value}</Badge> : value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <UserRound size={22} />
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function KeyValueList({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="key-values">
      {items.map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Timeline({ items }: { items: Array<[string, string, string]> }) {
  return (
    <div className="timeline-list">
      {items.map(([time, title, body]) => (
        <div className="timeline-item" key={`${time}-${title}`}>
          <span>{time}</span>
          <strong>{title}</strong>
          <p>{body}</p>
        </div>
      ))}
    </div>
  );
}

export { Activity, HeartPulse, Search, ShieldCheck, Stethoscope };
