import { trackStore } from '$lib/server/db/track-store';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { slug } = params;

	const track = await trackStore.getBySlug(slug);

	if (!track) {
		error(404, 'Track not found');
	}

	return {
		track: {
			id: track.id,
			name: track.name,
			slug: track.slug,
			url: track.url,
			description: track.description,
			createdAt: track.createdAt.toISOString(),
			images: track.images,
			audioFiles: track.audioFiles
		}
	};
};
