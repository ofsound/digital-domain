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

	interface Spark {
		x: number;
		y: number;
		z: number;
		vx: number;
		vy: number;
		vz: number;
		life: number;
		maxLife: number;
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
	let pendulumCount = $state(0);
	let sparkCount = $state(0);

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
		let shockImpulse = 0;
		let waveImpulse = 0;

		const scene = new THREE.Scene();
		scene.background = null;
		scene.fog = new THREE.Fog('#080609', 20, 170);

		const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 280);
		camera.position.set(0, 7, 26);
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

		const ambient = new THREE.AmbientLight('#9f9fc6', 0.55);
		scene.add(ambient);

		const keyLight = new THREE.DirectionalLight('#f5f0ff', 1.25);
		keyLight.position.set(10, 16, 8);
		scene.add(keyLight);

		const accentLight = new THREE.PointLight('#9b63ff', 1.5, 120, 2.0);
		accentLight.position.set(-8, 7, -10);
		scene.add(accentLight);

		const floor = new THREE.Mesh(
			new THREE.CircleGeometry(64, 72),
			new THREE.MeshStandardMaterial({
				color: '#15111f',
				emissive: '#24194a',
				emissiveIntensity: 0.32,
				metalness: 0.1,
				roughness: 0.86
			})
		);
		floor.rotation.x = -Math.PI / 2;
		floor.position.y = -7.2;
		scene.add(floor);

		const pendulumMax = 260;
		const bobs = new THREE.InstancedMesh(
			new THREE.SphereGeometry(0.26, 16, 16),
			new THREE.MeshStandardMaterial({
				color: '#c8ebff',
				emissive: '#2f68bb',
				emissiveIntensity: 0.45,
				metalness: 0.34,
				roughness: 0.24
			}),
			pendulumMax
		);
		bobs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		scene.add(bobs);

		const stringPositions = new Float32Array(pendulumMax * 2 * 3);
		const stringGeometry = new THREE.BufferGeometry();
		stringGeometry.setAttribute('position', new THREE.BufferAttribute(stringPositions, 3));
		stringGeometry.setDrawRange(0, pendulumMax * 2);
		const strings = new THREE.LineSegments(
			stringGeometry,
			new THREE.LineBasicMaterial({ color: '#8ba0de', transparent: true, opacity: 0.55 })
		);
		scene.add(strings);

		const rootX = new Float32Array(pendulumMax);
		const rootY = new Float32Array(pendulumMax);
		const rootZ = new Float32Array(pendulumMax);
		const length = new Float32Array(pendulumMax);
		const phase = new Float32Array(pendulumMax);
		const frequency = new Float32Array(pendulumMax);
		const bobX = new Float32Array(pendulumMax);
		const bobY = new Float32Array(pendulumMax);
		const bobZ = new Float32Array(pendulumMax);

		for (let index = 0; index < pendulumMax; index++) {
			const col = index % 20;
			const row = Math.floor(index / 20);
			rootX[index] = (col - 9.5) * 1.2;
			rootY[index] = 9.5 - row * 0.28;
			rootZ[index] = (row - 6) * 1.35;
			length[index] = 5 + (index % 7) * 0.38 + Math.random() * 0.6;
			phase[index] = Math.random() * Math.PI * 2;
			frequency[index] = 0.8 + Math.random() * 1.4;
		}

		const sparkMax = 900;
		const sparks: Spark[] = [];
		const sparkPositions = new Float32Array(sparkMax * 3);
		const sparkGeometry = new THREE.BufferGeometry();
		sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
		sparkGeometry.setDrawRange(0, 0);
		const sparkMaterial = new THREE.PointsMaterial({
			color: '#d8f5ff',
			size: 0.1,
			sizeAttenuation: true,
			transparent: true,
			opacity: 0.82,
			blending: THREE.AdditiveBlending,
			depthWrite: false
		});
		const sparkPoints = new THREE.Points(sparkGeometry, sparkMaterial);
		scene.add(sparkPoints);

		const maxSparksByTier: Record<PerfTier, number> = {
			high: sparkMax,
			medium: Math.floor(sparkMax * 0.72),
			low: Math.floor(sparkMax * 0.5)
		};

		const spawnSparkBurst = (intensity: number) => {
			const activePendulums = pendulumCount;
			if (activePendulums <= 0) return;
			const target = Math.floor(Math.random() * activePendulums);
			const originX = bobX[target] ?? 0;
			const originY = bobY[target] ?? 0;
			const originZ = bobZ[target] ?? 0;
			const burstCount = Math.floor(12 + intensity * 20);
			for (let i = 0; i < burstCount; i++) {
				if (sparks.length >= maxSparksByTier[perfTier]) {
					sparks.shift();
				}
				const angle = Math.random() * Math.PI * 2;
				const speed = 0.05 + Math.random() * (0.15 + intensity * 0.45);
				sparks.push({
					x: originX,
					y: originY,
					z: originZ,
					vx: Math.cos(angle) * speed,
					vy: (Math.random() - 0.3) * speed,
					vz: Math.sin(angle) * speed,
					life: 1,
					maxLife: 1
				});
			}
		};

		const unsubBass = frequencyStore.onThreshold('bass', 'enter', (band) => {
			const strength = clamp01(Math.max(0, band.current - band.threshold) / 340);
			shockImpulse = Math.min(2.4, shockImpulse + 0.58);
			spawnSparkBurst(strength + 0.2);
		});
		unsubscribers.push(unsubBass);

		const unsubLowMid = frequencyStore.onThreshold('low-mid', 'enter', () => {
			waveImpulse = Math.min(2.1, waveImpulse + 0.45);
		});
		unsubscribers.push(unsubLowMid);

		const unsubMid = frequencyStore.onThreshold('mid', 'enter', (band) => {
			const strength = clamp01(Math.max(0, band.current - band.threshold) / 280);
			spawnSparkBurst(strength + 0.4);
		});
		unsubscribers.push(unsubMid);

		const setPixelRatio = (tier: PerfTier) => {
			const cap = layerMode
				? Math.min(window.devicePixelRatio || 1, 0.9)
				: Math.min(window.devicePixelRatio || 1, 1.75);
			let ratio = cap;
			if (tier === 'medium') {
				ratio = layerMode ? Math.max(0.5, cap * 0.86) : Math.max(1, cap * 0.86);
			}
			if (tier === 'low') {
				ratio = layerMode ? Math.max(0.5, cap * 0.72) : Math.max(1, cap * 0.72);
			}
			renderer.setPixelRatio(ratio);
		};

		const applyTier = (tier: PerfTier) => {
			if (tier === 'high') {
				bobs.count = pendulumMax;
				stringGeometry.setDrawRange(0, pendulumMax * 2);
			}
			if (tier === 'medium') {
				bobs.count = Math.floor(pendulumMax * 0.76);
				stringGeometry.setDrawRange(0, bobs.count * 2);
			}
			if (tier === 'low') {
				bobs.count = Math.floor(pendulumMax * 0.56);
				stringGeometry.setDrawRange(0, bobs.count * 2);
			}
			pendulumCount = bobs.count;
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
			const bassDrive = smoothedSub * 0.6 + smoothedBass * 1.1 + shockImpulse * 0.4;
			const waveDrive = smoothedLowMid + waveImpulse * 0.5;
			const sparkleDrive = smoothedMid;

			camera.position.x += (pointerX * 4.5 - camera.position.x) * 0.05;
			camera.position.y += (6 + pointerY * -3.2 - camera.position.y) * 0.04;
			camera.position.z += (26 - camera.position.z) * 0.04;
			camera.lookAt(0, -1.5, -4);

			const stringAttr = stringGeometry.getAttribute('position');
			if (stringAttr instanceof THREE.BufferAttribute) {
				for (let index = 0; index < bobs.count; index++) {
					const rootPosX = rootX[index] ?? 0;
					const rootPosY = rootY[index] ?? 0;
					const rootPosZ = rootZ[index] ?? 0;
					const l = length[index] ?? 5;
					const phaseValue = phase[index] ?? 0;
					const freq = frequency[index] ?? 1;
					const swayX =
						Math.sin(time * (freq + waveDrive * 0.6) + phaseValue) * (0.2 + bassDrive * 0.8) +
						Math.cos(time * 0.7 + index * 0.09) * waveDrive * 0.14;
					const swayZ =
						Math.cos(time * (freq * 0.8 + waveDrive * 0.4) + phaseValue * 0.6) *
							(0.15 + bassDrive * 0.7) +
						Math.sin(time * 0.9 + index * 0.08) * waveDrive * 0.12;

					const bobPosX = rootPosX + swayX * l;
					const bobPosY =
						rootPosY - l * Math.cos(Math.min(1.2, Math.abs(swayX) + Math.abs(swayZ)) * 0.6);
					const bobPosZ = rootPosZ + swayZ * l;

					bobX[index] = bobPosX;
					bobY[index] = bobPosY;
					bobZ[index] = bobPosZ;

					tempPosition.set(bobPosX, bobPosY, bobPosZ);
					tempQuaternion.setFromEuler(
						new THREE.Euler(
							swayZ * 0.7 + sparkleDrive * 0.15,
							time * 0.35 + phaseValue,
							swayX * 0.7
						)
					);
					const scale = 0.8 + bassDrive * 0.25;
					tempScale.setScalar(scale);
					tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
					bobs.setMatrixAt(index, tempMatrix);

					tempColor.setHSL(
						(0.56 + sparkleDrive * 0.18 + index * 0.0012) % 1,
						0.78,
						0.56 + sparkleDrive * 0.16
					);
					bobs.setColorAt(index, tempColor);

					const i6 = index * 6;
					stringPositions[i6] = rootPosX;
					stringPositions[i6 + 1] = rootPosY;
					stringPositions[i6 + 2] = rootPosZ;
					stringPositions[i6 + 3] = bobPosX;
					stringPositions[i6 + 4] = bobPosY;
					stringPositions[i6 + 5] = bobPosZ;
				}
				stringAttr.needsUpdate = true;
			}

			bobs.instanceMatrix.needsUpdate = true;
			if (bobs.instanceColor) {
				bobs.instanceColor.needsUpdate = true;
			}
			const bobMaterial = bobs.material as THREE.MeshStandardMaterial;
			bobMaterial.emissiveIntensity = 0.25 + sparkleDrive * 0.8;
			const stringMaterial = strings.material as THREE.LineBasicMaterial;
			stringMaterial.opacity = 0.32 + sparkleDrive * 0.45;
			const floorMaterial = floor.material as THREE.MeshStandardMaterial;
			floorMaterial.emissiveIntensity = 0.2 + bassDrive * 0.4;

			for (let index = sparks.length - 1; index >= 0; index--) {
				const spark = sparks[index];
				if (!spark) continue;
				spark.x += spark.vx;
				spark.y += spark.vy;
				spark.z += spark.vz;
				spark.vx *= 0.98;
				spark.vy = spark.vy * 0.98 - 0.0015;
				spark.vz *= 0.98;
				spark.life -= 0.022 + sparkleDrive * 0.014;
				if (spark.life <= 0) {
					sparks.splice(index, 1);
				}
			}

			const cappedSparkCount = Math.min(sparks.length, maxSparksByTier[perfTier]);
			for (let index = 0; index < cappedSparkCount; index++) {
				const spark = sparks[index];
				if (!spark) continue;
				sparkPositions[index * 3] = spark.x;
				sparkPositions[index * 3 + 1] = spark.y;
				sparkPositions[index * 3 + 2] = spark.z;
			}
			sparkGeometry.setDrawRange(0, cappedSparkCount);
			const sparkAttr = sparkGeometry.getAttribute('position');
			if (sparkAttr instanceof THREE.BufferAttribute) {
				sparkAttr.needsUpdate = true;
			}
			sparkMaterial.size = 0.08 + sparkleDrive * 0.15;
			sparkMaterial.opacity = 0.38 + sparkleDrive * 0.5;
			sparkCount = cappedSparkCount;

			shockImpulse *= 0.9;
			waveImpulse *= 0.9;

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
				<div class="text-[11px] tracking-[0.2em] text-violet-300/90 uppercase">Pendulum Atrium</div>
				<div class="mt-1 text-xs text-white/70">Kinetic Oscillation Field</div>
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
				<div class="text-[10px] text-white/55 uppercase">Pendulums</div>
				<div class="font-mono text-lg font-bold text-violet-300">{pendulumCount}</div>
			</div>
		</div>

		<div
			class="pointer-events-none absolute right-6 bottom-6 z-10 rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm"
		>
			<div class="text-[10px] text-white/50 uppercase">Tier</div>
			<div class="mt-1 font-mono text-sm text-white/80">{perfTier}</div>
			<div class="font-mono text-xs text-violet-100/80">Sparks {sparkCount}</div>
		</div>
	{/if}
</div>
