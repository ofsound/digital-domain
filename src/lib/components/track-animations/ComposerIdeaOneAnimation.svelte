<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import { gsap } from 'gsap';
	import { frequencyStore } from '$lib/stores/audio-frequency-store.svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';

	/**
	 * Composer Idea One: The Spotlight
	 *
	 * A full-page editorial layout with an audio-driven circular spotlight mask.
	 * Content is revealed and hidden by a breathing aperture that expands on
	 * threshold enter and contracts on exit. Heavy use of exit events.
	 */

	let unsubscribers: (() => void)[] = [];

	// Spotlight aperture: radius as % of viewport diagonal (20–120)
	let apertureRadius = $state(50);
	let targetRadius = $state(50);
	const MIN_RADIUS = 20;
	const MAX_RADIUS = 120;

	// Smoothed band values (0–1)
	let smoothedMid = $state(0);

	// Spotlight center (drift with mid for jitter)
	let spotlightX = $state(50);
	let spotlightY = $state(50);
	let animationFrameId: number | null = null;

	onMount(() => {
		playerStore.getAnalyser();
		const unsubscribe = frequencyStore.subscribe();
		unsubscribers.push(unsubscribe);

		// Bass enter — expand target
		const unsubBassEnter = frequencyStore.onThreshold('bass', 'enter', (band) => {
			const intensity = (band.current - band.threshold) / band.threshold;
			targetRadius = Math.min(
				MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * (0.5 + intensity * 0.5),
				MAX_RADIUS
			);
		});
		unsubscribers.push(unsubBassEnter);

		// Bass exit — contract target (slow release)
		const unsubBassExit = frequencyStore.onThreshold('bass', 'exit', () => {
			gsap.to(
				{ t: targetRadius },
				{
					t: MIN_RADIUS + 15,
					duration: 1.2,
					ease: 'power2.inOut',
					onUpdate: function () {
						targetRadius = this.targets()[0].t;
					}
				}
			);
		});
		unsubscribers.push(unsubBassExit);

		// Sub-bass enter — expand target
		const unsubSubEnter = frequencyStore.onThreshold('sub-bass', 'enter', (band) => {
			const intensity = (band.current - band.threshold) / band.threshold;
			targetRadius = Math.min(targetRadius + intensity * 25, MAX_RADIUS);
		});
		unsubscribers.push(unsubSubEnter);

		// Sub-bass exit — gentle contract
		const unsubSubExit = frequencyStore.onThreshold('sub-bass', 'exit', () => {
			gsap.to(
				{ t: targetRadius },
				{
					t: Math.max(targetRadius * 0.85, MIN_RADIUS),
					duration: 0.9,
					ease: 'power2.out',
					onUpdate: function () {
						targetRadius = this.targets()[0].t;
					}
				}
			);
		});
		unsubscribers.push(unsubSubExit);

		// Low-mid enter — secondary swell
		const unsubLowMidEnter = frequencyStore.onThreshold('low-mid', 'enter', (band) => {
			const intensity = (band.current - band.threshold) / band.threshold;
			targetRadius = Math.min(targetRadius + intensity * 15, MAX_RADIUS);
		});
		unsubscribers.push(unsubLowMidEnter);

		// Low-mid exit — gradual return
		const unsubLowMidExit = frequencyStore.onThreshold('low-mid', 'exit', () => {
			gsap.to(
				{ t: targetRadius },
				{
					t: Math.max(targetRadius - 8, MIN_RADIUS),
					duration: 0.7,
					ease: 'power2.out',
					onUpdate: function () {
						targetRadius = this.targets()[0].t;
					}
				}
			);
		});
		unsubscribers.push(unsubLowMidExit);

		// Mid enter — burst
		const unsubMidEnter = frequencyStore.onThreshold('mid', 'enter', (band) => {
			const intensity = (band.current - band.threshold) / band.threshold;
			targetRadius = Math.min(targetRadius + intensity * 20, MAX_RADIUS);
		});
		unsubscribers.push(unsubMidEnter);

		// Mid exit — quick snap back
		const unsubMidExit = frequencyStore.onThreshold('mid', 'exit', () => {
			gsap.to(
				{ t: targetRadius },
				{
					t: Math.max(targetRadius - 5, MIN_RADIUS),
					duration: 0.4,
					ease: 'power2.out',
					onUpdate: function () {
						targetRadius = this.targets()[0].t;
					}
				}
			);
		});
		unsubscribers.push(unsubMidExit);

		// Continuous loop: interpolate radius toward target, drift center
		const animateLoop = () => {
			if (frequencyStore.isRunning) {
				const bands = frequencyStore.bands;
				const mid = bands.find((b) => b.name === 'mid');
				if (mid) smoothedMid = smoothedMid * 0.88 + Math.min(mid.current / 600, 1) * 0.12;
			}

			// Interpolate aperture toward target
			apertureRadius = apertureRadius * 0.93 + targetRadius * 0.07;
			apertureRadius = Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, apertureRadius));

			// Mid adds slight center jitter
			spotlightX = 50 + Math.sin(Date.now() / 200) * smoothedMid * 3;
			spotlightY = 50 + Math.cos(Date.now() / 250) * smoothedMid * 2;

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

<div class="relative min-h-screen overflow-hidden bg-transparent">
	<!-- Content behind spotlight mask -->
	<div
		class="overflow-y-auto"
		style="
			clip-path: circle({apertureRadius}% at {spotlightX}% {spotlightY}%);
			-webkit-clip-path: circle({apertureRadius}% at {spotlightX}% {spotlightY}%);
			transition: clip-path 0.08s ease-out;
		"
	>
		<div class="min-h-screen bg-transparent text-white">
			<!-- Back link -->
			<nav class="absolute top-0 right-0 left-0 z-10 flex items-center justify-between p-6">
				<a
					href={resolve('/examples')}
					class="rounded-lg border border-white/20 bg-black/30 px-4 py-2 text-sm backdrop-blur-sm transition-colors hover:bg-white/10"
				>
					← Back to Examples
				</a>
			</nav>

			<!-- Hero -->
			<header class="px-8 pt-24 pb-16 md:pt-32 md:pb-24">
				<div class="mx-auto max-w-4xl">
					<p class="mb-4 text-sm tracking-[0.3em] text-amber-400 uppercase">Editorial</p>
					<h1 class="text-5xl leading-tight font-black tracking-tighter md:text-7xl">
						The Sound of Design
					</h1>
					<p class="mt-6 max-w-2xl text-xl leading-relaxed text-white/70">
						Music shapes the spaces we create. This page responds to every bass drop, every snare
						hit— revealing itself through an aperture that breathes with the beat.
					</p>
				</div>
			</header>

			<!-- Article body -->
			<main class="px-8 pb-16">
				<div class="mx-auto max-w-3xl">
					<div class="prose prose-invert max-w-none">
						<p class="text-lg leading-relaxed text-white/80">
							When we think about digital experiences, we rarely consider how sound can transform
							the way we perceive layout and content. The spotlight effect you're witnessing
							demonstrates a different approach: the mask expands when frequency bands cross their
							thresholds, and contracts gracefully when they release.
						</p>
						<blockquote
							class="my-12 border-l-4 border-amber-500/70 pl-8 text-xl text-white/90 italic"
						>
							"The aperture breathes. Bass drops open it. Silence lets it close."
						</blockquote>
						<p class="text-lg leading-relaxed text-white/80">
							Four frequency bands—sub-bass, bass, low-mid, and mid—each contribute to the radius.
							Sub-bass provides a slow, deep swell. Bass drives the primary pulse. Low-mid adds
							secondary movement. Mid frequencies inject high-frequency jitter into the spotlight
							center.
						</p>
						<p class="mt-6 text-lg leading-relaxed text-white/80">
							Play any track from the persistent player. Watch the content reveal and recede. This
							is a synesthetic bridge between audio and layout—where the music doesn't just
							accompany the page; it controls what you see.
						</p>
					</div>
				</div>
			</main>

			<!-- Card grid -->
			<section class="px-8 pb-20">
				<div class="mx-auto max-w-6xl">
					<h2 class="mb-8 text-2xl font-bold">Related</h2>
					<div class="grid gap-6 md:grid-cols-3">
						<a
							href={resolve('/liquid-grid')}
							class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10"
						>
							<div class="text-sm tracking-wider text-amber-400 uppercase">Liquid Grid</div>
							<h3 class="mt-2 text-lg font-semibold">Adaptive Layouts</h3>
							<p class="mt-1 text-sm text-white/60">Grids that breathe with the music.</p>
						</a>
						<a
							href={resolve('/color-schemes')}
							class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10"
						>
							<div class="text-sm tracking-wider text-amber-400 uppercase">Color Schemes</div>
							<h3 class="mt-2 text-lg font-semibold">Synesthetic Palettes</h3>
							<p class="mt-1 text-sm text-white/60">Colors driven by frequency.</p>
						</a>
						<a
							href={resolve('/reactive-physics')}
							class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10"
						>
							<div class="text-sm tracking-wider text-amber-400 uppercase">Reactive Physics</div>
							<h3 class="mt-2 text-lg font-semibold">Physics + Audio</h3>
							<p class="mt-1 text-sm text-white/60">Matter.js meets the beat.</p>
						</a>
					</div>
				</div>
			</section>

			<!-- Image placeholders -->
			<section class="px-8 pb-20">
				<div class="mx-auto max-w-6xl">
					<div class="grid gap-6 md:grid-cols-2">
						<div
							class="aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900/40 to-slate-800"
						>
							<div class="flex h-full items-center justify-center text-white/30">
								<span>Visual 1</span>
							</div>
						</div>
						<div
							class="aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-amber-900/30"
						>
							<div class="flex h-full items-center justify-center text-white/30">
								<span>Visual 2</span>
							</div>
						</div>
					</div>
				</div>
			</section>

			<!-- Footer -->
			<footer class="border-t border-white/10 px-8 py-12">
				<div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
					<div class="text-sm text-white/50">
						Composer Idea One — The Spotlight. Clip-path + threshold exit.
					</div>
					<a href={resolve('/examples')} class="text-sm text-amber-400 hover:underline"
						>All Examples</a
					>
				</div>
			</footer>
		</div>
	</div>

	<!-- Control panel overlay -->
	<div
		class="pointer-events-none absolute right-8 bottom-8 left-8 flex flex-wrap items-end justify-between gap-4 md:right-auto md:max-w-sm"
	>
		<div class="rounded-xl border border-white/10 bg-black/60 p-4 backdrop-blur-sm">
			<div class="mb-3 text-xs tracking-wider text-white/50 uppercase">Aperture</div>
			<div class="mb-2 font-mono text-2xl font-bold">{apertureRadius.toFixed(0)}%</div>
			<div class="h-2 overflow-hidden rounded-full bg-white/10">
				<div
					class="h-full rounded-full bg-amber-500 transition-all duration-100"
					style="width: {((apertureRadius - MIN_RADIUS) / (MAX_RADIUS - MIN_RADIUS)) * 100}%"
				></div>
			</div>
		</div>
		<div class="flex gap-3">
			{#each frequencyStore.bands as band (band.name)}
				<div class="rounded-lg border border-white/10 bg-black/60 px-3 py-2 backdrop-blur-sm">
					<div class="mb-1 text-[10px] text-white/40 uppercase">{band.name}</div>
					<div
						class="h-1 w-12 overflow-hidden rounded-full bg-white/10"
						title={String(band.current)}
					>
						<div
							class="h-full rounded-full transition-all duration-75 {band.isActive
								? 'bg-amber-500'
								: 'bg-white/30'}"
							style="width: {Math.min(band.current / 8, 100)}%"
						></div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
