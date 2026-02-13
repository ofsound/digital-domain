<script lang="ts">
	import { playerStore } from '$lib/stores/player-store.svelte';
	import { isTrackAnimationKey } from '$lib/track-animations/catalog';
	import { trackAnimationComponents } from '$lib/track-animations/registry';

	interface Props {
		enabled?: boolean;
		trackAnimations?: Array<{
			id: string;
			url: string;
			name: string;
			animationKey: string | null | undefined;
		}>;
	}

	let { enabled = true, trackAnimations = [] }: Props = $props();

	const currentAnimationKey = $derived.by(() => {
		if (!enabled) {
			return null;
		}

		const currentTrack = playerStore.currentTrack;
		if (!currentTrack) {
			return null;
		}

		const mappedTrack = trackAnimations.find(
			(track) =>
				track.id === currentTrack.id ||
				track.url === currentTrack.url ||
				track.name === currentTrack.name
		);

		if (mappedTrack && isTrackAnimationKey(mappedTrack.animationKey)) {
			return mappedTrack.animationKey;
		}

		return isTrackAnimationKey(currentTrack.animationKey) ? currentTrack.animationKey : null;
	});

	const CurrentAnimationComponent = $derived(
		currentAnimationKey && isTrackAnimationKey(currentAnimationKey)
			? trackAnimationComponents[currentAnimationKey]
			: null
	);
</script>

{#if CurrentAnimationComponent && currentAnimationKey}
	<div
		class="pointer-events-none fixed inset-0 z-[1] [transform:translateZ(0)] overflow-hidden [contain:layout_paint_style] [&_*]:pointer-events-none [&_a]:hidden [&_button]:hidden [&_input]:hidden [&_select]:hidden [&_textarea]:hidden"
		aria-hidden="true"
	>
		{#key currentAnimationKey}
			<div class="absolute inset-0 [transform:translateZ(0)] overflow-hidden">
				<CurrentAnimationComponent layerMode={true} />
			</div>
		{/key}
	</div>
{/if}
