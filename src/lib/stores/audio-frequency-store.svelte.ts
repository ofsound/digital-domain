/**
 * Audio Frequency Store - Reactive frequency analysis for animations
 *
 * Provides real-time frequency bin data from the Web Audio API analyser,
 * grouped into configurable bands with threshold crossing detection.
 *
 * Usage:
 *   import { frequencyStore } from '$lib/stores/audio-frequency-store.svelte';
 *
 *   // Access reactive band data
 *   $effect(() => {
 *     const bass = frequencyStore.bands.find(b => b.name === 'bass');
 *     if (bass?.isActive) {
 *       // Trigger animation
 *     }
 *   });
 *
 *   // Subscribe to threshold crossings
 *   frequencyStore.onThreshold('bass', 'enter', (band) => {
 *     console.log('Bass crossed threshold:', band.current);
 *   });
 */

import {
	DEFAULT_FREQUENCY_BANDS,
	DEFAULT_ANALYSIS_FPS,
	createDefaultFrequencyConfig,
	isValidFrequencyConfig,
	type FrequencyBandState,
	type FrequencyBandConfig,
	type TrackFrequencyConfig
} from '$lib/audio/frequency-config';

/**
 * Threshold event types
 */
type ThresholdEvent = 'enter' | 'exit';

/**
 * Callback for threshold events
 */
type ThresholdCallback = (band: FrequencyBandState) => void;

// Reactive state using Svelte 5 runes at module level
let currentTrackId = $state<string | null>(null);
let config = $state<TrackFrequencyConfig>(createDefaultFrequencyConfig('default'));
let bands = $state<FrequencyBandState[]>(
	DEFAULT_FREQUENCY_BANDS.map((band) => ({
		...band,
		current: 0,
		isActive: false
	}))
);
let isRunning = $state(false);
let subscriberCount = $state(0);
let animationId: number | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: Uint8Array<ArrayBuffer> | null = null;
let lastFrameTime = $state(0);
// eslint-disable-next-line svelte/prefer-svelte-reactivity
const listeners = new Map<string, Map<ThresholdEvent, Set<ThresholdCallback>>>();

/**
 * Initialize band states from configuration
 */
function initializeBands(bandConfigs: FrequencyBandConfig[]): FrequencyBandState[] {
	return bandConfigs.map((band) => ({
		...band,
		current: 0,
		isActive: false
	}));
}

/**
 * Update frequency band values from analyser data
 */
function updateBands(): void {
	if (!analyser || !dataArray) return;

	// Get frequency data
	analyser.getByteFrequencyData(dataArray);

	// Calculate totals for each band and update reactively
	const updatedBands = bands.map((band) => {
		let total = 0;
		for (let bin = band.lowBin; bin <= band.highBin; bin++) {
			total += dataArray?.[bin] ?? 0;
		}

		const wasActive = band.isActive;
		const isActiveNow = total > band.threshold;

		// Fire callbacks on threshold crossing
		if (!wasActive && isActiveNow) {
			fireThresholdCallback(band.name, 'enter', { ...band, current: total, isActive: true });
		} else if (wasActive && !isActiveNow) {
			fireThresholdCallback(band.name, 'exit', { ...band, current: total, isActive: false });
		}

		return {
			...band,
			current: total,
			isActive: isActiveNow
		};
	});

	bands = updatedBands;
}

/**
 * Fire threshold callback for a band
 */
function fireThresholdCallback(
	bandName: string,
	event: ThresholdEvent,
	band: FrequencyBandState
): void {
	const bandListeners = listeners.get(bandName);
	if (!bandListeners) return;

	const eventListeners = bandListeners.get(event);
	if (!eventListeners) return;

	for (const callback of eventListeners) {
		try {
			callback(band);
		} catch (err) {
			console.error(`[FrequencyStore] Error in threshold callback for ${bandName}:`, err);
		}
	}
}

/**
 * RAF loop for frequency analysis
 */
function analysisLoop(timestamp: number): void {
	if (!isRunning) return;

	// Calculate target frame interval based on FPS
	const fps = config.fps ?? DEFAULT_ANALYSIS_FPS;
	const targetInterval = 1000 / fps;

	// Check if enough time has passed
	if (timestamp - lastFrameTime >= targetInterval) {
		updateBands();
		lastFrameTime = timestamp;
	}

	// Schedule next frame
	animationId = requestAnimationFrame(analysisLoop);
}

/**
 * Start the analysis loop
 */
function startAnalysis(): void {
	if (isRunning || !analyser) return;

	isRunning = true;
	lastFrameTime = performance.now();
	animationId = requestAnimationFrame(analysisLoop);
}

/**
 * Stop the analysis loop
 */
