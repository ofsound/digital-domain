<script lang="ts">
	import { playerStore } from '$lib/stores/player-store.svelte';
	import { formatTime } from '$lib/audio/format-time';

	let progressRef = $state<HTMLDivElement | null>(null);

	function progressBarAction(node: HTMLDivElement) {
		progressRef = node;
		return {
			destroy() {
				progressRef = null;
			}
		};
	}

	const progressPercentage = $derived(
		playerStore.duration > 0 ? (playerStore.currentTime / playerStore.duration) * 100 : 0
	);

	function handleProgressClick(event: MouseEvent) {
		if (!progressRef || playerStore.duration === 0) return;

		const rect = progressRef.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, x / rect.width));
		const time = percentage * playerStore.duration;

		playerStore.seek(time);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (playerStore.duration === 0) return;

		const seekStep = 5;
		switch (event.key) {
			case 'ArrowLeft':
				event.preventDefault();
				playerStore.seek(Math.max(0, playerStore.currentTime - seekStep));
				break;
			case 'ArrowRight':
				event.preventDefault();
				playerStore.seek(Math.min(playerStore.duration, playerStore.currentTime + seekStep));
				break;
		}
	}
</script>

<div class="bg-surface-elevated fixed inset-x-0 bottom-0 z-40 shadow-2xl">
	<div class="flex items-center gap-4 px-4 py-3">
		<!-- Play/Pause Button -->
		<button
			type="button"
			class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-t from-violet-600 to-cyan-500 text-white shadow-md transition-all hover:brightness-90 active:scale-95"
			onclick={() => playerStore.togglePlayPause()}
			aria-label={playerStore.isPlaying ? 'Pause' : 'Play'}
		>
			{#if playerStore.isLoading}
				<svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
			{:else if playerStore.isPlaying}
				<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
					<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
				</svg>
			{:else}
				<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
					<path d="M8 5v14l11-7z" />
				</svg>
			{/if}
		</button>

		<!-- Track Info -->
		<div class="min-w-0 flex-1">
			<div class="text-text-primary truncate text-sm font-medium">
				{playerStore.currentTrack?.name || 'No track selected'}
			</div>
			<div class="text-text-secondary flex items-center gap-2 text-xs">
				<span>{formatTime(playerStore.currentTime)}</span>
				<span>/</span>
				<span>{formatTime(playerStore.duration)}</span>
			</div>
		</div>

		<!-- Progress Bar (Clickable) -->
		<div
			use:progressBarAction
			class="hidden flex-1 cursor-pointer md:block"
			onclick={handleProgressClick}
			onkeydown={handleKeyDown}
			role="slider"
			aria-valuenow={playerStore.currentTime}
			aria-valuemax={playerStore.duration}
			aria-label="Progress"
			tabindex="0"
		>
			<div class="group bg-surface-subtle relative h-2 rounded-full">
				<div
					class="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 transition-all"
					style="width: {progressPercentage}%"
				></div>
			</div>
		</div>

		<!-- Expand Button -->
		<button
			type="button"
			class="text-text-secondary hover:bg-surface-subtle hover:text-text-primary flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors"
			onclick={() => playerStore.maximize()}
			aria-label="Expand player"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
			</svg>
		</button>
	</div>

	<!-- Mobile Progress Bar -->
	<div class="block px-4 pb-2 md:hidden">
		<button
			type="button"
			class="w-full"
			onclick={handleProgressClick}
			aria-label="Audio progress - click to seek"
		>
			<div class="bg-surface-subtle relative h-1 rounded-full">
				<div
					class="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500"
					style="width: {progressPercentage}%"
				></div>
			</div>
		</button>
	</div>
</div>
