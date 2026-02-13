import { trackStore } from '$lib/server/db/track-store';
import { isTrackAnimationKey } from '$lib/track-animations/catalog';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url }) => {
	const tracks = await trackStore.getAll();

	return {
		pathname: url.pathname,
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
