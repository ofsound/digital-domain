<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { gsap } from 'gsap';

	import { frequencyStore } from '$lib/stores/audio-frequency-store.svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';

	/**
	 * Animation Demo Page
	 *
	 * Demonstrates the audio frequency store by showing real-time bin values
	 * and animating elements when thresholds are crossed.
	 *	Similar to the Vue PhysicsVisualizer example, this uses GSAP to animate
	 * elements based on frequency analysis of the playing audio.
	 */

	// Track animation elements
	let itemRefs = $state<HTMLDivElement[]>([]);

	// Store unsubscribe functions
	let unsubscribers: (() => void)[] = [];

	// Subscribe to threshold crossings for each band
	onMount(() => {
		// Initialize player store to ensure audio engine is created
		// This also sets up the analyser in the frequency store
		playerStore.getAnalyser();

		// Subscribe to the frequency store to start analysis
		const unsubscribe = frequencyStore.subscribe();
		unsubscribers.push(unsubscribe);

		// Set up GSAP animations for each band's threshold crossings
		const bands = frequencyStore.bands;
		for (let i = 0; i < bands.length; i++) {
			const band = bands[i];
			if (!band) continue;

			// Subscribe to 'enter' events (crossing above threshold)
			const unsubEnter = frequencyStore.onThreshold(band.name, 'enter', (b) => {
				const element = itemRefs[i];
				if (!element) return;

				const strength = b.current - b.threshold;

				gsap.to(element, {
					duration: 0.05,
					x: `+=${strength / 100}`,
					ease: 'power2.out'
				});
			});
			unsubscribers.push(unsubEnter);

			// Subscribe to 'exit' events (crossing below threshold)
			const unsubExit = frequencyStore.onThreshold(band.name, 'exit', () => {
				const element = itemRefs[i];
				if (!element) return;

				gsap.to(element, {
					duration: 0.3,
					x: 0,
					ease: 'power2.out'
				});
			});
			unsubscribers.push(unsubExit);
		}
	});

	onDestroy(() => {
		// Clean up all subscriptions
		for (const unsub of unsubscribers) {
			unsub();
		}
		unsubscribers = [];
	});
</script>

<div class="min-h-screen bg-transparent p-8">
	<div class="mx-auto max-w-4xl">
		<h1 class="mb-8 text-3xl font-bold">Audio Frequency Animation Demo</h1>

		<div class="rounded-lg bg-white p-8 shadow-lg">
			<h2 class="mb-6 text-xl font-bold">Frequency Band Metrics</h2>

			<div class="grid gap-4 md:grid-cols-4">
				<!-- Column Headers -->
				<div class="space-y-2">
					<div class="font-semibold text-gray-500">Bins</div>
					{#each frequencyStore.bands as band (band.name)}
						<div class="py-2">{band.lowBin}-{band.highBin}</div>
					{/each}
				</div>

				<div class="space-y-2">
					<div class="font-semibold text-gray-500">Threshold</div>
					{#each frequencyStore.bands as band (band.name)}
						<div class="py-2 font-mono">{band.threshold}</div>
					{/each}
				</div>

				<div class="space-y-2">
					<div class="font-semibold text-gray-500">Current</div>
					{#each frequencyStore.bands as band (band.name)}
						<div
							class="py-2 font-mono transition-colors duration-150"
							class:text-green-600={band.isActive}
							class:font-bold={band.isActive}
						>
							{band.current}
						</div>
					{/each}
				</div>

				<div class="space-y-2">
					<div class="font-semibold text-gray-500">Animation</div>
					{#each frequencyStore.bands as band, i (band.name)}
						<div
							bind:this={itemRefs[i]}
							class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 text-white transition-colors duration-150"
							class:bg-green-500={band.isActive}
							class:scale-110={band.isActive}
						>
							⚡
						</div>
					{/each}
				</div>
			</div>

			<div class="mt-8 border-t pt-6">
				<h3 class="mb-4 text-lg font-semibold">How it works</h3>
				<p class="text-gray-600">
					This page demonstrates the frequency store's threshold detection. When audio is playing,
					the frequency bins are grouped into bands and monitored in real-time. When a band's total
					crosses its threshold, GSAP animations trigger the lightning bolt icons to move and change
					color.
				</p>
				<p class="mt-4 text-sm text-gray-500">
					Current FPS: {frequencyStore.fps} | Track: {frequencyStore.currentTrackId ?? 'None'}
				</p>
			</div>
		</div>
	</div>
</div>
