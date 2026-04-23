/**
 * SmartCard AI chat — Claude tool-use port of the Lovable
 * `smart-card-chat` edge function.
 *
 * Per-card conversational assistant. Claude is given the card's current
 * state (sections + lines + todos) as a system-prompt JSON snapshot and a
 * fixed set of tools that mutate exactly that card. The loop keeps
 * running until Claude stops calling tools (`end_turn`) or we hit the
 * iteration / time budget.
 *
 * Design notes:
 *   - We keep this self-contained (no invokeLLM abstraction) so the tool
 *     flow stays legible and mirrors `chatAgent.ts`.
 *   - Every tool call is scoped to the `cardId` we were given — Claude
 *     cannot leak into other cards even if it tries.
 *   - The chat history is persisted to `smart_chat_messages`.
 */

import Anthropic from "@anthropic-ai/sdk";
import { ENV } from "./_core/env";
import * as sdb from "./smartCardDb";

const MODEL = "claude-sonnet-4-5-20250514";
const MAX_ITERATIONS = 5;
const SOFT_TIMEOUT_MS = 60_000;

// ===== Tool schema (Claude / Anthropic shape) =====

const TOOLS: Anthropic.Tool[] = [
  {
    name: "add_section",
    description: "Add a new section (group) to the card. Returns the new section_id.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_section",
    description: "Rename or re-describe an existing section.",
    input_schema: {
      type: "object",
      properties: {
        section_id: { type: "number" },
        title: { type: "string" },
        description: { type: "string" },
      },
      required: ["section_id"],
    },
  },
  {
    name: "delete_section",
    description: "Delete a section and all its lines.",
    input_schema: {
      type: "object",
      properties: { section_id: { type: "number" } },
      required: ["section_id"],
    },
  },
  {
    name: "add_line",
    description:
      "Add a line to a section. Either pass section_id (if you know it) or section_title (the bot will match or create one).",
    input_schema: {
      type: "object",
      properties: {
        section_id: { type: "number" },
        section_title: { type: "string" },
        label: { type: "string" },
        value: { type: "string" },
        quantity: { type: "string" },
        notes: { type: "string" },
        due_date: { type: "string", description: "YYYY-MM-DD" },
      },
    },
  },
  {
    name: "update_line",
    description: "Update fields on an existing line. Only include fields you want to change.",
    input_schema: {
      type: "object",
      properties: {
        line_id: { type: "number" },
        label: { type: "string" },
        value: { type: "string" },
        quantity: { type: "string" },
        notes: { type: "string" },
        status: { type: "string" },
        owner: { type: "string" },
        due_date: { type: "string" },
      },
      required: ["line_id"],
    },
  },
  {
    name: "delete_line",
    description: "Delete a line.",
    input_schema: {
      type: "object",
      properties: { line_id: { type: "number" } },
      required: ["line_id"],
    },
  },
  {
    name: "create_todo",
    description: "Create a todo item for this card with optional deadline and owner.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        due_date: { type: "string", description: "YYYY-MM-DD" },
        owner: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "update_todo_status",
    description: "Change the status of a todo. Use `done` to tick it off.",
    input_schema: {
      type: "object",
      properties: {
        todo_id: { type: "number" },
        status: { type: "string", enum: ["open", "in_progress", "done", "blocked"] },
      },
      required: ["todo_id", "status"],
    },
  },
  {
    name: "delete_todo",
    description: "Delete a todo.",
    input_schema: {
      type: "object",
      properties: { todo_id: { type: "number" } },
      required: ["todo_id"],
    },
  },
];

// ===== Tool executor =====

