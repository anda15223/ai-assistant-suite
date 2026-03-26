/*
 * DESIGN: Command Center — Stations Overview
 * Three station cards in a responsive grid.
 */
import { motion } from "framer-motion";
import { Calendar, Mail, MessageSquare } from "lucide-react";
import StationCard from "./StationCard";

const FESTIVAL_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663480602866/KuriegSE9E2r7xqu9W7qQS/festival-architect-ejtTSKhfbJL7temJhi7icc.webp";
const INBOX_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663480602866/KuriegSE9E2r7xqu9W7qQS/inbox-intelligence-5iY5NhVuBwFC28tcYhDPbY.webp";
const WHATSAPP_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663480602866/KuriegSE9E2r7xqu9W7qQS/workforce-concierge-gg4nkpquJuUzawdcovzPwd.webp";

const stations = [
  {
    id: "festival",
    title: "Festival Architect",
    subtitle: "Station Alpha — Event Logistics",
    description:
      "End-to-end festival planning powered by AI. From scheduling performances and optimizing vendor routes to monitoring weather and triggering contingency plans — all automated.",
    icon: Calendar,
    image: FESTIVAL_IMG,
    status: "active" as const,
    features: [
      {
        title: "Dynamic Scheduling",
        description:
          "Auto-generates and updates master schedules for performances, staff shifts, and vendor deliveries.",
      },
      {
        title: "Logistics Optimization",
        description:
          "Uses spatial data to map festival layouts and optimize vendor routes in real time.",
      },
      {
        title: "Contingency Planning",
        description:
          "Monitors weather and real-time data to propose immediate adjustments to the event plan.",
      },
      {
        title: "Financial Management",
        description:
          "Handles ticket sales, vendor fees, and merchandise transactions through integrated payment gateways.",
      },
    ],
    tools: [
      { name: "OpenAI GPT-4o", category: "LLM" },
      { name: "LangChain", category: "Orchestration" },
      { name: "Google Calendar API", category: "Scheduling" },
      { name: "Google Maps Platform", category: "Logistics" },
      { name: "Stripe API", category: "Payments" },
      { name: "Eventbrite API", category: "Ticketing" },
      { name: "OpenWeatherMap", category: "Data" },
    ],
    workflow: [
      "User interacts via web dashboard or conversational interface.",
      "NLP engine extracts intent, entities, and constraints from requests.",
      "System queries internal databases and external APIs for context.",
      "AI scheduling engine optimizes resource allocation and resolves conflicts.",
      "Plans are executed: calendar events created, venues booked, payments processed.",
      "Real-time monitoring dispatches alerts and proposes contingency adjustments.",
    ],
  },
  {
    id: "inbox",
    title: "Inbox Intelligence",
    subtitle: "Station Beta — Email & Tasks",
    description:
      "Dual-purpose email assistant that extracts tasks and invoices from your inbox, then drafts contextual replies for your approval. Never sends without your sign-off.",
    icon: Mail,
    image: INBOX_IMG,
    status: "active" as const,
    features: [
      {
        title: "Invoice Detection",
        description:
          "Scans attachments, extracts amount, due date, and vendor. Notifies you to forward to accounting.",
      },
      {
        title: "Task Extraction",
        description:
          "Converts action-oriented emails into tasks in your project management tool automatically.",
      },
      {
        title: "Draft & Approve",
        description:
          "Generates contextual reply drafts. You can approve, edit, or regenerate before sending.",
      },
      {
        title: "Smart Classification",
        description:
          "Categorizes emails as Task, Invoice, Reminder, or Irrelevant for prioritized processing.",
      },
    ],
    tools: [
      { name: "Gmail / Outlook API", category: "Email" },
      { name: "Parseur / Nanonets", category: "OCR" },
      { name: "OpenAI GPT-4o", category: "LLM" },
      { name: "Asana / Jira API", category: "Tasks" },
      { name: "QuickBooks / Xero", category: "Accounting" },
      { name: "n8n", category: "Workflow" },
    ],
    workflow: [
      "System monitors inbox via Gmail/Outlook API for new emails.",
      "AI classifies each email: Task, Invoice, Reminder, or Irrelevant.",
      "For invoices: OCR extracts vendor, amount, due date from attachments.",
      "For tasks: NLP identifies action items, deadlines, and responsible parties.",
      "AI drafts a contextual reply based on email content and your tone history.",
      "You receive a notification with the draft — approve, edit, or regenerate.",
      "Approved replies are sent; tasks and invoices are routed to the right tools.",
    ],
  },
  {
    id: "workforce",
    title: "Workforce Concierge",
    subtitle: "Station Gamma — Employee Comms",
    description:
      "Your WhatsApp-based interface for employee management. Answers routine queries, converts reported problems into formal tasks, and notifies the right managers instantly.",
    icon: MessageSquare,
    image: WHATSAPP_IMG,
    status: "active" as const,
    features: [
      {
        title: "Query Resolution",
        description:
          "Answers routine employee questions using a pre-defined knowledge base and HR documentation.",
      },
      {
        title: "Problem-to-Task",
        description:
          "When an employee reports an issue, the AI creates a prioritized ticket in your project management system.",
      },
      {
        title: "Manager Alerts",
        description:
          "Automatically notifies the relevant manager when high-priority issues are escalated.",
      },
      {
        title: "Shift & Schedule",
        description:
          "Sends shift schedules, notifies employees of changes, and tracks attendance via WhatsApp.",
      },
    ],
    tools: [
      { name: "WhatsApp Business API", category: "Messaging" },
      { name: "Twilio", category: "Communication" },
      { name: "FastAPI", category: "Backend" },
      { name: "OpenAI GPT-4o", category: "LLM" },
      { name: "Jira / Trello API", category: "Tasks" },
      { name: "PostgreSQL", category: "Database" },
    ],
    workflow: [
      "Employee sends a message via WhatsApp to the business number.",
      "Webhook receives the message and forwards it to the FastAPI backend.",
      "LLM processes the message to understand intent and extract information.",
      "For queries: AI generates an answer from the knowledge base.",
      "For problems: AI creates a task ticket with priority and assigns it.",
      "Relevant manager is notified. Employee receives an acknowledgment.",
      "Conversation history is stored for context in future interactions.",
    ],
  },
];

export default function StationsSection() {
  return (
    <section id="stations" className="py-24 relative">
      {/* Section header */}
      <div className="container mb-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="font-mono text-[11px] uppercase tracking-widest text-amber mb-3 block">
            Active Stations
          </span>
          <h2 className="font-heading font-bold text-3xl sm:text-4xl text-foreground mb-4">
            Your AI Command Stations
          </h2>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Each station is a specialized AI agent designed for a specific
            operational domain. They share a common intelligence core but
            operate independently, with human-in-the-loop safeguards for
            sensitive actions.
          </p>
        </motion.div>
      </div>

      {/* Cards grid */}
      <div className="container grid grid-cols-1 lg:grid-cols-3 gap-6">
        {stations.map((station, i) => (
          <StationCard key={station.id} {...station} index={i} />
        ))}
      </div>
    </section>
  );
}
