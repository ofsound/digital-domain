<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { gsap } from 'gsap';
	import { frequencyStore } from '$lib/stores/audio-frequency-store.svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';

	/**
	 * Reactive Typography Page
	 *
	 * Text that breathes, pulses, and transforms with the music.
	 * Uses both threshold triggers and continuous raw audio data.
	 */

	let unsubscribers: (() => void)[] = [];
	let containerRef: HTMLDivElement;

	// Track smoothed values for continuous animations
	let smoothedBass = $state(0);
	let smoothedMid = $state(0);

	// Text elements for GSAP targeting
	let titleRef: HTMLHeadingElement;
	let subtitleRef: HTMLParagraphElement;
	let lyricsRefs = $state<HTMLSpanElement[]>([]);
	let animationFrameId: number | null = null;

	// Animation timeline
	let breatheTimeline: gsap.core.Timeline | null = null;

	onMount(() => {
		// Initialize audio
		playerStore.getAnalyser();
		const unsubscribe = frequencyStore.subscribe();
		unsubscribers.push(unsubscribe);

		// Create breathing animation timeline
		breatheTimeline = gsap.timeline({ repeat: -1, yoyo: true });
		breatheTimeline.to('.breathe-text', {
			duration: 2,
			ease: 'sine.inOut',
			stagger: {
				each: 0.1,
				from: 'center'
			}
		});

		// Subscribe to bass threshold - trigger explosive scale
		const unsubBass = frequencyStore.onThreshold('bass', 'enter', (band) => {
			if (!titleRef) return;

			const intensity = Math.min((band.current - band.threshold) / 200, 2);

			gsap.to(titleRef, {
				scale: 1 + intensity * 0.3,
				duration: 0.1,
				ease: 'power2.out',
				onComplete: () => {
					gsap.to(titleRef, {
						scale: 1,
						duration: 0.4,
						ease: 'elastic.out(1, 0.3)'
					});
				}
			});

			// Flash effect
			gsap.fromTo(
				titleRef,
				{ textShadow: '0 0 0px rgba(255,100,100,0)' },
				{
					textShadow: `0 0 ${30 + intensity * 20}px rgba(255,100,100,0.8)`,
					duration: 0.1,
					yoyo: true,
					repeat: 1
				}
			);
		});
		unsubscribers.push(unsubBass);

		// Subscribe to sub-bass for letter spacing
		const unsubSub = frequencyStore.onThreshold('sub-bass', 'enter', () => {
			gsap.to('.lyric-word', {
				letterSpacing: '0.2em',
				duration: 0.15,
				ease: 'power2.out',
				onComplete: () => {
					gsap.to('.lyric-word', {
						letterSpacing: '0em',
						duration: 0.5,
						ease: 'power2.inOut'
					});
				}
			});
		});
		unsubscribers.push(unsubSub);

		// Continuous animation loop using raw data
		const animateLoop = () => {
			if (!frequencyStore.isRunning) {
				animationFrameId = requestAnimationFrame(animateLoop);
				return;
			}

			const bands = frequencyStore.bands;
			const bassBand = bands.find((b) => b.name === 'bass');
			const midBand = bands.find((b) => b.name === 'mid');

			if (bassBand) {
				// Smooth the bass value
				smoothedBass = smoothedBass * 0.9 + bassBand.current * 0.1;

				// Continuous glow based on raw bass level
				const glowIntensity = Math.min(smoothedBass / 500, 1);
				if (subtitleRef) {
					subtitleRef.style.textShadow = `0 0 ${10 + glowIntensity * 40}px rgba(100,150,255,${0.3 + glowIntensity * 0.7})`;
					subtitleRef.style.opacity = `${0.6 + glowIntensity * 0.4}`;
				}
			}

			if (midBand) {
				smoothedMid = smoothedMid * 0.92 + midBand.current * 0.08;

				// Subtle rotation based on mid frequencies
				const rotation = (smoothedMid / 255 - 0.5) * 4;
				gsap.set('.floating-word', {
					rotation: rotation,
					y: Math.sin(Date.now() / 1000) * 5 + smoothedMid / 50
				});
			}

			animationFrameId = requestAnimationFrame(animateLoop);
		};

		animationFrameId = requestAnimationFrame(animateLoop);
	});

	onDestroy(() => {
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		if (breatheTimeline) {
			breatheTimeline.kill();
		}
		unsubscribers.forEach((unsub) => unsub());
	});