function stopAnalysis(): void {
	isRunning = false;
	if (animationId !== null) {
		cancelAnimationFrame(animationId);
		animationId = null;
	}
}

/**
 * Public frequency store API
 */
export const frequencyStore = {
	/**
	 * Reactive array of frequency band states
	 * Components can subscribe to this for real-time updates
	 */
	get bands(): FrequencyBandState[] {
		return bands;
	},

	/**
	 * Current track ID being analyzed
	 */
	get currentTrackId(): string | null {
		return currentTrackId;
	},

	/**
	 * Current FPS setting
	 */
	get fps(): number {
		return config.fps ?? DEFAULT_ANALYSIS_FPS;
	},

	/**
	 * Set the analyser node to use for frequency analysis
	 */
	setAnalyser(newAnalyser: AnalyserNode | null): void {
		analyser = newAnalyser;
		if (analyser) {
			const buffer = new ArrayBuffer(analyser.frequencyBinCount);
			dataArray = new Uint8Array(buffer);
			console.log('[FrequencyStore] Analyser set, frequencyBinCount:', analyser.frequencyBinCount);
			// Auto-start if we have subscribers
			if (subscriberCount > 0) {
				console.log('[FrequencyStore] Auto-starting analysis');
				startAnalysis();
			}
		} else {
			dataArray = null;
			stopAnalysis();
		}
	},

	/**
	 * Set the frequency configuration for the current track
	 */
	setConfig(newConfig: TrackFrequencyConfig | null): void {
		if (newConfig && isValidFrequencyConfig(newConfig)) {
			config = newConfig;
			currentTrackId = newConfig.trackId;
			bands = initializeBands(newConfig.bands);
		} else {
			// Use default config
			config = createDefaultFrequencyConfig(currentTrackId ?? 'default');
			bands = initializeBands(config.bands);
		}
	},

	/**
	 * Set the current track ID (triggers config update)
	 */
	setTrackId(trackId: string | null, newConfig?: TrackFrequencyConfig | null): void {
		currentTrackId = trackId;
		if (newConfig !== undefined) {
			this.setConfig(newConfig);
		} else {
			// Reset to default for this track
			config = createDefaultFrequencyConfig(trackId ?? 'default');
			bands = initializeBands(config.bands);
		}
	},

	/**
	 * Subscribe to a threshold crossing event for a specific band
	 * @param bandName - Name of the band to watch
	 * @param event - 'enter' (crossing up) or 'exit' (crossing down)
	 * @param callback - Function to call when threshold is crossed
	 * @returns Unsubscribe function
	 */
	onThreshold(bandName: string, event: ThresholdEvent, callback: ThresholdCallback): () => void {
		// Get or create band listeners
		let bandListeners = listeners.get(bandName);
		if (!bandListeners) {
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			bandListeners = new Map();
			listeners.set(bandName, bandListeners);
		}

		// Get or create event listeners
		let eventListeners = bandListeners.get(event);
		if (!eventListeners) {
			// eslint-disable-next-line svelte/prefer-svelte-reactivity
			eventListeners = new Set();
			bandListeners.set(event, eventListeners);
		}

		// Add callback
		eventListeners.add(callback);

		// Return unsubscribe function
		return () => {
			eventListeners?.delete(callback);
		};
	},

	/**
	 * Increment subscriber count and auto-start analysis if needed
	 */
	subscribe(): () => void {
		subscriberCount++;
		console.log('[FrequencyStore] Subscribed, count:', subscriberCount, 'analyser:', !!analyser);

		// Auto-start if we have an analyser
		if (analyser && !isRunning) {
			console.log('[FrequencyStore] Starting analysis from subscribe');
			startAnalysis();
		}

		// Return unsubscribe function
		return () => {
			subscriberCount--;
			console.log('[FrequencyStore] Unsubscribed, count:', subscriberCount);
			// Auto-stop if no more subscribers
			if (subscriberCount <= 0) {
				stopAnalysis();
			}
		};
	},

	/**
	 * Manually start analysis (rarely needed, use subscribe() instead)
	 */
	start(): void {
		startAnalysis();
	},

	/**
	 * Manually stop analysis (rarely needed, unsubscribe instead)
	 */
	stop(): void {
		stopAnalysis();
	},

	/**
	 * Update FPS at runtime
	 */
	setFps(fps: number): void {
		config.fps = Math.max(1, Math.min(120, fps));
	},

	/**
	 * Debug: Check if analysis is running
	 */
	get isRunning(): boolean {
		return isRunning;
	},

	/**
	 * Debug: Get subscriber count
	 */
	get subscriberCount(): number {
		return subscriberCount;
	}
};
