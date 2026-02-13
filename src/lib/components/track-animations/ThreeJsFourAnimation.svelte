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

	interface ShellPulse {
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
	let shellCount = $state(0);
	let pixelRatio = $state(1);

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

		scene.traverse((object: THREE.Object3D) => {
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
		let pointerX = 0;
		let pointerY = 0;

		let smoothedSub = 0;
		let smoothedBass = 0;
		let smoothedLowMid = 0;
		let smoothedMid = 0;
		let twistImpulse = 0;
		let sparkleImpulse = 0;

		const scene = new THREE.Scene();
		scene.background = null;
		scene.fog = new THREE.Fog('#06020f', 15, 120);

		const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 220);
		camera.position.set(0, 0, 18);
		const renderer = new THREE.WebGLRenderer({
			antialias: !layerMode,
			alpha: true,
			powerPreference: 'high-performance'
		});
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.12;
		renderer.setClearColor('#000000', 0);
		// eslint-disable-next-line svelte/no-dom-manipulating
		mountRef.appendChild(renderer.domElement);

		const hemiLight = new THREE.HemisphereLight('#97bcff', '#130f1d', 0.9);
		hemiLight.position.set(0, 16, 0);
		scene.add(hemiLight);

		const keyLight = new THREE.PointLight('#72a9ff', 1.6, 90, 2.2);
		keyLight.position.set(8, 6, 12);
		scene.add(keyLight);

		const rimLight = new THREE.PointLight('#f58bff', 1.4, 110, 2.0);
		rimLight.position.set(-8, -6, -10);
		scene.add(rimLight);

		const coreGeometry = new THREE.IcosahedronGeometry(4, 6);
		const coreMaterial = new THREE.MeshPhysicalMaterial({
			color: '#7fb7ff',
			emissive: '#342a8c',
			emissiveIntensity: 0.52,
			metalness: 0.24,
			roughness: 0.22,
			transmission: 0.55,
			thickness: 0.7,
			transparent: true,
			opacity: 0.95
		});
		const core = new THREE.Mesh(coreGeometry, coreMaterial);
		scene.add(core);

		const basePositions = (coreGeometry.attributes.position.array as Float32Array).slice();
		const phaseOffsets = new Float32Array(basePositions.length / 3);
		for (let index = 0; index < phaseOffsets.length; index++) {
			phaseOffsets[index] = Math.random() * Math.PI * 2;
		}

		const wireframe = new THREE.LineSegments(
			new THREE.WireframeGeometry(coreGeometry),
			new THREE.LineBasicMaterial({ color: '#b8f3ff', transparent: true, opacity: 0.55 })
		);
		scene.add(wireframe);

		const petalCount = 36;
		const petals: THREE.Mesh[] = [];
		for (let index = 0; index < petalCount; index++) {
			const petal = new THREE.Mesh(
				new THREE.TorusGeometry(5 + (index % 6) * 0.38, 0.045 + (index % 3) * 0.02, 8, 44),
				new THREE.MeshBasicMaterial({
					color: new THREE.Color().setHSL(0.55 + index * 0.01, 0.76, 0.58),
					transparent: true,
					opacity: 0.26,
					blending: THREE.AdditiveBlending,
					depthWrite: false
				})
			);
			petal.rotation.x = (index / petalCount) * Math.PI;
			petal.rotation.y = (index / petalCount) * Math.PI * 2;
			petal.rotation.z = (index / petalCount) * Math.PI * 0.7;
			scene.add(petal);
			petals.push(petal);
		}

		const maxDust = 2600;
		const dustPositions = new Float32Array(maxDust * 3);
		const dustVelocities = new Float32Array(maxDust);
		for (let index = 0; index < maxDust; index++) {
			const radius = 5 + Math.random() * 22;
			const angle = Math.random() * Math.PI * 2;
			const vertical = -10 + Math.random() * 20;
			dustPositions[index * 3] = Math.cos(angle) * radius;
			dustPositions[index * 3 + 1] = vertical;
			dustPositions[index * 3 + 2] = Math.sin(angle) * radius;
			dustVelocities[index] = 0.25 + Math.random() * 1.35;
		}

		const dustGeometry = new THREE.BufferGeometry();
		dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
		dustGeometry.setDrawRange(0, maxDust);
		const dustMaterial = new THREE.PointsMaterial({
			color: '#d7fbff',
			size: 0.075,
			sizeAttenuation: true,
			transparent: true,
			opacity: 0.7,
			blending: THREE.AdditiveBlending,
			depthWrite: false
		});
		const dust = new THREE.Points(dustGeometry, dustMaterial);
		scene.add(dust);

		const shellGeometry = new THREE.IcosahedronGeometry(4.2, 2);
		const shellPulses: ShellPulse[] = [];
		const maxPulseByTier: Record<PerfTier, number> = {
			high: 14,
			medium: 10,
			low: 7
		};

		const spawnShell = (strength: number) => {
			const maxPulses = maxPulseByTier[perfTier];
			if (shellPulses.length >= maxPulses) {
				const removed = shellPulses.shift();
				if (removed) {
					scene.remove(removed.mesh);
					removed.mesh.geometry.dispose();
					(removed.mesh.material as THREE.Material).dispose();
				}
			}

			const material = new THREE.MeshBasicMaterial({
				color: '#9de3ff',
				transparent: true,
				opacity: 0.58,
				wireframe: true,
				blending: THREE.AdditiveBlending,
				depthWrite: false
			});
			const mesh = new THREE.Mesh(shellGeometry.clone(), material);
			const scale = 1 + strength * 0.8;
			mesh.scale.set(scale, scale, scale);
			scene.add(mesh);

			shellPulses.push({
				mesh,
				life: 1,
				maxLife: 1,
				velocity: 0.09 + strength * 0.22
			});
		};

		const unsubBass = frequencyStore.onThreshold('bass', 'enter', (band) => {
			const strength = clamp01(Math.max(0, band.current - band.threshold) / 340);
			spawnShell(strength);
			twistImpulse = Math.min(2, twistImpulse + 0.5);
		});
		unsubscribers.push(unsubBass);

		const unsubLowMid = frequencyStore.onThreshold('low-mid', 'enter', () => {
			twistImpulse = Math.min(2.2, twistImpulse + 0.45);
		});
		unsubscribers.push(unsubLowMid);

		const unsubMid = frequencyStore.onThreshold('mid', 'enter', () => {
			sparkleImpulse = Math.min(2, sparkleImpulse + 0.4);
		});
		unsubscribers.push(unsubMid);

		const setPixelRatio = (tier: PerfTier) => {
			const cap = layerMode
				? Math.min(window.devicePixelRatio || 1, 0.9)
				: Math.min(window.devicePixelRatio || 1, 1.75);
			let ratio = cap;
			if (tier === 'medium') {
				ratio = layerMode ? Math.max(0.5, cap * 0.88) : Math.max(1, cap * 0.88);
			}
			if (tier === 'low') {
				ratio = layerMode ? Math.max(0.5, cap * 0.74) : Math.max(1, cap * 0.74);
			}
			renderer.setPixelRatio(ratio);
			pixelRatio = ratio;
		};

		const applyTier = (tier: PerfTier) => {
			if (tier === 'high') {
				dustGeometry.setDrawRange(0, maxDust);
			}
			if (tier === 'medium') {
				dustGeometry.setDrawRange(0, Math.floor(maxDust * 0.72));
			}
			if (tier === 'low') {
				dustGeometry.setDrawRange(0, Math.floor(maxDust * 0.5));
			}
		};

		const handleResize = () => {
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

		setPixelRatio(perfTier);
		applyTier(perfTier);
		handleResize();
		window.addEventListener('resize', handleResize);
		if (!layerMode) {
			mountRef.addEventListener('pointermove', handlePointerMove);
		}

		let lastFrameTime = performance.now();
		const animate = (now: number) => {
			const delta = Math.min(48, now - lastFrameTime);
			lastFrameTime = now;
			if (layerMode && delta < 30) {
				frameId = requestAnimationFrame(animate);
				return;
			}
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
					setPixelRatio(nextTier);
					applyTier(nextTier);
					tierCooldown = 700;
				}
			}

			const audio = readAudioLevels();
			smoothedSub = smoothedSub * 0.9 + audio.sub * 0.1;
			smoothedBass = smoothedBass * 0.89 + audio.bass * 0.11;
			smoothedLowMid = smoothedLowMid * 0.91 + audio.lowMid * 0.09;
			smoothedMid = smoothedMid * 0.9 + audio.mid * 0.1;
			audioEnergy = (smoothedSub + smoothedBass + smoothedLowMid + smoothedMid) * 0.25;

			const time = now * 0.001;
			const bassDrive = smoothedSub * 0.7 + smoothedBass * 1.1;
			const lowMidDrive = smoothedLowMid + twistImpulse * 0.42;
			const midDrive = smoothedMid + sparkleImpulse * 0.5;

			camera.position.x += (pointerX * 3.6 - camera.position.x) * 0.05;
			camera.position.y += (pointerY * -3 + camera.position.y * -0.15 - camera.position.y) * 0.04;
			camera.position.z += (17 - camera.position.z) * 0.04;
			camera.lookAt(0, 0, 0);

			const positionAttribute = coreGeometry.getAttribute('position');
			if (positionAttribute instanceof THREE.BufferAttribute) {
				for (let index = 0; index < positionAttribute.count; index++) {
					const i3 = index * 3;
					const x = basePositions[i3] ?? 0;
					const y = basePositions[i3 + 1] ?? 0;
					const z = basePositions[i3 + 2] ?? 0;
					const phase = phaseOffsets[index] ?? 0;
					const radius = Math.sqrt(x * x + y * y + z * z) || 1;
					const nx = x / radius;
					const ny = y / radius;
					const nz = z / radius;

					const wave = Math.sin(time * (1.8 + lowMidDrive) + phase + nx * 2.2 + ny * 1.7);
					const flutter = Math.cos(time * (1.2 + midDrive * 2.5) + nz * 3 + phase * 0.5);
					const offset = wave * (0.5 + bassDrive * 1.2) + flutter * (0.22 + midDrive * 0.52);

					positionAttribute.setXYZ(index, x + nx * offset, y + ny * offset, z + nz * offset);
				}
				positionAttribute.needsUpdate = true;
				coreGeometry.computeVertexNormals();
			}

			core.rotation.x += 0.003 + lowMidDrive * 0.009;
			core.rotation.y += 0.005 + lowMidDrive * 0.012;
			core.rotation.z += 0.002 + midDrive * 0.006;

			coreMaterial.emissiveIntensity = 0.35 + midDrive * 0.75;
			coreMaterial.thickness = 0.5 + bassDrive * 0.8;
			coreMaterial.color.setHSL((0.56 + midDrive * 0.16) % 1, 0.72, 0.56 + bassDrive * 0.1);

			wireframe.rotation.copy(core.rotation);
			(wireframe.material as THREE.LineBasicMaterial).opacity = 0.38 + midDrive * 0.55;

			for (let index = 0; index < petals.length; index++) {
				const petal = petals[index];
				if (!petal) continue;
				const wave = Math.sin(time * 0.8 + index * 0.31);
				petal.rotation.x += 0.001 + lowMidDrive * 0.004;
				petal.rotation.y += 0.002 + lowMidDrive * 0.006;
				petal.rotation.z += 0.001 + midDrive * 0.005;
				const scale = 1 + bassDrive * 0.25 + wave * 0.06;
				petal.scale.set(scale, scale, scale);
				const material = petal.material as THREE.MeshBasicMaterial;
				material.opacity = 0.14 + midDrive * 0.32;
				material.color.setHSL(
					(0.52 + index * 0.012 + midDrive * 0.2) % 1,
					0.72,
					0.5 + midDrive * 0.18
				);
			}

			const dustAttribute = dustGeometry.getAttribute('position');
			if (dustAttribute instanceof THREE.BufferAttribute) {
				const activeDust = dustGeometry.drawRange.count;
				for (let index = 0; index < activeDust; index++) {
					const i3 = index * 3;
					const x = dustPositions[i3] ?? 0;
					const z = dustPositions[i3 + 2] ?? 0;
					const angle =
						Math.atan2(z, x) + (dustVelocities[index] ?? 0.6) * (0.005 + lowMidDrive * 0.007);
					const radius = Math.max(
						4,
						Math.sqrt(x * x + z * z) + Math.sin(time + index * 0.1) * 0.03
					);
					dustPositions[i3] = Math.cos(angle) * radius;
					dustPositions[i3 + 2] = Math.sin(angle) * radius;
					dustPositions[i3 + 1] += Math.sin(time * 0.6 + index * 0.03) * 0.015 + midDrive * 0.02;
					if ((dustPositions[i3 + 1] ?? 0) > 13) {
						dustPositions[i3 + 1] = -13;
					}
				}
				dustAttribute.needsUpdate = true;
			}

			dustMaterial.size = 0.075 + midDrive * 0.08;
			dustMaterial.opacity = 0.35 + midDrive * 0.5;

			for (let index = shellPulses.length - 1; index >= 0; index--) {
				const pulse = shellPulses[index];
				if (!pulse) continue;
				pulse.mesh.scale.x += pulse.velocity;
				pulse.mesh.scale.y += pulse.velocity;
				pulse.mesh.scale.z += pulse.velocity;
				pulse.life -= 0.022 + midDrive * 0.016;
				const material = pulse.mesh.material as THREE.MeshBasicMaterial;
				material.opacity = Math.max(0, pulse.life / pulse.maxLife);
				if (pulse.life <= 0) {
					scene.remove(pulse.mesh);
					pulse.mesh.geometry.dispose();
					material.dispose();
					shellPulses.splice(index, 1);
				}
			}

			shellCount = shellPulses.length;
			twistImpulse *= 0.9;
			sparkleImpulse *= 0.88;

			renderer.render(scene, camera);
			frameId = requestAnimationFrame(animate);
		};

		frameId = requestAnimationFrame(animate);

		return () => {
			if (frameId !== null) {
				cancelAnimationFrame(frameId);
			}
			window.removeEventListener('resize', handleResize);
			if (!layerMode) {
				mountRef.removeEventListener('pointermove', handlePointerMove);
			}

			for (const pulse of shellPulses) {
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
				<div class="text-[11px] tracking-[0.2em] text-cyan-300/90 uppercase">
					Resonant Core Bloom
				</div>
				<div class="mt-1 text-xs text-white/70">Membrane Deformation</div>
			</div>
		</div>

		<div class="pointer-events-none absolute bottom-6 left-6 z-10 flex gap-3">
			<div class="rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
				<div class="text-[10px] text-white/55 uppercase">FPS</div>
				<div class="font-mono text-lg font-bold text-cyan-300">{fpsEstimate.toFixed(0)}</div>
			</div>
			<div class="rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
				<div class="text-[10px] text-white/55 uppercase">Energy</div>
				<div class="font-mono text-lg font-bold text-blue-300">
					{(audioEnergy * 100).toFixed(0)}%
				</div>
			</div>
			<div class="rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
				<div class="text-[10px] text-white/55 uppercase">Shell Pulses</div>
				<div class="font-mono text-lg font-bold text-violet-300">{shellCount}</div>
			</div>
		</div>

		<div
			class="pointer-events-none absolute right-6 bottom-6 z-10 rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm"
		>
			<div class="text-[10px] text-white/50 uppercase">Render Tier</div>
			<div class="mt-1 font-mono text-sm text-white/80">{perfTier}</div>
			<div class="font-mono text-xs text-cyan-100/80">DPR {pixelRatio.toFixed(2)}</div>
		</div>
	{/if}
</div>
