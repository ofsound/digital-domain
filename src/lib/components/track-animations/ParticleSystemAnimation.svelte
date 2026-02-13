<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { gsap } from 'gsap';
	import { frequencyStore } from '$lib/stores/audio-frequency-store.svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';

	/**
	 * Particle System Page
	 *
	 * Canvas-based particle explosion system that responds to audio frequencies.
	 * Particles burst, flow, and create trails based on the music.
	 */

	let unsubscribers: (() => void)[] = [];
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;

	// Particle system
	interface Particle {
		x: number;
		y: number;
		vx: number;
		vy: number;
		life: number;
		maxLife: number;
		size: number;
		color: string;
		alpha: number;
		decay: number;
	}

	let particles: Particle[] = [];
	const MAX_PARTICLES = 800;

	// Canvas dimensions
	let width = $state(0);
	let height = $state(0);

	// Emitter position
	let emitterX = $state(0);
	let emitterY = $state(0);

	// Audio-reactive values
	let bassIntensity = $state(0);
	let midIntensity = $state(0);

	onMount(() => {
		// Initialize audio
		playerStore.getAnalyser();
		const unsubscribe = frequencyStore.subscribe();
		unsubscribers.push(unsubscribe);

		// Setup canvas
		ctx = canvas.getContext('2d');
		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);

		// Set emitter to center
		emitterX = width / 2;
		emitterY = height / 2;

		// Bass explosion - burst of particles
		const unsubBass = frequencyStore.onThreshold('bass', 'enter', (band) => {
			const intensity = (band.current - band.threshold) / band.threshold;
			const count = Math.floor(30 + intensity * 50);

			for (let i = 0; i < count; i++) {
				spawnParticle(intensity, 'bass');
			}

			// Screen shake effect
			gsap.to(canvas, {
				duration: 0.1,
				x: (Math.random() - 0.5) * intensity * 20,
				y: (Math.random() - 0.5) * intensity * 20,
				onComplete: () => {
					gsap.to(canvas, {
						duration: 0.3,
						x: 0,
						y: 0,
						ease: 'elastic.out(1, 0.3)'
					});
				}
			});
		});
		unsubscribers.push(unsubBass);

		// Sub-bass - slower, larger particles
		const unsubSub = frequencyStore.onThreshold('sub-bass', 'enter', (band) => {
			const intensity = (band.current - band.threshold) / band.threshold;

			for (let i = 0; i < 15; i++) {
				spawnParticle(intensity * 1.5, 'sub');
			}
		});
		unsubscribers.push(unsubSub);

		// Low-mid - directional flow
		const unsubLowMid = frequencyStore.onThreshold('low-mid', 'enter', (band) => {
			const intensity = (band.current - band.threshold) / band.threshold;

			// Create ring of particles
			for (let i = 0; i < 40; i++) {
				const angle = (i / 40) * Math.PI * 2;
				spawnRingParticle(angle, intensity);
			}
		});
		unsubscribers.push(unsubLowMid);

		// Mid - sparkle particles
		const unsubMid = frequencyStore.onThreshold('mid', 'enter', (band) => {
			const intensity = (band.current - band.threshold) / band.threshold;

			for (let i = 0; i < 20; i++) {
				spawnSparkle(intensity);
			}
		});
		unsubscribers.push(unsubMid);

		// Animation loop
		let animationId: number;
		const animate = () => {
			updateParticles();
			render();
			animationId = requestAnimationFrame(animate);
		};
		animate();

		// Continuous emitter based on raw data
		const emitLoop = setInterval(() => {
			if (!frequencyStore.isRunning) return;

			const bands = frequencyStore.bands;
			const bass = bands.find((b) => b.name === 'bass');
			const mid = bands.find((b) => b.name === 'mid');

			if (bass) {
				bassIntensity = bassIntensity * 0.95 + (bass.current / 1000) * 0.05;

				// Emit particles continuously based on bass level
				if (Math.random() < bassIntensity * 0.5) {
					spawnParticle(bassIntensity * 0.5, 'ambient');
				}
			}

			if (mid) {
				midIntensity = midIntensity * 0.9 + (mid.current / 500) * 0.1;

				// Move emitter based on mid frequencies
				emitterX = width / 2 + Math.sin(Date.now() / 1000) * (midIntensity * 100);
				emitterY = height / 2 + Math.cos(Date.now() / 1500) * (midIntensity * 50);
			}
		}, 16);

		return () => {
			cancelAnimationFrame(animationId);
			clearInterval(emitLoop);
			window.removeEventListener('resize', resizeCanvas);
		};
	});

	onDestroy(() => {
		unsubscribers.forEach((unsub) => unsub());
	});

	function resizeCanvas() {
		if (!canvas) return;
		width = window.innerWidth;
		height = window.innerHeight;
		canvas.width = width;
		canvas.height = height;
		emitterX = width / 2;
		emitterY = height / 2;
	}

	function spawnParticle(intensity: number, type: string) {
		if (particles.length >= MAX_PARTICLES) return;

		const angle = Math.random() * Math.PI * 2;
		const speed = (2 + intensity * 8) * (0.5 + Math.random());

		let color: string;
		let size: number;
		let life: number;

		switch (type) {
			case 'bass':
				color = `hsla(${280 + Math.random() * 40}, 90%, 60%, 1)`;
				size = 4 + intensity * 8;
				life = 60 + intensity * 40;
				break;
			case 'sub':
				color = `hsla(${200 + Math.random() * 30}, 80%, 50%, 1)`;
				size = 8 + intensity * 12;
				life = 100 + intensity * 60;
				break;
			case 'ambient':
				color = `hsla(${160 + Math.random() * 60}, 70%, 70%, 1)`;
				size = 2 + intensity * 4;
				life = 40 + Math.random() * 30;
				break;
			default:
				color = `hsla(${Math.random() * 360}, 80%, 60%, 1)`;
				size = 3 + Math.random() * 4;
				life = 50 + Math.random() * 50;
		}

		particles.push({
			x: emitterX + (Math.random() - 0.5) * 50,
			y: emitterY + (Math.random() - 0.5) * 50,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			life,
			maxLife: life,
			size,
			color,
			alpha: 1,
			decay: 1 + Math.random() * 2
		});
	}

	function spawnRingParticle(angle: number, intensity: number) {
		if (particles.length >= MAX_PARTICLES) return;

		const radius = 50 + intensity * 100;
		const speed = 3 + intensity * 5;

		particles.push({
			x: emitterX + Math.cos(angle) * radius,
			y: emitterY + Math.sin(angle) * radius,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			life: 80,
			maxLife: 80,
			size: 3 + intensity * 5,
			color: `hsla(${320 + Math.random() * 40}, 100%, 70%, 1)`,
			alpha: 1,
			decay: 1.5
		});
	}

	function spawnSparkle(intensity: number) {
		if (particles.length >= MAX_PARTICLES) return;

		particles.push({
			x: Math.random() * width,
			y: Math.random() * height,
			vx: (Math.random() - 0.5) * 2,
			vy: (Math.random() - 0.5) * 2,
			life: 30 + Math.random() * 20,
			maxLife: 50,
			size: 1 + Math.random() * 2,
			color: '#ffffff',
			alpha: 0.8 + intensity * 0.2,
			decay: 3
		});
	}

	function updateParticles() {
		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];
			if (!p) continue;

			// Update position
			p.x += p.vx;
			p.y += p.vy;

			// Apply friction
			p.vx *= 0.98;
			p.vy *= 0.98;

			// Apply gravity (subtle)
			p.vy += 0.05;

			// Update life
			p.life -= p.decay;
			p.alpha = p.life / p.maxLife;

			// Remove dead particles
			if (p.life <= 0) {
				particles.splice(i, 1);
			}
		}
	}

	function render() {
		if (!ctx || !canvas) return;

		// Fade effect for trails
		ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
		ctx.fillRect(0, 0, width, height);

		// Draw particles
		particles.forEach((p) => {
			if (!ctx) return;

			ctx.save();
			ctx.globalAlpha = p.alpha;

			// Glow effect
			const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
			gradient.addColorStop(0, p.color);
			gradient.addColorStop(1, 'transparent');

			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
			ctx.fill();

			// Core
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx.fill();

			ctx.restore();
		});

		// Draw emitter
		if (ctx) {
			const gradient = ctx.createRadialGradient(emitterX, emitterY, 0, emitterX, emitterY, 40);
			gradient.addColorStop(0, `rgba(255, 255, 255, ${0.3 + bassIntensity * 0.4})`);
			gradient.addColorStop(0.5, `rgba(147, 51, 234, ${0.2 + midIntensity * 0.3})`);
			gradient.addColorStop(1, 'transparent');

			ctx.fillStyle = gradient;
			ctx.beginPath();
			ctx.arc(emitterX, emitterY, 40, 0, Math.PI * 2);
			ctx.fill();
		}
	}
