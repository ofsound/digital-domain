<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { gsap } from 'gsap';
	import { frequencyStore } from '$lib/stores/audio-frequency-store.svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';

	/**
	 * Color Schemes Page - Synesthetic Audio-Reactive Colors
	 *
	 * A synesthetic experience where audio frequencies dictate the site's color palette.
	 * Bass frequencies drive the hue, overall energy controls saturation,
	 * and brightness responds to intensity. The entire UI becomes a living,
	 * breathing color field that responds to the music.
	 */

	let unsubscribers: (() => void)[] = [];

	// Color values in HSL
	let primaryHue = $state(220); // Start with blue
	let primarySaturation = $state(50);
	let primaryLightness = $state(50);

	// Secondary colors for palette
	let secondaryHue = $state(280);
	let accentHue = $state(340);

	// RGB breakdown for display
	let rValue = $state(100);
	let gValue = $state(100);
	let bValue = $state(200);

	// Audio analysis
	let dominantBand = $state<'bass' | 'mid' | 'low-mid' | 'sub-bass'>('bass');
	let overallEnergy = $state(0);
	let colorMode = $state<'cool' | 'warm' | 'neon' | 'muted'>('cool');

	// Smoothing values
	let smoothedBass = $state(0);
	let smoothedMids = $state(0);
	let smoothedLowMids = $state(0);
	let smoothedSubBass = $state(0);

	// Color history for visualization
	let colorHistory: { hue: number; sat: number; light: number; time: number }[] = [];
	const MAX_HISTORY = 100;

	// Animated gradients
	let gradientAngle = $state(0);
	let animationFrameId: number | null = null;

	onMount(() => {
		// Initialize audio
		playerStore.getAnalyser();
		const unsubscribe = frequencyStore.subscribe();
		unsubscribers.push(unsubscribe);

		// Bass threshold - shift to warm colors
		const unsubBass = frequencyStore.onThreshold('bass', 'enter', (band) => {
			const intensity = (band.current - band.threshold) / band.threshold;
			colorMode = 'warm';
			dominantBand = 'bass';

			// Animate hue shift to warm (reds/oranges)
			gsap.to(
				{ h: primaryHue },
				{
					h: 15 + intensity * 30, // Red-orange range
					duration: 0.5,
					ease: 'power2.out',
					onUpdate: function () {
						primaryHue = this.targets()[0].h;
					}
				}
			);

			// Boost saturation
			gsap.to(
				{ s: primarySaturation },
				{
					s: 70 + intensity * 30,
					duration: 0.3,
					ease: 'power2.out',
					onUpdate: function () {
						primarySaturation = this.targets()[0].s;
					}
				}
			);
		});
		unsubscribers.push(unsubBass);

		// Mid threshold - shift to neon/high energy
		const unsubMid = frequencyStore.onThreshold('mid', 'enter', (band) => {
			const intensity = (band.current - band.threshold) / band.threshold;
			colorMode = 'neon';
			dominantBand = 'mid';

			// Electric cyan/magenta range
			gsap.to(
				{ h: primaryHue },
				{
					h: 180 + intensity * 60, // Cyan to green range
					duration: 0.4,
					ease: 'power2.out',
					onUpdate: function () {
						primaryHue = this.targets()[0].h;
					}
				}
			);

			// Max saturation for neon effect
			gsap.to(
				{ s: primarySaturation },
				{
					s: 90 + intensity * 10,
					duration: 0.2,
					ease: 'power2.out',
					onUpdate: function () {
						primarySaturation = this.targets()[0].s;
					}
				}
			);

			// Higher lightness for neon glow
			gsap.to(
				{ l: primaryLightness },
				{
					l: 60 + intensity * 20,
					duration: 0.3,
					ease: 'power2.out',
					onUpdate: function () {
						primaryLightness = this.targets()[0].l;
					}
				}
			);
		});
		unsubscribers.push(unsubMid);

		// Low-mid threshold - purple/magenta zone
		const unsubLowMid = frequencyStore.onThreshold('low-mid', 'enter', () => {
			colorMode = dominantBand === 'bass' ? 'warm' : 'cool';
			dominantBand = 'low-mid';

			gsap.to(
				{ h: primaryHue },
				{
					h: 280, // Purple range
					duration: 0.6,
					ease: 'power2.inOut',
					onUpdate: function () {
						primaryHue = this.targets()[0].h;
					}
				}
			);
		});
		unsubscribers.push(unsubLowMid);

		// Sub-bass - deep cool tones
		const unsubSub = frequencyStore.onThreshold('sub-bass', 'enter', () => {
			colorMode = 'cool';
			dominantBand = 'sub-bass';

			gsap.to(
				{ h: primaryHue },
				{
					h: 220, // Deep blue
					duration: 0.8,
					ease: 'power2.out',
					onUpdate: function () {
						primaryHue = this.targets()[0].h;
					}
				}
			);

			// Lower saturation for cool, muted feel
			gsap.to(
				{ s: primarySaturation },
				{
					s: 40,
					duration: 0.5,
					ease: 'power2.out',
					onUpdate: function () {
						primarySaturation = this.targets()[0].s;
					}
				}
			);
		});
		unsubscribers.push(unsubSub);

		// Exit thresholds - return to balanced state
		const unsubBassExit = frequencyStore.onThreshold('bass', 'exit', () => {
			if (dominantBand === 'bass') {
				colorMode = 'muted';
				gsap.to(
					{ s: primarySaturation },
					{
						s: 50,
						duration: 1,
						ease: 'power2.out',
						onUpdate: function () {
							primarySaturation = this.targets()[0].s;
						}
					}
				);
			}
		});
		unsubscribers.push(unsubBassExit);

		// Continuous color update loop
		const animateLoop = () => {
			if (!frequencyStore.isRunning) {
				animationFrameId = requestAnimationFrame(animateLoop);
				return;
			}

			const bands = frequencyStore.bands;
			const bass = bands.find((b) => b.name === 'bass');
			const mids = bands.find((b) => b.name === 'mid');
			const lowMids = bands.find((b) => b.name === 'low-mid');
			const subBass = bands.find((b) => b.name === 'sub-bass');

			// Normalize values (0-1)
			if (bass) {
				smoothedBass = smoothedBass * 0.9 + Math.min(bass.current / 800, 1) * 0.1;
			}
			if (mids) {
				smoothedMids = smoothedMids * 0.9 + Math.min(mids.current / 600, 1) * 0.1;
			}
			if (lowMids) {
				smoothedLowMids = smoothedLowMids * 0.92 + Math.min(lowMids.current / 800, 1) * 0.08;
			}
			if (subBass) {
				smoothedSubBass = smoothedSubBass * 0.94 + Math.min(subBass.current / 700, 1) * 0.06;
			}

			// Calculate overall energy (average of all bands)
			overallEnergy = (smoothedBass + smoothedMids + smoothedLowMids + smoothedSubBass) / 4;

			// Determine dominant frequency for hue
			let targetHue = primaryHue;
			const maxVal = Math.max(smoothedBass, smoothedMids, smoothedLowMids, smoothedSubBass);

			if (!frequencyStore.bands.find((b) => b.isActive)) {
				// No active bands - drift slowly
				targetHue = (primaryHue + 0.1) % 360;
			} else if (maxVal === smoothedBass && smoothedBass > 0.3) {
				targetHue = 15 + smoothedBass * 45; // Red-orange (warm)
			} else if (maxVal === smoothedMids && smoothedMids > 0.3) {
				targetHue = 160 + smoothedMids * 80; // Cyan-green (neon)
			} else if (maxVal === smoothedLowMids && smoothedLowMids > 0.3) {
				targetHue = 260 + smoothedLowMids * 60; // Purple-magenta
			} else if (maxVal === smoothedSubBass && smoothedSubBass > 0.3) {
				targetHue = 200 + smoothedSubBass * 40; // Blue (cool)
			}

			// Smooth hue transition
			const hueDiff = targetHue - primaryHue;
			primaryHue += hueDiff * 0.05;

			// Saturation based on overall energy
			const targetSaturation = 30 + overallEnergy * 70;
			primarySaturation += (targetSaturation - primarySaturation) * 0.1;

			// Lightness based on intensity
			const targetLightness = 40 + overallEnergy * 40;
			primaryLightness += (targetLightness - primaryLightness) * 0.1;

			// Calculate secondary and accent hues (triadic harmony)
			secondaryHue = (primaryHue + 120) % 360;
			accentHue = (primaryHue + 240) % 360;

			// Convert HSL to RGB for display
			const rgb = hslToRgb(primaryHue / 360, primarySaturation / 100, primaryLightness / 100);
			rValue = rgb[0];
			gValue = rgb[1];
			bValue = rgb[2];

			// Store color history
			colorHistory.push({
				hue: primaryHue,
				sat: primarySaturation,
				light: primaryLightness,
				time: Date.now()
			});
			if (colorHistory.length > MAX_HISTORY) {
				colorHistory.shift();
			}

			// Animate gradient rotation
			gradientAngle = (gradientAngle + 0.2 + overallEnergy * 0.5) % 360;

			animationFrameId = requestAnimationFrame(animateLoop);
		};

		animationFrameId = requestAnimationFrame(animateLoop);
	});

	onDestroy(() => {
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}
		unsubscribers.forEach((unsub) => unsub());
	});

	// HSL to RGB conversion
	function hslToRgb(h: number, s: number, l: number): [number, number, number] {
		let r: number, g: number, b: number;

		if (s === 0) {
			r = g = b = l;
		} else {
			const hue2rgb = (p: number, q: number, t: number) => {
				if (t < 0) t += 1;
				if (t > 1) t -= 1;
				if (t < 1 / 6) return p + (q - p) * 6 * t;
				if (t < 1 / 2) return q;
				if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
				return p;
			};

			const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			const p = 2 * l - q;
			r = hue2rgb(p, q, h + 1 / 3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1 / 3);
		}

		return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
	}
