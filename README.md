# AI Assistant Suite

A full-stack AI-powered personal assistant web app for email management, task prioritization, invoice processing, and WhatsApp integration.

## Features

- **Email AI Station** -- Connects to IMAP/SMTP servers, classifies emails as invoice or task using AI, extracts invoice data from PDFs, generates draft replies
- **Task Management** -- Eisenhower Matrix prioritization (urgency x importance), auto-archive, category suggestions
- **Invoice Dashboard** -- Invoice listing with line items, PDF viewer, PBS vs Faktura classification
- **WhatsApp Station** -- Webhook integration with Cloud API, AI classification and draft replies
- **Priority Matrix** -- 2x2 Eisenhower grid with escalation detection and overdue flagging

## Tech Stack

| Layer     | Tech                                          |
| --------- | --------------------------------------------- |
| Frontend  | React 19, TypeScript, Vite 7, Tailwind 4, shadcn/ui |
| Backend   | Express, tRPC, tsx                             |
| Database  | Drizzle ORM + PostgreSQL (Supabase)           |
| AI        | Anthropic Claude (claude-sonnet-4-5)          |
| Storage   | AWS S3 (PDF attachments)                      |
| Auth      | Email/password, bcryptjs, JWT (jose)          |
| Deploy    | Vercel (serverless)                           |

## Environment Variables

```env
# Required
DATABASE_URL=postgresql://user:pass@host:port/db        # Supabase Postgres connection string
JWT_SECRET=your-secret-key-min-32-chars                  # Signs session JWT tokens
ANTHROPIC_API_KEY=sk-ant-...                             # Anthropic API key for Claude

# AWS S3 (for PDF attachments)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=your-bucket
AWS_REGION=eu-central-1

# WhatsApp Cloud API (optional)
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...

# Optional
PORT=3000                                                # Dev server port (default: 3000)
NODE_ENV=development                                     # Set to "production" in prod
VITE_GOOGLE_MAPS_API_KEY=...                             # Google Maps API key (optional)
```

## Local Development

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env   # Then fill in values

# Run database migrations
pnpm run db:push

# Start dev server
pnpm run dev
```

The app runs at `http://localhost:3000`. The first registered user automatically becomes admin.

## Build & Deploy

```bash
# Build for production
pnpm run build

# Start production server
pnpm start
```

### Vercel Deployment

The repo is configured for Vercel with `vercel.json`. Push to `main` to auto-deploy, or:

```bash
vercel --prod
```

Set all environment variables in the Vercel project settings.

## Testing

```bash
pnpm test
```
