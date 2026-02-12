<script lang="ts">
	import { onMount } from 'svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';

	/**
	 * Examples Landing Page
	 *
	 * A showcase of all 9 audio-reactive experiences built with the frequency store.
	 * Each example demonstrates different ways to visualize and interact with audio data.
	 */

	let isAudioInitialized = $state(false);

	onMount(() => {
		// Initialize audio engine when page loads
		playerStore.getAnalyser();
		isAudioInitialized = true;
	});

	const examples = [
		{
			path: '/animation',
			title: 'Frequency Animation Demo',
			description:
				'The foundational example demonstrating real-time frequency bin analysis with GSAP animations. Watch as four frequency bands trigger visual animations when crossing their thresholds, with lightning bolt icons that move and pulse to the beat.',
			features: ['Threshold detection', 'GSAP animations', 'Real-time metrics'],
			color: 'from-blue-500 to-cyan-500'
		},
		{
			path: '/reactive-typography',
			title: 'Reactive Typography',
			description:
				'Text that breathes, pulses, and transforms with the music. Giant letterforms scale and glow with bass frequencies while letter-spacing expands on rhythmic hits. Features continuous waveform visualization and dynamic text shadows.',
			features: ['Text scaling', 'Dynamic spacing', 'Glow effects'],
			color: 'from-purple-500 to-pink-500'
		},
		{
			path: '/elements-shifting',
			title: 'Elements Shifting',
			description:
				'A 3D field of geometric shapes that shift, rotate, and transform based on audio frequencies. An 8x8 grid of prismatic forms creates an organic, breathing landscape with ripple effects and rotation waves triggered by the music.',
			features: ['3D grid', 'Geometric forms', 'Ripple effects'],
			color: 'from-violet-500 to-purple-500'
		},
		{
			path: '/particle-system',
			title: 'Particle System',
			description:
				'Canvas-based particle explosions that burst, flow, and create trails based on audio frequencies. Features 800 particles with physics, screen shake on bass drops, and ring-shaped emissions that respond to the music.',
			features: ['800 particles', 'Physics simulation', 'Explosion effects'],
			color: 'from-pink-500 to-rose-500'
		},
		{
			path: '/micro-animations',
			title: 'Micro Animations',
			description:
				'Subtle, elegant UI micro-interactions that respond to audio frequencies. Cards pulse, buttons ripple, progress bars dance, and circular indicators animate when thresholds are crossed. Demonstrates audio-enhanced user interfaces.',
			features: ['UI cards', 'Progress bars', 'Button effects'],
			color: 'from-indigo-500 to-blue-500'
		},
		{
			path: '/typography-heartbeat',
			title: 'Typography Heartbeat',
			description:
				"Variable font typography that pulses with the music's heartbeat. Bass frequencies drive font-weight from 300 to 900, creating text that physically thickens with the kick drum. Features an EKG visualization and BPM counter.",
			features: ['Variable fonts', 'Font-weight animation', 'EKG visualization'],
			color: 'from-emerald-500 to-teal-500'
		},
		{
			path: '/liquid-grid',
			title: 'Liquid Grid',
			description:
				'A complex nested CSS grid layout that breathes and shifts with the music. Columns, rows, and gaps dynamically resize based on audio—expanding during intense passages and contracting during quiet sections. Hidden panels reveal during high energy.',
			features: ['Adaptive grid', 'Dynamic columns', 'Hidden panels'],
			color: 'from-amber-500 to-orange-500'
		},
		{
			path: '/color-schemes',
			title: 'Color Schemes',
			description:
				"A synesthetic experience where audio frequencies dictate the entire site's color palette. Bass maps to warm reds, mids to neon cyans, and overall energy controls saturation. The entire UI becomes a living, breathing color field.",
			features: ['Synesthetic colors', 'HSL mapping', 'Color history'],
			color: 'from-rose-500 to-red-500'
		},
		{
			path: '/reactive-physics',
			title: 'Reactive Physics',
			description:
				'Matter.js physics simulation where UI elements react to audio with realistic forces. Buttons and cards experience explosive scatter on snare hits, heavy gravity on bass drops, inverse gravity on melodies, and slippery friction on sub-bass.',
			features: ['Matter.js physics', 'Explosive forces', 'Interactive bodies'],
			color: 'from-cyan-500 to-blue-500'
		}
	];
