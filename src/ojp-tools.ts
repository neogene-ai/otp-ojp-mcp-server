/**
 * Open Job Protocol – Agent Tools
 *
 * Pure TypeScript functions for validating and introspecting OJP documents.
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

const OJP_SCHEMA_PATH = resolve(__dirname, "../schema/openjob-protocol.schema.json");

let _ojpValidate: ValidateFunction | null = null;

function getOjpValidator(): ValidateFunction {
  if (!_ojpValidate) {
    const schema = JSON.parse(readFileSync(OJP_SCHEMA_PATH, "utf8"));
    const ajv = new Ajv2020({ strict: true, allErrors: true });
    addFormats(ajv);
    _ojpValidate = ajv.compile(schema);
  }
  return _ojpValidate!;
}

// ---------------------------------------------------------------------------
// Shared types (subset of OJP document)
// ---------------------------------------------------------------------------

interface OjpMeta {
  version: string;
  job_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  valid_through?: string;
  source?: string;
  source_url?: string;
  locale?: string;
}

interface OjpRole {
  title: string;
  description: string;
  employment_type: string;
  role_summary?: string;
  function?: string;
  seniority?: string;
  total_openings?: number;
  responsibilities?: string[];
  work_hours?: string;
  job_start_date?: string;
  immediate_start?: boolean;
}

interface OjpOrganization {
  name: string;
  url?: string;
  logo_url?: string;
  industry?: string;
  size?: string;
  department?: string;
  founded?: number;
  headquarters?: string;
}

interface OjpSkillRequirement {
  name: string;
  min_years?: number;
}

interface OjpDocument {
  meta: OjpMeta;
  role: OjpRole;
  organization: OjpOrganization;
  requirements?: {
    must_have?: {
      skills?: OjpSkillRequirement[];
      experience_years?: { min?: number; max?: number };
      credentials?: string[];
      certifications?: string[];
      languages?: Array<{ code: string; level: string }>;
      legal?: {
        work_authorization?: string;
        security_clearance?: string;
        physical_requirements?: string;
      };
    };
    nice_to_have?: {
      skills?: OjpSkillRequirement[];
      experience_in_place_of_education?: boolean;
      preferred_qualifications?: string[];
    };
  };
  offering?: {
    compensation?: {
      salary?: { min?: number; max?: number; currency?: string; period?: string };
      additional_compensation?: string[];
      transparency?: string;
    };
    location?: {
      arrangement?: string;
      primary_location?: string;
      alternate_locations?: string[];
      remote_regions?: string[];
      relocation_support?: boolean;
      visa_sponsorship?: boolean;
    };
    benefits?: {
      benefits?: Array<{ category: string; description: string }>;
    };
    growth?: {
      career_path?: string;
      mentorship?: string;
      promotion_cadence?: string;
    };
  };
  team?: {
    name?: string;
    size?: number;
    reports_to?: string;
    tech_stack?: string[];
    methodology?: string;
    description?: string;
  };
  process?: {
    stages?: Array<{ name: string; duration_minutes?: number; type: string }>;
    total_duration_days?: number;
    decision_timeline?: string;
    application_url?: string;
    direct_apply?: boolean;
    accepts_otp_profile?: boolean;
    ai_screening?: boolean;
  };
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Tool 1: validateJobPosting
// ---------------------------------------------------------------------------

export interface ValidateJobPostingInput {
  filePath?: string;
  document?: unknown;
}

export interface ValidateJobPostingResult {
  valid: boolean;
  summary: string;
  errors: Array<{ path: string; message: string }>;
}

export function validateJobPosting(input: ValidateJobPostingInput): ValidateJobPostingResult {
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

  const validate = getOjpValidator();
  const valid = validate(doc);

  if (valid) {
    return { valid: true, summary: "Valid Open Job Protocol document.", errors: [] };
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
// Tool 2: introspectJobPosting
// ---------------------------------------------------------------------------

export interface IntrospectJobPostingInput {
  filePath?: string;
  document?: unknown;
}

export interface IntrospectJobPostingResult {
  jobId: string;
  status: string;
  title: string;
  employmentType: string;
  seniority: string | null;
  organization: { name: string; industry: string | null; size: string | null };
  requirements: {
    mustHaveSkills: Array<{ name: string; min_years: number | null }>;
    niceToHaveSkills: Array<{ name: string; min_years: number | null }>;
    minExperience: number | null;
    languages: Array<{ code: string; level: string }>;
    credentials: string[];
    legal: string | null;
  };
  compensation: {
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurrency: string | null;
    salaryPeriod: string | null;
    transparency: string | null;
  };
  location: {
    arrangement: string | null;
    primaryLocation: string | null;
    remoteRegions: string[];
    visaSponsorship: boolean | null;
    relocationSupport: boolean | null;
  };
  team: {
    size: number | null;
    reportsTo: string | null;
    techStack: string[];
    methodology: string | null;
  };
  process: {
    stages: Array<{ name: string; type: string }>;
    totalDurationDays: number | null;
    acceptsOtpProfile: boolean | null;
  };
  agentSummary: string;
}

export function introspectJobPosting(input: IntrospectJobPostingInput): IntrospectJobPostingResult {
  let doc: OjpDocument;

  if (input.filePath) {
    doc = JSON.parse(readFileSync(resolve(input.filePath), "utf8")) as OjpDocument;
  } else if (input.document) {
    doc = input.document as OjpDocument;
  } else {
    throw new Error("Either filePath or document must be provided.");
  }

  const mustHaveSkills = (doc.requirements?.must_have?.skills ?? []).map((s) => ({
    name: s.name,
    min_years: s.min_years ?? null,
  }));

  const niceToHaveSkills = (doc.requirements?.nice_to_have?.skills ?? []).map((s) => ({
    name: s.name,
    min_years: s.min_years ?? null,
  }));

  const compensation = {
    salaryMin: doc.offering?.compensation?.salary?.min ?? null,
    salaryMax: doc.offering?.compensation?.salary?.max ?? null,
    salaryCurrency: doc.offering?.compensation?.salary?.currency ?? null,
    salaryPeriod: doc.offering?.compensation?.salary?.period ?? null,
    transparency: doc.offering?.compensation?.transparency ?? null,
  };

  const location = {
    arrangement: doc.offering?.location?.arrangement ?? null,
    primaryLocation: doc.offering?.location?.primary_location ?? null,
    remoteRegions: doc.offering?.location?.remote_regions ?? [],
    visaSponsorship: doc.offering?.location?.visa_sponsorship ?? null,
    relocationSupport: doc.offering?.location?.relocation_support ?? null,
  };

  const team = {
    size: doc.team?.size ?? null,
    reportsTo: doc.team?.reports_to ?? null,
    techStack: doc.team?.tech_stack ?? [],
    methodology: doc.team?.methodology ?? null,
  };

  const processStages = (doc.process?.stages ?? []).map((s) => ({
    name: s.name,
    type: s.type,
  }));

  const salaryStr =
    compensation.salaryMin !== null && compensation.salaryCurrency
      ? `${compensation.salaryCurrency} ${compensation.salaryMin.toLocaleString()}–${(compensation.salaryMax ?? compensation.salaryMin).toLocaleString()} ${compensation.salaryPeriod ?? ""}`
      : null;

  const topSkills = mustHaveSkills
    .slice(0, 5)
    .map((s) => (s.min_years ? `${s.name} (${s.min_years}y+)` : s.name))
    .join(", ");

  const locationStr =
    location.arrangement === "remote"
      ? `Remote${location.remoteRegions.length ? ` (${location.remoteRegions.join(", ")})` : ""}`
      : location.arrangement === "hybrid"
      ? `Hybrid – ${location.primaryLocation ?? "location TBC"}`
      : location.primaryLocation ?? location.arrangement ?? "TBC";

  const parts: string[] = [];
  parts.push(
    `Role: ${doc.role.title} (${doc.role.seniority ?? "unspecified"}, ${doc.role.employment_type}) at ${doc.organization.name} (${doc.organization.industry ?? "industry unspecified"}, ${doc.organization.size ?? "size unspecified"}).`
  );
  parts.push(`Location: ${locationStr}.`);
  if (topSkills) parts.push(`Must-have: ${topSkills}.`);
  if (salaryStr) parts.push(`Salary: ${salaryStr}.`);
  if (processStages.length) {
    parts.push(
      `Process: ${processStages.length} stage${processStages.length === 1 ? "" : "s"}${doc.process?.total_duration_days ? ` (~${doc.process.total_duration_days} days)` : ""}.`
    );
  }
  if (doc.process?.accepts_otp_profile) parts.push("Accepts OTP profile.");

  return {
    jobId: doc.meta.job_id,
    status: doc.meta.status,
    title: doc.role.title,
    employmentType: doc.role.employment_type,
    seniority: doc.role.seniority ?? null,
    organization: {
      name: doc.organization.name,
      industry: doc.organization.industry ?? null,
      size: doc.organization.size ?? null,
    },
    requirements: {
      mustHaveSkills,
      niceToHaveSkills,
      minExperience: doc.requirements?.must_have?.experience_years?.min ?? null,
      languages: doc.requirements?.must_have?.languages ?? [],
      credentials: doc.requirements?.must_have?.credentials ?? [],
      legal: doc.requirements?.must_have?.legal?.work_authorization ?? null,
    },
    compensation,
    location,
    team,
    process: {
      stages: processStages,
      totalDurationDays: doc.process?.total_duration_days ?? null,
      acceptsOtpProfile: doc.process?.accepts_otp_profile ?? null,
    },
    agentSummary: parts.join(" "),
  };
}
