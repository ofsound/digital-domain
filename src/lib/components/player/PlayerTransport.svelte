<script lang="ts">
	interface Props {
		isPlaying: boolean;
		isBuffering?: boolean;
		onPrevious: () => void;
		onPlayPause: () => void;
		onNext: () => void;
	}

	let { isPlaying, isBuffering = false, onPrevious, onPlayPause, onNext }: Props = $props();
</script>

<div class="flex items-center justify-center gap-3">
	<button
		type="button"
		class="flex min-h-10 min-w-10 items-center justify-center rounded-full bg-gradient-to-t from-violet-600 to-cyan-500 text-white shadow-md transition-all hover:brightness-90 active:scale-95 md:min-h-14 md:min-w-14"
		onclick={onPrevious}
		aria-label="Previous track"
	>
		<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
			<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
		</svg>
	</button>

	<button
		type="button"
		class="flex min-h-12 min-w-12 items-center justify-center rounded-full bg-gradient-to-t from-violet-600 to-cyan-500 text-white shadow-md transition-all hover:brightness-90 active:scale-95 md:min-h-14 md:min-w-14"
		onclick={onPlayPause}
		aria-label={isPlaying ? 'Pause' : 'Play'}
	>
		{#if isBuffering}
			<svg class="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
		{:else if isPlaying}
			<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
				<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
			</svg>
		{:else}
			<svg class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
				<path d="M8 5v14l11-7z" />
			</svg>
		{/if}
	</button>

	<button
		type="button"
		class="flex min-h-10 min-w-10 items-center justify-center rounded-full bg-gradient-to-t from-violet-600 to-cyan-500 text-white shadow-md transition-all hover:brightness-90 active:scale-95 md:min-h-14 md:min-w-14"
		onclick={onNext}
		aria-label="Next track"
	>
		<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
			<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
		</svg>
	</button>
</div>
