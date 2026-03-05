#!/usr/bin/env node
/**
 * Open Talent Protocol & Open Job Protocol — MCP Server
 *
 * Exposes 6 agent tools over the Model Context Protocol (stdio transport):
 *
 *   otp_validate_profile       — validate an OTP document against the schema
 *   otp_introspect_profile     — extract agent-friendly summary from an OTP document
 *   otp_parse_resume           — produce OTP extraction skeleton from raw resume text
 *   ojp_validate_job_posting   — validate an OJP document against the schema
 *   ojp_introspect_job_posting — extract agent-friendly summary from an OJP document
 *   ojp_parse_job_posting      — produce OJP extraction skeleton from raw job posting text
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { validateProfile, introspectProfile } from "./otp-tools";
import { validateJobPosting, introspectJobPosting } from "./ojp-tools";
import { parseResume } from "./parsers/resume-to-otp";
import { parseJobPosting } from "./parsers/job-to-ojp";

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "otp_validate_profile",
    description:
      "Validate a JSON document against the Open Talent Protocol schema (v0.1). " +
      "Provide either filePath (absolute path to a .json file) or document (pre-parsed object). " +
      "Returns validity status and a list of errors.",
    inputSchema: {
      type: "object" as const,
      properties: {
        filePath: {
          type: "string",
          description: "Absolute path to an OTP JSON document.",
        },
        document: {
          type: "object",
          description: "A pre-parsed OTP document object.",
        },
      },
    },
  },
  {
    name: "otp_introspect_profile",
    description:
      "Extract a structured, agent-friendly summary of an Open Talent Protocol document. " +
      "Returns normalized skills, work history, preferences, and an agentSummary string " +
      "suitable for use in a system prompt. " +
      "Provide either filePath or document. Optionally filter sections: identity, summary, skills, work, preferences.",
    inputSchema: {
      type: "object" as const,
      properties: {
        filePath: {
          type: "string",
          description: "Absolute path to an OTP JSON document.",
        },
        document: {
          type: "object",
          description: "A pre-parsed OTP document object.",
        },
        sections: {
          type: "array",
          items: {
            type: "string",
            enum: ["identity", "summary", "skills", "work", "preferences"],
          },
          description: "Which sections to include. Defaults to all.",
        },
      },
    },
  },
  {
    name: "otp_parse_resume",
    description:
      "Produce a structured OTP extraction template from raw resume text. " +
      "Returns a document skeleton with _EXTRACT_* annotations, a fieldConfidence list " +
      "(high/medium/low per field), and a gaps list of information not typically on resumes. " +
      "The calling agent should fill in the skeleton using its reasoning over the text, " +
      "then call otp_validate_profile to verify the result.",
    inputSchema: {
      type: "object" as const,
      required: ["text"],
      properties: {
        text: {
          type: "string",
          description: "Raw resume text (plain text, markdown, or extracted PDF text).",
        },
      },
    },
  },
  {
    name: "ojp_validate_job_posting",
    description:
      "Validate a JSON document against the Open Job Protocol schema (v0.1). " +
      "Provide either filePath (absolute path to a .json file) or document (pre-parsed object). " +
      "Returns validity status and a list of errors.",
    inputSchema: {
      type: "object" as const,
      properties: {
        filePath: {
          type: "string",
          description: "Absolute path to an OJP JSON document.",
        },
        document: {
          type: "object",
          description: "A pre-parsed OJP document object.",
        },
      },
    },
  },
  {
    name: "ojp_introspect_job_posting",
    description:
      "Extract a structured, agent-friendly summary of an Open Job Protocol document. " +
      "Returns normalized requirements, compensation, location, team, process details, " +
      "and an agentSummary string suitable for use in a system prompt. " +
      "Provide either filePath or document.",
    inputSchema: {
      type: "object" as const,
      properties: {
        filePath: {
          type: "string",
          description: "Absolute path to an OJP JSON document.",
        },
        document: {
          type: "object",
          description: "A pre-parsed OJP document object.",
        },
      },
    },
  },
  {
    name: "ojp_parse_job_posting",
    description:
      "Produce a structured OJP extraction template from raw job posting text. " +
      "Returns a document skeleton with _EXTRACT_* annotations, a fieldConfidence list " +
      "(high/medium/low per field), and a gaps list of information commonly missing from postings. " +
      "The calling agent should fill in the skeleton using its reasoning over the text, " +
      "then call ojp_validate_job_posting to verify the result.",
    inputSchema: {
      type: "object" as const,
      required: ["text"],
      properties: {
        text: {
          type: "string",
          description: "Raw job posting text (plain text, markdown, or extracted HTML text).",
        },
        sourceUrl: {
          type: "string",
          description: "Source URL of the job posting, if known.",
        },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "otp-ojp-mcp-server", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "otp_validate_profile": {
        const result = validateProfile(args as Parameters<typeof validateProfile>[0]);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "otp_introspect_profile": {
        const result = introspectProfile(args as Parameters<typeof introspectProfile>[0]);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "otp_parse_resume": {
        const result = parseResume(args as unknown as Parameters<typeof parseResume>[0]);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "ojp_validate_job_posting": {
        const result = validateJobPosting(args as Parameters<typeof validateJobPosting>[0]);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "ojp_introspect_job_posting": {
        const result = introspectJobPosting(args as Parameters<typeof introspectJobPosting>[0]);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      case "ojp_parse_job_posting": {
        const result = parseJobPosting(args as unknown as Parameters<typeof parseJobPosting>[0]);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      default:
        return {
          content: [{ type: "text", text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
      isError: true,
    };
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
