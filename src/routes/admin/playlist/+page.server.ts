import { trackStore } from '$lib/server/db/track-store';

import type { PageServerLoad } from './$types';

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
