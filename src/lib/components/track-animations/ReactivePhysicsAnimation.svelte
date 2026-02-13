<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Matter from 'matter-js';
	import { frequencyStore } from '$lib/stores/audio-frequency-store.svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';

	/**
	 * Reactive Physics Page
	 *
	 * Matter.js physics simulation where UI elements (buttons, cards, shapes)
	 * react to audio frequencies. High-frequency percussion triggers forces,
	 * gravity shifts, and explosive interactions.
	 */

	let unsubscribers: (() => void)[] = [];

	// Matter.js modules
	const Engine = Matter.Engine;
	const Render = Matter.Render;
	const Runner = Matter.Runner;
	const Bodies = Matter.Bodies;
	const Composite = Matter.Composite;
	const Body = Matter.Body;
	const Mouse = Matter.Mouse;
	const MouseConstraint = Matter.MouseConstraint;

	// Physics engine
	let engine: Matter.Engine;
	let render: Matter.Render;
	let runner: Matter.Runner;
	let canvas: HTMLCanvasElement;

	// Physics bodies
	let uiBodies: Matter.Body[] = [];
	let walls: Matter.Body[] = [];
	let particles: Matter.Body[] = [];

	// Audio analysis
	let smoothedBass = $state(0);
	let smoothedMids = $state(0);
	let smoothedLowMids = $state(0);
	let smoothedHighs = $state(0);
	let overallEnergy = $state(0);
	let lastExplosionTime = 0;

	// Physics parameters
	let gravity = $state(1);
	let friction = $state(0.1);
	let restitution = $state(0.5);
	let timeScale = $state(1);
	let animationFrameId: number | null = null;

	// Stats
	let bodyCount = $state(0);

	onMount(() => {
		// Initialize audio
		playerStore.getAnalyser();
		const unsubscribe = frequencyStore.subscribe();
		unsubscribers.push(unsubscribe);

		// Initialize Matter.js
		initPhysics();

		// Bass threshold - heavy gravity shift
		const unsubBass = frequencyStore.onThreshold('bass', 'enter', (band) => {
			const intensity = (band.current - band.threshold) / band.threshold;

			// Increase gravity temporarily (heavy drop feel)
			engine.gravity.y = 2 + intensity * 3;
			engine.gravity.x = (Math.random() - 0.5) * intensity;

			// Apply downward force to all bodies
			uiBodies.forEach((body) => {
				if (!body.isStatic) {
					Body.applyForce(body, body.position, {
						x: 0,
						y: 0.02 * intensity * body.mass
					});
				}
			});

			// Reset gravity after drop
			setTimeout(() => {
				engine.gravity.y = 1;
				engine.gravity.x = 0;
			}, 500);
		});
		unsubscribers.push(unsubBass);

		// Mid threshold - explosion/scatter effect
		const unsubMid = frequencyStore.onThreshold('mid', 'enter', (band) => {
			const intensity = (band.current - band.threshold) / band.threshold;
			const now = Date.now();

			// Prevent too frequent explosions
			if (now - lastExplosionTime < 200) return;
			lastExplosionTime = now;

			// Apply explosive radial force from center
			const centerX = canvas.width / 2;
			const centerY = canvas.height / 2;

			uiBodies.forEach((body) => {
				if (!body.isStatic) {
					const angle = Math.atan2(body.position.y - centerY, body.position.x - centerX);
					const force = 0.03 * intensity;

					Body.applyForce(body, body.position, {
						x: Math.cos(angle) * force * body.mass,
						y: Math.sin(angle) * force * body.mass
					});
				}
			});

			// Spawn explosion particles
			spawnExplosion(centerX, centerY, intensity);
		});
		unsubscribers.push(unsubMid);

		// Low-mid threshold - inverse gravity effect
		const unsubLowMid = frequencyStore.onThreshold('low-mid', 'enter', () => {
			// Inverse gravity - float up
			engine.gravity.y = -1;

			uiBodies.forEach((body) => {
				if (!body.isStatic) {
					Body.applyForce(body, body.position, {
						x: (Math.random() - 0.5) * 0.01,
						y: -0.02 * body.mass
					});
				}
			});

			setTimeout(() => {
				engine.gravity.y = 1;
			}, 400);
		});
		unsubscribers.push(unsubLowMid);

		// Sub-bass - friction reduction (slippery)
		const unsubSub = frequencyStore.onThreshold('sub-bass', 'enter', () => {
			// Reduce friction temporarily
			uiBodies.forEach((body) => {
				body.friction = 0.001;
				body.frictionAir = 0.0001;
			});
			friction = 0.001;

			setTimeout(() => {
				uiBodies.forEach((body) => {
					body.friction = 0.1;
					body.frictionAir = 0.01;
				});
				friction = 0.1;
			}, 600);
		});
		unsubscribers.push(unsubSub);

		// Continuous physics updates
		const physicsLoop = () => {
			if (!frequencyStore.isRunning) {
				animationFrameId = requestAnimationFrame(physicsLoop);
				return;
			}

			const bands = frequencyStore.bands;
			const bass = bands.find((b) => b.name === 'bass');
			const mids = bands.find((b) => b.name === 'mid');
			const lowMids = bands.find((b) => b.name === 'low-mid');

			if (bass) {
				smoothedBass = smoothedBass * 0.9 + Math.min(bass.current / 800, 1) * 0.1;
			}
			if (mids) {
				smoothedMids = smoothedMids * 0.9 + Math.min(mids.current / 600, 1) * 0.1;
			}
			if (lowMids) {
				smoothedLowMids = smoothedLowMids * 0.92 + Math.min(lowMids.current / 500, 1) * 0.08;
			}

			overallEnergy = (smoothedBass + smoothedMids + smoothedLowMids + smoothedHighs) / 4;

			// Modulate time scale based on energy
			engine.timing.timeScale = 1 + smoothedMids * 0.5;
			timeScale = engine.timing.timeScale;

			// Restitution bounciness based on highs
			const targetRestitution = 0.3 + smoothedHighs * 0.7;
			uiBodies.forEach((body) => {
				body.restitution = targetRestitution;
			});
			restitution = targetRestitution;

			// Update stats
			bodyCount = Composite.allBodies(engine.world).length;

			animationFrameId = requestAnimationFrame(physicsLoop);
		};

		animationFrameId = requestAnimationFrame(physicsLoop);

		return () => {
			if (animationFrameId !== null) {
				cancelAnimationFrame(animationFrameId);
				animationFrameId = null;
			}
			if (runner) runner.enabled = false;
			if (render) Render.stop(render);
			if (engine) Engine.clear(engine);
		};
	});

	onDestroy(() => {
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		unsubscribers.forEach((unsub) => unsub());
		if (runner) runner.enabled = false;
		if (render) Render.stop(render);
		if (engine) Engine.clear(engine);
	});

	function initPhysics() {
		// Create engine
		engine = Engine.create();
		engine.gravity.y = 1;
		engine.gravity.scale = 0.001;

		// Create renderer
		render = Render.create({
			element: document.getElementById('physics-container')!,
			engine: engine,
			canvas: canvas,
			options: {
				width: canvas?.parentElement?.clientWidth || 800,
				height: canvas?.parentElement?.clientHeight || 600,
				wireframes: false,
				background: 'transparent',
				showAngleIndicator: false,
				showVelocity: false
			}
		});

		// Create walls
		const width = render.options.width || 800;
		const height = render.options.height || 600;
		const wallThickness = 60;

		walls = [
			Bodies.rectangle(width / 2, -wallThickness / 2, width, wallThickness, {
				isStatic: true,
				render: { fillStyle: '#1f2937' }
			}),
			Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, {
				isStatic: true,
				render: { fillStyle: '#1f2937' }
			}),
			Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, {
				isStatic: true,
				render: { fillStyle: '#1f2937' }
			}),
			Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, {
				isStatic: true,
				render: { fillStyle: '#1f2937' }
			})
		];
		Composite.add(engine.world, walls);

		// Create UI element bodies
		createUIBodies(width);

		// Add mouse control
		const mouse = Mouse.create(render.canvas);
		const mouseConstraint = MouseConstraint.create(engine, {
			mouse: mouse,
			constraint: {
				stiffness: 0.2,
				render: { visible: false }
			}
		});
		Composite.add(engine.world, mouseConstraint);
		render.mouse = mouse;

		// Run the engine
		runner = Runner.create();
		Runner.run(runner, engine);
		Render.run(render);

		// Handle resize
		window.addEventListener('resize', handleResize);
	}

	function createUIBodies(width: number) {
		uiBodies = [];

		// Create different types of UI elements

		// 1. Rectangular cards (buttons)
		for (let i = 0; i < 5; i++) {
			const x = 100 + i * 140;
			const y = 100 + Math.random() * 100;
			const body = Bodies.rectangle(x, y, 80, 50, {
				restitution: 0.5,
				friction: 0.1,
				render: {
					fillStyle: `hsl(${220 + i * 20}, 70%, 50%)`,
					strokeStyle: '#fff',
					lineWidth: 2
				},
				label: `Button ${i + 1}`,
				chamfer: { radius: 8 }
			});
			uiBodies.push(body);
		}

		// 2. Circles (icons)
		for (let i = 0; i < 6; i++) {
			const x = 150 + i * 100;
			const y = 250 + Math.random() * 50;
			const body = Bodies.circle(x, y, 25, {
				restitution: 0.7,
				friction: 0.05,
				render: {
					fillStyle: `hsl(${280 + i * 30}, 80%, 60%)`,
					strokeStyle: '#fff',
					lineWidth: 2
				},
				label: `Icon ${i + 1}`
			});
			uiBodies.push(body);
		}

		// 3. Hexagons (complex shapes)
		for (let i = 0; i < 4; i++) {
			const x = 200 + i * 150;
			const y = 400 + Math.random() * 50;
			const body = Bodies.polygon(x, y, 6, 35, {
				restitution: 0.6,
				friction: 0.08,
				render: {
					fillStyle: `hsl(${340 + i * 15}, 75%, 55%)`,
					strokeStyle: '#fff',
					lineWidth: 2
				},
				label: `Hex ${i + 1}`
			});
			uiBodies.push(body);
		}

		// 4. Triangles (warnings)
		for (let i = 0; i < 3; i++) {
			const x = 250 + i * 200;
			const y = 500 + Math.random() * 50;
			const body = Bodies.polygon(x, y, 3, 30, {
				restitution: 0.8,
				friction: 0.03,
				render: {
					fillStyle: `hsl(${40 + i * 20}, 90%, 55%)`,
					strokeStyle: '#fff',
					lineWidth: 2
				},
				label: `Alert ${i + 1}`
			});
			uiBodies.push(body);
		}

		// 5. Long rectangles (input fields)
		for (let i = 0; i < 3; i++) {
			const x = width / 2;
			const y = 180 + i * 80;
			const body = Bodies.rectangle(x, y, 300, 40, {
				restitution: 0.3,
				friction: 0.15,
				render: {
					fillStyle: 'rgba(59, 130, 246, 0.8)',
					strokeStyle: '#fff',
					lineWidth: 2
				},
				label: `Input ${i + 1}`,
				chamfer: { radius: 4 }
			});
			uiBodies.push(body);
		}

		Composite.add(engine.world, uiBodies);
	}

	function spawnExplosion(x: number, y: number, intensity: number) {
		const particleCount = Math.floor(5 + intensity * 10);

		for (let i = 0; i < particleCount; i++) {
			const angle = (Math.PI * 2 * i) / particleCount;
			const speed = 2 + intensity * 5;
			const body = Bodies.circle(
				x + Math.cos(angle) * 20,
				y + Math.sin(angle) * 20,
				3 + Math.random() * 4,
				{
					render: {
						fillStyle: `hsl(${Math.random() * 60 + 300}, 100%, 70%)`
					},
					friction: 0,
					frictionAir: 0.01,
					restitution: 0.9,
					label: 'Particle'
				}
			);

			Body.setVelocity(body, {
				x: Math.cos(angle) * speed,
				y: Math.sin(angle) * speed
			});

			Composite.add(engine.world, body);
			particles.push(body);

			// Remove particle after delay
			setTimeout(() => {
				Composite.remove(engine.world, body);
				particles = particles.filter((p) => p !== body);
			}, 2000);
		}
	}

	function handleResize() {
		if (!render || !engine) return;
		const container = document.getElementById('physics-container');
		if (container) {
			render.canvas.width = container.clientWidth;
			render.canvas.height = container.clientHeight;
		}
	}

	function addRandomBody() {
		const types = ['rectangle', 'circle', 'polygon'];
		const type = types[Math.floor(Math.random() * types.length)];
		const x = Math.random() * (render.options.width || 800);
		const y = -50;
		let body: Matter.Body;

		switch (type) {
			case 'rectangle':
				body = Bodies.rectangle(x, y, 60 + Math.random() * 40, 40 + Math.random() * 30, {
					render: {
						fillStyle: `hsl(${Math.random() * 360}, 70%, 50%)`
					},
					chamfer: { radius: 5 }
				});
				break;
			case 'circle':
				body = Bodies.circle(x, y, 20 + Math.random() * 20, {
					render: {
						fillStyle: `hsl(${Math.random() * 360}, 80%, 60%)`
					}
				});
				break;
			default:
				body = Bodies.polygon(x, y, 3 + Math.floor(Math.random() * 4), 25 + Math.random() * 15, {
					render: {
						fillStyle: `hsl(${Math.random() * 360}, 75%, 55%)`
					}
				});
		}

		uiBodies.push(body);
		Composite.add(engine.world, body);
	}

	function resetPhysics() {
		// Remove all dynamic bodies
		Composite.remove(engine.world, uiBodies);
		Composite.remove(engine.world, particles);
		uiBodies = [];
		particles = [];

		// Recreate
		createUIBodies(render.options.width || 800);
	}
