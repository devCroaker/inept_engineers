CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"kind" text DEFAULT 'other' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"location" text,
	"address" text,
	"external_registration_url" text,
	"capacity" integer,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_kind_valid" CHECK (kind in ('camping', 'party', 'day_event', 'practice', 'meeting', 'other')),
	CONSTRAINT "events_status_valid" CHECK (status in ('draft', 'published', 'cancelled')),
	CONSTRAINT "events_ends_after_starts" CHECK (ends_at is null or ends_at >= starts_at)
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"arrival_date" date,
	"departure_date" date,
	"guest_count" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rsvps_status_valid" CHECK (status in ('yes', 'no', 'maybe')),
	CONSTRAINT "rsvps_guest_count_non_negative" CHECK (guest_count >= 0),
	CONSTRAINT "rsvps_departure_after_arrival" CHECK (departure_date is null or arrival_date is null or departure_date >= arrival_date)
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "events_status_starts_at_idx" ON "events" USING btree ("status","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rsvps_event_user_idx" ON "rsvps" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "rsvps_event_status_idx" ON "rsvps" USING btree ("event_id","status");