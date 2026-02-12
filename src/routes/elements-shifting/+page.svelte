<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { gsap } from 'gsap';
	import { frequencyStore } from '$lib/stores/audio-frequency-store.svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';

	/**
	 * Elements Shifting Page
	 *
	 * A field of geometric shapes that shift, rotate, and transform
	 * based on audio frequencies. Creates an organic, breathing landscape.
	 */

	let unsubscribers: (() => void)[] = [];
	let gridContainer: HTMLDivElement;

	// Grid configuration
	const GRID_SIZE = 8;
	const TOTAL_ELEMENTS = GRID_SIZE * GRID_SIZE;

	// Element refs
	let elementRefs: HTMLDivElement[] = [];

	// Continuous animation state
	let time = 0;
	let smoothedValues = $state<number[]>(new Array(TOTAL_ELEMENTS).fill(0));

	onMount(() => {
		// Initialize audio
		playerStore.getAnalyser();
		const unsubscribe = frequencyStore.subscribe();
		unsubscribers.push(unsubscribe);

		// Initialize element positions with GSAP
		elementRefs.forEach((el, i) => {
			if (!el) return;
			const row = Math.floor(i / GRID_SIZE);
			const col = i % GRID_SIZE;

			// Staggered initial animation
			gsap.from(el, {
				duration: 1.5,
				delay: (row + col) * 0.05,
				opacity: 0,
				scale: 0,
				rotation: -180,
				ease: 'back.out(1.7)'
			});
		});

		// Bass threshold triggers - ripple effect
		const unsubBass = frequencyStore.onThreshold('bass', 'enter', (band) => {
			const intensity = (band.current - band.threshold) / band.threshold;

			// Create ripple from center
			const centerIndex = Math.floor(TOTAL_ELEMENTS / 2);

			elementRefs.forEach((el, i) => {
				if (!el) return;

				const distance = Math.abs(i - centerIndex);
				const delay = distance * 0.02;

				gsap.to(el, {
					duration: 0.3,
					delay,
					scale: 1 + intensity * 0.5,
					z: intensity * 100,
					boxShadow: `0 ${10 + intensity * 20}px ${30 + intensity * 40}px rgba(147,51,234,${0.4 + intensity * 0.4})`,
					ease: 'power2.out',
					onComplete: () => {
						gsap.to(el, {
							duration: 0.6,
							scale: 1,
							z: 0,
							boxShadow: '0 0 0 rgba(147,51,234,0)',
							ease: 'elastic.out(1, 0.5)'
						});
					}
				});
			});
		});
		unsubscribers.push(unsubBass);

		// Low-mid threshold - rotation wave
		const unsubLowMid = frequencyStore.onThreshold('low-mid', 'enter', () => {
			elementRefs.forEach((el, i) => {
				if (!el) return;
				const row = Math.floor(i / GRID_SIZE);

				gsap.to(el, {
					duration: 0.4,
					delay: row * 0.03,
					rotationY: 360,
					ease: 'power2.inOut',
					onComplete: () => {
						gsap.set(el, { rotationY: 0 });
					}
				});
			});
		});
		unsubscribers.push(unsubLowMid);

		// Mid threshold - color shift pulse
		const unsubMid = frequencyStore.onThreshold('mid', 'enter', (band) => {
			const intensity = (band.current - band.threshold) / band.threshold;

			elementRefs.forEach((el) => {
				if (!el) return;

				gsap.to(el, {
					duration: 0.2,
					backgroundColor: `hsla(${280 + intensity * 60}, 80%, 60%, 1)`,
					ease: 'power2.out',
					yoyo: true,
					repeat: 1
				});
			});
		});
		unsubscribers.push(unsubMid);

		// Continuous organic movement based on raw data
		const animateLoop = () => {
			if (!frequencyStore.isRunning) {
				requestAnimationFrame(animateLoop);
				return;
			}

			time += 0.016;
			const bands = frequencyStore.bands;
			const bassValue = bands.find((b) => b.name === 'bass')?.current ?? 0;
			const lowMidValue = bands.find((b) => b.name === 'low-mid')?.current ?? 0;

			elementRefs.forEach((el, i) => {
				if (!el) return;

				const row = Math.floor(i / GRID_SIZE);
				const col = i % GRID_SIZE;

				// Smooth the value
				const targetValue = (bassValue / 1000) * Math.sin(time + row * 0.5 + col * 0.5);
				smoothedValues[i] = smoothedValues[i] * 0.95 + targetValue * 0.05;

				// Subtle continuous movement
				const offsetX = Math.sin(time * 0.5 + row) * (10 + lowMidValue / 50);
				const offsetY = Math.cos(time * 0.3 + col) * (10 + lowMidValue / 50);
				const scale = 1 + smoothedValues[i] * 0.3;
				const rotateZ = smoothedValues[i] * 15;

				gsap.set(el, {
					x: offsetX,
					y: offsetY,
					scale: scale,
					rotation: rotateZ
				});
			});

			requestAnimationFrame(animateLoop);
		};

		requestAnimationFrame(animateLoop);
	});

	onDestroy(() => {
		unsubscribers.forEach((unsub) => unsub());
		gsap.killTweensOf('.grid-element');
	});
