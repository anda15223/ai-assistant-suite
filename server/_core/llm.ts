import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    if (!ENV.anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    _client = new Anthropic({ apiKey: ENV.anthropicApiKey });
  }
  return _client;
}

function extractTextContent(content: MessageContent): string {
  if (typeof content === "string") return content;
  if (content.type === "text") return content.text;
  return JSON.stringify(content);
}

function toAnthropicContent(
  content: MessageContent | MessageContent[]
): string | Anthropic.ContentBlockParam[] {
  const parts = Array.isArray(content) ? content : [content];

  // If single text, return as string
  if (parts.length === 1) {
    const part = parts[0];
    if (typeof part === "string") return part;
    if (part.type === "text") return part.text;
  }

  return parts.map((part): Anthropic.ContentBlockParam => {
    if (typeof part === "string") return { type: "text", text: part };
    if (part.type === "text") return { type: "text", text: part.text };
    if (part.type === "image_url") {
      // Try to convert data: URLs to Anthropic format
      const url = part.image_url.url;
      if (url.startsWith("data:")) {
        const match = url.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          return {
            type: "image",
            source: {
              type: "base64",
              media_type: match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: match[2],
            },
          };
        }
      }
      return { type: "text", text: `[Image: ${url}]` };
    }
    if (part.type === "file_url") {
      return { type: "text", text: `[File: ${part.file_url.url}]` };
    }
    return { type: "text", text: JSON.stringify(part) };
  });
}

function getJsonSchemaInstruction(
  params: InvokeParams
): string | null {
  const format = params.responseFormat || params.response_format;
  const schema = params.outputSchema || params.output_schema;

  if (format && format.type === "json_schema" && format.json_schema?.schema) {
    return `\n\nYou MUST respond with valid JSON matching this exact schema:\n${JSON.stringify(format.json_schema.schema, null, 2)}\n\nRespond ONLY with the JSON object, no other text.`;
  }

  if (schema?.schema) {
    return `\n\nYou MUST respond with valid JSON matching this exact schema:\n${JSON.stringify(schema.schema, null, 2)}\n\nRespond ONLY with the JSON object, no other text.`;
  }

  if (format && format.type === "json_object") {
    return "\n\nYou MUST respond with valid JSON. Respond ONLY with the JSON object, no other text.";
  }

  return null;
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const client = getClient();

  // Separate system messages from conversation messages
  let systemText = "";
  const conversationMessages: Anthropic.MessageParam[] = [];

  for (const msg of params.messages) {
    if (msg.role === "system") {
      const text = Array.isArray(msg.content)
        ? msg.content.map(extractTextContent).join("\n")
        : extractTextContent(msg.content);
      systemText += (systemText ? "\n\n" : "") + text;
    } else if (msg.role === "user" || msg.role === "assistant") {
      conversationMessages.push({
        role: msg.role,
        content: toAnthropicContent(msg.content) as any,
      });
    } else if (msg.role === "tool" || msg.role === "function") {
      // Convert tool results to user messages for compatibility
      const text = Array.isArray(msg.content)
        ? msg.content.map(extractTextContent).join("\n")
        : extractTextContent(msg.content);
      conversationMessages.push({
        role: "user",
        content: `[Tool result for ${msg.name || "unknown"}]: ${text}`,
      });
    }
  }

  // Append JSON schema instructions to system prompt
  const jsonInstruction = getJsonSchemaInstruction(params);
  if (jsonInstruction) {
    systemText += jsonInstruction;
  }

  const maxTokens = params.maxTokens || params.max_tokens || 8192;

  const response = await client.messages.create({
    model: "claude-sonnet-4-5-20250514",
    max_tokens: maxTokens,
    system: systemText || undefined,
    messages: conversationMessages,
  });

  // Extract text content from Anthropic response
  let responseText = "";
  for (const block of response.content) {
    if (block.type === "text") {
      responseText += block.text;
    }
  }

  // Return in OpenAI-compatible InvokeResult shape
  return {
    id: response.id,
    created: Math.floor(Date.now() / 1000),
    model: response.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: responseText,
        },
        finish_reason: response.stop_reason === "end_turn" ? "stop" : response.stop_reason,
      },
    ],
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}
