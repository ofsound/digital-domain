<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { gsap } from 'gsap';
	import { frequencyStore } from '$lib/stores/audio-frequency-store.svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';

	/**
	 * Liquid Grid Page
	 *
	 * A complex nested CSS grid layout that breathes and shifts with the music.
	 * Grid columns, rows, and areas dynamically resize based on audio frequencies,
	 * revealing hidden content during high-energy sections.
	 */

	let unsubscribers: (() => void)[] = [];

	// Grid configuration values (all 0-1 normalized)
	let mainContentWidth = $state(0.6); // 60% default
	let sidebarWidth = $state(0.25); // 25% default
	let decorativeWidth = $state(0.15); // 15% default (hidden when quiet)
	let rowExpansion = $state(0); // Vertical expansion
	let gridGap = $state(16); // Gap size in px
	let hiddenPanelOpacity = $state(0); // Opacity of bonus panels
	let intensity = $state(0); // Overall energy level

	// Smooth interpolated values
	let smoothedMids = $state(0);
	let smoothedBass = $state(0);
	let smoothedHighs = $state(0);

	// Content visibility states
	let showMetadata = $state(false);
	let showVisuals = $state(false);
	let layoutMode = $state<'quiet' | 'building' | 'intense'>('quiet');

	// Dynamic grid template
	let gridTemplateColumns = $state('1fr 3fr 1fr');
	let gridTemplateRows = $state('auto 1fr auto');

	// Animated cell scales
	let cellScales = $state<number[]>(new Array(12).fill(1));
	let animationFrameId: number | null = null;

	onMount(() => {
		// Initialize audio
		playerStore.getAnalyser();
		const unsubscribe = frequencyStore.subscribe();
		unsubscribers.push(unsubscribe);

		// Bass threshold - expand layout dramatically
		const unsubBass = frequencyStore.onThreshold('bass', 'enter', (band) => {
			const energy = (band.current - band.threshold) / band.threshold;

			// Expand grid gaps
			gsap.to(
				{ gap: gridGap },
				{
					gap: 24 + energy * 32,
					duration: 0.3,
					ease: 'power2.out',
					onUpdate: function () {
						gridGap = this.targets()[0].gap;
					}
				}
			);

			// Reveal hidden decorative panels
			gsap.to(
				{ opacity: hiddenPanelOpacity },
				{
					opacity: Math.min(energy * 1.5, 1),
					duration: 0.4,
					ease: 'power2.out',
					onUpdate: function () {
						hiddenPanelOpacity = this.targets()[0].opacity;
					}
				}
			);

			// Pulse cell scales
			cellScales = cellScales.map((scale, i) => {
				const targetScale = 1 + energy * (0.1 + (i % 3) * 0.05);
				gsap.to(
					{ s: scale },
					{
						s: targetScale,
						duration: 0.2,
						ease: 'power2.out',
						yoyo: true,
						repeat: 1,
						onUpdate: function () {
							cellScales[i] = this.targets()[0].s;
						}
					}
				);
				return scale;
			});
		});
		unsubscribers.push(unsubBass);

		// Low-mid threshold - shift to building mode
		const unsubLowMid = frequencyStore.onThreshold('low-mid', 'enter', () => {
			layoutMode = 'building';
			showMetadata = true;

			// Animate column expansion
			gsap.to(
				{ width: sidebarWidth },
				{
					width: 0.35,
					duration: 0.5,
					ease: 'power2.inOut',
					onUpdate: function () {
						sidebarWidth = this.targets()[0].width;
					}
				}
			);
		});
		unsubscribers.push(unsubLowMid);

		// Exit low-mid - return to quiet mode
		const unsubLowMidExit = frequencyStore.onThreshold('low-mid', 'exit', () => {
			layoutMode = 'quiet';

			gsap.to(
				{ width: sidebarWidth },
				{
					width: 0.2,
					duration: 0.8,
					ease: 'power2.out',
					onUpdate: function () {
						sidebarWidth = this.targets()[0].width;
					}
				}
			);
		});
		unsubscribers.push(unsubLowMidExit);

		// Mid threshold - intense mode with full reveal
		const unsubMid = frequencyStore.onThreshold('mid', 'enter', (band) => {
			layoutMode = 'intense';
			showVisuals = true;
			showMetadata = true;

			const energy = (band.current - band.threshold) / band.threshold;

			// Dramatic layout shift
			gsap.to(
				{
					sidebar: sidebarWidth,
					main: mainContentWidth,
					deco: decorativeWidth
				},
				{
					sidebar: 0.15,
					main: 0.5,
					deco: 0.35,
					duration: 0.4,
					ease: 'power2.out',
					onUpdate: function () {
						const vals = this.targets()[0];
						sidebarWidth = vals.sidebar;
						mainContentWidth = vals.main;
						decorativeWidth = vals.deco;
					}
				}
			);

			// Expand row heights
			gsap.to(
				{ expand: rowExpansion },
				{
					expand: energy * 0.5,
					duration: 0.3,
					ease: 'power2.out',
					onUpdate: function () {
						rowExpansion = this.targets()[0].expand;
					}
				}
			);
		});
		unsubscribers.push(unsubMid);

		// Exit mid - return to building mode
		const unsubMidExit = frequencyStore.onThreshold('mid', 'exit', () => {
			layoutMode = 'building';
			showVisuals = false;

			gsap.to(
				{
					sidebar: sidebarWidth,
					main: mainContentWidth,
					deco: decorativeWidth
				},
				{
					sidebar: 0.3,
					main: 0.55,
					deco: 0.15,
					duration: 0.6,
					ease: 'power2.out',
					onUpdate: function () {
						const vals = this.targets()[0];
						sidebarWidth = vals.sidebar;
						mainContentWidth = vals.main;
						decorativeWidth = vals.deco;
					}
				}
			);
		});
		unsubscribers.push(unsubMidExit);

		// Continuous animation loop for smooth interpolation
		const animateLoop = () => {
			if (!frequencyStore.isRunning) {
				animationFrameId = requestAnimationFrame(animateLoop);
				return;
			}

			const bands = frequencyStore.bands;
			const mids = bands.find((b) => b.name === 'mid');
			const bass = bands.find((b) => b.name === 'bass');
			const lowMid = bands.find((b) => b.name === 'low-mid');

			// Smooth interpolation of values
			if (mids) {
				const normalizedMids = Math.min(mids.current / 600, 1);
				smoothedMids = smoothedMids * 0.92 + normalizedMids * 0.08;
			}

			if (bass) {
				const normalizedBass = Math.min(bass.current / 800, 1);
				smoothedBass = smoothedBass * 0.9 + normalizedBass * 0.1;
			}

			if (lowMid) {
				const normalizedLowMid = Math.min(lowMid.current / 700, 1);
				smoothedHighs = smoothedHighs * 0.94 + normalizedLowMid * 0.06;
			}

			// Calculate overall intensity
			intensity = (smoothedMids + smoothedBass + smoothedHighs) / 3;

			// Update grid templates based on current mode and smoothed values
			updateGridTemplates();

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

	function updateGridTemplates() {
		// Dynamic grid column ratios based on audio
		const leftRatio = sidebarWidth + smoothedHighs * 0.1;
		const centerRatio = mainContentWidth + smoothedMids * 0.15;
		const rightRatio = decorativeWidth + smoothedBass * 0.1;

		// Convert to fr units
		gridTemplateColumns = `${leftRatio}fr ${centerRatio}fr ${rightRatio}fr`;

		// Dynamic row heights based on intensity
		const headerHeight = 80 + smoothedBass * 40;
		const footerHeight = 60 + smoothedMids * 30;
		const contentFlex = 1 + rowExpansion;

		gridTemplateRows = `${headerHeight}px ${contentFlex}fr ${footerHeight}px`;
	}
</script>

<div class="min-h-screen overflow-hidden bg-transparent text-white">
	<!-- Main Liquid Grid Container -->
	<div
		class="min-h-screen p-4 transition-all duration-75 md:p-8"
		style="
			display: grid;
			grid-template-columns: {gridTemplateColumns};
			grid-template-rows: {gridTemplateRows};
			grid-template-areas: 
				'sidebar header decorative'
				'sidebar main decorative'
				'footer footer footer';
			gap: {gridGap}px;
		"
	>
		<!-- Header Area -->
		<header
			class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300"
			style="
				grid-area: header;
				transform: scaleY({1 + smoothedBass * 0.1});
				box-shadow: 0 {4 + smoothedBass * 20}px {20 + smoothedBass * 40}px rgba(147,51,234,{0.2 +
				smoothedBass * 0.3});
			"
		>
			<div>
				<h1 class="text-3xl font-black tracking-tighter md:text-4xl">LIQUID</h1>
				<p class="text-sm text-white/50">Adaptive grid layout</p>
			</div>
			<div class="flex items-center gap-4">
				<div
					class="h-3 w-3 rounded-full transition-all duration-200"
					style="
						background-color: {layoutMode === 'intense'
						? '#ec4899'
						: layoutMode === 'building'
							? '#a855f7'
							: '#6b7280'};
						box-shadow: 0 0 {10 + intensity * 20}px {layoutMode === 'intense'
						? '#ec4899'
						: layoutMode === 'building'
							? '#a855f7'
							: 'transparent'};
					"
				></div>
				<span class="text-xs tracking-wider text-white/50 uppercase">{layoutMode}</span>
			</div>
		</header>

		<!-- Sidebar - Navigation & Controls -->
		<aside
			class="flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300"
			style="
				grid-area: sidebar;
				min-width: {150 + smoothedHighs * 100}px;
			"
		>
			<div class="mb-2 text-xs tracking-wider text-white/50 uppercase">Navigation</div>

			<!-- Nav Items -->
			{#each ['Dashboard', 'Library', 'Settings', 'Profile'] as item, i (item)}
				<div
					class="flex cursor-pointer items-center gap-3 rounded-xl bg-white/5 p-3 transition-all duration-200 hover:bg-white/10"
					style="
						transform: scale({cellScales[i]});
						background: linear-gradient(135deg, rgba(147,51,234,{0.1 +
						smoothedMids * 0.2}) 0%, rgba(236,72,153,{0.1 + smoothedMids * 0.2}) 100%);
					"
				>
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm">
						{i + 1}
					</div>
					<span class="text-sm font-medium">{item}</span>
				</div>
			{/each}

			<!-- Frequency Visualization -->
			<div class="mt-auto">
				<div class="mb-3 text-xs tracking-wider text-white/50 uppercase">Audio Levels</div>
				<div class="space-y-2">
					{#each frequencyStore.bands as band (band.name)}
						<div class="flex items-center gap-2">
							<span class="w-16 truncate text-[10px] text-white/40">{band.name}</span>
							<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
								<div
									class="h-full rounded-full transition-all duration-75"
									style="
										width: {Math.min(band.current / 8, 100)}%;
										background: {band.isActive ? 'linear-gradient(90deg, #a855f7, #ec4899)' : '#6b7280'};
									"
								></div>
							</div>
							<span class="w-8 text-right text-[10px] text-white/30">{band.current.toFixed(0)}</span
							>
						</div>
					{/each}
				</div>
			</div>
		</aside>

		<!-- Main Content Area -->
		<main
			class="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-300"
			style="
				grid-area: main;
				box-shadow: inset 0 0 {30 + smoothedMids * 50}px rgba(147,51,234,{0.1 + smoothedMids * 0.2});
			"
		>
			<!-- Content Header -->
			<div class="mb-6 flex items-center justify-between">
				<h2 class="text-xl font-bold">Main Content</h2>
				<div class="flex gap-2">
					{#each ['Edit', 'Share', 'More'] as action (action)}
						<button
							class="rounded-lg bg-white/10 px-3 py-1.5 text-xs transition-colors hover:bg-white/20"
						>
							{action}
						</button>
					{/each}
				</div>
			</div>

			<!-- Nested Content Grid -->
			<div
				class="grid flex-1 gap-4"
				style="
					grid-template-columns: repeat({showMetadata ? 3 : 2}, 1fr);
					grid-template-rows: repeat({showVisuals ? 3 : 2}, 1fr);
					transition: all 0.5s ease-out;
				"
			>
				<!-- Content Cards -->
				{#each Array.from({ length: 6 }, (_, i) => i) as i (i)}
					<div
						class="flex flex-col justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-all duration-300"
						style="
							transform: scale({cellScales[i + 4]});
							opacity: {showVisuals || i < 4 ? 1 : 0.3};
							grid-column: span {i === 0 ? (showMetadata ? 2 : 1) : 1};
							grid-row: span {i === 1 && showVisuals ? 2 : 1};
							background: linear-gradient(135deg, 
								rgba(147,51,234,{0.05 + smoothedMids * 0.1}) 0%, 
								rgba(236,72,153,{0.05 + smoothedMids * 0.1}) 100%
							);
						"
					>
						<div class="text-xs tracking-wider text-white/50 uppercase">Section {i + 1}</div>
						<div class="text-2xl font-bold" style="opacity: {0.5 + smoothedMids * 0.5}">
							{Math.floor(20 + Math.random() * 80)}%
						</div>
						<div class="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
							<div
								class="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
								style="width: {30 + Math.random() * 70}%"
							></div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Dynamic Content Reveal -->
			{#if showMetadata}
				<div
					class="mt-4 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 transition-all duration-500"
					style="
						opacity: {showMetadata ? 1 : 0};
						transform: translateY({showMetadata ? 0 : 20}px);
					"
				>
					<div class="mb-2 text-xs tracking-wider text-purple-400 uppercase">Metadata</div>
					<div class="grid grid-cols-3 gap-4 text-sm">
						<div>
							<div class="text-white/50">Intensity</div>
							<div class="font-bold">{(intensity * 100).toFixed(0)}%</div>
						</div>
						<div>
							<div class="text-white/50">Grid Gap</div>
							<div class="font-bold">{gridGap.toFixed(0)}px</div>
						</div>
						<div>
							<div class="text-white/50">Mode</div>
							<div class="font-bold capitalize">{layoutMode}</div>
						</div>
					</div>
				</div>
			{/if}
		</main>

		<!-- Decorative/Hidden Panel -->
		<div
			class="flex flex-col gap-4 rounded-2xl border p-6 backdrop-blur-sm transition-all duration-500"
			style="
				grid-area: decorative;
				background: linear-gradient(135deg, 
					rgba(236,72,153,{0.1 + hiddenPanelOpacity * 0.2}) 0%, 
					rgba(147,51,234,{0.1 + hiddenPanelOpacity * 0.2}) 100%
				);
				border-color: rgba(236,72,153,{0.2 + hiddenPanelOpacity * 0.5});
				opacity: {0.3 + hiddenPanelOpacity * 0.7};
				min-width: {100 + hiddenPanelOpacity * 150}px;
			"
		>
			<div class="text-xs tracking-wider text-white/50 uppercase">Visuals</div>

			<!-- Visual Elements -->
			<div class="flex flex-1 flex-col gap-3">
				{#each Array.from({ length: 4 }, (_, i) => i) as i (i)}
					<div
						class="relative flex-1 overflow-hidden rounded-lg bg-white/5"
						style="
							opacity: {hiddenPanelOpacity};
							transform: scale({0.8 + hiddenPanelOpacity * 0.2});
						"
					>
						<div
							class="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20"
							style="
								transform: translateY({100 - smoothedBass * 100}%);
								transition: transform 0.1s ease-out;
							"
						></div>
						<div class="absolute inset-0 flex items-center justify-center">
							<div class="text-xs text-white/30">Visual {i + 1}</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Hidden Content Revealed During Intense Mode -->
			{#if layoutMode === 'intense'}
				<div
					class="mt-4 rounded-lg border border-pink-500/40 bg-pink-500/20 p-3 text-center"
					style="animation: pulse 2s ease-in-out infinite;"
				>
					<div class="text-xs tracking-wider text-pink-400 uppercase">Peak Energy</div>
					<div class="text-2xl font-black">{(intensity * 100).toFixed(0)}%</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<footer
			class="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all duration-300"
			style="
				grid-area: footer;
				height: {60 + smoothedMids * 40}px;
			"
		>
			<div class="flex items-center gap-4">
				{#each frequencyStore.bands as band (band.name)}
					<div class="flex items-center gap-2">
						<div
							class="h-2 w-2 rounded-full transition-all duration-100"
							style="
								background-color: {band.isActive ? '#ec4899' : '#374151'};
								box-shadow: {band.isActive ? '0 0 10px #ec4899' : 'none'};
								transform: scale({band.isActive ? 1.5 : 1});
							"
						></div>
						<span class="hidden text-xs text-white/40 md:inline">{band.name}</span>
					</div>
				{/each}
			</div>

			<div class="flex items-center gap-4 text-xs text-white/50">
				<span>Running: {frequencyStore.isRunning ? 'ON' : 'OFF'}</span>
				<span>FPS: {frequencyStore.fps}</span>
			</div>
		</footer>
	</div>

	<!-- Grid Layout Indicator -->
	<div
		class="fixed right-4 bottom-4 rounded-lg border border-white/10 bg-black/80 p-3 text-xs backdrop-blur-sm"
	>
		<div class="mb-2 tracking-wider text-white/50 uppercase">Grid Config</div>
		<div class="space-y-1 font-mono text-white/70">
			<div>Columns: {gridTemplateColumns}</div>
			<div>Gap: {gridGap.toFixed(0)}px</div>
			<div>Intensity: {(intensity * 100).toFixed(0)}%</div>
		</div>
	</div>
</div>

<style>
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.8;
			transform: scale(1.05);
		}
	}
</style>
