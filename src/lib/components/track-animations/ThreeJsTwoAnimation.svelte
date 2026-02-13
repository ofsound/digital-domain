<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import * as THREE from 'three';
	import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
	import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
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

	interface Flare {
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
	let swarmCount = $state(0);
	let glitterCount = $state(0);

	const MAX_SWARM = 1800;
	const MAX_GLITTER = 2800;

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
		let frameAverage = 16;
		let tierCooldown = 0;
		let pointerX = 0;
		let pointerY = 0;

		let smoothedSub = 0;
		let smoothedBass = 0;
		let smoothedLowMid = 0;
		let smoothedMid = 0;
		let precessionImpulse = 0;
		let flareImpulse = 0;

		const scene = new THREE.Scene();
		scene.background = null;
		scene.fog = new THREE.Fog('#02020a', 30, 210);

		const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 320);
		camera.position.set(0, 2, 38);
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

		const composer = new EffectComposer(renderer);
		const renderPass = new RenderPass(scene, camera);
		const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.9, 0.65, 0.2);
		const afterimagePass = new AfterimagePass(0.89);
		composer.addPass(renderPass);
		composer.addPass(bloomPass);
		composer.addPass(afterimagePass);

		const hemiLight = new THREE.HemisphereLight('#93a7ff', '#0b1020', 0.8);
		hemiLight.position.set(0, 24, 0);
		scene.add(hemiLight);

		const keyLight = new THREE.DirectionalLight('#ffffff', 1.45);
		keyLight.position.set(8, 14, 10);
		scene.add(keyLight);

		const rimLight = new THREE.PointLight('#6e5bff', 2.2, 100, 2.2);
		rimLight.position.set(0, 0, 0);
		scene.add(rimLight);

		const attractor = new THREE.Mesh(
			new THREE.IcosahedronGeometry(2.8, 4),
			new THREE.MeshStandardMaterial({
				color: '#8ca6ff',
				emissive: '#354ac0',
				emissiveIntensity: 1.05,
				metalness: 0.5,
				roughness: 0.24
			})
		);
		scene.add(attractor);

		const swarmGeometry = new THREE.TetrahedronGeometry(0.22, 0);
		const swarmMaterial = new THREE.MeshStandardMaterial({
			color: '#99f6ff',
			emissive: '#2046a2',
			emissiveIntensity: 0.35,
			metalness: 0.22,
			roughness: 0.38
		});
		const swarm = new THREE.InstancedMesh(swarmGeometry, swarmMaterial, MAX_SWARM);
		swarm.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
		scene.add(swarm);

		const orbitRadius = new Float32Array(MAX_SWARM);
		const orbitAngle = new Float32Array(MAX_SWARM);
		const orbitSpeed = new Float32Array(MAX_SWARM);
		const orbitTilt = new Float32Array(MAX_SWARM);
		const orbitBandBias = new Float32Array(MAX_SWARM);
		const orbitShell = new Float32Array(MAX_SWARM);

		for (let index = 0; index < MAX_SWARM; index++) {
			const shell = 6 + Math.random() * 24;
			orbitRadius[index] = shell;
			orbitAngle[index] = Math.random() * Math.PI * 2;
			orbitSpeed[index] = 0.35 + Math.random() * 1.35;
			orbitTilt[index] = -1 + Math.random() * 2;
			orbitBandBias[index] = Math.random();
			orbitShell[index] = 0.7 + Math.random() * 1.4;
			tempPosition.set(shell, 0, 0);
			tempQuaternion.setFromEuler(new THREE.Euler(0, 0, 0));
			tempScale.setScalar(1);
			tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
			swarm.setMatrixAt(index, tempMatrix);
			swarm.setColorAt(index, new THREE.Color().setHSL(0.62, 0.74, 0.56));
		}
		if (swarm.instanceColor) {
			swarm.instanceColor.needsUpdate = true;
		}

		const glitterPositions = new Float32Array(MAX_GLITTER * 3);
		const glitterVelocity = new Float32Array(MAX_GLITTER);
		for (let index = 0; index < MAX_GLITTER; index++) {
			const radius = 8 + Math.random() * 36;
			const angle = Math.random() * Math.PI * 2;
			const height = -12 + Math.random() * 24;
			glitterPositions[index * 3] = Math.cos(angle) * radius;
			glitterPositions[index * 3 + 1] = height;
			glitterPositions[index * 3 + 2] = Math.sin(angle) * radius;
			glitterVelocity[index] = 0.25 + Math.random() * 0.75;
		}

		const glitterGeometry = new THREE.BufferGeometry();
		glitterGeometry.setAttribute('position', new THREE.BufferAttribute(glitterPositions, 3));
		glitterGeometry.setDrawRange(0, MAX_GLITTER);
		const glitterMaterial = new THREE.PointsMaterial({
			color: '#d8f7ff',
			size: 0.08,
			sizeAttenuation: true,
			transparent: true,
			opacity: 0.8,
			blending: THREE.AdditiveBlending,
			depthWrite: false
		});
		const glitter = new THREE.Points(glitterGeometry, glitterMaterial);
		scene.add(glitter);

		const flareGeometry = new THREE.ConeGeometry(0.34, 2.4, 12, 1, true);
		const flares: Flare[] = [];
		const maxFlareByTier: Record<PerfTier, number> = {
			high: 22,
			medium: 16,
			low: 10
		};

		const spawnFlare = (strength: number) => {
			const maxFlares = maxFlareByTier[perfTier];
			if (flares.length >= maxFlares) {
				const removed = flares.shift();
				if (removed) {
					scene.remove(removed.mesh);
					removed.mesh.geometry.dispose();
					(removed.mesh.material as THREE.Material).dispose();
				}
			}

			const material = new THREE.MeshBasicMaterial({
				color: '#8ae9ff',
				transparent: true,
				opacity: 0.88,
				blending: THREE.AdditiveBlending,
				depthWrite: false,
				side: THREE.DoubleSide
			});
			const mesh = new THREE.Mesh(flareGeometry.clone(), material);
			const angle = Math.random() * Math.PI * 2;
			const radius = 1.5 + Math.random() * 1.8;
			mesh.position.set(Math.cos(angle) * radius, -0.5 + Math.random(), Math.sin(angle) * radius);
			mesh.lookAt(mesh.position.clone().multiplyScalar(2));
			mesh.rotateX(Math.PI * 0.5);
			const scale = 1 + strength * 1.5;
			mesh.scale.set(scale, scale, scale);
			scene.add(mesh);

			flares.push({ mesh, life: 1, maxLife: 1, velocity: 0.3 + strength * 0.6 });
		};

		const unsubLowMid = frequencyStore.onThreshold('low-mid', 'enter', () => {
			precessionImpulse = Math.min(2, precessionImpulse + 0.45);
		});
		unsubscribers.push(unsubLowMid);

		const unsubMid = frequencyStore.onThreshold('mid', 'enter', (band) => {
			const over = Math.max(0, band.current - band.threshold);
			const strength = clamp01(over / 280);
			for (let index = 0; index < 4; index++) {
				spawnFlare(strength + Math.random() * 0.4);
			}
			flareImpulse = Math.min(2.2, flareImpulse + 0.7);
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

		const applyTierQuality = (tier: PerfTier) => {
			if (tier === 'high') {
				swarm.count = MAX_SWARM;
				glitterGeometry.setDrawRange(0, MAX_GLITTER);
				bloomPass.strength = 0.92;
				afterimagePass.uniforms.damp.value = 0.89;
			}
			if (tier === 'medium') {
				swarm.count = Math.floor(MAX_SWARM * 0.78);
				glitterGeometry.setDrawRange(0, Math.floor(MAX_GLITTER * 0.75));
				bloomPass.strength = 0.72;
				afterimagePass.uniforms.damp.value = 0.87;
			}
			if (tier === 'low') {
				swarm.count = Math.floor(MAX_SWARM * 0.58);
				glitterGeometry.setDrawRange(0, Math.floor(MAX_GLITTER * 0.52));
				bloomPass.strength = 0.52;
				afterimagePass.uniforms.damp.value = 0.84;
			}
			swarmCount = swarm.count;
			glitterCount = glitterGeometry.drawRange.count;
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

		const handlePointerMove = (event: PointerEvent) => {
			const rect = mountRef.getBoundingClientRect();
			const x = (event.clientX - rect.left) / Math.max(rect.width, 1);
			const y = (event.clientY - rect.top) / Math.max(rect.height, 1);
			pointerX = (x - 0.5) * 2;
			pointerY = (y - 0.5) * 2;
		};

		setPixelRatio(perfTier);
		applyTierQuality(perfTier);
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
			const orbitBreath = 1 + smoothedBass * 0.55;
			const precession = smoothedLowMid * 0.45 + precessionImpulse * 0.24;
			const sparkle = smoothedMid * 0.8 + flareImpulse * 0.45;

			attractor.rotation.y += 0.006 + smoothedLowMid * 0.03;
			attractor.rotation.x += 0.003 + smoothedMid * 0.02;
			(attractor.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8 + sparkle * 0.7;

			camera.position.x += (pointerX * 3.5 - camera.position.x) * 0.04;
			camera.position.y += (pointerY * -2.6 + 2 - camera.position.y) * 0.04;
			camera.lookAt(0, 0, 0);

			for (let index = 0; index < swarm.count; index++) {
				const baseRadius = orbitRadius[index] ?? 8;
				const angle =
					(orbitAngle[index] ?? 0) + time * ((orbitSpeed[index] ?? 1) * (0.6 + smoothedLowMid));
				const shellInfluence = orbitShell[index] ?? 1;
				const bandBias = orbitBandBias[index] ?? 0;

				const radius = baseRadius * orbitBreath * (1 + bandBias * smoothedBass * 0.3);
				const tilt =
					(orbitTilt[index] ?? 0) * (0.8 + precession) +
					Math.sin(time * 0.45 + bandBias * 4) * 0.45;
				const vertical =
					Math.sin(angle * 1.5 + bandBias * 5) * (2.8 + smoothedLowMid * 8) * shellInfluence;
				const x = Math.cos(angle + tilt) * radius;
				const z = Math.sin(angle + tilt) * radius;
				const y = vertical;

				tempPosition.set(x, y, z);
				tempQuaternion.setFromEuler(
					new THREE.Euler(angle * 0.7, angle * 1.4 + precession, angle * 0.45 + precession)
				);
				const scale = 0.75 + smoothedBass * 0.9 + (bandBias * sparkle) / 2.2;
				tempScale.setScalar(scale);
				tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
				swarm.setMatrixAt(index, tempMatrix);

				const hue = (0.52 + smoothedMid * 0.24 + bandBias * 0.16 + Math.sin(angle) * 0.03 + 1) % 1;
				tempColor.setHSL(hue, 0.78, 0.5 + sparkle * 0.15);
				swarm.setColorAt(index, tempColor);
			}
			swarm.instanceMatrix.needsUpdate = true;
			if (swarm.instanceColor) {
				swarm.instanceColor.needsUpdate = true;
			}

			const glitterAttribute = glitterGeometry.getAttribute('position');
			if (glitterAttribute instanceof THREE.BufferAttribute) {
				const activeGlitter = glitterGeometry.drawRange.count;
				for (let index = 0; index < activeGlitter; index++) {
					const i3 = index * 3;
					const velocity = (glitterVelocity[index] ?? 0.4) * (0.3 + smoothedMid * 1.2);
					const x = glitterPositions[i3] ?? 0;
					const z = glitterPositions[i3 + 2] ?? 0;
					const angle = Math.atan2(z, x) + velocity * 0.01;
					const radius = Math.max(
						4,
						Math.sqrt(x * x + z * z) + Math.sin(time + index * 0.15) * 0.04
					);
					glitterPositions[i3] = Math.cos(angle) * radius;
					glitterPositions[i3 + 2] = Math.sin(angle) * radius;
					glitterPositions[i3 + 1] +=
						Math.sin(time * 0.9 + index * 0.02) * 0.02 + smoothedBass * 0.03;
					if ((glitterPositions[i3 + 1] ?? 0) > 16) {
						glitterPositions[i3 + 1] = -16;
					}
				}
				glitterAttribute.needsUpdate = true;
			}

			for (let index = flares.length - 1; index >= 0; index--) {
				const flare = flares[index];
				if (!flare) continue;
				const growth = flare.velocity * (1 + smoothedMid * 0.5);
				flare.mesh.scale.x += growth;
				flare.mesh.scale.y += growth;
				flare.mesh.scale.z += growth;
				flare.mesh.position.y += 0.02 + smoothedMid * 0.03;
				flare.life -= 0.03 + smoothedMid * 0.018;
				const material = flare.mesh.material as THREE.MeshBasicMaterial;
				material.opacity = Math.max(0, flare.life / flare.maxLife);
				if (flare.life <= 0) {
					scene.remove(flare.mesh);
					flare.mesh.geometry.dispose();
					material.dispose();
					flares.splice(index, 1);
				}
			}

			bloomPass.strength += (0.5 + sparkle * 1.15 - bloomPass.strength) * 0.05;
			glitterMaterial.size = 0.08 + sparkle * 0.12;
			glitterMaterial.opacity = 0.45 + sparkle * 0.55;

			precessionImpulse *= 0.91;
			flareImpulse *= 0.9;

			composer.render();
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

			for (const flare of flares) {
				scene.remove(flare.mesh);
				flare.mesh.geometry.dispose();
				(flare.mesh.material as THREE.Material).dispose();
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
				<div class="text-[11px] tracking-[0.2em] text-sky-300/90 uppercase">Prism Swarm Orbit</div>
				<div class="mt-1 text-xs text-white/70">Bloom + Afterimage</div>
			</div>
		</div>

		<div class="pointer-events-none absolute top-24 right-6 z-10 flex flex-col gap-2">
			<div class="rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
				<div class="text-[10px] text-white/55 uppercase">FPS</div>
				<div class="font-mono text-lg font-bold text-cyan-300">{fpsEstimate.toFixed(0)}</div>
			</div>
			<div class="rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
				<div class="text-[10px] text-white/55 uppercase">Swarm</div>
				<div class="font-mono text-lg font-bold text-blue-300">{swarmCount}</div>
			</div>
			<div class="rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
				<div class="text-[10px] text-white/55 uppercase">Glitter</div>
				<div class="font-mono text-lg font-bold text-violet-300">{glitterCount}</div>
			</div>
			<div class="rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm">
				<div class="text-[10px] text-white/55 uppercase">Energy</div>
				<div class="font-mono text-lg font-bold text-emerald-300">
					{(audioEnergy * 100).toFixed(0)}%
				</div>
			</div>
		</div>

		<div
			class="pointer-events-none absolute bottom-6 left-6 z-10 rounded-lg border border-white/10 bg-black/45 px-3 py-2 backdrop-blur-sm"
		>
			<div class="text-[10px] text-white/50 uppercase">Render Tier</div>
			<div class="mt-1 font-mono text-sm text-white/80">{perfTier}</div>
		</div>
	{/if}
</div>