</script>

<div class="relative h-screen w-full overflow-hidden bg-transparent">
	<!-- Canvas -->
	<canvas bind:this={canvas} class="absolute inset-0 block"></canvas>

	<!-- UI Overlay -->
	<div class="absolute top-0 right-0 left-0 z-10 p-8">
		<h1 class="text-4xl font-black tracking-tighter text-white">PARTICLES</h1>
		<p class="mt-2 text-sm text-white/50">Audio-reactive explosion system</p>
	</div>

	<!-- Stats -->
	<div class="absolute bottom-8 left-8 space-y-1 text-xs text-white/30">
		<div>Particles: {particles.length} / {MAX_PARTICLES}</div>
		<div>Bass Intensity: {bassIntensity.toFixed(2)}</div>
		<div>Mid Intensity: {midIntensity.toFixed(2)}</div>
		<div>Running: {frequencyStore.isRunning}</div>
	</div>

	<!-- Frequency indicators -->
	<div class="absolute right-8 bottom-8 flex gap-4">
		{#each frequencyStore.bands as band (band.name)}
			<div class="flex flex-col items-center gap-1">
				<div
					class="w-3 rounded-full transition-all duration-100"
					style="
						height: {Math.min(band.current / 5, 60)}px;
						background: {band.isActive ? '#ec4899' : '#6b7280'};
						box-shadow: {band.isActive ? '0 0 20px #ec4899' : 'none'};
					"
				></div>
				<span class="text-[10px] text-white/40 uppercase">{band.name.slice(0, 3)}</span>
			</div>
		{/each}
	</div>

	<!-- Instructions -->
	<div class="absolute top-8 right-8 text-right text-xs text-white/30">
		<div>Play audio to trigger</div>
		<div>particle explosions</div>
	</div>
</div>
