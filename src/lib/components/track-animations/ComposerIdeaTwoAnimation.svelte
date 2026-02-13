<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { createNoise2D } from 'simplex-noise';
	import { resolve } from '$app/paths';
	import { frequencyStore } from '$lib/stores/audio-frequency-store.svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';

	/**
	 * Composer Idea Two: Fluid Blob Borders
	 *
	 * Dashboard with blob-shaped panels. Polygon points are driven by the four
	 * frequency bands; point index mod 4 maps each point to a band. lowBin/highBin
	 * weight sensitivity. Simplex noise adds organic drift modulated by audio.
	 */

	let unsubscribers: (() => void)[] = [];

	const POINT_COUNT = 28;
	const noise2D = createNoise2D();

	// Smoothed band values (0-1)
	let smoothedBands = $state<number[]>([0, 0, 0, 0]);

	// Time for simplex drift (incremented in RAF loop)
	let noiseTime = $state(0);
	let animationFrameId: number | null = null;

	// Generate blob polygon for clip-path. Each point i maps to band (i % 4).
	// lowBin/highBin weight sensitivity. Simplex noise adds organic drift.
	function getBlobPathPercent(
		scaleX: number,
		scaleY: number,
		bands: { current: number; lowBin: number; highBin: number }[]
	): string {
		const cx = 50;
		const cy = 50;
		const baseRadius = 40;
		const points: string[] = [];
		const overallEnergy =
			smoothedBands.reduce((a, b) => a + b, 0) / Math.max(smoothedBands.length, 1);
		const driftAmplitude = 4 + overallEnergy * 8;

		for (let i = 0; i < POINT_COUNT; i++) {
			const bandIndex = i % 4;
			const band = bands[bandIndex];
			if (!band) continue;

			const binSpan = band.highBin - band.lowBin + 1;
			const sensitivity = 1 / Math.max(binSpan * 0.5, 1);
			const audioOffset =
				(smoothedBands[bandIndex] ?? 0) *
				baseRadius *
				0.4 *
				sensitivity *
				(0.8 + 0.4 * Math.sin(i * 0.7));

			const angle = (i / POINT_COUNT) * Math.PI * 2;
			const noiseVal = noise2D(angle * 2, noiseTime);
			const driftOffset = noiseVal * driftAmplitude;
			const r = baseRadius + audioOffset + driftOffset;
			const x = cx + Math.cos(angle) * r * scaleX;
			const y = cy + Math.sin(angle) * r * scaleY;
			points.push(
				`${Math.max(0, Math.min(100, x)).toFixed(2)}% ${Math.max(0, Math.min(100, y)).toFixed(2)}%`
			);
		}
		return `polygon(${points.join(', ')})`;
	}

	onMount(() => {
		playerStore.getAnalyser();
		const unsubscribe = frequencyStore.subscribe();
		unsubscribers.push(unsubscribe);

		const animateLoop = () => {
			if (frequencyStore.isRunning) {
				const bands = frequencyStore.bands;
				smoothedBands = bands.map((band, i) => {
					const prev = smoothedBands[i] ?? 0;
					const norm = Math.min(band.current / 600, 1);
					return prev * 0.88 + norm * 0.12;
				});
			}
			noiseTime += 0.008;
			animationFrameId = requestAnimationFrame(animateLoop);
		};
		animationFrameId = requestAnimationFrame(animateLoop);
	});

	onDestroy(() => {
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		unsubscribers.forEach((unsub) => unsub());
	});
</script>

