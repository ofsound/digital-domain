<script lang="ts">
	import { onMount, type Component } from 'svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';

	interface Props {
		/** Initial tracks to load (optional) */
		initialTracks?: Array<{ id: string; name: string; url: string }>;
	}

	let { initialTracks }: Props = $props();

	let MinimizedComponent = $state<Component | null>(null);
	let MaximizedComponent = $state<Component | null>(null);

	onMount(() => {
		// Load initial tracks if provided
		if (initialTracks && initialTracks.length > 0) {
			playerStore.loadTracks(initialTracks);
		}

		// Dynamically import components
		import('./MinimizedPlayer.svelte').then((mod) => {
			MinimizedComponent = mod.default as Component;
		});
		import('./MaximizedPlayer.svelte').then((mod) => {
			MaximizedComponent = mod.default as Component;
		});
	});
</script>

{#if playerStore.isMaximized}
	{#if MaximizedComponent}
		<MaximizedComponent />
	{/if}
{:else if MinimizedComponent}
	<MinimizedComponent />
{/if}
