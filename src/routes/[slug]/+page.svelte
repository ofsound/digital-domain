<script lang="ts">
	import { buffersLoadedStore, playerStore } from '$lib/stores/player-store.svelte';

	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Non-reactive; avoids $effect malpractice of assigning state that would trigger re-runs
	let lastQueuedTrackId: string | null = null;

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
