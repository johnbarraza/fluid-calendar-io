import { createMcpHandler } from "mcp-handler";
import { mcpTools, type McpContext } from "@/lib/mcp-server";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const LOG_SOURCE = "MCPRoute";

/**
 * MCP Server endpoint using Vercel's mcp-handler
 * Supports both SSE (Server-Sent Events) and stdio transports
 */

interface ToolConfig {
  description: string;
  parameters: unknown; // Can be Zod schema or Record
  execute: (params: Record<string, unknown>, context: McpContext) => Promise<unknown>;
}

// Initialize the MCP server with authentication
async function initializeMcpServer(server: McpServer): Promise<void> {
  // Register all tools from mcpTools
  for (const [toolName, toolConfig] of Object.entries(mcpTools)) {
    const config = toolConfig as ToolConfig;

    // Create a wrapper that returns the proper MCP response format
    const toolHandler = async (args: Record<string, unknown>) => {
      // Authenticate request
      const authOptions = await getAuthOptions();
      const session = await getServerSession(authOptions);

      if (!session || !session.user?.id) {
        logger.warn("MCP request without valid session", {}, LOG_SOURCE);
        throw new Error("Authentication required. Please sign in to use MCP tools.");
      }

      logger.info(
        "MCP request authenticated",
        { userId: session.user.id, tool: toolName },
        LOG_SOURCE
      );

      // Execute the tool with authentication context
      const context: McpContext = {
        userId: session.user.id,
      };

      const result = await config.execute(args, context);

      // Return in MCP format
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    };

    server.tool(
      toolName,
      config.description || "",
      config.parameters as Parameters<typeof server.tool>[2],
      toolHandler
    );
  }
}

// Create the MCP handler with authentication context
const handler = createMcpHandler(initializeMcpServer, {
  serverInfo: {
    name: "fluid-calendar-mcp",
    version: "1.0.0",
  },
});

// Export handlers for GET (SSE) and POST (tool calls)
export const GET = handler;
export const POST = handler;

/**
 * Usage:
 *
 * For SSE (Server-Sent Events) connection:
 * GET /api/mcp
 *
 * For tool invocation:
 * POST /api/mcp
 * Content-Type: application/json
 *
 * Body:
 * {
 *   "method": "tools/call",
 *   "params": {
 *     "name": "list_events",
 *     "arguments": {
 *       "accountId": "account-id-here",
 *       "calendarId": "primary",
 *       "maxResults": 10
 *     }
 *   }
 * }
 *
 * Response:
 * {
 *   "events": [...],
 *   "nextPageToken": "..."
 * }
 */