type ToolResult = { ok: true; [k: string]: unknown } | { ok: false; error: string };

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  cardId: number,
): Promise<ToolResult> {
  try {
    switch (name) {
      case "add_section": {
        const orderIndex = await sdb.nextSectionOrderIndex(cardId);
        const row = await sdb.addSection({
          cardId,
          title: String(input.title ?? "New section"),
          description: (input.description as string | undefined) ?? null,
          orderIndex,
          source: "ai",
        });
        return { ok: true, section_id: row.id };
      }
      case "update_section": {
        const patch: Record<string, unknown> = {};
        if (typeof input.title === "string") patch.title = input.title;
        if (typeof input.description === "string") patch.description = input.description;
        if (Object.keys(patch).length === 0) {
          return { ok: false, error: "Nothing to update" };
        }
        await sdb.updateSection(Number(input.section_id), patch);
        return { ok: true };
      }
      case "delete_section": {
        await sdb.deleteSection(Number(input.section_id));
        return { ok: true };
      }
      case "add_line": {
        let sectionId = input.section_id as number | undefined;
        if (sectionId == null && typeof input.section_title === "string") {
          // Find matching section or create a new one
          const full = await sdb.getCardFull(cardId);
          const matching = full?.sections.find(
            (s) => s.title.toLowerCase() === String(input.section_title).toLowerCase(),
          );
          if (matching) {
            sectionId = matching.id;
          } else {
            const orderIndex = await sdb.nextSectionOrderIndex(cardId);
            const created = await sdb.addSection({
              cardId,
              title: String(input.section_title),
              orderIndex,
              source: "ai",
            });
            sectionId = created.id;
          }
        }
        if (sectionId == null) {
          return { ok: false, error: "section_id or section_title required" };
        }
        const orderIndex = await sdb.nextLineOrderIndex(sectionId);
        const row = await sdb.addLine({
          sectionId,
          label: (input.label as string | undefined) ?? null,
          value: (input.value as string | undefined) ?? null,
          quantity: (input.quantity as string | undefined) ?? null,
          notes: (input.notes as string | undefined) ?? null,
          dueDate: typeof input.due_date === "string" ? new Date(input.due_date) : null,
          orderIndex,
          source: "ai",
        });
        return { ok: true, line_id: row.id, section_id: sectionId };
      }
      case "update_line": {
        const patch: any = {};
        for (const k of ["label", "value", "quantity", "notes", "status", "owner"]) {
          if (typeof input[k] === "string") patch[k] = input[k];
        }
        if (typeof input.due_date === "string") patch.dueDate = new Date(input.due_date);
        if (Object.keys(patch).length === 0) {
          return { ok: false, error: "Nothing to update" };
        }
        await sdb.updateLine(Number(input.line_id), patch);
        return { ok: true };
      }
      case "delete_line": {
        await sdb.deleteLine(Number(input.line_id));
        return { ok: true };
      }
      case "create_todo": {
        const orderIndex = await sdb.nextTodoOrderIndex(cardId);
        const row = await sdb.addTodo({
          cardId,
          title: String(input.title ?? ""),
          description: (input.description as string | undefined) ?? null,
          dueDate: typeof input.due_date === "string" ? new Date(input.due_date) : null,
          owner: (input.owner as string | undefined) ?? null,
          orderIndex,
          source: "ai",
        });
        return { ok: true, todo_id: row.id };
      }
      case "update_todo_status": {
        await sdb.updateTodo(Number(input.todo_id), {
          status: input.status as any,
        });
        return { ok: true };
      }
      case "delete_todo": {
        await sdb.deleteTodo(Number(input.todo_id));
        return { ok: true };
      }
      default:
        return { ok: false, error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

// ===== Context builder =====

async function buildSystemPrompt(cardId: number): Promise<string> {
  const full = await sdb.getCardFull(cardId);
  if (!full) throw new Error("Card not found");

  const sectionsSummary = full.sections.map((s) => ({
    id: s.id,
    title: s.title,
    lines: full.lines
      .filter((l) => l.sectionId === s.id)
      .map((l) => ({
        id: l.id,
        label: l.label,
        value: l.value,
        quantity: l.quantity,
        notes: l.notes,
        status: l.status,
        due_date: l.dueDate,
      })),
  }));

  const todosSummary = full.todos.map((t) => ({
    id: t.id,
    title: t.title,
    due_date: t.dueDate,
    owner: t.owner,
    status: t.status,
  }));

  const ctx = {
    card: {
      id: full.card.id,
      card_key: full.card.cardKey,
      title: full.card.title,
    },
    sections: sectionsSummary,
    todos: todosSummary,
  };

  return `You are a focused festival-planning assistant attached to ONE specific SmartCard called "${full.card.title ?? full.card.cardKey}".

STRICT RULES:
1. Do EXACTLY what the user asks. Nothing more, nothing less. Never tidy up, reformat or invent lines they didn't mention.
2. If the request is ambiguous or you're not 100% sure which section/line/todo it refers to, ASK a short clarifying question instead of calling a tool.
3. Never invent data. If the user doesn't give you a value, don't make one up.
4. Prefer updating existing items over creating new ones. To change an existing line, use update_line with its line_id from CONTEXT.sections[*].lines[*].id.
5. Only act on THIS card. If the user asks about another festival area, say so and stop.
6. After your tool calls, reply in ONE short sentence stating exactly what you changed (or what you need clarified). Never claim to have done something you didn't call a tool for.

Today's date: ${new Date().toISOString().slice(0, 10)}

CURRENT CARD STATE (JSON):
${JSON.stringify(ctx, null, 2)}`;
}

// ===== Main chat function =====

export type ChatHistoryMessage = { role: "user" | "assistant"; content: string };
export type ExecutedAction = {
  tool: string;
  input: Record<string, unknown>;
  result: ToolResult;
};

export async function sendChatMessage(params: {
  cardId: number;
  message: string;
  history: ChatHistoryMessage[];
}): Promise<{ reply: string; actions: ExecutedAction[] }> {
  if (!ENV.anthropicApiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  const client = new Anthropic({ apiKey: ENV.anthropicApiKey });
  const systemPrompt = await buildSystemPrompt(params.cardId);

  const anthropicMessages: Anthropic.MessageParam[] = [
    ...params.history.slice(-12).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: "user", content: params.message },
  ];

  const actions: ExecutedAction[] = [];
  const startTime = Date.now();
  let lastText = "";

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (Date.now() - startTime > SOFT_TIMEOUT_MS) {
      console.log("[SmartCardChat] Soft timeout — returning collected text");
      break;
    }

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      tools: TOOLS,
      messages: anthropicMessages,
    });

    // Collect any text content this turn
    let turnText = "";
    for (const block of response.content) {
      if (block.type === "text") turnText += block.text;
    }
    if (turnText) lastText = turnText;

    if (response.stop_reason === "end_turn" || response.stop_reason === "stop_sequence") {
      return { reply: lastText || "Done.", actions };
    }

    if (response.stop_reason === "tool_use") {
      anthropicMessages.push({ role: "assistant", content: response.content });
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            params.cardId,
          );
          actions.push({
            tool: block.name,
            input: block.input as Record<string, unknown>,
            result,
          });
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }
      anthropicMessages.push({ role: "user", content: toolResults });
      continue;
    }

    // Unexpected stop reason — return whatever we have
    break;
  }

  return { reply: lastText || "Done.", actions };
}
