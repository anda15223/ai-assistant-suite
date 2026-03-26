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
