<script lang="ts">
	import { onMount, type Component } from 'svelte';

	import PlayerTransport from './PlayerTransport.svelte';
	import PlaylistDrawer from './PlaylistDrawer.svelte';

	import { playerStore } from '$lib/stores/player-store.svelte';
	import { formatTime } from '$lib/audio/format-time';

	interface VisualizerProps {
		analyser: AnalyserNode | null;
		isPlaying?: boolean;
	}

	let VisualizerComponent = $state<Component<VisualizerProps> | null>(null);

	let playlistVisible = $state(false);
	let progressRef = $state<HTMLDivElement | null>(null);

	interface TooltipState {
		visible: boolean;
		x: number;
		time: number;
	}

	let tooltip = $state<TooltipState>({ visible: false, x: 0, time: 0 });

	onMount(() => {
		import('./SpectrumVisualizer.svelte').then((mod) => {
			VisualizerComponent = mod.default as Component<VisualizerProps>;
		});
	});

	function handleProgressPointerDown(event: PointerEvent) {
		if (!progressRef || playerStore.duration === 0) return;

		progressRef.setPointerCapture(event.pointerId);

		const rect = progressRef.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, x / rect.width));
		const time = percentage * playerStore.duration;

		playerStore.seek(time);

		if (event.pointerType === 'touch') {
			tooltip = {
				visible: true,
				x: event.clientX - rect.left,
				time
			};
		}
	}

	function handleProgressPointerMove(event: PointerEvent) {
		if (!progressRef || playerStore.duration === 0) return;

		const rect = progressRef.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const percentage = Math.max(0, Math.min(1, x / rect.width));
		const time = percentage * playerStore.duration;

		tooltip = {
			visible: true,
			x: event.clientX - rect.left,
			time
		};
	}

	function handleProgressPointerUp(event: PointerEvent) {
		if (progressRef) {
			progressRef.releasePointerCapture(event.pointerId);
		}
		tooltip = { ...tooltip, visible: false };
	}

	function handleProgressPointerLeave() {
		tooltip = { ...tooltip, visible: false };
	}

	function handleProgressKeyDown(event: KeyboardEvent) {
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
			case 'Home':
				event.preventDefault();
				playerStore.seek(0);
				break;
			case 'End':
				event.preventDefault();
				playerStore.seek(playerStore.duration);
				break;
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
			return;
		}

		switch (event.key) {
			case ' ':
				event.preventDefault();
				playerStore.togglePlayPause();
				break;
			case 'ArrowLeft':
				event.preventDefault();
				playerStore.previousTrack();
				break;
			case 'ArrowRight':
				event.preventDefault();
				playerStore.nextTrack();
				break;
		}
	}

	const progressPercentage = $derived(
		playerStore.duration > 0 ? (playerStore.currentTime / playerStore.duration) * 100 : 0
	);
</script>

<svelte:window onkeydown={handleKeyDown} />

