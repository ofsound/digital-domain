<script lang="ts">
	import { onMount } from 'svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	onMount(() => {
		// Find the track in the player's loaded tracks
		const trackIndex = playerStore.tracks.findIndex((t) => t.id === data.track.id);

		if (trackIndex !== -1) {
			// Queue the track (set as current but don't auto-play)
			playerStore.queueTrack(trackIndex);
			// Maximize the player view
			playerStore.maximize();
		}
	});
</script>

<svelte:head>
	<title>{data.track.name} - Digital Domain</title>
	<meta name="description" content={data.track.description || `Listen to ${data.track.name}`} />
</svelte:head>

<!-- Track route - player is maximized and track is queued -->
<div class="flex h-screen items-center justify-center">
	<p class="text-text-secondary">Queued: {data.track.name}</p>
</div>
