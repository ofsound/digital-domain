import { uploadTrack } from '$lib/server/actions/audio';

import type { Actions } from './$types';

export const actions: Actions = {
	upload: uploadTrack
};
