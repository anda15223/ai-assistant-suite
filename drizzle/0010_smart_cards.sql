-- SmartCard primitive + Brain entries + Festival contacts/extra details.
-- Hand-written Postgres DDL (see note in 0009). Idempotent.

CREATE TABLE IF NOT EXISTS "smart_cards" (
  "id" serial PRIMARY KEY NOT NULL,
  "festivalId" integer NOT NULL,
  "conceptId" integer,
  "cardKey" varchar(80) NOT NULL,
  "title" varchar(255),
  "scMeta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "scCreatedAt" timestamp DEFAULT now() NOT NULL,
  "scUpdatedAt" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "smart_cards_festival_key_idx"
  ON "smart_cards" ("festivalId", "cardKey");
CREATE INDEX IF NOT EXISTS "smart_cards_concept_idx"
  ON "smart_cards" ("conceptId");

CREATE TABLE IF NOT EXISTS "smart_sections" (
  "id" serial PRIMARY KEY NOT NULL,
  "cardId" integer NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "orderIndex" integer DEFAULT 0 NOT NULL,
  "ssSource" text DEFAULT 'manual' NOT NULL,
  "sourceFileId" integer,
  "ssMeta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "ssCreatedAt" timestamp DEFAULT now() NOT NULL,
  "ssUpdatedAt" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "smart_sections_card_idx"
  ON "smart_sections" ("cardId", "orderIndex");

CREATE TABLE IF NOT EXISTS "smart_lines" (
  "id" serial PRIMARY KEY NOT NULL,
  "sectionId" integer NOT NULL,
  "label" text,
  "value" text,
  "quantity" varchar(64),
  "notes" text,
  "status" varchar(32),
  "owner" varchar(128),
  "dueDate" timestamp,
  "orderIndex" integer DEFAULT 0 NOT NULL,
  "slSource" text DEFAULT 'manual' NOT NULL,
  "sourceFileId" integer,
  "aiConfidence" numeric,
  "slMeta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "slCreatedAt" timestamp DEFAULT now() NOT NULL,
  "slUpdatedAt" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "smart_lines_section_idx"
  ON "smart_lines" ("sectionId", "orderIndex");

CREATE TABLE IF NOT EXISTS "smart_files" (
  "id" serial PRIMARY KEY NOT NULL,
  "cardId" integer NOT NULL,
  "s3Key" text NOT NULL,
  "url" text,
  "filename" varchar(512),
  "mimeType" varchar(128),
  "size" integer,
  "extractedText" text,
  "aiSummary" text,
  "parseStatus" text DEFAULT 'pending' NOT NULL,
  "parseError" text,
  "warnings" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "sfMeta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "uploadedAt" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "smart_files_card_idx"
  ON "smart_files" ("cardId");

CREATE TABLE IF NOT EXISTS "smart_todos" (
  "id" serial PRIMARY KEY NOT NULL,
  "cardId" integer NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "stDueDate" timestamp,
  "stOwner" varchar(128),
  "stStatus" text DEFAULT 'open' NOT NULL,
  "stSource" text DEFAULT 'manual' NOT NULL,
  "relatedSectionId" integer,
  "relatedLineId" integer,
  "orderIndex" integer DEFAULT 0 NOT NULL,
  "stMeta" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "stCreatedAt" timestamp DEFAULT now() NOT NULL,
  "stUpdatedAt" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "smart_todos_card_idx"
  ON "smart_todos" ("cardId", "orderIndex");

CREATE TABLE IF NOT EXISTS "smart_chat_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "cardId" integer NOT NULL,
  "scmRole" text NOT NULL,
  "scmContent" text NOT NULL,
  "toolCalls" jsonb,
  "scmCreatedAt" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "smart_chat_messages_card_idx"
  ON "smart_chat_messages" ("cardId", "scmCreatedAt");

CREATE TABLE IF NOT EXISTS "brain_entries" (
  "id" serial PRIMARY KEY NOT NULL,
  "keyName" varchar(255) NOT NULL,
  "displayName" varchar(255),
  "beCategory" varchar(80),
  "beSource" text DEFAULT 'manual' NOT NULL,
  "beScope" text DEFAULT 'global' NOT NULL,
  "beFestivalId" integer,
  "lastSeenFestivalId" integer,
  "subjectType" varchar(80),
  "subjectId" varchar(128),
  "beContent" text,
  "structuredData" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "beTags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "frequency" integer DEFAULT 1 NOT NULL,
  "beConfidence" numeric DEFAULT 0.5 NOT NULL,
  "lastSeenAt" timestamp DEFAULT now() NOT NULL,
  "beCreatedAt" timestamp DEFAULT now() NOT NULL,
  "beUpdatedAt" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "brain_entries_key_idx"
  ON "brain_entries" ("keyName");
CREATE INDEX IF NOT EXISTS "brain_entries_category_idx"
  ON "brain_entries" ("beCategory");
CREATE INDEX IF NOT EXISTS "brain_entries_festival_idx"
  ON "brain_entries" ("beFestivalId");
CREATE INDEX IF NOT EXISTS "brain_entries_subject_idx"
  ON "brain_entries" ("subjectType", "subjectId");

CREATE TABLE IF NOT EXISTS "festival_contacts" (
  "id" serial PRIMARY KEY NOT NULL,
  "festivalId" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "fcRole" varchar(128),
  "phone" varchar(64),
  "email" varchar(320),
  "notes" text,
  "orderIndex" integer DEFAULT 0 NOT NULL,
  "fcCreatedAt" timestamp DEFAULT now() NOT NULL,
  "fcUpdatedAt" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "festival_contacts_festival_idx"
  ON "festival_contacts" ("festivalId", "orderIndex");

CREATE TABLE IF NOT EXISTS "festival_extra_details" (
  "id" serial PRIMARY KEY NOT NULL,
  "festivalId" integer NOT NULL,
  "label" varchar(255) DEFAULT '' NOT NULL,
  "value" text,
  "notes" text,
  "orderIndex" integer DEFAULT 0 NOT NULL,
  "fedCreatedAt" timestamp DEFAULT now() NOT NULL,
  "fedUpdatedAt" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "festival_extra_details_festival_idx"
  ON "festival_extra_details" ("festivalId", "orderIndex");
