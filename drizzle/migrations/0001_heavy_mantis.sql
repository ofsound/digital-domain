-- Add slug column as nullable first
ALTER TABLE "tracks" ADD COLUMN "slug" varchar(255);--> statement-breakpoint

-- Generate slugs from track names for existing tracks
UPDATE "tracks" SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g')) || '-' || SUBSTRING("id"::text, 1, 8);--> statement-breakpoint

-- Make slug NOT NULL
ALTER TABLE "tracks" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint

-- Create index on slug
CREATE INDEX "tracks_slug_idx" ON "tracks" USING btree ("slug");--> statement-breakpoint

-- Add unique constraint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_slug_unique" UNIQUE("slug");
