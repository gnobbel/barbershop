ALTER TABLE "settings" ALTER COLUMN "tagline" SET DEFAULT 'Sharp cuts, no rush.';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "currency" SET DEFAULT 'EUR';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "timezone" SET DEFAULT 'Europe/Amsterdam';--> statement-breakpoint
-- Move an untouched settings row to the new defaults; anything you've edited stays.
UPDATE "settings" SET "currency" = 'EUR' WHERE "id" = 1 AND "currency" = 'GBP';--> statement-breakpoint
UPDATE "settings" SET "timezone" = 'Europe/Amsterdam' WHERE "id" = 1 AND "timezone" = 'Europe/London';--> statement-breakpoint
UPDATE "settings" SET "tagline" = 'Sharp cuts, no rush.' WHERE "id" = 1 AND "tagline" = 'Considered haircuts, by appointment, among friends.';
