/*
 * DESIGN: Light theme — Stations Overview
 * Three station cards in a responsive grid.
 */
import { motion } from "framer-motion";
import { Calendar, Mail, MessageSquare } from "lucide-react";
import StationCard from "./StationCard";

const stations = [
  {
    id: "festival",
    title: "Festival Architect",
    subtitle: "Station Alpha — Event Logistics",
    description:
      "End-to-end festival planning powered by AI. From scheduling performances and optimizing vendor routes to monitoring weather and triggering contingency plans — all automated.",
    icon: Calendar,
    image: "",
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
      { name: "Claude Sonnet", category: "LLM" },
      { name: "tRPC", category: "API" },
      { name: "Google Calendar API", category: "Scheduling" },
      { name: "Google Maps Platform", category: "Logistics" },
      { name: "Stripe API", category: "Payments" },
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
    image: "",
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
      { name: "IMAP / SMTP", category: "Email" },
      { name: "Claude Sonnet", category: "LLM" },
      { name: "Drizzle ORM", category: "Database" },
      { name: "tRPC", category: "API" },
    ],
    workflow: [
      "System monitors inbox via IMAP for new emails.",
      "AI classifies each email: Task or Invoice.",
      "For invoices: extracts vendor, amount, due date from content.",
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
    image: "",
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
      { name: "Meta Cloud API", category: "Communication" },
      { name: "Claude Sonnet", category: "LLM" },
      { name: "PostgreSQL", category: "Database" },
    ],
    workflow: [
      "Employee sends a message via WhatsApp to the business number.",
      "Webhook receives the message and forwards it to the backend.",
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
    <section id="stations" className="py-24 relative bg-white">
      {/* Section header */}
      <div className="container mb-14">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <span className="text-[11px] uppercase tracking-widest text-[#6366f1] font-medium mb-3 block">
            Active Stations
          </span>
          <h2 className="font-semibold text-3xl sm:text-4xl text-[#111827] mb-4">
            Your AI Command Stations
          </h2>
          <p className="text-[#6b7280] max-w-2xl leading-relaxed">
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
