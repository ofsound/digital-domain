<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { gsap } from 'gsap';
	import { frequencyStore } from '$lib/stores/audio-frequency-store.svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';

	/**
	 * Micro-Animations Page
	 *
	 * Subtle, elegant UI micro-interactions that respond to audio frequencies.
	 * Demonstrates how audio reactivity can enhance user interfaces.
	 */

	let unsubscribers: (() => void)[] = [];

	// Card refs
	let cardRefs: HTMLDivElement[] = [];
	let buttonRefs: HTMLButtonElement[] = [];
	let progressRefs: HTMLDivElement[] = [];
	let waveformRef: SVGPathElement;

	// Animation state
	let smoothedBass = $state(0);
	let smoothedLowMid = $state(0);
	let activeCard = $state(0);

	// Waveform points
	let waveformPoints = $state<string>('');

	onMount(() => {
		// Initialize audio
		playerStore.getAnalyser();
		const unsubscribe = frequencyStore.subscribe();
		unsubscribers.push(unsubscribe);

		// Bass threshold - card switch pulse
		const unsubBass = frequencyStore.onThreshold('bass', 'enter', (band) => {
			const intensity = (band.current - band.threshold) / band.threshold;

			// Pulse active card
			const activeCardEl = cardRefs[activeCard];
			if (activeCardEl) {
				gsap.to(activeCardEl, {
					duration: 0.15,
					scale: 1.02,
					boxShadow: `0 ${20 + intensity * 20}px ${40 + intensity * 30}px rgba(147,51,234,${0.3 + intensity * 0.3})`,
					ease: 'power2.out',
					onComplete: () => {
						gsap.to(activeCardEl, {
							duration: 0.4,
							scale: 1,
							boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
							ease: 'power2.out'
						});
					}
				});
			}

			// Cycle active card
			activeCard = (activeCard + 1) % cardRefs.length;
		});
		unsubscribers.push(unsubBass);

		// Sub-bass - button ripple
		const unsubSub = frequencyStore.onThreshold('sub-bass', 'enter', () => {
			buttonRefs.forEach((btn, i) => {
				if (!btn) return;

				gsap.to(btn, {
					duration: 0.2,
					delay: i * 0.05,
					scale: 0.95,
					ease: 'power2.out',
					yoyo: true,
					repeat: 1
				});
			});
		});
		unsubscribers.push(unsubSub);

		// Low-mid - progress bars dance
		const unsubLowMid = frequencyStore.onThreshold('low-mid', 'enter', () => {
			progressRefs.forEach((bar, i) => {
				if (!bar) return;

				gsap.to(bar, {
					duration: 0.3,
					delay: i * 0.02,
					width: `${70 + Math.random() * 30}%`,
					ease: 'power2.out',
					onComplete: () => {
						gsap.to(bar, {
							duration: 0.5,
							width: `${50 + Math.random() * 40}%`,
							ease: 'power2.inOut'
						});
					}
				});
			});
		});
		unsubscribers.push(unsubLowMid);

		// Mid - subtle UI wobble
		const unsubMid = frequencyStore.onThreshold('mid', 'enter', () => {
			gsap.to('.micro-element', {
				duration: 0.1,
				x: (i) => (i % 2 === 0 ? 2 : -2),
				ease: 'power2.out',
				yoyo: true,
				repeat: 3
			});
		});
		unsubscribers.push(unsubMid);

		// Continuous animation loop
		const animateLoop = () => {
			if (!frequencyStore.isRunning) {
				requestAnimationFrame(animateLoop);
				return;
			}

			const bands = frequencyStore.bands;
			const bass = bands.find((b) => b.name === 'bass');
			const lowMid = bands.find((b) => b.name === 'low-mid');

			if (bass) {
				smoothedBass = smoothedBass * 0.9 + bass.current * 0.1;

				// Update waveform
				const points: string[] = [];
				const segments = 50;
				for (let i = 0; i <= segments; i++) {
					const x = (i / segments) * 300;
					const amplitude = (smoothedBass / 1000) * 30;
					const frequency = 0.1;
					const y = 50 + Math.sin(i * frequency + Date.now() / 200) * amplitude;
					points.push(`${x},${y}`);
				}
				waveformPoints = points.join(' ');
			}

			if (lowMid) {
				smoothedLowMid = smoothedLowMid * 0.92 + lowMid.current * 0.08;

				// Subtle card floating
				cardRefs.forEach((card, i) => {
					if (!card) return;
					const offset = Math.sin(Date.now() / 1000 + i) * (smoothedLowMid / 100);
					gsap.set(card, { y: offset });
				});
			}

			requestAnimationFrame(animateLoop);
		};

		requestAnimationFrame(animateLoop);
	});

	onDestroy(() => {
		unsubscribers.forEach((unsub) => unsub());
	});

	function handleCardHover(index: number) {
		const card = cardRefs[index];
		if (!card) return;

		gsap.to(card, {
			duration: 0.3,
			scale: 1.05,
			boxShadow: '0 25px 50px rgba(147,51,234,0.3)',
			ease: 'power2.out'
		});
	}

	function handleCardLeave(index: number) {
		const card = cardRefs[index];
		if (!card) return;

		gsap.to(card, {
			duration: 0.3,
			scale: 1,
			boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
			ease: 'power2.out'
		});
	}
