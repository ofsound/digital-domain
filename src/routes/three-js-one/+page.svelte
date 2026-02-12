<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import * as THREE from 'three';

	import { frequencyStore } from '$lib/stores/audio-frequency-store.svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';

	type PerfTier = 'high' | 'medium' | 'low';

	interface AudioLevels {
		sub: number;
		bass: number;
		lowMid: number;
		mid: number;
	}

	interface RingPulse {
		mesh: THREE.Mesh;
		life: number;
		maxLife: number;
		velocity: number;
	}

	let mountRef: HTMLDivElement;
	let unsubscribers: (() => void)[] = [];

	let perfTier = $state<PerfTier>('high');
	let fpsEstimate = $state(0);
	let activePulses = $state(0);
	let audioEnergy = $state(0);
	let pixelRatio = $state(1);

	const GRID_SIZE = 28;
	const INSTANCE_COUNT = GRID_SIZE * GRID_SIZE;

	const tempMatrix = new THREE.Matrix4();
	const tempPosition = new THREE.Vector3();
	const tempQuaternion = new THREE.Quaternion();
	const tempScale = new THREE.Vector3();
	const tempColor = new THREE.Color();

	function clamp01(value: number): number {
		return Math.max(0, Math.min(1, value));
	}

	function readAudioLevels(): AudioLevels {
		const bands = frequencyStore.bands;
		const subBand = bands.find((band) => band.name === 'sub-bass');
		const bassBand = bands.find((band) => band.name === 'bass');
		const lowMidBand = bands.find((band) => band.name === 'low-mid');
		const midBand = bands.find((band) => band.name === 'mid');

		return {
			sub: clamp01((subBand?.current ?? 0) / 700),
			bass: clamp01((bassBand?.current ?? 0) / 900),
			lowMid: clamp01((lowMidBand?.current ?? 0) / 900),
			mid: clamp01((midBand?.current ?? 0) / 500)
		};
	}

	function disposeSceneGraph(scene: THREE.Scene): void {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const materials = new Set<THREE.Material>();
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const geometries = new Set<THREE.BufferGeometry>();
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const textures = new Set<THREE.Texture>();

		scene.traverse((object) => {
			const mesh = object as THREE.Mesh;
			if (mesh.geometry) {
				geometries.add(mesh.geometry);
			}

			const materialValue = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
			if (Array.isArray(materialValue)) {
				for (const material of materialValue) {
					materials.add(material);
				}
			} else if (materialValue) {
				materials.add(materialValue);
			}
		});

		for (const material of materials) {
			for (const value of Object.values(material)) {
				if (value instanceof THREE.Texture) {
					textures.add(value);
				}
			}
			material.dispose();
		}

		for (const geometry of geometries) {
			geometry.dispose();
		}

		for (const texture of textures) {
			texture.dispose();
		}
	}

	onMount(() => {
		playerStore.getAnalyser();
		const unsubscribe = frequencyStore.subscribe();
		unsubscribers.push(unsubscribe);

		let frameId: number | null = null;
		let tierCooldown = 0;
		let frameAverage = 16;

		let pointerX = 0;
		let pointerY = 0;
		let smoothedSub = 0;
		let smoothedBass = 0;
		let smoothedLowMid = 0;
		let smoothedMid = 0;
		let bassImpulse = 0;
		let twistImpulse = 0;
		let shimmerImpulse = 0;

		const scene = new THREE.Scene();
		scene.background = new THREE.Color('#03060c');
		scene.fog = new THREE.Fog('#03060c', 20, 130);

		const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 260);
		camera.position.set(0, 10, 24);

		const renderer = new THREE.WebGLRenderer({
			antialias: true,
			powerPreference: 'high-performance'
		});
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.06;
		renderer.setClearColor('#03060c');
		// eslint-disable-next-line svelte/no-dom-manipulating
		mountRef.appendChild(renderer.domElement);

		const hemiLight = new THREE.HemisphereLight('#78b8ff', '#1d2434', 0.9);
		hemiLight.position.set(0, 24, 0);
		scene.add(hemiLight);

		const directional = new THREE.DirectionalLight('#ffffff', 1.5);
		directional.position.set(10, 16, 14);
		scene.add(directional);

		const fill = new THREE.DirectionalLight('#8a9cff', 0.5);
		fill.position.set(-14, 10, -12);
		scene.add(fill);

		const floor = new THREE.Mesh(
			new THREE.PlaneGeometry(180, 180, 1, 1),
			new THREE.MeshStandardMaterial({
				color: '#070d18',
				emissive: '#0b1324',
				emissiveIntensity: 0.36,
				metalness: 0.14,
				roughness: 0.84
			})
		);
		floor.rotation.x = -Math.PI / 2;
		floor.position.y = -0.25;
		scene.add(floor);

		const monolithGeometry = new THREE.BoxGeometry(0.74, 1, 0.74, 1, 3, 1);
		const monolithMaterial = new THREE.MeshStandardMaterial({
			color: '#80e0ff',
			emissive: '#17344a',
			emissiveIntensity: 0.2,
			metalness: 0.18,
			roughness: 0.34
		});

		const monoliths = new THREE.InstancedMesh(monolithGeometry, monolithMaterial, INSTANCE_COUNT);
		monoliths.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		monoliths.castShadow = false;
		monoliths.receiveShadow = false;
		scene.add(monoliths);

		const basePositions = new Float32Array(INSTANCE_COUNT * 3);
		const phaseOffsets = new Float32Array(INSTANCE_COUNT);
		const colorNoise = new Float32Array(INSTANCE_COUNT);
		const centerOffset = (GRID_SIZE - 1) * 0.5;

		for (let index = 0; index < INSTANCE_COUNT; index++) {
			const row = Math.floor(index / GRID_SIZE);
			const column = index % GRID_SIZE;
			const x = (column - centerOffset) * 1.12;
			const z = (row - centerOffset) * 1.12;

			basePositions[index * 3] = x;
			basePositions[index * 3 + 1] = 0;
			basePositions[index * 3 + 2] = z;
			phaseOffsets[index] = Math.random() * Math.PI * 2;
			colorNoise[index] = Math.random();

			tempPosition.set(x, 0.5, z);
			tempQuaternion.setFromEuler(new THREE.Euler(0, 0, 0));
			tempScale.set(1, 1, 1);
			tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
			monoliths.setMatrixAt(index, tempMatrix);
			monoliths.setColorAt(index, new THREE.Color().setHSL(0.58, 0.72, 0.52));
		}
		if (monoliths.instanceColor) {
			monoliths.instanceColor.needsUpdate = true;
		}

		const pulseGeometry = new THREE.TorusGeometry(2.6, 0.18, 20, 60);
		const pulses: RingPulse[] = [];

		const maxPulseByTier: Record<PerfTier, number> = {
			high: 14,
			medium: 10,
			low: 7
		};

		const spawnPulse = (energy: number) => {
			const maxPulse = maxPulseByTier[perfTier];
			if (pulses.length >= maxPulse) {
				const removed = pulses.shift();
				if (removed) {
					scene.remove(removed.mesh);
					removed.mesh.geometry.dispose();
					(removed.mesh.material as THREE.Material).dispose();
				}
			}

			const material = new THREE.MeshBasicMaterial({
				color: '#7ed3ff',
				transparent: true,
				opacity: 0.72,
				blending: THREE.AdditiveBlending,
				depthWrite: false
			});
			const mesh = new THREE.Mesh(pulseGeometry.clone(), material);
			mesh.rotation.x = Math.PI / 2;
			mesh.position.y = 0.16;
			const scale = 1 + energy * 1.5;
			mesh.scale.set(scale, scale, scale);
			scene.add(mesh);

			pulses.push({
				mesh,
				life: 1,
				maxLife: 1,
				velocity: 0.25 + energy * 0.65
			});
		};

		const unsubBass = frequencyStore.onThreshold('bass', 'enter', (band) => {
			const over = Math.max(0, band.current - band.threshold);
			spawnPulse(clamp01(over / 360));
			bassImpulse = Math.min(2.2, bassImpulse + 0.9);
		});
		unsubscribers.push(unsubBass);

		const unsubLowMid = frequencyStore.onThreshold('low-mid', 'enter', () => {
			twistImpulse = Math.min(1.6, twistImpulse + 0.5);
		});
		unsubscribers.push(unsubLowMid);

		const unsubMid = frequencyStore.onThreshold('mid', 'enter', () => {
			shimmerImpulse = Math.min(1.4, shimmerImpulse + 0.35);
		});
		unsubscribers.push(unsubMid);

		const setRendererPixelRatio = (tier: PerfTier) => {
			const cap = Math.min(window.devicePixelRatio || 1, 1.75);
			let next = cap;
			if (tier === 'medium') {
				next = Math.max(1, cap * 0.88);
			}
			if (tier === 'low') {
				next = Math.max(1, cap * 0.74);
			}
			renderer.setPixelRatio(next);
			pixelRatio = next;
		};

		const handleResize = () => {
			if (!mountRef) return;
			const width = mountRef.clientWidth;
			const height = mountRef.clientHeight;
			renderer.setSize(width, height, false);
			camera.aspect = width / Math.max(height, 1);
			camera.updateProjectionMatrix();
		};

		const handlePointerMove = (event: PointerEvent) => {
			const rect = mountRef.getBoundingClientRect();
			const x = (event.clientX - rect.left) / Math.max(rect.width, 1);
			const y = (event.clientY - rect.top) / Math.max(rect.height, 1);
			pointerX = (x - 0.5) * 2;
			pointerY = (y - 0.5) * 2;
		};

		setRendererPixelRatio(perfTier);
		handleResize();
		window.addEventListener('resize', handleResize);
		mountRef.addEventListener('pointermove', handlePointerMove);

		let lastFrameTime = performance.now();
		const animate = (now: number) => {
			const delta = Math.min(48, now - lastFrameTime);
			lastFrameTime = now;
			frameAverage = frameAverage * 0.95 + delta * 0.05;
			fpsEstimate = 1000 / Math.max(frameAverage, 1);

			tierCooldown = Math.max(0, tierCooldown - delta);
			if (tierCooldown <= 0) {
				let nextTier: PerfTier = perfTier;
				if (frameAverage > 27) {
					nextTier = 'low';
				} else if (frameAverage > 20) {
					nextTier = 'medium';
				} else {
					nextTier = 'high';
				}
				if (nextTier !== perfTier) {
					perfTier = nextTier;
					setRendererPixelRatio(nextTier);
					tierCooldown = 650;
				}
			}

			const audio = readAudioLevels();
			smoothedSub = smoothedSub * 0.9 + audio.sub * 0.1;
			smoothedBass = smoothedBass * 0.89 + audio.bass * 0.11;
			smoothedLowMid = smoothedLowMid * 0.91 + audio.lowMid * 0.09;
			smoothedMid = smoothedMid * 0.9 + audio.mid * 0.1;
			audioEnergy = (smoothedSub + smoothedBass + smoothedLowMid + smoothedMid) * 0.25;

			camera.position.x += (pointerX * 4.2 - camera.position.x) * 0.045;
			camera.position.y += (9 + pointerY * -2.2 - camera.position.y) * 0.045;
			camera.lookAt(0, 2.8 + smoothedBass * 2.8, -2);

			const time = now * 0.001;
			const waveSpeed = 2.1 + smoothedBass * 1.2;
			const shimmer = smoothedMid + shimmerImpulse * 0.7;
			const floorMaterial = floor.material as THREE.MeshStandardMaterial;
			floorMaterial.emissiveIntensity = 0.25 + audioEnergy * 0.9;

			for (let index = 0; index < INSTANCE_COUNT; index++) {
				const x = basePositions[index * 3] ?? 0;
				const z = basePositions[index * 3 + 2] ?? 0;
				const distance = Math.sqrt(x * x + z * z);
				const phase = (phaseOffsets[index] ?? 0) + distance * 0.35;

				const ripple = Math.sin(time * waveSpeed - distance * 0.62 + phase);
				const shear = Math.cos(time * (0.7 + smoothedLowMid) + distance * 0.12);
				const bassLift = (smoothedSub * 0.75 + smoothedBass * 1.18) * (1.2 + ripple * 0.5);
				const yScale = 0.56 + Math.max(0, bassLift * 4.8 + ripple * 0.65);
				const yPosition = yScale * 0.5 + ripple * 0.35;
				const xOffset = shear * smoothedLowMid * 0.7;
				const zOffset = ripple * smoothedLowMid * 0.62;
				const rotationY = ripple * 0.3 + smoothedLowMid * 1.1 + twistImpulse * 0.8;
				const rotationZ = shear * 0.12 + twistImpulse * 0.16;

				tempPosition.set(x + xOffset, yPosition, z + zOffset);
				tempQuaternion.setFromEuler(new THREE.Euler(0, rotationY, rotationZ));
				tempScale.set(1, yScale, 1);
				tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
				monoliths.setMatrixAt(index, tempMatrix);

				const hue =
					0.55 +
					smoothedMid * 0.14 +
					(colorNoise[index] ?? 0) * 0.04 +
					shimmer * 0.02 +
					ripple * 0.01;
				tempColor.setHSL(
					(hue + 1) % 1,
					0.74,
					0.42 + shimmer * 0.24 + (ripple > 0 ? ripple * 0.05 : 0)
				);
				monoliths.setColorAt(index, tempColor);
			}
			monoliths.instanceMatrix.needsUpdate = true;
			if (monoliths.instanceColor) {
				monoliths.instanceColor.needsUpdate = true;
			}

			for (let index = pulses.length - 1; index >= 0; index--) {
				const pulse = pulses[index];
				if (!pulse) continue;

				const scaleStep = pulse.velocity * (1 + smoothedBass * 0.6);
				pulse.mesh.scale.x += scaleStep;
				pulse.mesh.scale.y += scaleStep;
				pulse.mesh.scale.z += scaleStep;
				pulse.mesh.position.y += 0.01 + smoothedMid * 0.01;
				pulse.life -= 0.022 + smoothedMid * 0.014;

				const material = pulse.mesh.material as THREE.MeshBasicMaterial;
				material.opacity = Math.max(0, pulse.life / pulse.maxLife);
				if (pulse.life <= 0) {
					scene.remove(pulse.mesh);
					pulse.mesh.geometry.dispose();
					material.dispose();
					pulses.splice(index, 1);
				}
			}

			activePulses = pulses.length;
			bassImpulse *= 0.9;
			twistImpulse *= 0.9;
			shimmerImpulse *= 0.9;

			renderer.render(scene, camera);
			frameId = requestAnimationFrame(animate);
		};

		frameId = requestAnimationFrame(animate);

		return () => {
			if (frameId !== null) {
				cancelAnimationFrame(frameId);
			}
			window.removeEventListener('resize', handleResize);
			mountRef.removeEventListener('pointermove', handlePointerMove);

			for (const pulse of pulses) {
				scene.remove(pulse.mesh);
				pulse.mesh.geometry.dispose();
				(pulse.mesh.material as THREE.Material).dispose();
			}

			disposeSceneGraph(scene);
			renderer.dispose();
			renderer.forceContextLoss();
			renderer.domElement.remove();
		};
	});

	onDestroy(() => {
		for (const unsubscribe of unsubscribers) {
			unsubscribe();
		}
		unsubscribers = [];
	});
