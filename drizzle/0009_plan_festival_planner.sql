-- Festival Planner — structured per-festival Operations Plan module.
--
-- NOTE: the _journal.json in this folder is marked `dialect: mysql` and
-- migration 0008 uses MySQL ENUM syntax, which is invalid in Postgres.
-- Schema is actually deployed via drizzle-kit push (schema-diff-driven),
-- not via these files. This migration is hand-written in valid Postgres
-- DDL so it can be applied by `psql -f drizzle/0009_plan_festival_planner.sql`
-- OR discovered by a future `drizzle-kit push` run without tripping on
-- the stale MySQL journal. Idempotent via IF NOT EXISTS where practical.

CREATE TABLE IF NOT EXISTS "plan_orgs" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "plan_festivals" (
  "id" serial PRIMARY KEY NOT NULL,
  "orgId" integer DEFAULT 1 NOT NULL,
  "slug" varchar(120) NOT NULL UNIQUE,
  "name" varchar(255) NOT NULL,
  "year" integer NOT NULL,
  "startDate" timestamp NOT NULL,
  "endDate" timestamp NOT NULL,
  "location" text,
  "organiserName" varchar(255),
  "organiserPhone" varchar(64),
  "organiserEmail" varchar(320),
  "status" text DEFAULT 'planning' NOT NULL,
  "driveFolderId" varchar(255),
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "plan_sections" (
  "id" serial PRIMARY KEY NOT NULL,
  "key" varchar(64) NOT NULL UNIQUE,
  "title" varchar(255) NOT NULL,
  "description" text,
  "orderIndex" integer NOT NULL,
  "category" varchar(64) NOT NULL,
  "subEditorRoute" varchar(255)
);

CREATE TABLE IF NOT EXISTS "plan_questions" (
  "id" serial PRIMARY KEY NOT NULL,
  "sectionId" integer NOT NULL,
  "key" varchar(128) NOT NULL,
  "prompt" text NOT NULL,
  "kind" text NOT NULL,
  "options" jsonb,
  "helpText" text,
  "required" boolean DEFAULT false NOT NULL,
  "orderIndex" integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "plan_questions_section_key_idx"
  ON "plan_questions" ("sectionId", "key");

CREATE TABLE IF NOT EXISTS "plan_answers" (
  "id" serial PRIMARY KEY NOT NULL,
  "festivalId" integer NOT NULL,
  "questionId" integer NOT NULL,
  "value" jsonb NOT NULL,
  "valueType" text NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "plan_answers_festival_question_idx"
  ON "plan_answers" ("festivalId", "questionId");

CREATE TABLE IF NOT EXISTS "plan_concepts" (
  "id" serial PRIMARY KEY NOT NULL,
  "festivalId" integer NOT NULL,
  "name" varchar(255) NOT NULL,
  "zone" text NOT NULL,
  "salesHoursThu" varchar(64),
  "salesHoursFri" varchar(64),
  "salesHoursSat" varchar(64),
  "salesHoursSun" varchar(64),
  "powerBaseline" varchar(64),
  "powerExtras" jsonb,
  "gasRequired" boolean DEFAULT false NOT NULL,
  "gasSupplier" varchar(255),
  "wristbandMax" integer,
  "wristbandBlackPartout" integer,
  "wristbandNormalPartout" integer,
  "tentSize" varchar(128),
  "productsSold" text,
  "orderIndex" integer NOT NULL
);

CREATE INDEX IF NOT EXISTS "plan_concepts_festival_idx"
  ON "plan_concepts" ("festivalId");

CREATE TABLE IF NOT EXISTS "plan_staff" (
  "id" serial PRIMARY KEY NOT NULL,
  "festivalId" integer NOT NULL,
  "conceptId" integer,
  "name" varchar(255),
  "source" text NOT NULL,
  "role" varchar(255),
  "isManager" boolean DEFAULT false NOT NULL,
  "isSetupCrew" boolean DEFAULT false NOT NULL,
  "wristbandType" text
);

CREATE INDEX IF NOT EXISTS "plan_staff_festival_idx"
  ON "plan_staff" ("festivalId");

CREATE TABLE IF NOT EXISTS "plan_vagtplan_shifts" (
  "id" serial PRIMARY KEY NOT NULL,
  "conceptId" integer NOT NULL,
  "day" timestamp NOT NULL,
  "shiftName" varchar(64) NOT NULL,
  "startTime" varchar(8) NOT NULL,
  "endTime" varchar(8) NOT NULL,
  "peopleCount" integer NOT NULL,
  "notes" text,
  "orderIndex" integer NOT NULL
);

CREATE INDEX IF NOT EXISTS "plan_vagtplan_shifts_concept_idx"
  ON "plan_vagtplan_shifts" ("conceptId");

CREATE TABLE IF NOT EXISTS "plan_action_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "festivalId" integer NOT NULL,
  "sectionKey" varchar(64),
  "title" text NOT NULL,
  "deadline" timestamp,
  "status" text DEFAULT 'open' NOT NULL,
  "priority" text DEFAULT 'normal' NOT NULL,
  "owner" varchar(255),
  "notes" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "plan_action_items_festival_idx"
  ON "plan_action_items" ("festivalId");

CREATE TABLE IF NOT EXISTS "plan_vehicles" (
  "id" serial PRIMARY KEY NOT NULL,
  "festivalId" integer NOT NULL,
  "label" varchar(255) NOT NULL,
  "vehicleType" text NOT NULL,
  "status" text NOT NULL,
  "driver" varchar(255),
  "purpose" text,
  "travelDate" timestamp,
  "seats" integer
);

CREATE INDEX IF NOT EXISTS "plan_vehicles_festival_idx"
  ON "plan_vehicles" ("festivalId");

CREATE TABLE IF NOT EXISTS "plan_accommodation" (
  "id" serial PRIMARY KEY NOT NULL,
  "festivalId" integer NOT NULL,
  "label" varchar(255) NOT NULL,
  "status" text NOT NULL,
  "checkIn" timestamp,
  "checkOut" timestamp,
  "peopleCount" integer,
  "roomConfig" varchar(255),
  "notes" text
);

CREATE INDEX IF NOT EXISTS "plan_accommodation_festival_idx"
  ON "plan_accommodation" ("festivalId");

CREATE TABLE IF NOT EXISTS "plan_bc_trolleys" (
  "id" serial PRIMARY KEY NOT NULL,
  "conceptId" integer NOT NULL,
  "trolleyNumber" integer NOT NULL,
  "label" varchar(128) NOT NULL
);

CREATE INDEX IF NOT EXISTS "plan_bc_trolleys_concept_idx"
  ON "plan_bc_trolleys" ("conceptId");

CREATE TABLE IF NOT EXISTS "plan_bc_trolley_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "trolleyId" integer NOT NULL,
  "category" text NOT NULL,
  "itemName" varchar(255) NOT NULL,
  "quantity" varchar(64),
  "orderIndex" integer NOT NULL
);

CREATE INDEX IF NOT EXISTS "plan_bc_trolley_items_trolley_idx"
  ON "plan_bc_trolley_items" ("trolleyId");
