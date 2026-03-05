/**
 * Open Job Protocol – Job Posting Parser
 *
 * Produces a structured extraction template from raw job posting text.
 * Does NOT call an LLM. Returns a partially-filled OJP document skeleton
 * with field annotations and confidence levels — ready for the calling
 * agent to populate via its own reasoning.
 */

import { validateJobPosting } from "../ojp-tools";

export interface ParseJobPostingInput {
  text: string;
  sourceUrl?: string;
}

export interface FieldConfidence {
  path: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

export interface ParseJobPostingResult {
  document: Record<string, unknown>;
  fieldConfidence: FieldConfidence[];
  gaps: string[];
  valid: boolean;
  errors: Array<{ path: string; message: string }>;
}

export function parseJobPosting(input: ParseJobPostingInput): ParseJobPostingResult {
  const { text, sourceUrl } = input;

  const skeleton: Record<string, unknown> = {
    meta: {
      version: "0.1",
      job_id: "_EXTRACT_stable_job_id_from_url_or_generate_uuid",
      status: "ACTIVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      valid_through: "_EXTRACT_application_deadline_as_isoDate_or_null",
      source: "_EXTRACT_ats_name_or_company_careers_page",
      ...(sourceUrl ? { source_url: sourceUrl } : { source_url: "_EXTRACT_job_posting_url_or_null" }),
      locale: "_EXTRACT_language_of_posting_default_en",
    },
    role: {
      title: "_EXTRACT_job_title",
      description: "_EXTRACT_full_role_description_plain_text",
      employment_type: "_EXTRACT_one_of_full_time_part_time_contract_freelance_internship_temporary",
      role_summary: "_EXTRACT_one_paragraph_summary_for_agent_reasoning_or_null",
      function: "_EXTRACT_department_function_eg_Engineering_Product_or_null",
      seniority: "_EXTRACT_one_of_intern_junior_mid_senior_staff_principal_lead_director_vp_c_level_or_null",
      total_openings: "_EXTRACT_number_of_open_positions_default_1",
      responsibilities: "_EXTRACT_array_of_bullet_point_responsibilities",
      work_hours: "_EXTRACT_hours_and_schedule_description_or_null",
      job_start_date: "_EXTRACT_start_date_as_isoDate_or_null",
      immediate_start: "_EXTRACT_boolean_whether_immediate_start_required_or_null",
    },
    organization: {
      name: "_EXTRACT_company_name",
      url: "_EXTRACT_company_website_url_or_null",
      logo_url: "_EXTRACT_company_logo_url_or_null",
      industry: "_EXTRACT_industry_vertical_eg_B2B_SaaS_Fintech_or_null",
      size: "_EXTRACT_one_of_startup_scale_up_mid_market_enterprise_or_null",
      department: "_EXTRACT_department_within_company_or_null",
      founded: "_EXTRACT_founding_year_integer_or_null",
      headquarters: "_EXTRACT_hq_location_eg_Berlin_DE_or_null",
    },
    requirements: {
      must_have: {
        skills: "_EXTRACT_array_of_required_skills_with_name_and_min_years",
        experience_years: { min: "_EXTRACT_minimum_years_of_total_experience_or_null" },
        credentials: "_EXTRACT_array_of_required_degrees_or_empty",
        certifications: "_EXTRACT_array_of_required_certifications_or_empty",
        languages: "_EXTRACT_array_of_required_languages_with_code_and_cefr_level_or_empty",
        legal: { work_authorization: "_EXTRACT_work_authorization_requirements_or_null" },
      },
      nice_to_have: {
        skills: "_EXTRACT_array_of_preferred_skills_with_name_and_optional_min_years",
        experience_in_place_of_education: "_EXTRACT_boolean_whether_experience_accepted_instead_of_degree_or_null",
        preferred_qualifications: "_EXTRACT_array_of_preferred_qualifications_or_empty",
      },
    },
    offering: {
      compensation: {
        salary: {
          min: "_EXTRACT_minimum_salary_number_or_null",
          max: "_EXTRACT_maximum_salary_number_or_null",
          currency: "_EXTRACT_iso4217_currency_code_eg_EUR_USD_or_null",
          period: "_EXTRACT_one_of_annual_monthly_daily_hourly_or_null",
        },
        additional_compensation: "_EXTRACT_array_of_bonus_equity_perks_strings_or_empty",
        transparency: "_EXTRACT_one_of_public_on_request_after_interview_or_null",
      },
      location: {
        arrangement: "_EXTRACT_one_of_remote_hybrid_onsite",
        primary_location: "_EXTRACT_office_city_country_or_null",
        alternate_locations: "_EXTRACT_array_of_alternate_office_locations_or_empty",
        remote_regions: "_EXTRACT_array_of_accepted_remote_regions_or_empty",
        relocation_support: "_EXTRACT_boolean_relocation_support_offered_or_null",
        visa_sponsorship: "_EXTRACT_boolean_visa_sponsorship_available_or_null",
      },
      benefits: {
        benefits: "_EXTRACT_array_of_benefit_objects_with_category_and_description_or_empty",
      },
      growth: {
        career_path: "_EXTRACT_career_progression_description_or_null",
        mentorship: "_EXTRACT_mentorship_program_description_or_null",
        promotion_cadence: "_EXTRACT_review_cycle_description_or_null",
      },
    },
    team: {
      name: "_EXTRACT_team_name_or_null",
      size: "_EXTRACT_team_size_integer_or_null",
      reports_to: "_EXTRACT_reporting_manager_title_or_null",
      tech_stack: "_EXTRACT_array_of_technologies_used_by_team_or_empty",
      methodology: "_EXTRACT_development_methodology_eg_Scrum_Shape_Up_or_null",
      description: "_EXTRACT_team_description_or_null",
    },
    process: {
      stages: "_EXTRACT_array_of_interview_stages_with_name_and_type_or_empty",
      total_duration_days: "_EXTRACT_total_hiring_process_duration_days_integer_or_null",
      decision_timeline: "_EXTRACT_decision_timeline_description_or_null",
      application_url: "_EXTRACT_apply_now_url_or_null",
      direct_apply: "_EXTRACT_boolean_can_apply_directly_without_redirect_or_null",
      accepts_otp_profile: "_EXTRACT_boolean_whether_otp_profile_accepted_default_false",
      ai_screening: "_EXTRACT_boolean_whether_ai_screening_used_or_null",
    },
    culture: {
      values: "_EXTRACT_array_of_company_values_or_empty",
      work_style: "_EXTRACT_array_of_work_style_descriptors_or_empty",
      eeo_statement: "_EXTRACT_equal_opportunity_employer_statement_or_null",
      diversity_statement: "_EXTRACT_diversity_inclusion_statement_or_null",
      employer_overview: "_EXTRACT_brief_company_overview_for_candidates_or_null",
    },
    visibility: {
      salary: "_EXTRACT_one_of_public_on_request_after_interview_default_on_request",
      team_details: true,
      process_stages: true,
      hiring_manager: false,
    },
  };

  const fieldConfidence: FieldConfidence[] = [
    { path: "/role/title", confidence: "high", reason: "Job title is always explicitly stated in the posting title or header." },
    { path: "/role/description", confidence: "high", reason: "Full role description is the main body of the posting." },
    { path: "/role/employment_type", confidence: "high", reason: "Employment type (full-time, contract, etc.) is typically stated explicitly." },
    { path: "/role/responsibilities", confidence: "high", reason: "Responsibilities are listed as bullet points in nearly all postings." },
    { path: "/organization/name", confidence: "high", reason: "Company name is always present." },
    { path: "/requirements/must_have/skills", confidence: "high", reason: "Required skills are listed in 'requirements' or 'what you'll need' sections." },
    { path: "/role/seniority", confidence: "medium", reason: "Infer from title (Senior, Lead, Junior) and experience requirements." },
    { path: "/offering/location/arrangement", confidence: "medium", reason: "Remote/hybrid/onsite is usually stated but terminology varies." },
    { path: "/organization/size", confidence: "medium", reason: "Company size bracket requires mapping from headcount or funding stage." },
    { path: "/offering/benefits", confidence: "medium", reason: "Benefits are listed in most postings but vary in detail." },
    { path: "/process/stages", confidence: "medium", reason: "Interview stages are sometimes described but often omitted." },
    { path: "/offering/compensation/salary", confidence: "low", reason: "Salary ranges are omitted in ~60% of postings, especially outside Germany/Austria." },
    { path: "/team/size", confidence: "low", reason: "Team headcount is rarely stated explicitly." },
    { path: "/process/total_duration_days", confidence: "low", reason: "Total hiring timeline is rarely quantified." },
    { path: "/offering/location/visa_sponsorship", confidence: "low", reason: "Visa sponsorship policy is often ambiguous or missing." },
    { path: "/culture/values", confidence: "low", reason: "Company values may appear on career pages but not in the posting itself." },
  ];

  const gaps: string[] = [
    "offering.compensation.salary — exact salary range is absent in most postings; check careers page or Glassdoor",
    "team.size — team headcount is rarely stated; may be inferred from 'team of N' phrases",
    "process.stages — interview process is often summarized without stage details",
    "process.total_duration_days — hiring timeline is rarely quantified",
    "offering.location.visa_sponsorship — sponsorship policy is often ambiguous",
    "offering.location.relocation_support — relocation support is rarely mentioned unless offered",
    "organization.size — company size bracket may require external lookup (Crunchbase, LinkedIn)",
    "organization.founded — founding year requires external lookup unless stated",
    "culture.values — may be on company career page, not in the individual posting",
    "team.reports_to — reporting structure is inferred from job level; rarely explicit",
  ];

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const hasSalary = /\b(salary|compensation|\$|€|£|EUR|USD|GBP)\b/i.test(text);
  const hasRemote = /\b(remote|hybrid|onsite|on-site|in-office)\b/i.test(text);
  const hasEquity = /\b(equity|options|ESOP|VSOP|RSU|stock)\b/i.test(text);

  (skeleton.meta as Record<string, unknown>)["_hints"] = {
    wordCount,
    hasSalaryMention: hasSalary,
    hasRemoteMention: hasRemote,
    hasEquityMention: hasEquity,
    sourceUrl: sourceUrl ?? null,
    instruction:
      "Replace all _EXTRACT_* values with actual values from the job posting text. " +
      "Remove _hints from the final document. " +
      "Use null for fields that cannot be determined from the text. " +
      "For arrays, return [] if nothing is found. " +
      "For offering.compensation.salary, use null for all fields if salary is not stated.",
  };

  const validation = validateJobPosting({ document: skeleton });

  return {
    document: skeleton,
    fieldConfidence,
    gaps,
    valid: validation.valid,
    errors: validation.errors,
  };
}