</script>

<svelte:head>
	<title>Three.js One — Kinetic Monolith Field</title>
	<meta name="description" content="Three.js monolith field driven by audio frequency bands" />
</svelte:head>

<div class="relative min-h-screen overflow-hidden bg-black text-white">
	<div bind:this={mountRef} class="absolute inset-0"></div>

	<div
		class="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between p-6 md:p-8"
	>
		<a
			href={resolve('/examples')}
			class="pointer-events-auto rounded-lg border border-white/20 bg-black/45 px-4 py-2 text-sm text-white/85 backdrop-blur-sm transition-colors hover:bg-black/70"
		>
			← Back to Examples
		</a>
		<div
			class="rounded-xl border border-white/10 bg-black/45 px-4 py-3 text-right backdrop-blur-sm"
		>
			<div class="text-[11px] tracking-[0.2em] text-cyan-300/80 uppercase">
				Kinetic Monolith Field
			</div>
			<div class="mt-1 text-xs text-white/70">Three.js + Instanced Grid</div>
		</div>
	</div>

	<div class="pointer-events-none absolute bottom-6 left-6 z-10 flex gap-3">
		<div class="rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
			<div class="text-[10px] text-white/55 uppercase">FPS</div>
			<div class="font-mono text-lg font-bold text-cyan-300">{fpsEstimate.toFixed(0)}</div>
		</div>
		<div class="rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
			<div class="text-[10px] text-white/55 uppercase">Energy</div>
			<div class="font-mono text-lg font-bold text-blue-300">{(audioEnergy * 100).toFixed(0)}%</div>
		</div>
		<div class="rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
			<div class="text-[10px] text-white/55 uppercase">Pulse Rings</div>
			<div class="font-mono text-lg font-bold text-sky-300">{activePulses}</div>
		</div>
	</div>

	<div
		class="pointer-events-none absolute right-6 bottom-6 z-10 rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm"
	>
		<div class="text-[10px] text-white/50 uppercase">Render Tier</div>
		<div class="mt-1 flex items-center gap-2 font-mono text-sm text-white/80">
			<span>{perfTier}</span>
			<span>•</span>
			<span>DPR {pixelRatio.toFixed(2)}</span>
		</div>
	</div>
</div>
