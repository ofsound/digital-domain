<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import * as THREE from 'three';
	import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
	import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
	import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
	import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

	import { frequencyStore } from '$lib/stores/audio-frequency-store.svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';

	type PerfTier = 'high' | 'medium' | 'low';

	interface AudioLevels {
		sub: number;
		bass: number;
		lowMid: number;
		mid: number;
	}

	interface PulseWall {
		mesh: THREE.Mesh;
		life: number;
		maxLife: number;
		velocity: number;
	}

	interface Props {
		layerMode?: boolean;
	}

	let { layerMode = false }: Props = $props();

	let mountRef: HTMLDivElement;
	let unsubscribers: (() => void)[] = [];

	let perfTier = $state<PerfTier>('high');
	let fpsEstimate = $state(0);
	let audioEnergy = $state(0);
	let cameraSpeed = $state(0);
	let pulseCount = $state(0);

	const TUNNEL_RING_COUNT = 132;
	const TUNNEL_DEPTH = 460;
	const TUNNEL_SPACING = TUNNEL_DEPTH / TUNNEL_RING_COUNT;
	const STREAM_PARTICLES = 2400;

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
		let frameAverage = 16;
		let tierCooldown = 0;
		let travel = 0;
		let smoothedSub = 0;
		let smoothedBass = 0;
		let smoothedLowMid = 0;
		let smoothedMid = 0;
		let warpImpulse = 0;
		let strobeImpulse = 0;

		const scene = new THREE.Scene();
		scene.background = null;
		scene.fog = new THREE.Fog('#020106', 25, 220);

		const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 540);
		camera.position.set(0, 0, 6);
		const renderer = new THREE.WebGLRenderer({
			antialias: !layerMode,
			alpha: true,
			powerPreference: 'high-performance'
		});
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.08;
		renderer.setClearColor('#000000', 0);
		// eslint-disable-next-line svelte/no-dom-manipulating
		mountRef.appendChild(renderer.domElement);

		const composer = new EffectComposer(renderer);
		const renderPass = new RenderPass(scene, camera);
		const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.65, 0.55, 0.18);
		const filmPass = new FilmPass(0.25, false);
		const filmUniforms = filmPass.uniforms as Record<string, { value: number | boolean }>;
		composer.addPass(renderPass);
		composer.addPass(bloomPass);
		composer.addPass(filmPass);

		const ambient = new THREE.AmbientLight('#6d72ff', 0.45);
		scene.add(ambient);

		const tunnelLight = new THREE.PointLight('#7bc4ff', 1.8, 120, 2.4);
		tunnelLight.position.set(0, 0, 8);
		scene.add(tunnelLight);

		const rimLight = new THREE.DirectionalLight('#bd7dff', 1.4);
		rimLight.position.set(-4, 6, 12);
		scene.add(rimLight);

		const tunnelGroup = new THREE.Group();
		scene.add(tunnelGroup);

		const ringMaterial = new THREE.MeshStandardMaterial({
			color: '#89d2ff',
			emissive: '#283f95',
			emissiveIntensity: 0.45,
			metalness: 0.22,
			roughness: 0.34
		});

		const rings: THREE.Mesh[] = [];
		for (let index = 0; index < TUNNEL_RING_COUNT; index++) {
			const ringRadius = 5.6 + Math.sin(index * 0.16) * 0.7;
			const geometry = new THREE.TorusGeometry(ringRadius, 0.12 + (index % 3) * 0.03, 12, 44);
			const ring = new THREE.Mesh(geometry, ringMaterial.clone());
			ring.userData.baseIndex = index;
			ring.userData.baseRadius = ringRadius;
			tunnelGroup.add(ring);
			rings.push(ring);
		}

		const filamentCount = 180;
		const filamentPositions = new Float32Array(filamentCount * 6);
		for (let index = 0; index < filamentCount; index++) {
			const i6 = index * 6;
			const angle = (index / filamentCount) * Math.PI * 2;
			const radius = 5.3 + Math.random() * 1.2;
			filamentPositions[i6] = Math.cos(angle) * radius;
			filamentPositions[i6 + 1] = Math.sin(angle) * radius;
			filamentPositions[i6 + 2] = -Math.random() * TUNNEL_DEPTH;
			filamentPositions[i6 + 3] = Math.cos(angle) * (radius + 0.8);
			filamentPositions[i6 + 4] = Math.sin(angle) * (radius + 0.8);
			filamentPositions[i6 + 5] = filamentPositions[i6 + 2] - 8 - Math.random() * 12;
		}

		const filamentGeometry = new THREE.BufferGeometry();
		filamentGeometry.setAttribute('position', new THREE.BufferAttribute(filamentPositions, 3));
		const filamentMaterial = new THREE.LineBasicMaterial({
			color: '#a0e8ff',
			transparent: true,
			opacity: 0.35,
			blending: THREE.AdditiveBlending
		});
		const filaments = new THREE.LineSegments(filamentGeometry, filamentMaterial);
		tunnelGroup.add(filaments);

		const streamPositions = new Float32Array(STREAM_PARTICLES * 3);
		const streamVelocity = new Float32Array(STREAM_PARTICLES);
		for (let index = 0; index < STREAM_PARTICLES; index++) {
			const radius = Math.random() * 4.2;
			const angle = Math.random() * Math.PI * 2;
			streamPositions[index * 3] = Math.cos(angle) * radius;
			streamPositions[index * 3 + 1] = Math.sin(angle) * radius;
			streamPositions[index * 3 + 2] = -Math.random() * TUNNEL_DEPTH;
			streamVelocity[index] = 0.5 + Math.random() * 1.4;
		}
		const streamGeometry = new THREE.BufferGeometry();
		streamGeometry.setAttribute('position', new THREE.BufferAttribute(streamPositions, 3));
		streamGeometry.setDrawRange(0, STREAM_PARTICLES);
		const streamMaterial = new THREE.PointsMaterial({
			color: '#d7f1ff',
			size: 0.06,
			sizeAttenuation: true,
			transparent: true,
			opacity: 0.68,
			blending: THREE.AdditiveBlending,
			depthWrite: false
		});
		const stream = new THREE.Points(streamGeometry, streamMaterial);
		tunnelGroup.add(stream);

		const pulseGeometry = new THREE.TorusGeometry(5.6, 0.15, 14, 56);
		const pulseWalls: PulseWall[] = [];
		const maxPulseByTier: Record<PerfTier, number> = {
			high: 16,
			medium: 12,
			low: 8
		};

		const spawnPulse = (strength: number) => {
			const maxPulses = maxPulseByTier[perfTier];
			if (pulseWalls.length >= maxPulses) {
				const removed = pulseWalls.shift();
				if (removed) {
					scene.remove(removed.mesh);
					removed.mesh.geometry.dispose();
					(removed.mesh.material as THREE.Material).dispose();
				}
			}

			const material = new THREE.MeshBasicMaterial({
				color: '#85d4ff',
				transparent: true,
				opacity: 0.82,
				blending: THREE.AdditiveBlending,
				depthWrite: false
			});
			const mesh = new THREE.Mesh(pulseGeometry.clone(), material);
			mesh.position.z = -18;
			mesh.rotation.x = Math.PI / 2;
			const scale = 1 + strength * 1.4;
			mesh.scale.set(scale, scale, scale);
			tunnelGroup.add(mesh);
			pulseWalls.push({
				mesh,
				life: 1,
				maxLife: 1,
				velocity: 5 + strength * 8
			});
		};

		const unsubBass = frequencyStore.onThreshold('bass', 'enter', (band) => {
			const over = Math.max(0, band.current - band.threshold);
			spawnPulse(clamp01(over / 330));
		});
		unsubscribers.push(unsubBass);

		const unsubLowMid = frequencyStore.onThreshold('low-mid', 'enter', () => {
			warpImpulse = Math.min(2.4, warpImpulse + 0.5);
		});
		unsubscribers.push(unsubLowMid);

		const unsubMid = frequencyStore.onThreshold('mid', 'enter', () => {
			strobeImpulse = Math.min(1.9, strobeImpulse + 0.45);
		});
		unsubscribers.push(unsubMid);

		const setPixelRatio = (tier: PerfTier) => {
			const cap = layerMode
				? Math.min(window.devicePixelRatio || 1, 0.9)
				: Math.min(window.devicePixelRatio || 1, 1.75);
			let ratio = cap;
			if (tier === 'medium') {
				ratio = layerMode ? Math.max(0.5, cap * 0.87) : Math.max(1, cap * 0.87);
			}
			if (tier === 'low') {
				ratio = layerMode ? Math.max(0.5, cap * 0.72) : Math.max(1, cap * 0.72);
			}
			renderer.setPixelRatio(ratio);
		};

		const applyTierQuality = (tier: PerfTier) => {
			if (tier === 'high') {
				streamGeometry.setDrawRange(0, STREAM_PARTICLES);
				bloomPass.strength = 0.7;
				const noiseUniform = filmUniforms.nIntensity;
				if (noiseUniform && typeof noiseUniform.value === 'number') {
					noiseUniform.value = 0.25;
				}
			}
			if (tier === 'medium') {
				streamGeometry.setDrawRange(0, Math.floor(STREAM_PARTICLES * 0.72));
				bloomPass.strength = 0.55;
				const noiseUniform = filmUniforms.nIntensity;
				if (noiseUniform && typeof noiseUniform.value === 'number') {
					noiseUniform.value = 0.2;
				}
			}
			if (tier === 'low') {
				streamGeometry.setDrawRange(0, Math.floor(STREAM_PARTICLES * 0.5));
				bloomPass.strength = 0.42;
				const noiseUniform = filmUniforms.nIntensity;
				if (noiseUniform && typeof noiseUniform.value === 'number') {
					noiseUniform.value = 0.16;
				}
			}
		};

		const handleResize = () => {
			const width = mountRef.clientWidth;
			const height = mountRef.clientHeight;
			renderer.setSize(width, height, false);
			composer.setSize(width, height);
			bloomPass.setSize(width, height);
			camera.aspect = width / Math.max(height, 1);
			camera.updateProjectionMatrix();
		};

		setPixelRatio(perfTier);
		applyTierQuality(perfTier);
		handleResize();
		window.addEventListener('resize', handleResize);

		let lastFrameTime = performance.now();
		const animate = (now: number) => {
			const delta = Math.min(48, now - lastFrameTime);
			lastFrameTime = now;
			if (layerMode && delta < 30) {
				frameId = requestAnimationFrame(animate);
				return;
			}
			frameAverage = frameAverage * 0.95 + delta * 0.05;
			fpsEstimate = 1000 / Math.max(1, frameAverage);

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
					setPixelRatio(nextTier);
					applyTierQuality(nextTier);
					handleResize();
					tierCooldown = 650;
				}
			}

			const audio = readAudioLevels();
			smoothedSub = smoothedSub * 0.9 + audio.sub * 0.1;
			smoothedBass = smoothedBass * 0.89 + audio.bass * 0.11;
			smoothedLowMid = smoothedLowMid * 0.91 + audio.lowMid * 0.09;
			smoothedMid = smoothedMid * 0.9 + audio.mid * 0.1;
			audioEnergy = (smoothedSub + smoothedBass + smoothedLowMid + smoothedMid) * 0.25;

			const time = now * 0.001;
			const bassDrive = smoothedSub * 0.65 + smoothedBass * 1.1;
			const lowMidDrive = smoothedLowMid + warpImpulse * 0.5;
			const midDrive = smoothedMid + strobeImpulse * 0.55;

			cameraSpeed = 8 + bassDrive * 18;
			travel += (cameraSpeed * delta) / 1000;
			camera.position.z = -travel * 0.4;
			camera.position.x = Math.sin(time * 0.5) * lowMidDrive * 2.8;
			camera.position.y = Math.cos(time * 0.42) * lowMidDrive * 1.8;
			camera.fov += (58 + bassDrive * 12 - camera.fov) * 0.08;
			camera.updateProjectionMatrix();
			camera.lookAt(0, 0, camera.position.z - 26);

			tunnelLight.position.z = camera.position.z + 6;
			tunnelLight.intensity = 1.2 + bassDrive * 2.3;

			for (let index = 0; index < rings.length; index++) {
				const ring = rings[index];
				if (!ring) continue;
				const baseIndex = ring.userData.baseIndex as number;
				const loopedZ = ((baseIndex * -TUNNEL_SPACING + travel) % TUNNEL_DEPTH) - TUNNEL_DEPTH;
				const curvature =
					Math.sin(loopedZ * 0.02 + time * (0.8 + lowMidDrive)) * (1.2 + lowMidDrive * 3.4);
				const curvatureY = Math.cos(loopedZ * 0.015 - time * 0.6) * (1.1 + lowMidDrive * 2.8);
				const baseRadius = (ring.userData.baseRadius as number) ?? 5.6;
				const radiusScale = 1 + bassDrive * 0.34 + Math.sin(time * 2 + baseIndex * 0.13) * 0.04;

				ring.position.set(curvature, curvatureY, loopedZ);
				ring.scale.set(radiusScale, radiusScale, 1);
				ring.rotation.z = time * 0.15 + baseIndex * 0.03;
				const material = ring.material as THREE.MeshStandardMaterial;
				material.emissiveIntensity = 0.3 + midDrive * 0.9;
				material.color.setHSL(
					(0.56 + midDrive * 0.2 + baseIndex * 0.0025) % 1,
					0.76,
					0.48 + midDrive * 0.1
				);
				material.roughness = 0.3 + Math.sin(time + baseIndex * 0.5) * 0.07;
				material.metalness = 0.2 + bassDrive * 0.35;

				if (baseRadius > 0 && index % 11 === 0) {
					material.opacity = 0.85;
					material.transparent = true;
				}
			}

			const streamAttribute = streamGeometry.getAttribute('position');
			if (streamAttribute instanceof THREE.BufferAttribute) {
				const activeParticles = streamGeometry.drawRange.count;
				for (let index = 0; index < activeParticles; index++) {
					const i3 = index * 3;
					streamPositions[i3 + 2] +=
						((streamVelocity[index] ?? 1) * (2 + bassDrive * 5) * delta) / 110;
					if ((streamPositions[i3 + 2] ?? 0) > camera.position.z + 8) {
						const radius = Math.random() * (4 + lowMidDrive * 4);
						const angle = Math.random() * Math.PI * 2;
						streamPositions[i3] = Math.cos(angle) * radius;
						streamPositions[i3 + 1] = Math.sin(angle) * radius;
						streamPositions[i3 + 2] = camera.position.z - TUNNEL_DEPTH;
					}
				}
				streamAttribute.needsUpdate = true;
			}

			const filamentAttribute = filamentGeometry.getAttribute('position');
			if (filamentAttribute instanceof THREE.BufferAttribute) {
				for (let index = 0; index < filamentCount; index++) {
					const i6 = index * 6;
					const z =
						(((filamentPositions[i6 + 2] ?? 0) + travel * 0.8) % TUNNEL_DEPTH) - TUNNEL_DEPTH;
					const sway = Math.sin(time + index * 0.2) * lowMidDrive * 0.35;
					filamentPositions[i6 + 2] = z;
					filamentPositions[i6 + 5] = z - 12;
					filamentPositions[i6] += sway * 0.002;
					filamentPositions[i6 + 1] += sway * 0.001;
					filamentPositions[i6 + 3] -= sway * 0.001;
					filamentPositions[i6 + 4] += sway * 0.001;
				}
				filamentAttribute.needsUpdate = true;
			}

			for (let index = pulseWalls.length - 1; index >= 0; index--) {
				const pulse = pulseWalls[index];
				if (!pulse) continue;
				pulse.mesh.position.z -= pulse.velocity * (delta / 16);
				pulse.mesh.scale.x += 0.03 + bassDrive * 0.03;
				pulse.mesh.scale.y += 0.03 + bassDrive * 0.03;
				pulse.mesh.scale.z += 0.03 + bassDrive * 0.03;
				pulse.life -= 0.024 + midDrive * 0.018;
				const material = pulse.mesh.material as THREE.MeshBasicMaterial;
				material.opacity = Math.max(0, pulse.life / pulse.maxLife);
				if (pulse.life <= 0 || pulse.mesh.position.z < camera.position.z - 220) {
					tunnelGroup.remove(pulse.mesh);
					pulse.mesh.geometry.dispose();
					material.dispose();
					pulseWalls.splice(index, 1);
				}
			}

			pulseCount = pulseWalls.length;
			streamMaterial.size = 0.06 + midDrive * 0.09;
			streamMaterial.opacity = 0.42 + midDrive * 0.45;
			filamentMaterial.opacity = 0.28 + midDrive * 0.52;
			const scanlineUniform = filmUniforms.sIntensity;
			if (scanlineUniform && typeof scanlineUniform.value === 'number') {
				scanlineUniform.value = 0.13 + midDrive * 0.28;
			}
			bloomPass.strength += (0.4 + midDrive * 0.9 - bloomPass.strength) * 0.07;

			warpImpulse *= 0.9;
			strobeImpulse *= 0.88;
			composer.render();
			frameId = requestAnimationFrame(animate);
		};

		frameId = requestAnimationFrame(animate);

		return () => {
			if (frameId !== null) {
				cancelAnimationFrame(frameId);
			}
			window.removeEventListener('resize', handleResize);
			for (const pulse of pulseWalls) {
				tunnelGroup.remove(pulse.mesh);
				pulse.mesh.geometry.dispose();
				(pulse.mesh.material as THREE.Material).dispose();
			}

			disposeSceneGraph(scene);
			composer.dispose();
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

<div class="relative min-h-screen overflow-hidden bg-transparent text-white">
	<div bind:this={mountRef} class="absolute inset-0"></div>

	{#if !layerMode}
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
				<div class="text-[11px] tracking-[0.2em] text-indigo-300/90 uppercase">
					Audio Tunnel Cathedral
				</div>
				<div class="mt-1 text-xs text-white/70">Film Pass + Bloom</div>
			</div>
		</div>

		<div class="pointer-events-none absolute bottom-6 left-6 z-10 flex gap-3">
			<div class="rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
				<div class="text-[10px] text-white/55 uppercase">FPS</div>
				<div class="font-mono text-lg font-bold text-sky-300">{fpsEstimate.toFixed(0)}</div>
			</div>
			<div class="rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
				<div class="text-[10px] text-white/55 uppercase">Speed</div>
				<div class="font-mono text-lg font-bold text-cyan-300">{cameraSpeed.toFixed(1)}</div>
			</div>
			<div class="rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
				<div class="text-[10px] text-white/55 uppercase">Pulse Walls</div>
				<div class="font-mono text-lg font-bold text-indigo-300">{pulseCount}</div>
			</div>
		</div>

		<div
			class="pointer-events-none absolute right-6 bottom-6 z-10 rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm"
		>
			<div class="text-[10px] text-white/50 uppercase">Tier</div>
			<div class="mt-1 font-mono text-sm text-white/80">{perfTier}</div>
			<div class="mt-1 font-mono text-xs text-indigo-200">
				Energy {(audioEnergy * 100).toFixed(0)}%
			</div>
		</div>
	{/if}
</div>