<div class="relative min-h-screen overflow-hidden bg-transparent text-white">
	<!-- Decorative background blobs -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		{#each [1, 2, 3] as i (i)}
			<div
				class="absolute opacity-20 blur-3xl"
				style="
					width: {120 + i * 80}px;
					height: {120 + i * 80}px;
					left: {15 + i * 25}%;
					top: {10 + (i % 2) * 50}%;
					background: radial-gradient(circle, rgba(147,51,234,0.6) 0%, transparent 70%);
					clip-path: {getBlobPathPercent(1, 1, frequencyStore.bands)};
				"
			></div>
		{/each}
	</div>

	<!-- Header -->
	<header class="relative z-10 flex items-center justify-between p-6">
		<a
			href={resolve('/examples')}
			class="rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/10"
		>
			← Back to Examples
		</a>
		<div class="flex items-center gap-4">
			<span class="text-sm text-white/60">Composer Studio</span>
			<div
				class="h-10 w-10 overflow-hidden rounded-full border-2 border-white/30"
				style="clip-path: {getBlobPathPercent(1, 1, frequencyStore.bands)}"
			>
				<div class="h-full w-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
			</div>
		</div>
	</header>

	<!-- Main layout -->
	<div
		class="relative z-10 grid min-h-[calc(100vh-8rem)] grid-cols-1 gap-6 p-6 md:grid-cols-[240px_1fr] lg:grid-cols-[280px_1fr_320px]"
	>
		<!-- Sidebar with blob nav -->
		<aside class="space-y-2">
			<div class="mb-4 text-xs tracking-wider text-white/50 uppercase">Projects</div>
			{#each ['Project Alpha', 'Mastering', 'Export Queue'] as item, i (item)}
				<div
					class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all"
					style="clip-path: {getBlobPathPercent(1, 1, frequencyStore.bands)}; border-radius: 1rem;"
				>
					<div class="text-sm font-medium">{item}</div>
					<div class="mt-1 text-xs text-white/50">{(i + 1) * 24}% complete</div>
				</div>
			{/each}
		</aside>

		<!-- Main cards -->
		<main class="grid gap-6 md:grid-cols-2">
			<div
				class="overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-purple-900/30 to-slate-900/50 p-8 backdrop-blur-sm"
				style="clip-path: {getBlobPathPercent(1, 1, frequencyStore.bands)}; border-radius: 1.5rem;"
			>
				<div class="text-xs tracking-wider text-purple-400 uppercase">Project Alpha</div>
				<h2 class="mt-2 text-2xl font-bold">Active Session</h2>
				<p class="mt-2 text-white/70">
					Blob borders breathe with sub-bass, bass, low-mid, and mid. Point index mod 4 maps to each
					band. Simplex noise adds organic drift; amplitude scales with audio energy.
				</p>
				<div class="mt-6 flex gap-3">
					<button
						class="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-purple-500"
						style="clip-path: {getBlobPathPercent(
							0.5,
							0.5,
							frequencyStore.bands
						)}; border-radius: 0.75rem;"
					>
						Open
					</button>
					<button
						class="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm transition-colors hover:bg-white/10"
					>
						Settings
					</button>
				</div>
			</div>

			<div
				class="overflow-hidden rounded-3xl border border-pink-500/30 bg-gradient-to-br from-pink-900/20 to-slate-900/50 p-8 backdrop-blur-sm"
				style="clip-path: {getBlobPathPercent(1, 1, frequencyStore.bands)}; border-radius: 1.5rem;"
			>
				<div class="text-xs tracking-wider text-pink-400 uppercase">Mastering</div>
				<h2 class="mt-2 text-2xl font-bold">Levels</h2>
				<div class="mt-4 space-y-4">
					{#each frequencyStore.bands as band (band.name)}
						<div>
							<div class="mb-1 flex justify-between text-xs">
								<span class="text-white/60">{band.name}</span>
								<span class="text-white/40">bins {band.lowBin}-{band.highBin}</span>
							</div>
							<div class="h-2 overflow-hidden rounded-full bg-white/10">
								<div
									class="h-full rounded-full transition-all duration-75 {band.isActive
										? 'bg-purple-500'
										: 'bg-white/30'}"
									style="width: {Math.min(band.current / 6, 100)}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div
				class="overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-cyan-900/20 to-slate-900/50 p-8 backdrop-blur-sm md:col-span-2"
				style="clip-path: {getBlobPathPercent(1, 1, frequencyStore.bands)}; border-radius: 1.5rem;"
			>
				<div class="text-xs tracking-wider text-cyan-400 uppercase">Export</div>
				<h2 class="mt-2 text-2xl font-bold">Ready to Export</h2>
				<p class="mt-2 text-white/70">
					The polygon uses band-specific offsets. Sub-bass (bins 0-1) moves slowly; mid (bins 11-13)
					responds quickly. Bin span modulates sensitivity.
				</p>
			</div>
		</main>

		<!-- Stats sidebar -->
		<aside class="hidden space-y-4 lg:block">
			<div class="rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm">
				<div class="mb-4 text-xs tracking-wider text-white/50 uppercase">Stats</div>
				<div class="space-y-3">
					<div class="flex justify-between text-sm">
						<span class="text-white/60">Active bands</span>
						<span class="font-mono font-bold">
							{frequencyStore.bands.filter((b) => b.isActive).length}
						</span>
					</div>
					<div class="flex justify-between text-sm">
						<span class="text-white/60">FPS</span>
						<span class="font-mono font-bold">{frequencyStore.fps}</span>
					</div>
					<div class="flex justify-between text-sm">
						<span class="text-white/60">Peak</span>
						<span class="font-mono font-bold">
							{Math.max(...frequencyStore.bands.map((b) => b.current), 0).toFixed(0)}
						</span>
					</div>
				</div>
			</div>
			<div
				class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
				style="clip-path: {getBlobPathPercent(1, 1, frequencyStore.bands)}; border-radius: 1rem;"
			>
				<div class="text-xs tracking-wider text-white/50 uppercase">Bin mapping</div>
				<div class="mt-3 space-y-2 text-xs text-white/60">
					{#each frequencyStore.bands as band, i (band.name)}
						<div>
							{band.name}: bins {band.lowBin}-{band.highBin} → points {i}, {i + 4}, {i + 8}...
						</div>
					{/each}
				</div>
			</div>
		</aside>
	</div>

	<!-- Bottom toolbar -->
	<footer class="relative z-10 flex items-center gap-6 border-t border-white/10 px-6 py-4">
		<div class="flex gap-2">
			<button
				class="rounded-xl bg-white/10 px-4 py-2 text-sm transition-colors hover:bg-white/20"
				style="clip-path: {getBlobPathPercent(
					0.3,
					0.5,
					frequencyStore.bands
				)}; border-radius: 0.75rem;"
			>
				Play
			</button>
			<button class="rounded-xl bg-white/10 px-4 py-2 text-sm transition-colors hover:bg-white/20">
				Pause
			</button>
		</div>
		<div class="flex gap-4 text-sm text-white/50">
			<span>BPM: 120</span>
			<span>Level: -6dB</span>
		</div>
		<div class="ml-auto flex gap-2">
			{#each frequencyStore.bands as band (band.name)}
				<div class="h-2 w-8 overflow-hidden rounded-full bg-white/10" title={String(band.current)}>
					<div
						class="h-full rounded-full transition-all duration-75 {band.isActive
							? 'bg-cyan-500'
							: 'bg-white/20'}"
						style="width: {Math.min(band.current / 8, 100)}%"
					></div>
				</div>
			{/each}
		</div>
	</footer>
</div>
