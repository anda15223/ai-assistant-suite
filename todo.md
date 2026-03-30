# AI Assistant Suite — Functional Build TODO

## Phase 1: Infrastructure
- [x] Upgrade to full-stack (web-db-user)
- [x] Set up database schema (emails, tasks, drafts, settings)

## Phase 2: Research
- [x] Confirm one.com IMAP/SMTP settings
- [x] Plan email connection flow (user provides credentials via settings page)

## Phase 3: Backend
- [x] IMAP email fetching endpoint (connect to one.com)
- [x] AI email classification (invoice, task, general, irrelevant)
- [x] Invoice data extraction (vendor, amount, due date)
- [x] Task extraction from emails (action items, deadlines)
- [x] AI draft reply generation
- [x] Approval workflow (approve/edit/reject draft)
- [x] SMTP send approved replies
- [x] Store emails, tasks, drafts in database

## Phase 4: Frontend
- [x] Dashboard with station status cards
- [x] Email inbox view with classification badges
- [x] Email detail view with AI analysis panel
- [x] Task board (extracted tasks from emails)
- [x] Draft approval interface (approve/edit/regenerate)
- [x] Settings page (email credentials, AI preferences)
- [x] WhatsApp station placeholder (ready for future connection)

## Phase 5: Testing & Delivery
- [x] Vitest unit tests (auth, protected routes, router structure)
- [x] End-to-end test with real email connection
- [x] Checkpoint and deliver

## Bug Fixes
- [x] Fix "Failed to fetch emails: Command failed" IMAP error on deployed server
- [x] Add better error handling and connection diagnostics for email sync
- [x] Add server-side logging for IMAP connection attempts

## Feature Updates
- [x] Fetch all emails back to March 1, 2026 (not just last 7 days)
- [x] Increase fetch limit to handle larger mailbox backlog (500 emails)
- [x] Allow user to trigger a full historical sync from the dashboard
- [x] Bug: Only today's emails showing — fixed: reset lastSyncAt, added Full Resync button, sinceDate always uses March 1 as minimum
- [x] Change AI classification: every email is either "invoice" or "task" — no "general" category
- [x] Ensure all non-invoice emails automatically create a task (with fallback if AI fails)
- [x] Update frontend to show only invoice/task categories
- [x] Fix RangeError: Invalid time value — added safe date parsing for due dates
- [x] Added "Invoices" filter tab to Task Board
- [ ] Bug: Only March 26 emails visible — older emails not being fetched from IMAP server
- [x] Enforce strict 1:1 rule: total emails = total tasks (invoices + regular tasks)
- [x] Re-classify all old emails (general/irrelevant/reminder → invoice or task) — reclassifyAll endpoint added
- [x] Clear old tasks and regenerate from scratch with new classification
- [x] Add accounting summary to dashboard: total emails, invoices count, tasks count, verification match
- [x] Ensure future syncs always maintain the 1:1 match — removed if(taskData) guard

## Skill Improvements
- [x] Add urgency-based task prioritization to AI Email Assistant skill
- [x] Create urgency scoring model reference file
- [x] Update SKILL.md with prioritization workflow
- [x] Update schema template with urgency fields

## WhatsApp Integration
- [x] Add WhatsApp tables to database schema (whatsappMessages, whatsappDraftReplies, employees)
- [x] Build WhatsApp webhook endpoints (GET verification + POST receiver)
- [x] Build WhatsApp message processing service with AI classification
- [x] Build WhatsApp reply sending via Cloud API
- [x] Add WhatsApp tRPC routers (messages, drafts, employees, accounting)
- [x] Build WhatsApp Inbox page
- [x] Build WhatsApp Detail page with draft reply approval
- [x] Build Employees directory page
- [x] Update Dashboard with WhatsApp accounting card
- [x] Update sidebar navigation with WhatsApp pages
- [ ] Request WhatsApp API secrets from user (deferred — user will add later)
- [x] Write vitest tests for WhatsApp integration (23/23 passing)

## Urgency-Based Task Prioritization (Eisenhower Matrix)
- [x] Add urgency/importance scoring fields to tasks table (urgencyScore, importanceScore, priorityScore, quadrant, escalationLevel, isOverdue, snoozedUntil)
- [x] Update AI classification to score urgency (1-10) and importance (1-10) for each task
- [x] Implement priority score formula: priorityScore = urgency * 0.6 + importance * 0.4
- [x] Assign Eisenhower quadrant: do_first / schedule / delegate / archive
- [x] Add escalation logic: auto-bump overdue tasks, detect follow-ups, deadline alerts
- [x] Add re-prioritization endpoint to recalculate all task priorities
- [x] Build Priority View page with 2x2 Eisenhower Matrix grid
- [x] Update Task Board with priority sorting, urgency badges, quadrant indicators
- [x] Add Priority Matrix to sidebar navigation
- [x] Write vitest tests for urgency scoring and escalation (17 tests, 40 total passing)

