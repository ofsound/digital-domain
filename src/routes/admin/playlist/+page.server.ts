import { fail } from '@sveltejs/kit';

import { storage } from '$lib/storage';
import { trackStore } from '$lib/server/db/track-store';
import { isTrackAnimationKey, type TrackAnimationKey } from '$lib/track-animations/catalog';

import type { Actions, PageServerLoad } from './$types';

function getStoragePathFromUrl(url: string): string {
	return url.replace(/^\/api\/files\//, '').replace(/^\//, '');
}

export const load: PageServerLoad = async () => {
	const tracks = await trackStore.getAll();

	return {
		tracks: tracks.map((t) => ({
			id: t.id,
			name: t.name,
			url: t.url,
			videoUrl: t.videoUrl,
			animationKey: isTrackAnimationKey(t.animationKey) ? t.animationKey : null,
			description: t.description,
			createdAt: t.createdAt.toISOString(),
			images: t.images,
			audioFiles: t.audioFiles
		}))
	};
};

export const actions: Actions = {
	reorder: async ({ request }) => {
		const formData = await request.formData();
		const orderedIdsRaw = formData.get('orderedIds');

		if (typeof orderedIdsRaw !== 'string') {
			return fail(400, { message: 'Invalid order payload.' });
		}

		let orderedIds: unknown;
		try {
			orderedIds = JSON.parse(orderedIdsRaw);
		} catch {
			return fail(400, { message: 'Invalid order payload.' });
		}

		if (!Array.isArray(orderedIds) || !orderedIds.every((id) => typeof id === 'string')) {
			return fail(400, { message: 'Invalid order payload.' });
		}

		if (new Set(orderedIds).size !== orderedIds.length) {
			return fail(400, { message: 'Track order contains duplicates.' });
		}

		const existingTracks = await trackStore.getAll();
		const existingIds = new Set(existingTracks.map((track) => track.id));

		if (orderedIds.length !== existingTracks.length) {
			return fail(400, { message: 'Track order does not match playlist.' });
		}

		if (orderedIds.some((id) => !existingIds.has(id))) {
			return fail(400, { message: 'Track order contains unknown tracks.' });
		}

		await trackStore.reorder(orderedIds);
		return { success: true };
	},

	setVideo: async ({ request }) => {
		const formData = await request.formData();
		const trackId = formData.get('trackId');
		const videoEntry = formData.get('video');

		if (typeof trackId !== 'string' || trackId.length === 0) {
			return fail(400, { message: 'Invalid track.' });
		}

		if (!(videoEntry instanceof File) || videoEntry.size === 0) {
			return fail(400, { message: 'No video file provided.' });
		}

		if (!videoEntry.type.includes('video/mp4') && !videoEntry.name.toLowerCase().endsWith('.mp4')) {
			return fail(400, { message: 'Background video must be MP4.' });
		}

		const track = await trackStore.getById(trackId);
		if (!track) {
			return fail(404, { message: 'Track not found.' });
		}

		const safeName = track.name.replace(/[^a-zA-Z0-9\-_]/g, '_');
		const filename = `${Date.now()}_${safeName}_video.mp4`;
		const videoUrl = await storage.save(videoEntry, `videos/${filename}`);

		if (track.videoUrl) {
			await storage.delete(getStoragePathFromUrl(track.videoUrl)).catch(console.error);
		}

		await trackStore.update(trackId, { videoUrl });
		return { success: true };
	},

	removeVideo: async ({ request }) => {
		const formData = await request.formData();
		const trackId = formData.get('trackId');

		if (typeof trackId !== 'string' || trackId.length === 0) {
			return fail(400, { message: 'Invalid track.' });
		}

		const track = await trackStore.getById(trackId);
		if (!track) {
			return fail(404, { message: 'Track not found.' });
		}

		if (track.videoUrl) {
			await storage.delete(getStoragePathFromUrl(track.videoUrl)).catch(console.error);
		}

		await trackStore.update(trackId, { videoUrl: null });
		return { success: true };
	},

	setAnimation: async ({ request }) => {
		const formData = await request.formData();
		const trackId = formData.get('trackId');
		const animationKeyEntry = formData.get('animationKey');

		if (typeof trackId !== 'string' || trackId.length === 0) {
			return fail(400, { message: 'Invalid track.' });
		}

		let animationKey: TrackAnimationKey | null = null;
		if (typeof animationKeyEntry === 'string' && animationKeyEntry.trim().length > 0) {
			const normalizedAnimationKey = animationKeyEntry.trim();
			if (!isTrackAnimationKey(normalizedAnimationKey)) {
				return fail(400, { message: 'Invalid animation selection.' });
			}
			animationKey = normalizedAnimationKey;
		}

		const track = await trackStore.getById(trackId);
		if (!track) {
			return fail(404, { message: 'Track not found.' });
		}

		await trackStore.update(trackId, { animationKey });
		return { success: true };
	}
};