</script>

<svelte:head>
	<title>Audio-Reactive Examples</title>
	<meta
		name="description"
		content="Showcase of 9 audio-reactive experiences built with frequency analysis"
	/>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black text-white">
	<!-- Hero Section -->
	<header class="relative px-8 py-20 md:py-32">
		<div class="mx-auto max-w-6xl text-center">
			<div
				class="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-sm"
			>
				<div class="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
				<span class="text-sm text-white/60"
					>{isAudioInitialized ? 'Audio Engine Ready' : 'Initializing...'}</span
				>
			</div>

			<h1 class="mb-6 text-5xl font-black tracking-tighter md:text-7xl">
				<span
					class="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent"
				>
					Audio-Reactive
				</span>
				<br />
				Experiences
			</h1>

			<p class="mx-auto max-w-2xl text-lg leading-relaxed text-white/60 md:text-xl">
				Nine unique explorations of real-time audio frequency analysis. Each example demonstrates
				different ways to visualize, animate, and interact with music.
			</p>

			<div class="mt-8 flex flex-wrap justify-center gap-4 text-sm text-white/40">
				<span class="flex items-center gap-2">
					<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"
						><path
							d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
						/></svg
					>
					Play any audio to begin
				</span>
				<span class="hidden md:inline">•</span>
				<span>60fps real-time analysis</span>
				<span class="hidden md:inline">•</span>
				<span>4 frequency bands</span>
			</div>
		</div>
	</header>

	<!-- Examples Grid -->
	<main class="px-8 pb-20">
		<div class="mx-auto max-w-7xl">
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each examples as example, i (example.path)}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a
						href={example.path}
						class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
					>
						<!-- Gradient accent -->
						<div
							class="absolute inset-0 bg-gradient-to-br {example.color} opacity-0 transition-opacity duration-300 group-hover:opacity-10"
						></div>

						<!-- Number badge -->
						<div
							class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
						>
							{i + 1}
						</div>

						<div class="relative">
							<!-- Icon placeholder -->
							<div
								class="h-12 w-12 rounded-xl bg-gradient-to-br {example.color} mb-4 flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
							>
								<svg
									class="h-6 w-6 text-white"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
									/>
								</svg>
							</div>

							<h2
								class="mb-2 text-xl font-bold group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent {example.color} transition-all duration-300"
							>
								{example.title}
							</h2>

							<p class="mb-4 text-sm leading-relaxed text-white/50">
								{example.description}
							</p>

							<!-- Features -->
							<div class="flex flex-wrap gap-2">
								{#each example.features as feature (feature)}
									<span
										class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
									>
										{feature}
									</span>
								{/each}
							</div>

							<!-- Arrow indicator -->
							<div
								class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
							>
								<span>Explore</span>
								<svg
									class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5l7 7-7 7"
									/>
								</svg>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</main>

	<!-- Footer -->
	<footer class="border-t border-white/10 px-8 py-12">
		<div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
			<div class="text-sm text-white/40">
				Built with <span class="text-white/60">Svelte 5</span>,
				<span class="text-white/60">GSAP</span>, <span class="text-white/60">Matter.js</span>, and
				<span class="text-white/60">Web Audio API</span>
			</div>
			<div class="flex items-center gap-4 text-sm text-white/40">
				<span>Frequency Store</span>
				<span class="h-1 w-1 rounded-full bg-white/20"></span>
				<span>60fps Analysis</span>
				<span class="h-1 w-1 rounded-full bg-white/20"></span>
				<span>Real-time</span>
			</div>
		</div>
	</footer>
</div>
