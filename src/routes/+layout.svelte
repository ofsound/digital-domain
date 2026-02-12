<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navigation from '$lib/components/Navigation.svelte';
	import { PersistentPlayer } from '$lib/components/player';

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

<div class="bg-surface min-h-screen">
	<!-- Navigation -->
	<Navigation />

	<!-- Main Content - with padding for fixed nav -->
	<main class="pt-16">
		{@render children()}
	</main>
</div>

<!-- Persistent Player - always present at bottom -->
<PersistentPlayer initialTracks={playerTracks} />
