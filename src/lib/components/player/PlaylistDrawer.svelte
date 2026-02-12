<script lang="ts">
	import type { AudioTrack } from '$lib/audio/playback-state';

	interface Props {
		tracks: AudioTrack[];
		currentTrackIndex: number;
		isVisible: boolean;
		onTrackSelect: (index: number) => void;
		onClose: () => void;
	}

	let { tracks, currentTrackIndex, isVisible, onTrackSelect, onClose }: Props = $props();
</script>

{#if isVisible}
	<div
		class="bg-surface-elevated max-h-[70vh] w-full overflow-y-auto shadow-2xl transition-transform duration-300 ease-out"
	>
		<div class="flex justify-center pt-3 pb-2 md:hidden">
			<div class="bg-surface-subtle h-1 w-12 rounded-full"></div>
		</div>

		<div class="flex items-center justify-between px-4 py-2">
			<h2 class="text-text-primary text-lg font-semibold">Playlist</h2>
			<button
				onclick={onClose}
				class="text-text-muted hover:bg-surface-subtle flex h-10 w-10 items-center justify-center rounded-full"
				aria-label="Close playlist"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-6 w-6"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>

		<div class="pb-safe">
			{#each tracks as track, index (track.id)}
				{@const isCurrent = index === currentTrackIndex}
				<button
					onclick={() => onTrackSelect(index)}
					class="border-surface-subtle flex min-h-14 w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors {isCurrent
						? 'bg-surface-muted text-text-inverse'
						: 'bg-surface-elevated text-text-primary hover:bg-surface-subtle'}"
				>
					<span class="min-w-6 text-center text-xs font-bold">
						{index + 1}
					</span>

					<span class="flex-1 truncate text-sm font-medium">
						{track.name}
					</span>

					{#if isCurrent}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
							/>
						</svg>
					{/if}
				</button>
			{/each}
		</div>
	</div>
{/if}
