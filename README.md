# OTP/OJP MCP Server

An MCP server for the [Open Talent Protocol](https://opentalentprotocol.org) (OTP) and [Open Job Protocol](https://opentalentprotocol.org) (OJP) — open standards for structuring candidate profiles and job postings for AI agent reasoning.

## Tools

| Tool | Description |
|------|-------------|
| `otp_parse_resume` | Raw resume text &rarr; OTP skeleton with `_EXTRACT_*` placeholders for an LLM to fill |
| `otp_validate_profile` | Validate an OTP document against the JSON Schema |
| `otp_introspect_profile` | Extract an agent-friendly summary from an OTP document |
| `ojp_parse_job_posting` | Raw job posting text &rarr; OJP skeleton with `_EXTRACT_*` placeholders |
| `ojp_validate_job_posting` | Validate an OJP document against the JSON Schema |
| `ojp_introspect_job_posting` | Extract an agent-friendly summary from an OJP document |

## Key traits

- **Pure functions** — no LLM calls, no network calls, no API keys needed
- **JSON Schema draft 2020-12** validation via AJV
- **LLM-free parsers** — produce structured templates for the calling agent to complete
- **Zero config** — just install and run

## Install

```bash
npm install -g @opentalentprotocol/mcp-server
```

Or run directly with npx:

```bash
npx @opentalentprotocol/mcp-server
```

## Setup

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "otp-ojp": {
      "command": "npx",
      "args": ["-y", "@opentalentprotocol/mcp-server"]
    }
  }
}
```

### Claude Code

Add to your project or global MCP settings:

```json
{
  "mcpServers": {
    "otp-ojp": {
      "command": "npx",
      "args": ["-y", "@opentalentprotocol/mcp-server"]
    }
  }
}
```

### From source

```bash
git clone https://github.com/neogene-ai/otp-ojp-mcp-server.git
cd otp-ojp-mcp-server
npm install
npm run build
node dist/index.js
```

## How it works

### Parsing workflow

The parsers follow a **skeleton + fill** pattern:

1. Call `otp_parse_resume` (or `ojp_parse_job_posting`) with raw text
2. Get back a document skeleton with `_EXTRACT_*` annotations, confidence levels, and known gaps
3. The calling agent fills in the skeleton using its own reasoning
4. Call `otp_validate_profile` (or `ojp_validate_job_posting`) to verify the result

This keeps the MCP server LLM-free while giving agents structured guidance on what to extract.

### Introspection

The introspect tools flatten an OTP/OJP document into a normalized, agent-friendly object with an `agentSummary` string — ready for system prompts, retrieval-augmented context, or matching logic.

## Schemas

The JSON Schemas are bundled in the `schema/` directory:

- `schema/opentalent-protocol.schema.json` — OTP v0.1
- `schema/openjob-protocol.schema.json` — OJP v0.1

## Requirements

- Node.js >= 18

## License

MIT