## Auto-Archive Feature
- [x] Add auto-archive logic: dismiss tasks in 'archive' quadrant after 30 days of inactivity
- [x] Add lastActivityAt and autoArchivedAt fields to tasks table (already existed in schema)
- [x] Create auto-archive query helpers (getStaleArchiveTasks, autoArchiveTasks, touchTaskActivity, getAutoArchiveStats)
- [x] Create auto-archive tRPC endpoints (autoArchiveStats, autoArchivePreview, autoArchiveRun, touchActivity)
- [x] Touch lastActivityAt on every task status change to reset inactivity timer
- [x] Add auto-archive card to Dashboard (shows candidates count + dismiss button)
- [x] Add auto-archive section to Priority Matrix page (preview list + dismiss button)
- [x] Write vitest tests for auto-archive logic (18 tests, 58 total passing)

## Task-Email Linking & Category Reassignment
- [x] Add "Open Email" button on every task card that links to the original email
- [x] Add manual category reassignment dropdown on task cards
- [x] Add new task categories: "read_lecture" (Read as Lecture), "read_learn" (Read to Learn), "might_be_interesting" (Might Be Interesting)
- [x] Create tRPC endpoints for updating task category (updateCategory) and getting email link (getEmailId)
- [x] Add db helpers: updateTaskCategory, getTaskEmailId
- [x] Update Task Board UI with email link button, category dropdown, and new filter tabs (Lectures, Learn, Interesting)
- [x] Update Priority Matrix task cards with email link button and category dropdown
- [x] Write vitest tests for category reassignment and email link (21 tests, 79 total passing)

## Email Detail Page
- [x] Add tRPC endpoint to fetch single email by ID with linked tasks and draft replies (updated email.get to include linkedTasks)
- [x] Add getTasksByEmailId db helper to fetch tasks linked to an email
- [x] Build EmailDetail page showing full email body, headers (From/To/Date/MessageID), sender, classification badge
- [x] Show linked tasks on the email detail page with category badges, quadrant icons, priority scores, and status
- [x] Show draft replies on the email detail page (pending draft with approve/edit/reject, sent history)
- [x] HTML/Plain text toggle for emails with HTML content
- [x] Route /emails/:id already existed in App.tsx — confirmed working
- [x] "Open Email" button in Task Board and Priority Matrix already navigates to /emails/:emailId
- [x] Write vitest tests for email detail logic (20 tests, 99 total passing across 8 files)

## AI-Assisted Category Suggestions
- [x] Update AI classification prompt to predict contentCategory: lecture, learn, interesting, or standard task/invoice
- [x] Add suggestedCategory, suggestionConfidence, suggestionReasoning, suggestionConfirmed fields to tasks table
- [x] Wire AI suggestion into email sync pipeline (store suggestedCategory on task creation)
- [x] Add tRPC endpoints: acceptSuggestion, rejectSuggestion, suggestionStats
- [x] Add db helpers: updateTaskSuggestion, acceptSuggestion, rejectSuggestion, getSuggestionStats
- [x] Update Task Board UI with AI suggestion badge (violet, animated), accept/reject buttons, and "AI Suggestions" filter tab
- [x] Update Priority Matrix TaskCard with AI suggestion inline panel (accept/reject)
- [x] Update Email Detail page to show AI category suggestion badge on linked tasks
- [x] Write vitest tests for category suggestion logic (22 tests, 121 total passing across 9 files)

## Critical Bugs (User Reported)
- [x] BUG: Clicking "Open Email" from task cards — TESTED WORKING (navigates to /emails/:id)
- [x] BUG: Manual category classification dropdown — TESTED WORKING (dropdown opens, reassignment saves)
- [x] BUG: 497 of 510 emails missing tasks — Reclassify All times out (504) and hits LLM API quota
- [x] Rewrite reclassify to process in small batches of 5 with 500ms delay between calls
- [x] Add progress tracking with progress bar, processed/remaining count
- [x] Handle API quota errors gracefully — stops batch early, creates fallback task, user can resume later
- [x] Update Dashboard UI with batch progress bar, stop button, and auto-continue between batches
- [x] New endpoints: classifyBatch (5 at a time), missingTaskCount (query remaining)
- [x] New db helpers: getEmailsWithoutTasks, countEmailsWithoutTasks

## Invoice Dashboard
- [x] Create invoiceDetails table (supplier, paymentDate, dueDate, amount, currency, products, invoiceNumber, lineItems, status, emailId, taskId)
- [x] Create supplierSettings table (supplierName, eEconomicEndpoint, eEconomicApiKey, eEconomicAgreement, isConfigured)
- [x] Build AI extraction (extractInvoiceDetails) to parse invoice emails — handles Danish/Swedish/Norwegian/English
- [x] Create tRPC invoice router: list, listEmails, extract, extractBatch, stats, pendingCount, updateStatus, sendToEconomic
- [x] Create tRPC supplier endpoints: suppliers, upsertSupplier
- [x] Build Invoice Dashboard page with stats cards, filter tabs, search, expandable rows with line items
- [x] Add "Send to e-conomic" button per invoice (checks supplier config, placeholder API call)
- [x] Add Supplier Settings panel with per-supplier e-conomic endpoint/key/agreement configuration
- [x] Batch extraction with auto-continue (5 at a time, like email classification)
- [x] Register /invoices route in App.tsx and add "Invoices" to sidebar navigation
- [x] Write vitest tests for invoice extraction and dashboard logic (21 tests, 142 total passing across 10 files)
