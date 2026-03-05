# An MCP server that provides tools for working with the Open Talent Protocol (OTP) and Open Job Protocol (OJP) — open standards for structuring candidate profiles and job postings for AI 
  agent reasoning.                                                                                                                                                                          
                                                                                                                                                                                            
# 6 tools:                                                                                                                                                                                  
                                                                                                                                                                                            
  ┌────────────────────────────┬────────────────────────────────────────────────────────────────────────────────┐                                                                           
  │            Tool            │                                  What it does                                  │
  ├────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ otp_parse_resume           │ Raw resume text → OTP skeleton with _EXTRACT_* placeholders for an LLM to fill │
  ├────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ otp_validate_profile       │ Validate an OTP document against the JSON Schema                               │
  ├────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ otp_introspect_profile     │ Extract an agent-friendly summary from an OTP document                         │
  ├────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ ojp_parse_job_posting      │ Raw job posting text → OJP skeleton with _EXTRACT_* placeholders               │
  ├────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ ojp_validate_job_posting   │ Validate an OJP document against the JSON Schema                               │
  ├────────────────────────────┼────────────────────────────────────────────────────────────────────────────────┤
  │ ojp_introspect_job_posting │ Extract an agent-friendly summary from an OJP document                         │
  └────────────────────────────┴────────────────────────────────────────────────────────────────────────────────┘

# Key traits:
  - Pure functions — no LLM calls, no network calls, no API keys needed
  - JSON Schema draft 2020-12 validation via AJV
  - Parsers are LLM-free scaffolders — they produce structured templates for the calling agent to complete
  - Zero external dependencies beyond Node 18+

# Use case: Any AI agent that needs to read, create, or validate standardized talent profiles or job postings.