</script>

<div class="min-h-screen overflow-hidden bg-transparent text-white">
	<!-- Header -->
	<header class="absolute top-0 right-0 left-0 z-20 p-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-4xl font-black tracking-tighter">REACTIVE PHYSICS</h1>
				<p class="mt-1 text-sm text-white/50">Matter.js audio-reactive simulation</p>
			</div>
			<div class="flex gap-4">
				<button
					onclick={addRandomBody}
					class="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-purple-500"
				>
					Add Body
				</button>
				<button
					onclick={resetPhysics}
					class="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-600"
				>
					Reset
				</button>
			</div>
		</div>
	</header>

	<!-- Physics Canvas Container -->
	<div id="physics-container" class="absolute inset-0">
		<canvas bind:this={canvas} class="h-full w-full"></canvas>
	</div>

	<!-- Physics Controls Overlay -->
	<div class="absolute right-8 bottom-8 left-8 grid grid-cols-2 gap-4 md:grid-cols-5">
		<!-- Gravity -->
		<div class="rounded-xl border border-white/10 bg-black/50 p-4 backdrop-blur-sm">
			<div class="mb-2 text-xs tracking-wider text-white/50 uppercase">Gravity</div>
			<div class="font-mono text-2xl font-bold">{gravity.toFixed(2)}</div>
			<div class="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
				<div
					class="h-full bg-purple-500 transition-all duration-100"
					style="width: {(gravity / 5) * 100}%"
				></div>
			</div>
		</div>

		<!-- Friction -->
		<div class="rounded-xl border border-white/10 bg-black/50 p-4 backdrop-blur-sm">
			<div class="mb-2 text-xs tracking-wider text-white/50 uppercase">Friction</div>
			<div class="font-mono text-2xl font-bold">{friction.toFixed(3)}</div>
			<div class="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
				<div
					class="h-full bg-blue-500 transition-all duration-100"
					style="width: {friction * 100}%"
				></div>
			</div>
		</div>

		<!-- Bounciness -->
		<div class="rounded-xl border border-white/10 bg-black/50 p-4 backdrop-blur-sm">
			<div class="mb-2 text-xs tracking-wider text-white/50 uppercase">Bounciness</div>
			<div class="font-mono text-2xl font-bold">{restitution.toFixed(2)}</div>
			<div class="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
				<div
					class="h-full bg-pink-500 transition-all duration-100"
					style="width: {restitution * 100}%"
				></div>
			</div>
		</div>

		<!-- Time Scale -->
		<div class="rounded-xl border border-white/10 bg-black/50 p-4 backdrop-blur-sm">
			<div class="mb-2 text-xs tracking-wider text-white/50 uppercase">Time Scale</div>
			<div class="font-mono text-2xl font-bold">{timeScale.toFixed(2)}x</div>
			<div class="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
				<div
					class="h-full bg-green-500 transition-all duration-100"
					style="width: {(timeScale / 1.5) * 100}%"
				></div>
			</div>
		</div>

		<!-- Body Count -->
		<div class="rounded-xl border border-white/10 bg-black/50 p-4 backdrop-blur-sm">
			<div class="mb-2 text-xs tracking-wider text-white/50 uppercase">Bodies</div>
			<div class="font-mono text-2xl font-bold">{bodyCount}</div>
			<div class="mt-2 text-xs text-white/30">Active physics objects</div>
		</div>
	</div>

	<!-- Audio Frequency Indicators -->
	<div class="absolute top-24 right-8 space-y-3">
		{#each [{ name: 'Bass', value: smoothedBass, color: '#a855f7', effect: 'Heavy Gravity' }, { name: 'Mid', value: smoothedMids, color: '#ec4899', effect: 'Explosion' }, { name: 'Low-Mid', value: smoothedLowMids, color: '#3b82f6', effect: 'Inverse G' }, { name: 'Sub', value: smoothedHighs, color: '#f59e0b', effect: 'Low Friction' }] as freq (freq.name)}
			<div class="w-48 rounded-xl border border-white/10 bg-black/50 p-3 backdrop-blur-sm">
				<div class="mb-2 flex items-center justify-between">
					<span class="text-xs text-white/50">{freq.name}</span>
					<span class="text-xs" style="color: {freq.color}">{(freq.value * 100).toFixed(0)}%</span>
				</div>
				<div class="h-1.5 overflow-hidden rounded-full bg-white/10">
					<div
						class="h-full rounded-full transition-all duration-100"
						style="width: {freq.value * 100}%; background-color: {freq.color}"
					></div>
				</div>
				<div class="mt-1 text-[10px] text-white/30">{freq.effect}</div>
			</div>
		{/each}
	</div>

	<!-- Instructions -->
	<div class="absolute top-24 left-8 max-w-xs">
		<div class="rounded-xl border border-white/10 bg-black/50 p-4 backdrop-blur-sm">
			<div class="mb-2 text-xs tracking-wider text-white/50 uppercase">How it works</div>
			<ul class="space-y-1 text-xs text-white/70">
				<li>• Drag bodies with your mouse</li>
				<li>• Bass → Heavy gravity drop</li>
				<li>• Mid → Explosion forces</li>
				<li>• Low-mid → Float upward</li>
				<li>• Sub-bass → Slippery friction</li>
			</ul>
		</div>
	</div>

	<!-- Energy Meter -->
	<div class="absolute right-8 bottom-8">
		<div
			class="flex items-center gap-3 rounded-full border border-white/10 bg-black/50 px-4 py-2 backdrop-blur-sm"
		>
			<div class="text-xs text-white/50">Energy</div>
			<div class="h-2 w-24 overflow-hidden rounded-full bg-white/10">
				<div
					class="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100"
					style="width: {overallEnergy * 100}%"
				></div>
			</div>
			<div class="text-sm font-bold">{(overallEnergy * 100).toFixed(0)}%</div>
		</div>
	</div>
</div>