<div class="bg-surface fixed inset-0 z-50 flex flex-col">
	<!-- Header with minimize button -->
	<div class="border-surface-subtle flex items-center justify-between border-b px-4 py-3">
		<h2 class="text-text-primary text-lg font-semibold">Now Playing</h2>
		<button
			type="button"
			class="text-text-secondary hover:bg-surface-subtle hover:text-text-primary flex h-10 w-10 items-center justify-center rounded-full transition-colors"
			onclick={() => playerStore.minimize()}
			aria-label="Minimize player"
		>
			<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
	</div>

	<!-- Error Banner -->
	{#if playerStore.error}
		<div class="flex items-center justify-between bg-red-500 px-4 py-3 text-white">
			<span class="text-sm">{playerStore.error}</span>
			<button
				onclick={() => playerStore.retryLoad()}
				class="rounded bg-white px-3 py-1 text-sm font-medium text-red-500 transition-colors hover:bg-red-50"
			>
				Retry
			</button>
		</div>
	{/if}

	<!-- Loading State -->
	{#if playerStore.isLoading}
		<div class="flex flex-1 items-center justify-center gap-2">
			<div
				class="border-surface-subtle h-8 w-8 animate-spin rounded-full border-2 border-t-violet-600"
			></div>
			<span class="text-text-secondary">Loading audio...</span>
		</div>
	{:else}
		<div class="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
			<!-- Title -->
			<div class="text-center">
				<h3 class="text-text-primary truncate text-2xl font-bold">
					{playerStore.currentTrack?.name || 'No track selected'}
				</h3>
			</div>

			<!-- Controls Row -->
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<!-- Playlist Toggle -->
					<button
						onclick={() => (playlistVisible = !playlistVisible)}
						class="bg-surface-subtle text-text-primary hover:bg-surface-muted flex items-center gap-2 rounded-lg px-3 py-2 transition-colors"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 6h16M4 12h16M4 18h16"
							/>
						</svg>
						<span class="text-sm">Playlist</span>
					</button>

					<!-- Shuffle Toggle -->
					<button
						onclick={() => playerStore.toggleShuffle()}
						class="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors {playerStore.isShuffleEnabled
							? 'bg-violet-600 text-white'
							: 'bg-surface-subtle text-text-primary hover:bg-surface-muted'}"
						aria-label="Toggle shuffle"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"
							/>
						</svg>
					</button>

					<!-- Loop Toggle -->
					<button
						onclick={() => playerStore.toggleLoop()}
						class="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors {playerStore.isLoopEnabled
							? 'bg-violet-600 text-white'
							: 'bg-surface-subtle text-text-primary hover:bg-surface-muted'}"
						aria-label="Toggle loop"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
					</button>
				</div>

				<!-- Volume -->
				<div class="flex items-center gap-2">
					<svg
						class="text-text-secondary h-5 w-5"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
						/>
					</svg>
					<input
						type="range"
						min="0"
						max="1"
						step="0.01"
						value={playerStore.volume}
						oninput={(e) => playerStore.setVolume(parseFloat(e.currentTarget.value))}
						class="w-24 accent-violet-600"
					/>
				</div>
			</div>

			<!-- Transport Controls -->
			<div class="flex justify-center py-4">
				<PlayerTransport
					isPlaying={playerStore.isPlaying}
					isBuffering={playerStore.isBuffering}
					onPlayPause={() => playerStore.togglePlayPause()}
					onPrevious={() => playerStore.previousTrack()}
					onNext={() => playerStore.nextTrack()}
				/>
			</div>

			<!-- Progress Bar -->
			<div
				bind:this={progressRef}
				class="group bg-surface-subtle relative h-4 cursor-pointer touch-none rounded-full"
				onpointerdown={handleProgressPointerDown}
				onpointermove={handleProgressPointerMove}
				onpointerup={handleProgressPointerUp}
				onpointerleave={handleProgressPointerLeave}
				onkeydown={handleProgressKeyDown}
				role="slider"
				aria-valuenow={playerStore.currentTime}
				aria-valuemax={playerStore.duration}
				aria-label="Progress"
				tabindex="0"
			>
				<div
					class="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-600 to-cyan-500"
					style="width: {progressPercentage}%"
				></div>

				{#if tooltip.visible}
					<div
						class="bg-surface-muted pointer-events-none absolute -top-10 -translate-x-1/2 transform rounded px-2 py-1 text-xs text-white"
						style="left: {tooltip.x}px"
					>
						{formatTime(tooltip.time)}
					</div>
				{/if}
			</div>

			<!-- Time Display -->
			<div class="text-text-secondary flex justify-between text-sm">
				<span>{formatTime(playerStore.currentTime)}</span>
				<span>{formatTime(playerStore.duration)}</span>
			</div>

			<!-- Spectrum Visualizer -->
			{#if VisualizerComponent}
				<div class="mt-4 flex justify-center">
					<VisualizerComponent
						analyser={playerStore.getAnalyser()}
						isPlaying={playerStore.isPlaying}
					/>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Playlist Drawer -->
	<PlaylistDrawer
		tracks={playerStore.tracks}
		currentTrackIndex={playerStore.currentTrackIndex}
		isVisible={playlistVisible}
		onTrackSelect={(index) => playerStore.startTrack(index)}
		onClose={() => (playlistVisible = false)}
	/>
</div>