</script>

<div bind:this={containerRef} class="min-h-screen overflow-hidden bg-transparent">
	<div class="relative flex min-h-screen flex-col items-center justify-center px-8 py-20">
		<!-- Background pulsing orbs -->
		<div class="pointer-events-none absolute inset-0 overflow-hidden">
			{#each Array.from({ length: 5 }, (_, i) => i) as i (i)}
				<div
					class="absolute rounded-full opacity-20 blur-3xl"
					style="
						width: {200 + i * 100}px;
						height: {200 + i * 100}px;
						background: radial-gradient(circle, rgba(147,51,234,0.5) 0%, transparent 70%);
						left: {10 + i * 20}%;
						top: {20 + (i % 2) * 40}%;
						animation: float {10 + i * 2}s ease-in-out infinite;
						animation-delay: {i * 0.5}s;
					"
				></div>
			{/each}
		</div>

		<!-- Main title -->
		<h1
			bind:this={titleRef}
			class="breathe-text relative z-10 text-center text-8xl font-black tracking-tighter text-white uppercase md:text-[12rem]"
			style="font-family: 'Arial Black', sans-serif; mix-blend-mode: difference;"
		>
			<span class="inline-block">S</span><span class="inline-block">O</span><span
				class="inline-block">U</span
			><span class="inline-block">N</span><span class="inline-block">D</span>
		</h1>

		<!-- Subtitle with glow -->
		<p
			bind:this={subtitleRef}
			class="breathe-text relative z-10 mt-8 text-center text-2xl font-light tracking-[0.3em] text-blue-200 md:text-4xl"
			style="transition: text-shadow 0.1s ease-out;"
		>
			FREQUENCY • REACTIVE • TYPE
		</p>

		<!-- Floating lyrics -->
		<div class="relative z-10 mt-20 max-w-4xl">
			<div class="flex flex-wrap items-center justify-center gap-4 text-center">
				{#each ['THE', 'MUSIC', 'FLOWS', 'THROUGH', 'EVERY', 'WORD'] as word, i (word)}
					<span
						bind:this={lyricsRefs[i]}
						class="lyric-word floating-word breathe-text inline-block text-4xl font-bold text-white/80 md:text-6xl"
						style="transition: letter-spacing 0.15s ease-out; font-family: Georgia, serif;"
					>
						{word}
					</span>
				{/each}
			</div>
		</div>

		<!-- Frequency visualization bars -->
		<div class="relative z-10 mt-20 flex items-end gap-2">
			{#each frequencyStore.bands as band (band.name)}
				<div class="flex flex-col items-center gap-2">
					<div
						class="w-12 rounded-t-lg transition-all duration-75 ease-out"
						style="
							height: {Math.min(band.current / 5, 150)}px;
							background: linear-gradient(to top, 
								rgba(147,51,234,{band.isActive ? 1 : 0.5}) 0%, 
								rgba(236,72,153,{band.isActive ? 1 : 0.5}) 100%
							);
							box-shadow: 0 0 {band.isActive ? 30 : 10}px rgba(236,72,153,{band.isActive ? 0.8 : 0.3});
						"
					></div>
					<span class="text-xs tracking-wider text-white/50 uppercase">{band.name}</span>
				</div>
			{/each}
		</div>

		<!-- Debug info -->
		<div class="absolute bottom-8 left-8 text-xs text-white/30">
			FPS: {frequencyStore.fps} | Running: {frequencyStore.isRunning} | Subscribers: {frequencyStore.subscriberCount}
		</div>
	</div>
</div>

<style>
	@keyframes float {
		0%,
		100% {
			transform: translateY(0px) scale(1);
		}
		50% {
			transform: translateY(-20px) scale(1.1);
		}
	}
</style>
