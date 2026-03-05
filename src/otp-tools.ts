/**
 * Open Talent Protocol – Agent Tools
 *
 * Pure TypeScript functions for validating and introspecting OTP documents.
 * No LLM calls, no network calls.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { ErrorObject, ValidateFunction } from "ajv";

// ---------------------------------------------------------------------------
// Schema loading (cached at module load time)
// ---------------------------------------------------------------------------

const SCHEMA_PATH = resolve(__dirname, "../schema/opentalent-protocol.schema.json");

let _validate: ValidateFunction | null = null;

function getValidator(): ValidateFunction {
  if (!_validate) {
    const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    addFormats(ajv);
    _validate = ajv.compile(schema);
  }
  return _validate!;
}

// ---------------------------------------------------------------------------
// Shared types (subset of OTP document)
// ---------------------------------------------------------------------------

interface OtpMeta {
  schemaVersion: string;
  language?: string;
  lastUpdated?: string;
  source?: string;
  dataController?: string;
  subjectId?: string;
}

interface OtpContactLocation {
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
}

interface OtpContact {
  email?: string;
  phone?: string;
  location?: OtpContactLocation;
  timezone?: string;
}

interface OtpIdentity {
  fullName: string;
  preferredName?: string;
  pronouns?: string;
  contact?: OtpContact;
  workAuthorization?: {
    description?: string;
    authorizedCountries?: string[];
    requiresSponsorship?: boolean;
  };
}

interface OtpSkill {
  name: string;
  level?: "beginner" | "intermediate" | "advanced" | "expert";
  category?: string;
  lastUsed?: string;
  yearsOfExperience?: number;
}

interface OtpWorkEntry {
  organization: string;
  role: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  employmentType?: string;
  highlights?: string[];
  impact?: Array<{ metric: string; value: string; period?: string }>;
  tags?: string[];
}

interface OtpPreferences {
  desiredRoles?: string[];
  industries?: string[];
  locations?: string[];
  workModes?: string[];
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
    negotiable?: boolean;
  };
  workHours?: string[];
  constraints?: {
    noticePeriod?: string;
    availableFrom?: string;
    travelWillingness?: string;
    notes?: string;
  };
}

interface OtpDocument {
  meta: OtpMeta;
  identity: OtpIdentity;
  summary?: string;
  work?: OtpWorkEntry[];
  skills?: OtpSkill[];
  preferences?: OtpPreferences;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Tool 1: validateProfile
// ---------------------------------------------------------------------------

export interface ValidateProfileInput {
  filePath?: string;
  document?: unknown;
}

export interface ValidateProfileResult {
  valid: boolean;
  summary: string;
  errors: Array<{ path: string; message: string }>;
}

export function validateProfile(input: ValidateProfileInput): ValidateProfileResult {
  let doc: unknown;

  if (input.filePath) {
    try {
      doc = JSON.parse(readFileSync(resolve(input.filePath), "utf8"));
    } catch (err) {
      return {
        valid: false,
        summary: `Could not read file: ${(err as Error).message}`,
        errors: [{ path: "(file)", message: (err as Error).message }],
      };
    }
  } else if (input.document !== undefined) {
    doc = input.document;
  } else {
    return {
      valid: false,
      summary: "Either filePath or document must be provided.",
      errors: [{ path: "(input)", message: "Either filePath or document must be provided." }],
    };
  }

  const validate = getValidator();
  const valid = validate(doc);

  if (valid) {
    return { valid: true, summary: "Valid Open Talent Protocol document.", errors: [] };
  }

  const errors = (validate.errors ?? []).map((e: ErrorObject) => ({
    path: e.instancePath || "(root)",
    message: e.message ?? "unknown error",
  }));

  return {
    valid: false,
    summary: `${errors.length} validation error${errors.length === 1 ? "" : "s"} found.`,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Tool 2: introspectProfile
// ---------------------------------------------------------------------------

export interface IntrospectProfileInput {
  filePath?: string;
  document?: unknown;
  sections?: Array<"identity" | "summary" | "skills" | "work" | "preferences">;
}

export interface IntrospectProfileResult {
  schemaVersion: string;
  subjectId: string | null;
  displayName: string;
  location: string | null;
  summary: string | null;
  skills: Array<{
    name: string;
    level: string;
    category: string;
    yearsOfExperience: number | null;
    lastUsed: string | null;
  }>;
  workHistory: Array<{
    organization: string;
    role: string;
    startDate: string;
    endDate: string | null;
    current: boolean;
    employmentType: string;
    topHighlights: string[];
    impactMetrics: Array<{ metric: string; value: string }>;
  }>;
  preferences: {
    desiredRoles: string[];
    preferredWorkModes: string[];
    preferredLocations: string[];
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string | null;
    salaryPeriod: string | null;
    salaryNegotiable: boolean;
    engagementTypes: string[];
    noticePeriod: string | null;
    availableFrom: string | null;
    constraints: string | null;
  } | null;
  agentSummary: string;
}

export function introspectProfile(input: IntrospectProfileInput): IntrospectProfileResult {
  let doc: OtpDocument;

  if (input.filePath) {
    doc = JSON.parse(readFileSync(resolve(input.filePath), "utf8")) as OtpDocument;
  } else if (input.document) {
    doc = input.document as OtpDocument;
  } else {
    throw new Error("Either filePath or document must be provided.");
  }

  const sections = input.sections ?? ["identity", "summary", "skills", "work", "preferences"];
  const include = (s: string) => sections.includes(s as never);

  const identity = doc.identity;
  const displayName = identity.preferredName
    ? `${identity.preferredName} (${identity.fullName})`
    : identity.fullName;

  const locationParts = [
    identity.contact?.location?.city,
    identity.contact?.location?.country,
  ].filter(Boolean);
  const location = locationParts.length ? locationParts.join(", ") : null;

  const skills = include("skills")
    ? (doc.skills ?? [])
        .map((s) => ({
          name: s.name,
          level: s.level ?? "unknown",
          category: s.category ?? "uncategorized",
          yearsOfExperience: s.yearsOfExperience ?? null,
          lastUsed: s.lastUsed ?? null,
        }))
        .sort((a, b) => (b.yearsOfExperience ?? 0) - (a.yearsOfExperience ?? 0))
    : [];

  const workHistory = include("work")
    ? (doc.work ?? []).map((w) => ({
        organization: w.organization,
        role: w.role,
        startDate: w.startDate,
        endDate: w.endDate ?? null,
        current: w.current ?? false,
        employmentType: w.employmentType ?? "unknown",
        topHighlights: (w.highlights ?? []).slice(0, 3),
        impactMetrics: (w.impact ?? []).map((i) => ({
          metric: i.metric,
          value: i.value,
        })),
      }))
    : [];

  let preferences: IntrospectProfileResult["preferences"] = null;
  if (include("preferences") && doc.preferences) {
    const p = doc.preferences;
    preferences = {
      desiredRoles: p.desiredRoles ?? [],
      preferredWorkModes: p.workModes ?? [],
      preferredLocations: p.locations ?? [],
      salaryMin: p.salary?.min ?? null,
      salaryMax: p.salary?.max ?? null,
      salaryCurrency: p.salary?.currency ?? null,
      salaryPeriod: p.salary?.period ?? null,
      salaryNegotiable: p.salary?.negotiable ?? true,
      engagementTypes: p.workHours ?? [],
      noticePeriod: p.constraints?.noticePeriod ?? null,
      availableFrom: p.constraints?.availableFrom ?? null,
      constraints: p.constraints?.notes ?? null,
    };
  }

  const currentRole = workHistory.find((w) => w.current);
  const topSkillNames = skills
    .filter((s) => s.level === "expert" || s.level === "advanced")
    .slice(0, 5)
    .map((s) => s.name);

  const salaryStr =
    preferences?.salaryMin && preferences?.salaryCurrency
      ? `${preferences.salaryCurrency} ${preferences.salaryMin.toLocaleString()}–${(preferences.salaryMax ?? preferences.salaryMin).toLocaleString()} ${preferences.salaryPeriod ?? ""}`
      : null;

  const parts: string[] = [];
  parts.push(`Candidate: ${displayName}.`);
  if (location) parts.push(`Location: ${location}.`);
  if (currentRole) parts.push(`Currently: ${currentRole.role} at ${currentRole.organization}.`);
  if (include("summary") && doc.summary) parts.push(`Summary: ${doc.summary.slice(0, 200)}${doc.summary.length > 200 ? "…" : ""}`);
  if (topSkillNames.length) parts.push(`Top skills: ${topSkillNames.join(", ")}.`);
  if (preferences?.desiredRoles?.length) parts.push(`Seeking: ${preferences.desiredRoles.join(", ")}.`);
  if (preferences?.preferredWorkModes?.length) parts.push(`Work modes: ${preferences.preferredWorkModes.join(", ")}.`);
  if (salaryStr) parts.push(`Salary expectation: ${salaryStr}.`);
  if (preferences?.noticePeriod) parts.push(`Notice period: ${preferences.noticePeriod}.`);
  if (preferences?.constraints) parts.push(`Non-negotiables: ${preferences.constraints}`);

  return {
    schemaVersion: doc.meta.schemaVersion,
    subjectId: doc.meta.subjectId ?? null,
    displayName,
    location,
    summary: include("summary") ? (doc.summary ?? null) : null,
    skills,
    workHistory,
    preferences,
    agentSummary: parts.join(" "),
  };
}
