<script lang="ts">
	import { buffersLoadedStore, playerStore } from '$lib/stores/player-store.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Only skip if we've already queued the current track (allows re-queue when slug changes)
	let lastQueuedTrackId = $state<string | null>(null);

	// Reactively queue the track once tracks are loaded (use store for reliable reactivity)
	$effect(() => {
		if (!$buffersLoadedStore) return;
		if (lastQueuedTrackId === data.track.id) return;

		const trackIndex = playerStore.tracks.findIndex((t) => t.id === data.track.id);

		if (trackIndex !== -1) {
			playerStore.queueTrack(trackIndex);
			playerStore.maximize();
			lastQueuedTrackId = data.track.id;
		}
	});
</script>

<svelte:head>
	<title>{data.track.name} - Digital Domain</title>
	<meta name="description" content={data.track.description || `Listen to ${data.track.name}`} />
</svelte:head>

<!-- Track route - same as home: maximized player is the main content -->
