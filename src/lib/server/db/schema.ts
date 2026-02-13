import {
	pgTable,
	uuid,
	varchar,
	text,
	integer,
	timestamp,
	index,
	jsonb
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Frequency configuration for audio reactive animations
 */
export interface FrequencyBandConfig {
	name: string;
	lowBin: number;
	highBin: number;
	threshold: number;
}

export interface TrackFrequencyConfig {
	trackId: string;
	bands: FrequencyBandConfig[];
	fps?: number;
}

/**
 * Tracks table - Main audio tracks with metadata
 */
export const tracks = pgTable(
	'tracks',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: varchar('name', { length: 255 }).notNull(),
		slug: varchar('slug', { length: 255 }).notNull().unique(),
		url: text('url').notNull(), // Main audio file URL
		videoUrl: text('video_url'), // Optional background video URL
		animationKey: varchar('animation_key', { length: 64 }), // Optional background animation key
		description: text('description').default(''), // Rich text HTML
		sortOrder: integer('sort_order').default(0).notNull(),
		frequencyConfig: jsonb('frequency_config').$type<TrackFrequencyConfig | null>(), // Per-track frequency bin configuration
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => ({
		sortOrderIdx: index('tracks_sort_order_idx').on(table.sortOrder),
		createdAtIdx: index('tracks_created_at_idx').on(table.createdAt),
		slugIdx: index('tracks_slug_idx').on(table.slug)
	})
);

export type Track = typeof tracks.$inferSelect;
export type NewTrack = typeof tracks.$inferInsert;

/**
 * Track Images table - Additional images per track
 */
export const trackImages = pgTable(
	'track_images',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		trackId: uuid('track_id')
			.notNull()
			.references(() => tracks.id, { onDelete: 'cascade' }),
		url: text('url').notNull(),
		caption: text('caption').default(''),
		sortOrder: integer('sort_order').default(0).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => ({
		trackIdIdx: index('track_images_track_id_idx').on(table.trackId),
		sortOrderIdx: index('track_images_sort_order_idx').on(table.sortOrder)
	})
);

export type TrackImage = typeof trackImages.$inferSelect;
export type NewTrackImage = typeof trackImages.$inferInsert;

/**
 * Track Audio Files table - Additional MP3s per track
 */
export const trackAudioFiles = pgTable(
	'track_audio_files',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		trackId: uuid('track_id')
			.notNull()
			.references(() => tracks.id, { onDelete: 'cascade' }),
		url: text('url').notNull(),
		name: varchar('name', { length: 255 }).notNull(),
		description: text('description').default(''),
		sortOrder: integer('sort_order').default(0).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => ({
		trackIdIdx: index('track_audio_files_track_id_idx').on(table.trackId),
		sortOrderIdx: index('track_audio_files_sort_order_idx').on(table.sortOrder)
	})
);

export type TrackAudioFile = typeof trackAudioFiles.$inferSelect;
export type NewTrackAudioFile = typeof trackAudioFiles.$inferInsert;

/**
 * Relations
 */
export const tracksRelations = relations(tracks, ({ many }) => ({
	images: many(trackImages),
	audioFiles: many(trackAudioFiles)
}));

export const trackImagesRelations = relations(trackImages, ({ one }) => ({
	track: one(tracks, {
		fields: [trackImages.trackId],
		references: [tracks.id]
	})
}));

export const trackAudioFilesRelations = relations(trackAudioFiles, ({ one }) => ({
	track: one(tracks, {
		fields: [trackAudioFiles.trackId],
		references: [tracks.id]
	})
}));
