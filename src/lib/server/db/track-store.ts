/**
 * Database Track Store
 *
 * Replaces the in-memory store with Neon Postgres.
 * Provides CRUD operations for tracks with their images and additional audio files.
 */

import { eq, asc, desc } from 'drizzle-orm';

import { storage } from '$lib/storage';

import { db } from './index';
import { tracks, trackImages, trackAudioFiles, type Track, type NewTrack } from './schema';

interface TrackWithRelations extends Track {
	images: (typeof trackImages.$inferSelect)[];
	audioFiles: (typeof trackAudioFiles.$inferSelect)[];
}

function getStoragePathFromUrl(url: string): string {
	return url.replace(/^\/api\/files\//, '').replace(/^\//, '');
}

export const trackStore = {
	/**
	 * Get all tracks with their relations, ordered by sort_order
	 */
	async getAll(): Promise<TrackWithRelations[]> {
		const allTracks = await db.query.tracks.findMany({
			orderBy: [asc(tracks.sortOrder), desc(tracks.createdAt)],
			with: {
				images: {
					orderBy: [asc(trackImages.sortOrder)]
				},
				audioFiles: {
					orderBy: [asc(trackAudioFiles.sortOrder)]
				}
			}
		});
		return allTracks;
	},

	/**
	 * Get a single track by ID with relations
	 */
	async getById(id: string): Promise<TrackWithRelations | undefined> {
		const track = await db.query.tracks.findFirst({
			where: eq(tracks.id, id),
			with: {
				images: {
					orderBy: [asc(trackImages.sortOrder)]
				},
				audioFiles: {
					orderBy: [asc(trackAudioFiles.sortOrder)]
				}
			}
		});
		return track;
	},

	/**
	 * Get a single track by slug with relations
	 */
	async getBySlug(slug: string): Promise<TrackWithRelations | undefined> {
		const track = await db.query.tracks.findFirst({
			where: eq(tracks.slug, slug),
			with: {
				images: {
					orderBy: [asc(trackImages.sortOrder)]
				},
				audioFiles: {
					orderBy: [asc(trackAudioFiles.sortOrder)]
				}
			}
		});
		return track;
	},

	/**
	 * Create a new track
	 */
	async create(data: Omit<NewTrack, 'id' | 'createdAt' | 'updatedAt'>): Promise<Track> {
		// Get max sort_order
		const maxOrder = await db
			.select({ maxOrder: tracks.sortOrder })
			.from(tracks)
			.orderBy(desc(tracks.sortOrder))
			.limit(1);

		const sortOrder = (maxOrder[0]?.maxOrder ?? -1) + 1;

		const [track] = await db
			.insert(tracks)
			.values({
				...data,
				sortOrder
			})
			.returning();

		return track;
	},

	/**
	 * Update a track
	 */
	async update(
		id: string,
		data: Partial<Omit<NewTrack, 'id' | 'createdAt' | 'updatedAt'>>
	): Promise<Track | undefined> {
		const [track] = await db
			.update(tracks)
			.set({
				...data,
				updatedAt: new Date()
			})
			.where(eq(tracks.id, id))
			.returning();

		return track;
	},

	/**
	 * Delete a track and its related files from storage
	 */
	async delete(id: string): Promise<boolean> {
		// Get track to find files to delete
		const track = await this.getById(id);
		if (!track) return false;

		// Delete main audio file from storage
		const mainPath = getStoragePathFromUrl(track.url);
		await storage.delete(mainPath).catch(console.error);

		// Delete background video from storage
		if (track.videoUrl) {
			const videoPath = getStoragePathFromUrl(track.videoUrl);
			await storage.delete(videoPath).catch(console.error);
		}

		// Delete images from storage
		for (const image of track.images) {
			const imagePath = getStoragePathFromUrl(image.url);
			await storage.delete(imagePath).catch(console.error);
		}

		// Delete additional audio files from storage
		for (const audioFile of track.audioFiles) {
			const audioPath = getStoragePathFromUrl(audioFile.url);
			await storage.delete(audioPath).catch(console.error);
		}

		// Delete from database (cascade will handle relations)
		await db.delete(tracks).where(eq(tracks.id, id));

		return true;
	},

	/**
	 * Reorder tracks
	 */
	async reorder(orderedIds: string[]): Promise<void> {
		for (let i = 0; i < orderedIds.length; i++) {
			await db
				.update(tracks)
				.set({ sortOrder: i, updatedAt: new Date() })
				.where(eq(tracks.id, orderedIds[i]));
		}
	},

	/**
	 * Add an image to a track
	 */
	async addImage(
		trackId: string,
		data: { url: string; caption?: string }
	): Promise<typeof trackImages.$inferSelect> {
		// Get max sort_order for images
		const maxOrder = await db
			.select({ maxOrder: trackImages.sortOrder })
			.from(trackImages)
			.where(eq(trackImages.trackId, trackId))
			.orderBy(desc(trackImages.sortOrder))
			.limit(1);

		const sortOrder = (maxOrder[0]?.maxOrder ?? -1) + 1;

		const [image] = await db
			.insert(trackImages)
			.values({
				trackId,
				url: data.url,
				caption: data.caption || '',
				sortOrder
			})
			.returning();

		return image;
	},

	/**
	 * Add an additional audio file to a track
	 */
	async addAudioFile(
		trackId: string,
		data: { url: string; name: string; description?: string }
	): Promise<typeof trackAudioFiles.$inferSelect> {
		// Get max sort_order for audio files
		const maxOrder = await db
			.select({ maxOrder: trackAudioFiles.sortOrder })
			.from(trackAudioFiles)
			.where(eq(trackAudioFiles.trackId, trackId))
			.orderBy(desc(trackAudioFiles.sortOrder))
			.limit(1);

		const sortOrder = (maxOrder[0]?.maxOrder ?? -1) + 1;

		const [audioFile] = await db
			.insert(trackAudioFiles)
			.values({
				trackId,
				url: data.url,
				name: data.name,
				description: data.description || '',
				sortOrder
			})
			.returning();

		return audioFile;
	},

	/**
	 * Delete an image
	 */
	async deleteImage(imageId: string): Promise<boolean> {
		const [image] = await db.select().from(trackImages).where(eq(trackImages.id, imageId));

		if (!image) return false;

		// Delete from storage
		const imagePath = getStoragePathFromUrl(image.url);
		await storage.delete(imagePath).catch(console.error);

		// Delete from database
		await db.delete(trackImages).where(eq(trackImages.id, imageId));

		return true;
	},

	/**
	 * Delete an additional audio file
	 */
	async deleteAudioFile(audioFileId: string): Promise<boolean> {
		const [audioFile] = await db
			.select()
			.from(trackAudioFiles)
			.where(eq(trackAudioFiles.id, audioFileId));

		if (!audioFile) return false;

		// Delete from storage
		const audioPath = getStoragePathFromUrl(audioFile.url);
		await storage.delete(audioPath).catch(console.error);

		// Delete from database
		await db.delete(trackAudioFiles).where(eq(trackAudioFiles.id, audioFileId));

		return true;
	}
};
