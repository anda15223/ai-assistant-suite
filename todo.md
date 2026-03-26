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
