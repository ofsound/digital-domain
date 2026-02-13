<script lang="ts">
	import { page } from '$app/state';

	import TrackAnimationLayer from '$lib/components/TrackAnimationLayer.svelte';
	import TrackBackgroundVideo from '$lib/components/TrackBackgroundVideo.svelte';
	import Navigation from '$lib/components/Navigation.svelte';
	import { PersistentPlayer } from '$lib/components/player';
	import { isTrackAnimationKey } from '$lib/track-animations/catalog';

	import favicon from '$lib/assets/favicon.svg';

	import './layout.css';

	let { children, data } = $props();

	// Extract just the fields needed by the player (reactive)
	const playerTracks = $derived(
		data.tracks.map((t) => ({
			id: t.id,
			name: t.name,
			url: t.url,
			videoUrl: t.videoUrl,
			animationKey: isTrackAnimationKey(t.animationKey) ? t.animationKey : null
		}))
	);

	const trackAnimations = $derived(
		data.tracks.map((track) => ({
			id: track.id,
			url: track.url,
			name: track.name,
			animationKey: isTrackAnimationKey(track.animationKey) ? track.animationKey : null
		}))
	);

	const isAdminRoute = $derived(page.url.pathname.startsWith('/admin'));
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="bg-surface relative flex h-dvh max-h-dvh flex-col overflow-hidden">
	<TrackBackgroundVideo enabled={!isAdminRoute} />
	<TrackAnimationLayer enabled={!isAdminRoute} {trackAnimations} />

	<div class="relative z-10">
		<Navigation />
	</div>

	<main class="relative z-10 min-h-0 flex-1 overflow-y-auto">
		{@render children()}
	</main>

	<div class="relative z-10">
		<PersistentPlayer initialTracks={playerTracks} />
	</div>
</div>