</script>

<div
	class="min-h-screen overflow-hidden transition-all duration-100"
	style="
		background: linear-gradient({gradientAngle}deg,
			hsla({primaryHue}, {primarySaturation}%, {primaryLightness - 20}%, 0.24) 0%,
			hsla({secondaryHue}, {primarySaturation * 0.8}%, {primaryLightness - 10}%, 0.2) 50%,
			hsla({accentHue}, {primarySaturation * 0.6}%, {primaryLightness - 15}%, 0.22) 100%
		);
	"
>
	<!-- Nested Color Layer 1: Primary wash -->
	<div
		class="absolute inset-0 opacity-50"
		style="
			background: radial-gradient(circle at 30% 70%,
				hsla({primaryHue}, {primarySaturation}%, {primaryLightness}%, 0.8) 0%,
				transparent 60%
			);
		"
	></div>

	<!-- Nested Color Layer 2: Secondary glow -->
	<div
		class="absolute inset-0 opacity-40"
		style="
			background: radial-gradient(circle at 70% 30%,
				hsla({secondaryHue}, {primarySaturation}%, {primaryLightness + 10}%, 0.6) 0%,
				transparent 50%
			);
		"
	></div>

	<!-- Nested Color Layer 3: Accent spots -->
	<div
		class="absolute inset-0"
		style="
			background:
				radial-gradient(circle at 20% 20%, hsla({accentHue}, {primarySaturation}%, 60%, {0.3 +
			overallEnergy * 0.4}) 0%, transparent 40%),
				radial-gradient(circle at 80% 80%, hsla({primaryHue}, {primarySaturation}%, 70%, {0.2 +
			overallEnergy * 0.3}) 0%, transparent 45%),
				radial-gradient(circle at 50% 50%, hsla({secondaryHue}, {primarySaturation}%, 50%, {0.2 +
			smoothedBass * 0.3}) 0%, transparent 50%);
		"
	></div>

	<!-- Content Container -->
	<div class="relative z-10 min-h-screen p-6 md:p-12">
		<!-- Header -->
		<header class="mb-12">
			<div class="flex items-center justify-between">
				<div>
					<h1
						class="text-5xl font-black tracking-tighter md:text-7xl"
						style="color: hsl({primaryHue}, {Math.min(primarySaturation + 20, 100)}%, {Math.min(
							primaryLightness + 30,
							90
						)}%); text-shadow: 0 0 40px hsla({primaryHue}, {primarySaturation}%, 50%, 0.5);"
					>
						SYNESTHESIA
					</h1>
					<p
						class="mt-2 text-lg"
						style="color: hsl({primaryHue}, {primarySaturation * 0.7}%, {primaryLightness + 20}%);"
					>
						Digital color palette driven by audio frequencies
					</p>
				</div>
				<div
					class="rounded-full px-4 py-2 text-sm font-medium"
					style="
						background: hsla({primaryHue}, {primarySaturation}%, {primaryLightness}%, 0.2);
						color: hsl({primaryHue}, {primarySaturation}%, {primaryLightness + 30}%);
						border: 1px solid hsla({primaryHue}, {primarySaturation}%, {primaryLightness + 20}%, 0.3);
					"
				>
					{colorMode} • {dominantBand}
				</div>
			</div>
		</header>

		<!-- Main Grid: Color Analysis -->
		<div class="mb-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
			<!-- Primary Color Display -->
			<div
				class="relative overflow-hidden rounded-3xl p-8 md:p-12 lg:col-span-2"
				style="
					background: linear-gradient(135deg,
						hsla({primaryHue}, {primarySaturation}%, {primaryLightness}%, 0.15) 0%,
						hsla({secondaryHue}, {primarySaturation * 0.8}%, {primaryLightness}%, 0.1) 100%
					);
					border: 1px solid hsla({primaryHue}, {primarySaturation}%, {primaryLightness + 20}%, 0.2);
					box-shadow:
						0 0 60px hsla({primaryHue}, {primarySaturation}%, 50%, {0.2 + overallEnergy * 0.3}),
						inset 0 0 80px hsla({primaryHue}, {primarySaturation}%, 50%, 0.1);
				"
			>
				<!-- Animated inner glow rings -->
				{#each Array.from({ length: 3 }, (_, i) => i) as i (i)}
					<div
						class="pointer-events-none absolute rounded-full"
						style="
							width: {200 + i * 100}px;
							height: {200 + i * 100}px;
							left: 50%;
							top: 50%;
							transform: translate(-50%, -50%) scale({1 + smoothedBass * (0.2 + i * 0.1)});
							background: radial-gradient(circle,
								hsla({primaryHue}, {primarySaturation}%, {primaryLightness}%, {0.1 - i * 0.03}) 0%,
								transparent 70%
							);
							transition: transform 0.1s ease-out;
						"
					></div>
				{/each}

				<div class="relative z-10">
					<div
						class="mb-4 text-sm tracking-wider"
						style="color: hsl({primaryHue}, {primarySaturation * 0.5}%, {primaryLightness + 30}%);"
					>
						CURRENT PALETTE
					</div>

					<!-- Large color swatch -->
					<div class="mb-8 flex items-end gap-8">
						<div
							class="h-32 w-32 rounded-2xl shadow-2xl md:h-48 md:w-48"
							style="
								background: hsl({primaryHue}, {primarySaturation}%, {primaryLightness}%);
								box-shadow:
									0 20px 60px hsla({primaryHue}, {primarySaturation}%, 40%, 0.4),
									0 0 100px hsla({primaryHue}, {primarySaturation}%, 50%, {0.3 + overallEnergy * 0.4});
							"
						></div>

						<div class="flex-1 space-y-3">
							<div
								class="font-mono text-4xl font-black md:text-5xl"
								style="color: hsl({primaryHue}, {primarySaturation}%, {primaryLightness + 40}%);"
							>
								hsl({primaryHue.toFixed(0)}, {primarySaturation.toFixed(0)}%, {primaryLightness.toFixed(
									0
								)}%)
							</div>
							<div
								class="font-mono text-lg"
								style="color: hsl({primaryHue}, {primarySaturation * 0.6}%, {primaryLightness +
									20}%);"
							>
								rgb({rValue}, {gValue}, {bValue})
							</div>
						</div>
					</div>

					<!-- HSL Breakdown bars -->
					<div class="space-y-4">
						<div>
							<div
								class="mb-1 flex justify-between text-xs"
								style="color: hsl({primaryHue}, {primarySaturation * 0.5}%, {primaryLightness +
									20}%);"
							>
								<span>HUE</span>
								<span>{primaryHue.toFixed(0)}°</span>
							</div>
							<div class="h-3 overflow-hidden rounded-full bg-black/20">
								<div
									class="h-full rounded-full transition-all duration-100"
									style="width: {(primaryHue / 360) *
										100}%; background: linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);"
								></div>
							</div>
						</div>

						<div>
							<div
								class="mb-1 flex justify-between text-xs"
								style="color: hsl({primaryHue}, {primarySaturation * 0.5}%, {primaryLightness +
									20}%);"
							>
								<span>SATURATION</span>
								<span>{primarySaturation.toFixed(0)}%</span>
							</div>
							<div class="h-3 overflow-hidden rounded-full bg-black/20">
								<div
									class="h-full rounded-full transition-all duration-100"
									style="width: {primarySaturation}%; background: linear-gradient(90deg,
										hsl({primaryHue}, 0%, {primaryLightness}%),
										hsl({primaryHue}, 100%, {primaryLightness}%)
									);"
								></div>
							</div>
						</div>

						<div>
							<div
								class="mb-1 flex justify-between text-xs"
								style="color: hsl({primaryHue}, {primarySaturation * 0.5}%, {primaryLightness +
									20}%);"
							>
								<span>LIGHTNESS</span>
								<span>{primaryLightness.toFixed(0)}%</span>
							</div>
							<div class="h-3 overflow-hidden rounded-full bg-black/20">
								<div
									class="h-full rounded-full transition-all duration-100"
									style="width: {primaryLightness}%; background: linear-gradient(90deg,
										#000,
										hsl({primaryHue}, {primarySaturation}%, 50%),
										#fff
									);"
								></div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Secondary Colors -->
			<div class="space-y-4">
				<div
					class="rounded-2xl p-6"
					style="
						background: hsla({secondaryHue}, {primarySaturation * 0.8}%, {primaryLightness}%, 0.15);
						border: 1px solid hsla({secondaryHue}, {primarySaturation}%, {primaryLightness + 20}%, 0.2);
					"
				>
					<div
						class="mb-3 text-xs tracking-wider"
						style="color: hsl({secondaryHue}, {primarySaturation * 0.5}%, {primaryLightness +
							30}%);"
					>
						SECONDARY
					</div>
					<div
						class="mb-3 h-24 w-full rounded-xl"
						style="
							background: hsl({secondaryHue}, {primarySaturation * 0.8}%, {primaryLightness}%);
							box-shadow: 0 10px 30px hsla({secondaryHue}, {primarySaturation}%, 40%, 0.3);
						"
					></div>
					<div
						class="font-mono text-sm"
						style="color: hsl({secondaryHue}, {primarySaturation}%, {primaryLightness + 30}%);"
					>
						hsl({secondaryHue.toFixed(0)}, {(primarySaturation * 0.8).toFixed(0)}%, {primaryLightness.toFixed(
							0
						)}%)
					</div>
				</div>

				<div
					class="rounded-2xl p-6"
					style="
						background: hsla({accentHue}, {primarySaturation * 0.6}%, {primaryLightness}%, 0.15);
						border: 1px solid hsla({accentHue}, {primarySaturation}%, {primaryLightness + 20}%, 0.2);
					"
				>
					<div
						class="mb-3 text-xs tracking-wider"
						style="color: hsl({accentHue}, {primarySaturation * 0.5}%, {primaryLightness + 30}%);"
					>
						ACCENT
					</div>
					<div
						class="mb-3 h-24 w-full rounded-xl"
						style="
							background: hsl({accentHue}, {primarySaturation * 0.6}%, {primaryLightness}%);
							box-shadow: 0 10px 30px hsla({accentHue}, {primarySaturation}%, 40%, 0.3);
						"
					></div>
					<div
						class="font-mono text-sm"
						style="color: hsl({accentHue}, {primarySaturation}%, {primaryLightness + 30}%);"
					>
						hsl({accentHue.toFixed(0)}, {(primarySaturation * 0.6).toFixed(0)}%, {primaryLightness.toFixed(
							0
						)}%)
					</div>
				</div>
			</div>
		</div>

		<!-- Frequency-to-Color Mapping -->
		<div class="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4">
			{#each [{ name: 'Sub-Bass', value: smoothedSubBass, hue: 200 + smoothedSubBass * 40, label: 'Cool/Blue' }, { name: 'Bass', value: smoothedBass, hue: 15 + smoothedBass * 45, label: 'Warm/Red' }, { name: 'Low-Mid', value: smoothedLowMids, hue: 260 + smoothedLowMids * 60, label: 'Purple' }, { name: 'Mid', value: smoothedMids, hue: 160 + smoothedMids * 80, label: 'Neon/Cyan' }] as freq (freq.name)}
				<div
					class="rounded-2xl p-6 transition-all duration-300"
					style="
						background: hsla({freq.hue}, 70%, 50%, 0.1);
						border: 1px solid hsla({freq.hue}, 70%, 60%, {0.2 + freq.value * 0.5});
						box-shadow: 0 0 {20 + freq.value * 30}px hsla({freq.hue}, 70%, 50%, {freq.value * 0.4});
						transform: scale({1 + freq.value * 0.05});
					"
				>
					<div class="mb-2 text-xs" style="color: hsl({freq.hue}, 50%, 70%);">{freq.name}</div>
					<div class="mb-1 text-2xl font-bold" style="color: hsl({freq.hue}, 80%, 80%);">
						{(freq.value * 100).toFixed(0)}%
					</div>
					<div class="text-xs" style="color: hsl({freq.hue}, 40%, 60%);">{freq.label}</div>

					<!-- Color indicator -->
					<div class="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
						<div
							class="h-full rounded-full transition-all duration-100"
							style="width: {freq.value * 100}%; background: hsl({freq.hue}, 80%, 60%);"
						></div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Color History Visualization -->
		<div
			class="rounded-3xl p-8"
			style="
				background: hsla({primaryHue}, {primarySaturation}%, {primaryLightness}%, 0.1);
				border: 1px solid hsla({primaryHue}, {primarySaturation}%, {primaryLightness + 20}%, 0.2);
			"
		>
			<div
				class="mb-6 text-sm tracking-wider"
				style="color: hsl({primaryHue}, {primarySaturation * 0.5}%, {primaryLightness + 30}%);"
			>
				COLOR HISTORY
			</div>

			<div class="flex h-32 items-end gap-1 overflow-hidden">
				{#each colorHistory as color, i (i)}
					<div
						class="flex-1 rounded-t transition-all duration-75"
						style="
							height: {(color.light / 100) * 100}%;
							background: hsl({color.hue}, {color.sat}%, {color.light}%);
							opacity: {0.3 + (i / colorHistory.length) * 0.7};
						"
					></div>
				{/each}
			</div>

			<div
				class="mt-4 flex justify-between text-xs"
				style="color: hsl({primaryHue}, {primarySaturation * 0.3}%, {primaryLightness + 10}%);"
			>
				<span>Recent</span>
				<span>Now</span>
			</div>
		</div>

		<!-- Energy Level Indicator -->
		<div class="fixed right-8 bottom-8 flex items-center gap-4">
			<div
				class="rounded-full px-4 py-2 text-sm"
				style="
					background: hsla({primaryHue}, {primarySaturation}%, {primaryLightness}%, 0.2);
					color: hsl({primaryHue}, {primarySaturation}%, {primaryLightness + 40}%);
					border: 1px solid hsla({primaryHue}, {primarySaturation}%, {primaryLightness + 20}%, 0.3);
				"
			>
				Energy: {(overallEnergy * 100).toFixed(0)}%
			</div>
		</div>
	</div>
</div>