</script>

<svelte:head>
	<title>Elements Shifting</title>
	<meta name="description" content="Geometric forms that breathe with the music" />
</svelte:head>

<div class="min-h-screen overflow-hidden bg-black">
	<!-- Header -->
	<div class="absolute top-0 right-0 left-0 z-20 p-8">
		<h1 class="text-4xl font-black tracking-tighter text-white">SHIFTING</h1>
		<p class="mt-2 text-sm text-white/50">Geometric reactive landscape</p>
	</div>

	<!-- 3D Grid Container -->
	<div class="relative flex min-h-screen items-center justify-center" style="perspective: 1000px;">
		<div
			bind:this={gridContainer}
			class="grid gap-4 p-8"
			style="
				grid-template-columns: repeat({GRID_SIZE}, 1fr);
				transform-style: preserve-3d;
				transform: rotateX(20deg) rotateY(-10deg);
			"
		>
			{#each Array.from({ length: TOTAL_ELEMENTS }, (_, i) => i) as index (index)}
				<div
					bind:this={elementRefs[index]}
					class="grid-element relative h-16 w-16 rounded-lg backdrop-blur-sm md:h-20 md:w-20"
					style="
						background: linear-gradient(135deg, 
							rgba(147,51,234,0.8) 0%, 
							rgba(236,72,153,0.6) 50%,
							rgba(59,130,246,0.8) 100%
						);
						border: 1px solid rgba(255,255,255,0.1);
						box-shadow: 
							inset 0 0 20px rgba(255,255,255,0.1),
							0 0 0 rgba(147,51,234,0);
					"
				>
					<!-- Inner glow -->
					<div class="absolute inset-2 rounded bg-white/20" style="filter: blur(8px);"></div>

					<!-- Corner accents -->
					<div class="absolute top-1 left-1 h-2 w-2 rounded-full bg-white/40"></div>
					<div class="absolute right-1 bottom-1 h-2 w-2 rounded-full bg-white/40"></div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Frequency band indicators -->
	<div class="absolute right-8 bottom-8 left-8 flex justify-center gap-8">
		{#each frequencyStore.bands as band (band.name)}
			<div class="flex flex-col items-center gap-2">
				<div class="relative h-2 w-24 overflow-hidden rounded-full bg-white/10">
					<div
						class="absolute inset-y-0 left-0 rounded-full transition-all duration-75"
						style="
							width: {Math.min((band.current / band.threshold) * 100, 100)}%;
							background: {band.isActive ? 'linear-gradient(90deg, #a855f7, #ec4899)' : 'rgba(255,255,255,0.3)'};
							box-shadow: {band.isActive ? '0 0 20px rgba(236,72,153,0.8)' : 'none'};
						"
					></div>
				</div>
				<span class="text-xs tracking-wider text-white/40 uppercase">{band.name}</span>
			</div>
		{/each}
	</div>

	<!-- Ambient particles -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		{#each Array.from({ length: 20 }, (_, i) => i) as i (i)}
			<div
				class="absolute h-1 w-1 rounded-full bg-white/30"
				style="
					left: {Math.random() * 100}%;
					top: {Math.random() * 100}%;
					animation: particle-float {5 + Math.random() * 10}s ease-in-out infinite;
					animation-delay: {Math.random() * 5}s;
				"
			></div>
		{/each}
	</div>
</div>

<style>
	@keyframes particle-float {
		0%,
		100% {
			transform: translateY(0) translateX(0);
			opacity: 0.3;
		}
		50% {
			transform: translateY(-100px) translateX(50px);
			opacity: 0.8;
		}
	}
</style>
