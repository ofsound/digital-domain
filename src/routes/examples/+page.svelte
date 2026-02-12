<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { playerStore } from '$lib/stores/player-store.svelte';

	/**
	 * Examples Landing Page
	 *
	 * A showcase of all 17 audio-reactive experiences built with the frequency store.
	 * Each example demonstrates different ways to visualize and interact with audio data.
	 */

	let isAudioInitialized = $state(false);

	onMount(() => {
		// Initialize audio engine when page loads
		playerStore.getAnalyser();
		isAudioInitialized = true;
	});
</script>

<svelte:head>
	<title>Audio-Reactive Examples</title>
	<meta
		name="description"
		content="Showcase of 17 audio-reactive experiences built with frequency analysis"
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
				Seventeen unique explorations of real-time audio frequency analysis. Each example
				demonstrates different ways to visualize, animate, and interact with music.
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
				<!-- Example 1: Frequency Animation Demo -->
				<a
					href={resolve('/animation')}
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>
					<div
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
					>
						1
					</div>
					<div class="relative">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 transition-transform duration-300 group-hover:scale-110"
						>
							<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
								/></svg
							>
						</div>
						<h2
							class="mb-2 from-blue-500 to-cyan-500 text-xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent"
						>
							Frequency Animation Demo
						</h2>
						<p class="mb-4 text-sm leading-relaxed text-white/50">
							The foundational example demonstrating real-time frequency bin analysis with GSAP
							animations. Watch as four frequency bands trigger visual animations when crossing
							their thresholds, with lightning bolt icons that move and pulse to the beat.
						</p>
						<div class="flex flex-wrap gap-2">
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Threshold detection</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>GSAP animations</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Real-time metrics</span
							>
						</div>
						<div
							class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
						>
							<span>Explore</span><svg
								class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</div>
					</div>
				</a>

				<!-- Example 2: Reactive Typography -->
				<a
					href={resolve('/reactive-typography')}
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>
					<div
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
					>
						2
					</div>
					<div class="relative">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 transition-transform duration-300 group-hover:scale-110"
						>
							<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 6h16M4 12h16M4 18h7"
								/></svg
							>
						</div>
						<h2
							class="mb-2 from-purple-500 to-pink-500 text-xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent"
						>
							Reactive Typography
						</h2>
						<p class="mb-4 text-sm leading-relaxed text-white/50">
							Text that breathes, pulses, and transforms with the music. Giant letterforms scale and
							glow with bass frequencies while letter-spacing expands on rhythmic hits. Features
							continuous waveform visualization and dynamic text shadows.
						</p>
						<div class="flex flex-wrap gap-2">
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Text scaling</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Dynamic spacing</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Glow effects</span
							>
						</div>
						<div
							class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
						>
							<span>Explore</span><svg
								class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</div>
					</div>
				</a>

				<!-- Example 3: Elements Shifting -->
				<a
					href={resolve('/elements-shifting')}
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-violet-500 to-purple-500 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>
					<div
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
					>
						3
					</div>
					<div class="relative">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 transition-transform duration-300 group-hover:scale-110"
						>
							<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
								/></svg
							>
						</div>
						<h2
							class="mb-2 from-violet-500 to-purple-500 text-xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent"
						>
							Elements Shifting
						</h2>
						<p class="mb-4 text-sm leading-relaxed text-white/50">
							A 3D field of geometric shapes that shift, rotate, and transform based on audio
							frequencies. An 8x8 grid of prismatic forms creates an organic, breathing landscape
							with ripple effects and rotation waves triggered by the music.
						</p>
						<div class="flex flex-wrap gap-2">
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>3D grid</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Geometric forms</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Ripple effects</span
							>
						</div>
						<div
							class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
						>
							<span>Explore</span><svg
								class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</div>
					</div>
				</a>

				<!-- Example 4: Particle System -->
				<a
					href={resolve('/particle-system')}
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-pink-500 to-rose-500 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>
					<div
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
					>
						4
					</div>
					<div class="relative">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 transition-transform duration-300 group-hover:scale-110"
						>
							<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
								/></svg
							>
						</div>
						<h2
							class="mb-2 from-pink-500 to-rose-500 text-xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent"
						>
							Particle System
						</h2>
						<p class="mb-4 text-sm leading-relaxed text-white/50">
							Canvas-based particle explosions that burst, flow, and create trails based on audio
							frequencies. Features 800 particles with physics, screen shake on bass drops, and
							ring-shaped emissions that respond to the music.
						</p>
						<div class="flex flex-wrap gap-2">
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>800 particles</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Physics simulation</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Explosion effects</span
							>
						</div>
						<div
							class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
						>
							<span>Explore</span><svg
								class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</div>
					</div>
				</a>

				<!-- Example 5: Micro Animations -->
				<a
					href={resolve('/micro-animations')}
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-indigo-500 to-blue-500 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>
					<div
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
					>
						5
					</div>
					<div class="relative">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 transition-transform duration-300 group-hover:scale-110"
						>
							<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
								/></svg
							>
						</div>
						<h2
							class="mb-2 from-indigo-500 to-blue-500 text-xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent"
						>
							Micro Animations
						</h2>
						<p class="mb-4 text-sm leading-relaxed text-white/50">
							Subtle, elegant UI micro-interactions that respond to audio frequencies. Cards pulse,
							buttons ripple, progress bars dance, and circular indicators animate when thresholds
							are crossed. Demonstrates audio-enhanced user interfaces.
						</p>
						<div class="flex flex-wrap gap-2">
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>UI cards</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Progress bars</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Button effects</span
							>
						</div>
						<div
							class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
						>
							<span>Explore</span><svg
								class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</div>
					</div>
				</a>

				<!-- Example 6: Typography Heartbeat -->
				<a
					href={resolve('/typography-heartbeat')}
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-500 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>
					<div
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
					>
						6
					</div>
					<div class="relative">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 transition-transform duration-300 group-hover:scale-110"
						>
							<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
								/></svg
							>
						</div>
						<h2
							class="mb-2 from-emerald-500 to-teal-500 text-xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent"
						>
							Typography Heartbeat
						</h2>
						<p class="mb-4 text-sm leading-relaxed text-white/50">
							Variable font typography that pulses with the music's heartbeat. Bass frequencies
							drive font-weight from 300 to 900, creating text that physically thickens with the
							kick drum. Features an EKG visualization and BPM counter.
						</p>
						<div class="flex flex-wrap gap-2">
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Variable fonts</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Font-weight animation</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>EKG visualization</span
							>
						</div>
						<div
							class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
						>
							<span>Explore</span><svg
								class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</div>
					</div>
				</a>

				<!-- Example 7: Liquid Grid -->
				<a
					href={resolve('/liquid-grid')}
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>
					<div
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
					>
						7
					</div>
					<div class="relative">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 transition-transform duration-300 group-hover:scale-110"
						>
							<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
								/></svg
							>
						</div>
						<h2
							class="mb-2 from-amber-500 to-orange-500 text-xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent"
						>
							Liquid Grid
						</h2>
						<p class="mb-4 text-sm leading-relaxed text-white/50">
							A complex nested CSS grid layout that breathes and shifts with the music. Columns,
							rows, and gaps dynamically resize based on audio—expanding during intense passages and
							contracting during quiet sections. Hidden panels reveal during high energy.
						</p>
						<div class="flex flex-wrap gap-2">
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Adaptive grid</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Dynamic columns</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Hidden panels</span
							>
						</div>
						<div
							class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
						>
							<span>Explore</span><svg
								class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</div>
					</div>
				</a>

				<!-- Example 8: Color Schemes -->
				<a
					href={resolve('/color-schemes')}
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-rose-500 to-red-500 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>
					<div
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
					>
						8
					</div>
					<div class="relative">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-500 transition-transform duration-300 group-hover:scale-110"
						>
							<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
								/></svg
							>
						</div>
						<h2
							class="mb-2 from-rose-500 to-red-500 text-xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent"
						>
							Color Schemes
						</h2>
						<p class="mb-4 text-sm leading-relaxed text-white/50">
							A synesthetic experience where audio frequencies dictate the entire site's color
							palette. Bass maps to warm reds, mids to neon cyans, and overall energy controls
							saturation. The entire UI becomes a living, breathing color field.
						</p>
						<div class="flex flex-wrap gap-2">
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Synesthetic colors</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>HSL mapping</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Color history</span
							>
						</div>
						<div
							class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
						>
							<span>Explore</span><svg
								class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</div>
					</div>
				</a>

				<!-- Example 9: Reactive Physics -->
				<a
					href={resolve('/reactive-physics')}
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-500 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>
					<div
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
					>
						9
					</div>
					<div class="relative">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 transition-transform duration-300 group-hover:scale-110"
						>
							<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
								/></svg
							>
						</div>
						<h2
							class="mb-2 from-cyan-500 to-blue-500 text-xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent"
						>
							Reactive Physics
						</h2>
						<p class="mb-4 text-sm leading-relaxed text-white/50">
							Matter.js physics simulation where UI elements react to audio with realistic forces.
							Buttons and cards experience explosive scatter on snare hits, heavy gravity on bass
							drops, inverse gravity on melodies, and slippery friction on sub-bass.
						</p>
						<div class="flex flex-wrap gap-2">
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Matter.js physics</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Explosive forces</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Interactive bodies</span
							>
						</div>
						<div
							class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
						>
							<span>Explore</span><svg
								class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</div>
					</div>
				</a>

				<!-- Example 10: Composer Idea One - The Spotlight -->
				<a
					href={resolve('/composer-idea-one')}
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>
					<div
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
					>
						10
					</div>
					<div class="relative">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 transition-transform duration-300 group-hover:scale-110"
						>
							<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								/><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
								/></svg
							>
						</div>
						<h2
							class="mb-2 from-amber-500 to-orange-600 text-xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent"
						>
							The Spotlight
						</h2>
						<p class="mb-4 text-sm leading-relaxed text-white/50">
							Editorial content revealed through an audio-driven circular spotlight mask. Heavy use
							of threshold exit events for a breathing aperture that expands on bass and contracts
							on release.
						</p>
						<div class="flex flex-wrap gap-2">
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Clip-path mask</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Exit events</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Editorial layout</span
							>
						</div>
						<div
							class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
						>
							<span>Explore</span><svg
								class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</div>
					</div>
				</a>

				<!-- Example 11: Composer Idea Two - Fluid Blob Borders -->
				<a
					href={resolve('/composer-idea-two')}
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-fuchsia-500 to-violet-600 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>
					<div
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
					>
						11
					</div>
					<div class="relative">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 transition-transform duration-300 group-hover:scale-110"
						>
							<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
								/></svg
							>
						</div>
						<h2
							class="mb-2 from-fuchsia-500 to-violet-600 text-xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent"
						>
							Fluid Blob Borders
						</h2>
						<p class="mb-4 text-sm leading-relaxed text-white/50">
							Dashboard panels with blob-shaped clip-path borders. Polygon points mapped to bands
							via index mod 4; simplex noise adds organic drift modulated by audio energy.
						</p>
						<div class="flex flex-wrap gap-2">
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Simplex noise</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>lowBin/highBin</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Composer UI</span
							>
						</div>
						<div
							class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
						>
							<span>Explore</span><svg
								class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</div>
					</div>
				</a>

				<!-- Example 12: Three.js One - Kinetic Monolith Field -->
				<a
					href={resolve('/three-js-one')}
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-sky-500 to-blue-600 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>
					<div
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
					>
						12
					</div>
					<div class="relative">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 transition-transform duration-300 group-hover:scale-110"
						>
							<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 7h18M6 7v13m6-13v13m6-13v13M4 20h16"
								/></svg
							>
						</div>
						<h2
							class="mb-2 from-sky-500 to-blue-600 text-xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent"
						>
							Three.js One
						</h2>
						<p class="mb-4 text-sm leading-relaxed text-white/50">
							Kinetic monolith field with instanced 3D geometry that ripples to sub-bass and bass.
							Low-mid adds lattice twist while mid frequencies push emissive shimmer and kick
							pulses.
						</p>
						<div class="flex flex-wrap gap-2">
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Instanced mesh</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Pulsing rings</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Camera drift</span
							>
						</div>
						<div
							class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
						>
							<span>Explore</span><svg
								class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</div>
					</div>
				</a>

				<!-- Example 13: Three.js Two - Prism Swarm Orbit -->
				<a
					href={resolve('/three-js-two')}
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-cyan-500 to-indigo-600 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>
					<div
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
					>
						13
					</div>
					<div class="relative">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 transition-transform duration-300 group-hover:scale-110"
						>
							<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 2l3.5 7 7.5 1-5.5 5.5 1.5 7.5L12 19l-7 4 1.5-7.5L1 10l7.5-1L12 2z"
								/></svg
							>
						</div>
						<h2
							class="mb-2 from-cyan-500 to-indigo-600 text-xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent"
						>
							Three.js Two
						</h2>
						<p class="mb-4 text-sm leading-relaxed text-white/50">
							Prism swarm orbit with additive glitter, bloom, and afterimage trails. Bass breathes
							orbital shells, low-mid modulates precession, and mid bursts create high-energy flare
							cones.
						</p>
						<div class="flex flex-wrap gap-2">
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Postprocessing</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Swarm orbit</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Glitter field</span
							>
						</div>
						<div
							class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
						>
							<span>Explore</span><svg
								class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</div>
					</div>
				</a>

				<!-- Example 14: Three.js/Three - Audio Tunnel Cathedral -->
				<a
					href={resolve('/three-js/three')}
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-violet-500 to-indigo-700 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>
					<div
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
					>
						14
					</div>
					<div class="relative">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 transition-transform duration-300 group-hover:scale-110"
						>
							<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 12h16M12 4v16M5.5 5.5l13 13M18.5 5.5l-13 13"
								/></svg
							>
						</div>
						<h2
							class="mb-2 from-violet-500 to-indigo-700 text-xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent"
						>
							Three.js / Three
						</h2>
						<p class="mb-4 text-sm leading-relaxed text-white/50">
							A tunnel cathedral with forward camera travel, filament strobes, and pulse walls.
							Sub-bass and bass reshape tunnel radius while low-mid bends curvature and mid sharpens
							strobing detail.
						</p>
						<div class="flex flex-wrap gap-2">
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Tunnel traversal</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Film grain</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Pulse walls</span
							>
						</div>
						<div
							class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
						>
							<span>Explore</span><svg
								class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</div>
					</div>
				</a>

				<!-- Example 15: Three.js Four - Resonant Core Bloom -->
				<a
					href={resolve('/three-js-four')}
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-cyan-500 to-blue-700 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>
					<div
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
					>
						15
					</div>
					<div class="relative">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-700 transition-transform duration-300 group-hover:scale-110"
						>
							<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 3l2.8 5.8L21 10l-4.5 4.4L17.5 21 12 18.1 6.5 21l1-6.6L3 10l6.2-1.2L12 3z"
								/></svg
							>
						</div>
						<h2
							class="mb-2 from-cyan-500 to-blue-700 text-xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent"
						>
							Three.js Four
						</h2>
						<p class="mb-4 text-sm leading-relaxed text-white/50">
							Resonant Core Bloom: a deforming geodesic membrane with torus petals and shell-wave
							bursts on kick hits. Mid frequencies inject shimmer while low-mid drives rotational
							topology turbulence.
						</p>
						<div class="flex flex-wrap gap-2">
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Membrane warp</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Shell pulses</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Additive bloom look</span
							>
						</div>
						<div
							class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
						>
							<span>Explore</span><svg
								class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</div>
					</div>
				</a>

				<!-- Example 16: Three.js Five - Caustic Tide Stage -->
				<a
					href={resolve('/three-js-five')}
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-teal-500 to-emerald-700 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>
					<div
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
					>
						16
					</div>
					<div class="relative">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 transition-transform duration-300 group-hover:scale-110"
						>
							<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 15c3-5 5-7 9-7s6 2 9 7M4 19h16M7 11l2 2m8-2l-2 2"
								/></svg
							>
						</div>
						<h2
							class="mb-2 from-teal-500 to-emerald-700 text-xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent"
						>
							Three.js Five
						</h2>
						<p class="mb-4 text-sm leading-relaxed text-white/50">
							Caustic Tide Stage: an audio-driven water plane with crystal buoys, foam drift, and
							radial surface ripples. Bass shapes swell amplitude, low-mid adds chop, and mid
							frequencies color-shift caustic highlights.
						</p>
						<div class="flex flex-wrap gap-2">
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Water displacement</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Instanced buoys</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Ripple bursts</span
							>
						</div>
						<div
							class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
						>
							<span>Explore</span><svg
								class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</div>
					</div>
				</a>

				<!-- Example 17: Three.js Six - Pendulum Atrium -->
				<a
					href={resolve('/three-js-six')}
					class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-2xl"
				>
					<div
						class="absolute inset-0 bg-gradient-to-br from-fuchsia-500 to-pink-700 opacity-0 transition-opacity duration-300 group-hover:opacity-10"
					></div>
					<div
						class="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white/40 transition-colors group-hover:bg-white/20 group-hover:text-white/60"
					>
						17
					</div>
					<div class="relative">
						<div
							class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-700 transition-transform duration-300 group-hover:scale-110"
						>
							<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 2v6m0 0c3 0 5 2 5 5s-2 5-5 5-5-2-5-5 2-5 5-5zm0 10v4m-6 0h12"
								/></svg
							>
						</div>
						<h2
							class="mb-2 from-fuchsia-500 to-pink-700 text-xl font-bold transition-all duration-300 group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:text-transparent"
						>
							Three.js Six
						</h2>
						<p class="mb-4 text-sm leading-relaxed text-white/50">
							Pendulum Atrium: a kinetic hall of suspended bobs and tension lines driven by rhythmic
							swing physics. Bass expands arc amplitude, low-mid modulates wave phase, and mid
							impacts trigger spark cascades.
						</p>
						<div class="flex flex-wrap gap-2">
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Pendulum lattice</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>String dynamics</span
							>
							<span
								class="rounded-full border border-white/5 bg-white/5 px-2 py-1 text-xs text-white/40"
								>Spark bursts</span
							>
						</div>
						<div
							class="mt-4 flex items-center text-sm text-white/30 transition-colors group-hover:text-white/60"
						>
							<span>Explore</span><svg
								class="ml-1 h-4 w-4 transform transition-transform group-hover:translate-x-1"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								><path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/></svg
							>
						</div>
					</div>
				</a>
			</div>
		</div>
	</main>

	<!-- Footer -->
	<footer class="border-t border-white/10 px-8 py-12">
		<div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
			<div class="text-sm text-white/40">
				Built with <span class="text-white/60">Svelte 5</span>,
				<span class="text-white/60">GSAP</span>, <span class="text-white/60">Matter.js</span>,
				<span class="text-white/60">Three.js</span>, and
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
