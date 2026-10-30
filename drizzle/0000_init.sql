CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"manage_token" text NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reminder_sent_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_manage_token_unique" UNIQUE("manage_token"),
	CONSTRAINT "bookings_range" CHECK ("bookings"."start_at" < "bookings"."end_at")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"business_name" text DEFAULT 'The Chair' NOT NULL,
	"tagline" text DEFAULT 'Considered haircuts, by appointment, among friends.' NOT NULL,
	"service_name" text DEFAULT 'Haircut' NOT NULL,
	"service_description" text DEFAULT 'A consultation, a precise cut and a clean finish.' NOT NULL,
	"duration_min" integer DEFAULT 45 NOT NULL,
	"buffer_min" integer DEFAULT 15 NOT NULL,
	"price_pence" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'GBP' NOT NULL,
	"min_notice_hours" integer DEFAULT 12 NOT NULL,
	"window_days" integer DEFAULT 28 NOT NULL,
	"cancel_cutoff_hours" integer DEFAULT 12 NOT NULL,
	"timezone" text DEFAULT 'Europe/London' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"booking_open" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_off" (
	"id" serial PRIMARY KEY NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	CONSTRAINT "time_off_range" CHECK ("time_off"."start_at" < "time_off"."end_at")
);
--> statement-breakpoint
CREATE TABLE "weekly_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"weekday" smallint NOT NULL,
	"start_min" integer NOT NULL,
	"end_min" integer NOT NULL,
	CONSTRAINT "weekly_hours_weekday" CHECK ("weekly_hours"."weekday" between 0 and 6),
	CONSTRAINT "weekly_hours_range" CHECK ("weekly_hours"."start_min" < "weekly_hours"."end_min")
);
--> statement-breakpoint
CREATE INDEX "bookings_start_idx" ON "bookings" USING btree ("start_at");--> statement-breakpoint
CREATE INDEX "bookings_email_idx" ON "bookings" USING btree ("email");