CREATE TABLE "track_audio_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"url" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text DEFAULT '',
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"url" text NOT NULL,
	"caption" text DEFAULT '',
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"url" text NOT NULL,
	"description" text DEFAULT '',
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "track_audio_files" ADD CONSTRAINT "track_audio_files_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_images" ADD CONSTRAINT "track_images_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "track_audio_files_track_id_idx" ON "track_audio_files" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "track_audio_files_sort_order_idx" ON "track_audio_files" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "track_images_track_id_idx" ON "track_images" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "track_images_sort_order_idx" ON "track_images" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "tracks_sort_order_idx" ON "tracks" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "tracks_created_at_idx" ON "tracks" USING btree ("created_at");