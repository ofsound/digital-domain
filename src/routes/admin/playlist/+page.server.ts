import { fail } from '@sveltejs/kit';

import { trackStore } from '$lib/server/db/track-store';

import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const tracks = await trackStore.getAll();

	return {
		tracks: tracks.map((t) => ({
			id: t.id,
			name: t.name,
			url: t.url,
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
	}
};
