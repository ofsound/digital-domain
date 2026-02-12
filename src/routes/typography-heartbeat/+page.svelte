<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { gsap } from 'gsap';
	import { frequencyStore } from '$lib/stores/audio-frequency-store.svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';

	/**
	 * Typography Heartbeat Page
	 *
	 * Variable font typography that pulses with the music's heartbeat.
	 * Bass frequencies drive font-weight, creating text that breathes and thickens.
	 */

	let unsubscribers: (() => void)[] = [];

	// Typography variable values
	let fontWeight = $state(400);
	let fontWidth = $state(100);
	let opticalSize = $state(16);
	let letterSpacing = $state(0);
	let lineHeight = $state(1.2);

	// Heartbeat visualization
	let heartRate = $state(60);
	let pulseOpacity = $state(0.5);

	// Canvas for EKG visualization
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let ekgData: number[] = [];
	const EKG_LENGTH = 200;

	// Smoothing for values
	let smoothedBass = $state(0);
	let smoothedSubBass = $state(0);
	let smoothedLowMid = $state(0);
	let lastBeatTime = 0;
	let beatDetected = $state(false);

	onMount(() => {
		// Initialize audio
		playerStore.getAnalyser();
		const unsubscribe = frequencyStore.subscribe();
		unsubscribers.push(unsubscribe);

		// Setup canvas
		if (canvas) {
			ctx = canvas.getContext('2d');
			resizeCanvas();
			window.addEventListener('resize', resizeCanvas);
		}

		// Initialize EKG data
		ekgData = new Array(EKG_LENGTH).fill(0);

		// Bass threshold - heartbeat pulse
		const unsubBass = frequencyStore.onThreshold('bass', 'enter', (band) => {
			const intensity = (band.current - band.threshold) / band.threshold;
			const now = Date.now();

			// Calculate heart rate from beat timing
			if (lastBeatTime > 0) {
				const timeSinceLastBeat = now - lastBeatTime;
				heartRate = Math.round(60000 / timeSinceLastBeat);
			}
			lastBeatTime = now;

			// Beat detected animation
			beatDetected = true;
			setTimeout(() => (beatDetected = false), 100);

			// Pulse animation
			pulseOpacity = 1;
			gsap.to(
				{ val: pulseOpacity },
				{
					val: 0.3,
					duration: 0.4,
					onUpdate: function () {
						pulseOpacity = 0.3 + (1 - this.targets()[0].val) * 0.7;
					}
				}
			);

			// Trigger weight burst
			const burstWeight = 400 + intensity * 500;
			gsap.to(
				{ w: fontWeight },
				{
					w: burstWeight,
					duration: 0.08,
					ease: 'power2.out',
					onUpdate: function () {
						fontWeight = this.targets()[0].w;
					},
					onComplete: () => {
						gsap.to(
							{ w: fontWeight },
							{
								w: 400 + smoothedBass * 400,
								duration: 0.3,
								ease: 'elastic.out(1, 0.5)',
								onUpdate: function () {
									fontWeight = this.targets()[0].w;
								}
							}
						);
					}
				}
			);
		});
		unsubscribers.push(unsubBass);

		// Sub-bass triggers letter spacing expansion
		const unsubSub = frequencyStore.onThreshold('sub-bass', 'enter', (band) => {
			const intensity = (band.current - band.threshold) / band.threshold;

			gsap.to(
				{ spacing: letterSpacing },
				{
					spacing: intensity * 0.3,
					duration: 0.15,
					ease: 'power2.out',
					onUpdate: function () {
						letterSpacing = this.targets()[0].spacing;
					},
					onComplete: () => {
						gsap.to(
							{ spacing: letterSpacing },
							{
								spacing: smoothedSubBass * 0.1,
								duration: 0.5,
								ease: 'power2.inOut',
								onUpdate: function () {
									letterSpacing = this.targets()[0].spacing;
								}
							}
						);
					}
				}
			);
		});
		unsubscribers.push(unsubSub);

		// Low-mid triggers width variation
		const unsubLowMid = frequencyStore.onThreshold('low-mid', 'enter', () => {
			gsap.to(
				{ width: fontWidth },
				{
					width: 75 + Math.random() * 50,
					duration: 0.2,
					ease: 'power2.out',
					onUpdate: function () {
						fontWidth = this.targets()[0].width;
					},
					onComplete: () => {
						gsap.to(
							{ width: fontWidth },
							{
								width: 100 + smoothedLowMid * 25,
								duration: 0.6,
								ease: 'power2.out',
								onUpdate: function () {
									fontWidth = this.targets()[0].width;
								}
							}
						);
					}
				}
			);
		});
		unsubscribers.push(unsubLowMid);

		// Continuous heartbeat loop
		const animateLoop = () => {
			if (!frequencyStore.isRunning) {
				requestAnimationFrame(animateLoop);
				return;
			}

			const bands = frequencyStore.bands;
			const bass = bands.find((b) => b.name === 'bass');
			const subBass = bands.find((b) => b.name === 'sub-bass');
			const lowMid = bands.find((b) => b.name === 'low-mid');

			if (bass) {
				// Normalize bass to 0-1 range (threshold is around 400)
				const normalizedBass = Math.min(bass.current / 1000, 1);
				smoothedBass = smoothedBass * 0.85 + normalizedBass * 0.15;

				// Update font weight (300 to 900 range)
				const targetWeight = 300 + smoothedBass * 600;
				fontWeight = fontWeight * 0.9 + targetWeight * 0.1;

				// Update optical size
				opticalSize = 16 + smoothedBass * 48;

				// Update line height based on intensity
				lineHeight = 1.0 + smoothedBass * 0.6;

				// Add to EKG data
				ekgData.push(smoothedBass);
				if (ekgData.length > EKG_LENGTH) {
					ekgData.shift();
				}
			}

			if (subBass) {
				const normalizedSub = Math.min(subBass.current / 800, 1);
				smoothedSubBass = smoothedSubBass * 0.9 + normalizedSub * 0.1;
			}

			if (lowMid) {
				const normalizedLowMid = Math.min(lowMid.current / 1000, 1);
				smoothedLowMid = smoothedLowMid * 0.92 + normalizedLowMid * 0.08;
				fontWidth = 100 + smoothedLowMid * 30;
			}

			// Render EKG
			renderEKG();

			requestAnimationFrame(animateLoop);
		};

		requestAnimationFrame(animateLoop);

		return () => {
			window.removeEventListener('resize', resizeCanvas);
		};
	});

	onDestroy(() => {
		unsubscribers.forEach((unsub) => unsub());
	});

	function resizeCanvas() {
		if (!canvas) return;
		canvas.width = canvas.offsetWidth;
		canvas.height = canvas.offsetHeight;
	}

	function renderEKG() {
		if (!ctx || !canvas) return;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw grid
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
		ctx.lineWidth = 1;
		for (let i = 0; i < canvas.width; i += 40) {
			ctx.beginPath();
			ctx.moveTo(i, 0);
			ctx.lineTo(i, canvas.height);
			ctx.stroke();
		}
		for (let i = 0; i < canvas.height; i += 40) {
			ctx.beginPath();
			ctx.moveTo(0, i);
			ctx.lineTo(canvas.width, i);
			ctx.stroke();
		}

		// Draw EKG line
		if (ekgData.length > 1) {
			ctx.strokeStyle = beatDetected ? '#ec4899' : '#a855f7';
			ctx.lineWidth = 3;
			ctx.lineCap = 'round';
			ctx.lineJoin = 'round';

			// Add glow effect
			ctx.shadowBlur = beatDetected ? 20 : 10;
			ctx.shadowColor = beatDetected ? '#ec4899' : '#a855f7';

			ctx.beginPath();
			const stepX = canvas.width / EKG_LENGTH;

			for (let i = 0; i < ekgData.length; i++) {
				const x = i * stepX;
				const y = canvas.height / 2 - (ekgData[i] ?? 0) * (canvas.height * 0.4);

				if (i === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			}

			ctx.stroke();

			// Reset shadow
			ctx.shadowBlur = 0;
		}

		// Draw current value dot
		if (ekgData.length > 0) {
			const lastValue = ekgData[ekgData.length - 1] ?? 0;
			const x = (ekgData.length - 1) * (canvas.width / EKG_LENGTH);
			const y = canvas.height / 2 - lastValue * (canvas.height * 0.4);

			ctx.fillStyle = '#ec4899';
			ctx.beginPath();
			ctx.arc(x, y, 6, 0, Math.PI * 2);
			ctx.fill();
		}
	}
</script>

<svelte:head>
	<title>Typography Heartbeat</title>
	<meta name="description" content="Variable fonts that pulse with the music" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="min-h-screen overflow-hidden bg-black text-white">
	<!-- Background pulse rings -->
	<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
		{#each Array(3) as i (i)}
			<div
				class="absolute rounded-full border opacity-20"
				style="
					width: {200 + i * 150}px;
					height: {200 + i * 150}px;
					border-color: rgba(236,72,153, {0.3 + smoothedBass * 0.4});
					transform: scale({1 + smoothedBass * (0.1 + i * 0.05)});
					transition: transform 0.1s ease-out;
				"
			></div>
		{/each}
	</div>

	<div class="relative z-10 flex min-h-screen flex-col">
		<!-- Header -->
		<header class="flex items-start justify-between p-8">
			<div>
				<h1 class="text-4xl font-black tracking-tighter">HEARTBEAT</h1>
				<p class="mt-1 text-sm text-white/50">Variable font typography</p>
			</div>
			<div class="text-right">
				<div class="text-6xl font-black tabular-nums" style="color: #ec4899;">
					{heartRate}
				</div>
				<div class="text-xs tracking-wider text-white/50 uppercase">BPM</div>
			</div>
		</header>

		<!-- Main Typography Display -->
		<main class="flex flex-1 flex-col items-center justify-center px-8">
			<!-- Primary Heartbeat Text -->
			<div class="mb-16 text-center">
				<div
					class="text-9xl leading-none tracking-tight transition-all duration-75 md:text-[12rem] lg:text-[16rem]"
					style="
						font-family: 'Inter', sans-serif;
						font-variation-settings: 'wght' {fontWeight};
						letter-spacing: {letterSpacing}em;
						line-height: {lineHeight};
						text-shadow: 0 0 {30 + smoothedBass * 50}px rgba(236,72,153,{0.4 + smoothedBass * 0.4});
						color: rgba(255,255,255,{0.8 + smoothedBass * 0.2});
						transform: scale({1 + smoothedBass * 0.05});
					"
				>
					BEAT
				</div>
			</div>

			<!-- Variable Typography Showcase -->
			<div class="mb-16 grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
				<!-- Weight -->
				<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
					<div class="mb-4 text-xs tracking-wider text-white/50 uppercase">Font Weight</div>
					<div
						class="text-5xl transition-all duration-75 md:text-6xl"
						style="
							font-family: 'Inter', sans-serif;
							font-variation-settings: 'wght' {fontWeight};
						"
					>
						{fontWeight.toFixed(0)}
					</div>
					<div class="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
						<div
							class="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-75"
							style="width: {((fontWeight - 300) / 600) * 100}%"
						></div>
					</div>
				</div>

				<!-- Width -->
				<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
					<div class="mb-4 text-xs tracking-wider text-white/50 uppercase">Font Width</div>
					<div
						class="text-5xl transition-all duration-75 md:text-6xl"
						style="
							font-family: 'Inter', sans-serif;
							font-variation-settings: 'wght' {fontWeight}, 'wdth' {fontWidth};
						"
					>
						{fontWidth.toFixed(0)}%
					</div>
					<div class="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
						<div
							class="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-75"
							style="width: {fontWidth}%"
						></div>
					</div>
				</div>

				<!-- Optical Size -->
				<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
					<div class="mb-4 text-xs tracking-wider text-white/50 uppercase">Optical Size</div>
					<div
						class="text-5xl transition-all duration-75 md:text-6xl"
						style="
							font-family: 'Inter', sans-serif;
							font-size: {16 + smoothedBass * 32}px;
							font-variation-settings: 'wght' {fontWeight};
						"
					>
						{opticalSize.toFixed(0)}pt
					</div>
					<div class="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
						<div
							class="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-75"
							style="width: {((opticalSize - 16) / 48) * 100}%"
						></div>
					</div>
				</div>

				<!-- Letter Spacing -->
				<div class="rounded-2xl border border-white/10 bg-white/5 p-6">
					<div class="mb-4 text-xs tracking-wider text-white/50 uppercase">Tracking</div>
					<div
						class="text-4xl transition-all duration-75 md:text-5xl"
						style="
							font-family: 'Inter', sans-serif;
							font-variation-settings: 'wght' {fontWeight};
							letter-spacing: {letterSpacing}em;
						"
					>
						RHYTHM
					</div>
					<div class="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
						<div
							class="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-75"
							style="width: {letterSpacing * 200}%"
						></div>
					</div>
				</div>
			</div>

			<!-- Sample Text with Variable Properties -->
			<div
				class="max-w-4xl text-center text-2xl leading-relaxed md:text-3xl"
				style="
					font-family: 'Inter', sans-serif;
					font-variation-settings: 'wght' {fontWeight}, 'wdth' {fontWidth};
					letter-spacing: {letterSpacing}em;
					line-height: {lineHeight};
					opacity: {0.6 + smoothedBass * 0.4};
				"
			>
				The rhythm of the music flows through every letter, creating a living, breathing typography
				that responds to the heartbeat of the sound.
			</div>
		</main>

		<!-- EKG Visualization -->
		<div class="relative h-32 bg-gradient-to-t from-purple-900/20 to-transparent">
			<canvas bind:this={canvas} class="absolute inset-0 h-full w-full"></canvas>

			<!-- Beat indicator -->
			<div class="absolute right-8 bottom-4 flex items-center gap-2">
				<div
					class="h-3 w-3 rounded-full transition-all duration-75"
					style="
						background-color: {beatDetected ? '#ec4899' : '#6b7280'};
						box-shadow: {beatDetected ? '0 0 20px #ec4899' : 'none'};
						transform: scale({beatDetected ? 1.5 : 1});
					"
				></div>
				<span class="text-xs tracking-wider text-white/50 uppercase">
					{beatDetected ? 'BEAT' : 'WAITING'}
				</span>
			</div>
		</div>

		<!-- Frequency Data -->
		<div class="grid grid-cols-4 gap-4 p-8 text-center">
			{#each frequencyStore.bands as band (band.name)}
				<div class="space-y-2">
					<div class="text-xs tracking-wider text-white/50 uppercase">{band.name}</div>
					<div class="h-1 overflow-hidden rounded-full bg-white/10">
						<div
							class="h-full rounded-full transition-all duration-75"
							style="
								width: {Math.min(band.current / 10, 100)}%;
								background: {band.isActive ? '#ec4899' : '#6b7280'};
							"
						></div>
					</div>
					<div class="text-xs text-white/30">{band.current.toFixed(0)}</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Heartbeat pulse overlay -->
	<div
		class="pointer-events-none absolute inset-0 transition-opacity duration-100"
		style="
			background: radial-gradient(circle at center, rgba(236,72,153,{pulseOpacity *
			0.2}) 0%, transparent 70%);
			opacity: {pulseOpacity};
		"
	></div>
</div>
