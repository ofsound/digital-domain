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

	interface Ripple {
		mesh: THREE.Mesh;
		life: number;
		maxLife: number;
		velocity: number;
	}

	let mountRef: HTMLDivElement;
	let unsubscribers: (() => void)[] = [];

	let perfTier = $state<PerfTier>('high');
	let fpsEstimate = $state(0);
	let audioEnergy = $state(0);
	let rippleCount = $state(0);
	let buoyCount = $state(0);

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
		let chopImpulse = 0;
		let sparkleImpulse = 0;

		const scene = new THREE.Scene();
		scene.background = new THREE.Color('#020711');
		scene.fog = new THREE.Fog('#020711', 20, 180);

		const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 320);
		camera.position.set(0, 8, 24);

		const renderer = new THREE.WebGLRenderer({
			antialias: true,
			powerPreference: 'high-performance'
		});
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.05;
		renderer.setClearColor('#020711');
		// eslint-disable-next-line svelte/no-dom-manipulating
		mountRef.appendChild(renderer.domElement);

		const hemi = new THREE.HemisphereLight('#86c7ff', '#03192f', 0.95);
		hemi.position.set(0, 20, 0);
		scene.add(hemi);

		const keyLight = new THREE.DirectionalLight('#c2edff', 1.3);
		keyLight.position.set(12, 14, 10);
		scene.add(keyLight);

		const fillLight = new THREE.PointLight('#2e7dff', 1.7, 140, 2.0);
		fillLight.position.set(-14, 6, -12);
		scene.add(fillLight);

		const planeSize = 120;
		const planeSegments = 120;
		const waterGeometry = new THREE.PlaneGeometry(
			planeSize,
			planeSize,
			planeSegments,
			planeSegments
		);
		const waterMaterial = new THREE.MeshStandardMaterial({
			color: '#0f4d7d',
			emissive: '#0f2f5d',
			emissiveIntensity: 0.52,
			metalness: 0.18,
			roughness: 0.36,
			transparent: true,
			opacity: 0.96
		});
		const water = new THREE.Mesh(waterGeometry, waterMaterial);
		water.rotation.x = -Math.PI / 2;
		water.position.y = -2;
		scene.add(water);

		const baseWater = (waterGeometry.attributes.position.array as Float32Array).slice();
		const waterPhase = new Float32Array(baseWater.length / 3);
		for (let index = 0; index < waterPhase.length; index++) {
			waterPhase[index] = Math.random() * Math.PI * 2;
		}

		const buoyMax = 280;
		const buoyGeometry = new THREE.OctahedronGeometry(0.42, 0);
		const buoyMaterial = new THREE.MeshStandardMaterial({
			color: '#8cf4ff',
			emissive: '#2d8ec6',
			emissiveIntensity: 0.5,
			metalness: 0.22,
			roughness: 0.28
		});
		const buoys = new THREE.InstancedMesh(buoyGeometry, buoyMaterial, buoyMax);
		buoys.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		scene.add(buoys);

		const buoyX = new Float32Array(buoyMax);
		const buoyZ = new Float32Array(buoyMax);
		const buoyPhase = new Float32Array(buoyMax);
		const buoySpin = new Float32Array(buoyMax);
		for (let index = 0; index < buoyMax; index++) {
			buoyX[index] = -40 + Math.random() * 80;
			buoyZ[index] = -40 + Math.random() * 80;
			buoyPhase[index] = Math.random() * Math.PI * 2;
			buoySpin[index] = 0.6 + Math.random() * 2.4;
			tempPosition.set(buoyX[index] ?? 0, 0, buoyZ[index] ?? 0);
			tempQuaternion.setFromEuler(new THREE.Euler(0, 0, 0));
			tempScale.setScalar(1);
			tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
			buoys.setMatrixAt(index, tempMatrix);
			buoys.setColorAt(index, new THREE.Color().setHSL(0.56, 0.8, 0.6));
		}
		if (buoys.instanceColor) {
			buoys.instanceColor.needsUpdate = true;
		}

		const foamMax = 3400;
		const foamPositions = new Float32Array(foamMax * 3);
		const foamSpeed = new Float32Array(foamMax);
		for (let index = 0; index < foamMax; index++) {
			foamPositions[index * 3] = -55 + Math.random() * 110;
			foamPositions[index * 3 + 1] = -1.4 + Math.random() * 0.45;
			foamPositions[index * 3 + 2] = -55 + Math.random() * 110;
			foamSpeed[index] = 0.25 + Math.random() * 1.2;
		}
		const foamGeometry = new THREE.BufferGeometry();
		foamGeometry.setAttribute('position', new THREE.BufferAttribute(foamPositions, 3));
		foamGeometry.setDrawRange(0, foamMax);
		const foamMaterial = new THREE.PointsMaterial({
			color: '#ccf8ff',
			size: 0.075,
			sizeAttenuation: true,
			transparent: true,
			opacity: 0.72,
			blending: THREE.AdditiveBlending,
			depthWrite: false
		});
		const foam = new THREE.Points(foamGeometry, foamMaterial);
		scene.add(foam);

		const rippleGeometry = new THREE.RingGeometry(1.8, 2.1, 42);
		const ripples: Ripple[] = [];
		const maxRippleByTier: Record<PerfTier, number> = {
			high: 18,
			medium: 12,
			low: 8
		};

		const spawnRipple = (strength: number) => {
			const maxRipples = maxRippleByTier[perfTier];
			if (ripples.length >= maxRipples) {
				const removed = ripples.shift();
				if (removed) {
					scene.remove(removed.mesh);
					removed.mesh.geometry.dispose();
					(removed.mesh.material as THREE.Material).dispose();
				}
			}

			const material = new THREE.MeshBasicMaterial({
				color: '#9de9ff',
				transparent: true,
				opacity: 0.68,
				blending: THREE.AdditiveBlending,
				depthWrite: false,
				side: THREE.DoubleSide
			});
			const mesh = new THREE.Mesh(rippleGeometry.clone(), material);
			mesh.rotation.x = -Math.PI / 2;
			mesh.position.set((Math.random() - 0.5) * 40, -1.65, (Math.random() - 0.5) * 40);
			scene.add(mesh);
			ripples.push({ mesh, life: 1, maxLife: 1, velocity: 0.16 + strength * 0.45 });
		};

		const unsubBass = frequencyStore.onThreshold('bass', 'enter', (band) => {
			const strength = clamp01(Math.max(0, band.current - band.threshold) / 360);
			for (let index = 0; index < 3; index++) {
				spawnRipple(strength + Math.random() * 0.4);
			}
			chopImpulse = Math.min(2.3, chopImpulse + 0.55);
		});
		unsubscribers.push(unsubBass);

		const unsubLowMid = frequencyStore.onThreshold('low-mid', 'enter', () => {
			chopImpulse = Math.min(2.5, chopImpulse + 0.4);
		});
		unsubscribers.push(unsubLowMid);

		const unsubMid = frequencyStore.onThreshold('mid', 'enter', () => {
			sparkleImpulse = Math.min(2.2, sparkleImpulse + 0.45);
		});
		unsubscribers.push(unsubMid);

		const setPixelRatio = (tier: PerfTier) => {
			const cap = Math.min(window.devicePixelRatio || 1, 1.75);
			let ratio = cap;
			if (tier === 'medium') {
				ratio = Math.max(1, cap * 0.86);
			}
			if (tier === 'low') {
				ratio = Math.max(1, cap * 0.72);
			}
			renderer.setPixelRatio(ratio);
		};

		const applyTier = (tier: PerfTier) => {
			if (tier === 'high') {
				buoys.count = buoyMax;
				foamGeometry.setDrawRange(0, foamMax);
			}
			if (tier === 'medium') {
				buoys.count = Math.floor(buoyMax * 0.74);
				foamGeometry.setDrawRange(0, Math.floor(foamMax * 0.68));
			}
			if (tier === 'low') {
				buoys.count = Math.floor(buoyMax * 0.54);
				foamGeometry.setDrawRange(0, Math.floor(foamMax * 0.5));
			}
			buoyCount = buoys.count;
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
		mountRef.addEventListener('pointermove', handlePointerMove);

		let lastFrameTime = performance.now();
		const animate = (now: number) => {
			const delta = Math.min(48, now - lastFrameTime);
			lastFrameTime = now;
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
			const bassDrive = smoothedSub * 0.65 + smoothedBass * 1.08;
			const chopDrive = smoothedLowMid + chopImpulse * 0.5;
			const sparkleDrive = smoothedMid + sparkleImpulse * 0.52;

			camera.position.x += (pointerX * 5 - camera.position.x) * 0.04;
			camera.position.y += (7 + pointerY * -2.8 - camera.position.y) * 0.04;
			camera.position.z += (24 - camera.position.z) * 0.04;
			camera.lookAt(0, -2.4, -6);

			const positionAttribute = waterGeometry.getAttribute('position');
			if (positionAttribute instanceof THREE.BufferAttribute) {
				const step = perfTier === 'low' ? 2 : 1;
				for (let index = 0; index < positionAttribute.count; index += step) {
					const i3 = index * 3;
					const x = baseWater[i3] ?? 0;
					const z = baseWater[i3 + 2] ?? 0;
					const phase = waterPhase[index] ?? 0;
					const swell = Math.sin(time * (1 + bassDrive * 0.8) + x * 0.09 + z * 0.07 + phase);
					const chop = Math.cos(time * (2.1 + chopDrive * 2.4) + x * 0.28 + phase * 0.6);
					const cross = Math.sin(time * 1.4 - z * 0.17 + phase * 0.3);
					const height =
						swell * (1.2 + bassDrive * 2.4) + chop * (0.2 + chopDrive * 0.7) + cross * 0.32;
					positionAttribute.setY(index, height);

					if (step === 2 && index + 1 < positionAttribute.count) {
						positionAttribute.setY(index + 1, height * 0.96);
					}
				}
				positionAttribute.needsUpdate = true;
				waterGeometry.computeVertexNormals();
			}

			waterMaterial.emissiveIntensity = 0.32 + bassDrive * 0.8;
			waterMaterial.color.setHSL((0.56 + sparkleDrive * 0.15) % 1, 0.66, 0.34 + bassDrive * 0.12);

			for (let index = 0; index < buoys.count; index++) {
				const x = buoyX[index] ?? 0;
				const z = buoyZ[index] ?? 0;
				const phase = buoyPhase[index] ?? 0;
				const bob =
					Math.sin(time * (1 + bassDrive) + phase) * (0.3 + bassDrive * 1.1) +
					Math.cos(time * (1.8 + chopDrive) + phase * 0.5) * 0.16;

				tempPosition.set(x, -0.9 + bob, z);
				tempQuaternion.setFromEuler(
					new THREE.Euler(
						time * 0.6 + phase,
						time * ((buoySpin[index] ?? 1) * 0.5 + chopDrive * 0.3),
						time * 0.42 + phase * 0.3
					)
				);
				const scale = 0.8 + bassDrive * 0.42 + Math.sin(time + phase) * 0.06;
				tempScale.setScalar(scale);
				tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
				buoys.setMatrixAt(index, tempMatrix);
				tempColor.setHSL(
					(0.54 + sparkleDrive * 0.2 + index * 0.0008) % 1,
					0.82,
					0.54 + sparkleDrive * 0.15
				);
				buoys.setColorAt(index, tempColor);
			}
			buoys.instanceMatrix.needsUpdate = true;
			if (buoys.instanceColor) {
				buoys.instanceColor.needsUpdate = true;
			}

			const foamAttribute = foamGeometry.getAttribute('position');
			if (foamAttribute instanceof THREE.BufferAttribute) {
				const activeFoam = foamGeometry.drawRange.count;
				for (let index = 0; index < activeFoam; index++) {
					const i3 = index * 3;
					foamPositions[i3 + 2] +=
						((foamSpeed[index] ?? 0.6) * (0.06 + bassDrive * 0.2) * delta) / 16;
					foamPositions[i3] += Math.sin(time + index * 0.13) * (0.002 + chopDrive * 0.006);
					foamPositions[i3 + 1] =
						-1.45 + Math.sin(time * 2 + index * 0.08) * (0.05 + sparkleDrive * 0.1);
					if ((foamPositions[i3 + 2] ?? 0) > 55) {
						foamPositions[i3 + 2] = -55;
						foamPositions[i3] = -55 + Math.random() * 110;
					}
				}
				foamAttribute.needsUpdate = true;
			}
			foamMaterial.size = 0.06 + sparkleDrive * 0.11;
			foamMaterial.opacity = 0.3 + sparkleDrive * 0.55;

			for (let index = ripples.length - 1; index >= 0; index--) {
				const ripple = ripples[index];
				if (!ripple) continue;
				ripple.mesh.scale.x += ripple.velocity;
				ripple.mesh.scale.y += ripple.velocity;
				ripple.mesh.scale.z += ripple.velocity;
				ripple.life -= 0.024 + sparkleDrive * 0.018;
				const material = ripple.mesh.material as THREE.MeshBasicMaterial;
				material.opacity = Math.max(0, ripple.life / ripple.maxLife);
				if (ripple.life <= 0) {
					scene.remove(ripple.mesh);
					ripple.mesh.geometry.dispose();
					material.dispose();
					ripples.splice(index, 1);
				}
			}

			rippleCount = ripples.length;
			chopImpulse *= 0.9;
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
			mountRef.removeEventListener('pointermove', handlePointerMove);

			for (const ripple of ripples) {
				scene.remove(ripple.mesh);
				ripple.mesh.geometry.dispose();
				(ripple.mesh.material as THREE.Material).dispose();
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
	<title>Three.js Five — Caustic Tide Stage</title>
	<meta
		name="description"
		content="Audio-driven caustic sea with displaced water surface and floating crystalline buoys"
	/>
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
			<div class="text-[11px] tracking-[0.2em] text-cyan-300/90 uppercase">Caustic Tide Stage</div>
			<div class="mt-1 text-xs text-white/70">Fluid Surface Dynamics</div>
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
			<div class="text-[10px] text-white/55 uppercase">Surface Ripples</div>
			<div class="font-mono text-lg font-bold text-violet-300">{rippleCount}</div>
		</div>
	</div>

	<div
		class="pointer-events-none absolute right-6 bottom-6 z-10 rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm"
	>
		<div class="text-[10px] text-white/50 uppercase">Tier</div>
		<div class="mt-1 font-mono text-sm text-white/80">{perfTier}</div>
		<div class="font-mono text-xs text-cyan-100/80">Buoys {buoyCount}</div>
	</div>
</div>