</script>

<svelte:head>
	<title>Micro Animations</title>
	<meta name="description" content="UI micro-interactions with audio reactivity" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 p-8">
	<div class="mx-auto max-w-6xl">
		<!-- Header -->
		<div class="mb-12">
			<h1 class="text-5xl font-black tracking-tighter text-white">MICRO</h1>
			<p class="mt-2 text-white/50">UI interactions that breathe with the music</p>
		</div>

		<!-- Grid layout -->
		<div class="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
			<!-- Card 1: Now Playing -->
			<div
				bind:this={cardRefs[0]}
				class="micro-element relative overflow-hidden rounded-2xl border bg-white/5 p-6 backdrop-blur-lg transition-colors {activeCard ===
				0
					? 'border-purple-500/50'
					: 'border-white/10'}"
				on:mouseenter={() => handleCardHover(0)}
				on:mouseleave={() => handleCardLeave(0)}
			>
				<div class="flex items-center gap-4">
					<div
						class="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500"
					>
						<svg class="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
							<path
								d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
							/>
						</svg>
					</div>
					<div>
						<h3 class="font-semibold text-white">Now Playing</h3>
						<p class="text-sm text-white/50">Track information here</p>
					</div>
				</div>

				<!-- Waveform visualization -->
				<div class="mt-6">
					<svg width="300" height="100" viewBox="0 0 300 100" class="w-full">
						<polyline
							bind:this={waveformRef}
							points={waveformPoints}
							fill="none"
							stroke="url(#gradient)"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<defs>
							<linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
								<stop offset="0%" stop-color="#a855f7" />
								<stop offset="100%" stop-color="#ec4899" />
							</linearGradient>
						</defs>
					</svg>
				</div>
			</div>

			<!-- Card 2: Control Buttons -->
			<div
				bind:this={cardRefs[1]}
				class="micro-element rounded-2xl border bg-white/5 p-6 backdrop-blur-lg {activeCard === 1
					? 'border-purple-500/50'
					: 'border-white/10'}"
				on:mouseenter={() => handleCardHover(1)}
				on:mouseleave={() => handleCardLeave(1)}
			>
				<h3 class="mb-4 font-semibold text-white">Controls</h3>

				<div class="flex gap-3">
					<button
						bind:this={buttonRefs[0]}
						class="micro-element flex-1 rounded-xl bg-white/10 px-4 py-3 font-medium text-white transition-colors hover:bg-white/20"
					>
						Play
					</button>
					<button
						bind:this={buttonRefs[1]}
						class="micro-element flex-1 rounded-xl bg-purple-500/20 px-4 py-3 font-medium text-purple-300 transition-colors hover:bg-purple-500/30"
					>
						Pause
					</button>
					<button
						bind:this={buttonRefs[2]}
						class="micro-element flex-1 rounded-xl bg-pink-500/20 px-4 py-3 font-medium text-pink-300 transition-colors hover:bg-pink-500/30"
					>
						Skip
					</button>
				</div>
			</div>

			<!-- Card 3: Progress Bars -->
			<div
				bind:this={cardRefs[2]}
				class="micro-element rounded-2xl border bg-white/5 p-6 backdrop-blur-lg {activeCard === 2
					? 'border-purple-500/50'
					: 'border-white/10'}"
				on:mouseenter={() => handleCardHover(2)}
				on:mouseleave={() => handleCardLeave(2)}
			>
				<h3 class="mb-4 font-semibold text-white">Levels</h3>

				<div class="space-y-3">
					{#each ['Bass', 'Mids', 'Treble', 'Presence'] as label, i (label)}
						<div>
							<div class="mb-1 flex justify-between text-xs text-white/50">
								<span>{label}</span>
								<span>{Math.floor(50 + Math.random() * 40)}%</span>
							</div>
							<div class="h-2 overflow-hidden rounded-full bg-white/10">
								<div
									bind:this={progressRefs[i]}
									class="h-full rounded-full transition-all"
									style="
										width: {50 + Math.random() * 40}%;
										background: linear-gradient(90deg, #a855f7, #ec4899);
									"
								/>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Card 4: Frequency Circles -->
			<div
				bind:this={cardRefs[3]}
				class="micro-element rounded-2xl border bg-white/5 p-6 backdrop-blur-lg md:col-span-2 lg:col-span-1 {activeCard ===
				3
					? 'border-purple-500/50'
					: 'border-white/10'}"
				on:mouseenter={() => handleCardHover(3)}
				on:mouseleave={() => handleCardLeave(3)}
			>
				<h3 class="mb-4 font-semibold text-white">Frequencies</h3>

				<div class="flex items-center justify-around">
					{#each frequencyStore.bands as band (band.name)}
						<div class="relative">
							<svg width="60" height="60" viewBox="0 0 60 60">
								<circle
									cx="30"
									cy="30"
									r="25"
									fill="none"
									stroke="rgba(255,255,255,0.1)"
									stroke-width="4"
								/>
								<circle
									cx="30"
									cy="30"
									r="25"
									fill="none"
									stroke={band.isActive ? '#ec4899' : '#6b7280'}
									stroke-width="4"
									stroke-linecap="round"
									stroke-dasharray={2 * Math.PI * 25}
									stroke-dashoffset={2 * Math.PI * 25 * (1 - Math.min(band.current / 1000, 1))}
									transform="rotate(-90 30 30)"
									style="transition: stroke-dashoffset 0.1s ease-out;"
								/>
							</svg>
							<span
								class="absolute inset-0 flex items-center justify-center text-[10px] text-white/70"
							>
								{band.name.slice(0, 3)}
							</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Card 5: Stats -->
			<div
				bind:this={cardRefs[4]}
				class="micro-element rounded-2xl border bg-white/5 p-6 backdrop-blur-lg {activeCard === 4
					? 'border-purple-500/50'
					: 'border-white/10'}"
				on:mouseenter={() => handleCardHover(4)}
				on:mouseleave={() => handleCardLeave(4)}
			>
				<h3 class="mb-4 font-semibold text-white">Stats</h3>

				<div class="grid grid-cols-2 gap-4">
					<div class="rounded-xl bg-white/5 p-3 text-center">
						<div class="text-2xl font-bold text-purple-400">{frequencyStore.fps}</div>
						<div class="text-xs text-white/50">FPS</div>
					</div>
					<div class="rounded-xl bg-white/5 p-3 text-center">
						<div class="text-2xl font-bold text-pink-400">{frequencyStore.subscriberCount}</div>
						<div class="text-xs text-white/50">Subs</div>
					</div>
					<div class="rounded-xl bg-white/5 p-3 text-center">
						<div class="text-2xl font-bold text-blue-400">{smoothedBass.toFixed(0)}</div>
						<div class="text-xs text-white/50">Bass</div>
					</div>
					<div class="rounded-xl bg-white/5 p-3 text-center">
						<div class="text-2xl font-bold text-green-400">
							{frequencyStore.isRunning ? 'ON' : 'OFF'}
						</div>
						<div class="text-xs text-white/50">Status</div>
					</div>
				</div>
			</div>

			<!-- Card 6: Visual Indicator -->
			<div
				bind:this={cardRefs[5]}
				class="micro-element rounded-2xl border bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-6 backdrop-blur-lg {activeCard ===
				5
					? 'border-white/50'
					: 'border-purple-500/30'}"
				on:mouseenter={() => handleCardHover(5)}
				on:mouseleave={() => handleCardLeave(5)}
			>
				<div class="flex h-full flex-col items-center justify-center text-center">
					<div
						class="mb-4 flex h-20 w-20 items-center justify-center rounded-full transition-all duration-100"
						style="
							background: radial-gradient(circle, rgba(236,72,153,{0.3 +
							smoothedBass / 2000}) 0%, transparent 70%);
							box-shadow: 0 0 {20 + smoothedBass / 20}px rgba(236,72,153,{0.4 + smoothedBass / 2000});
						"
					>
						<div
							class="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 transition-transform"
							style="transform: scale({0.8 + smoothedBass / 2000})"
						></div>
					</div>
					<h3 class="font-semibold text-white">Active</h3>
					<p class="mt-1 text-sm text-white/50">Audio reactive mode enabled</p>
				</div>
			</div>
		</div>

		<!-- Instructions -->
		<div class="mt-12 text-center">
			<p class="text-sm text-white/30">
				Hover over cards to see interactions • Play audio to trigger reactivity
			</p>
		</div>
	</div>
</div>
