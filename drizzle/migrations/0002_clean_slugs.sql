-- Clean up slugs by removing the random suffix from existing tracks
-- This assumes track names are unique (enforced by user workflow)

-- Remove the 8-character suffix (e.g., "-03b98c28") from existing slugs
UPDATE "tracks" SET "slug" = SUBSTRING("slug" FROM 1 FOR LENGTH("slug") - 9) WHERE "slug" LIKE '%-________';
