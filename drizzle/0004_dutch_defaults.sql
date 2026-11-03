ALTER TABLE "settings" ALTER COLUMN "tagline" SET DEFAULT 'Strak geknipt, zonder haast.';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "service_name" SET DEFAULT 'Knipbeurt';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "service_description" SET DEFAULT 'Even overleggen, precies knippen en netjes afwerken.';--> statement-breakpoint
-- Move untouched texts to Dutch; anything you've edited stays.
UPDATE "settings" SET "tagline" = 'Strak geknipt, zonder haast.' WHERE "id" = 1 AND "tagline" = 'Sharp cuts, no rush.';--> statement-breakpoint
UPDATE "settings" SET "service_name" = 'Knipbeurt' WHERE "id" = 1 AND "service_name" = 'Haircut';--> statement-breakpoint
UPDATE "settings" SET "service_description" = 'Even overleggen, precies knippen en netjes afwerken.' WHERE "id" = 1 AND "service_description" = 'A consultation, a precise cut and a clean finish.';
