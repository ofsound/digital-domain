<script lang="ts">
	import { playerStore } from '$lib/stores/player-store.svelte';

	interface Props {
		enabled?: boolean;
	}

	let { enabled = true }: Props = $props();

	const currentVideoUrl = $derived(enabled ? (playerStore.currentTrack?.videoUrl ?? null) : null);
</script>

{#if currentVideoUrl}
	<div class="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
		{#key currentVideoUrl}
			<video class="h-full w-full object-cover" autoplay muted loop playsinline preload="metadata">
				<source src={currentVideoUrl} type="video/mp4" />
			</video>
		{/key}
	</div>
{/if}
