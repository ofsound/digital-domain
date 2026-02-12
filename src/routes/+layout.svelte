<script lang="ts">
	import Navigation from '$lib/components/Navigation.svelte';
	import { PersistentPlayer } from '$lib/components/player';

	import favicon from '$lib/assets/favicon.svg';

	import './layout.css';

	let { children, data } = $props();

	// Extract just the fields needed by the player (reactive)
	const playerTracks = $derived(
		data.tracks.map((t) => ({
			id: t.id,
			name: t.name,
			url: t.url
		}))
	);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="bg-surface flex h-dvh max-h-dvh flex-col overflow-hidden">
	<Navigation />

	<main class="min-h-0 flex-1 overflow-y-auto">
		{@render children()}
	</main>

	<PersistentPlayer initialTracks={playerTracks} />
</div>
