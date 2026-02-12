/**
 * Player Store - Singleton shared audio engine for the playlist player
 *
 * Manages ONE AudioEngine instance shared across all routes.
 * Provides reactive access to player state and controls.
 *
 * Usage:
 *   import { playerStore } from '$lib/stores/player-store.svelte';
 *
 *   // Access reactive state
 *   $effect(() => {
 *     console.log(playerStore.isPlaying);
 *     console.log(playerStore.currentTrack);
 *   });
 *
 *   // Call methods
 *   playerStore.togglePlayPause();
 *   playerStore.nextTrack();
 */

import { writable } from 'svelte/store';
import { AudioEngine } from '$lib/audio/audio-engine.svelte';
import type { AudioTrack } from '$lib/audio/playback-state';
import { frequencyStore } from './audio-frequency-store.svelte';

/**
 * Global player state
 */
let engine: AudioEngine | null = null;

/** Svelte store for reliable reactivity when buffers finish loading */
export const buffersLoadedStore = writable(false);

/** Whether the player is maximized (showing full playlist) or minimized */
let isMaximized = $state(false);

/**
 * Get or create the shared engine instance
 */
function getEngine(): AudioEngine | null {
	if (engine) {
		// Always sync the analyser to frequency store when engine exists
		const analyser = engine.getAnalyser();
		frequencyStore.setAnalyser(analyser);
		return engine;
	}

	try {
		engine = new AudioEngine();
		const initialized = engine.initialize();

		if (!initialized) {
			console.error('[PlayerStore] Failed to initialize audio engine');
			return null;
		}

		// Set analyser on frequency store after initialization
		const analyser = engine.getAnalyser();
		frequencyStore.setAnalyser(analyser);

		return engine;
	} catch (err) {
		console.error('[PlayerStore] Error creating engine:', err);
		return null;
	}
}

/**
 * HMR cleanup - reset module state when module is hot-replaced
 */
if (import.meta.hot) {
	import.meta.hot.dispose(() => {
		if (engine) {
			engine.destroy();
			engine = null;
		}
	});
}

/**
 * Player store - singleton providing reactive access to audio state
 */
export const playerStore = {
	/**
	 * Load tracks into the player
	 */
	loadTracks(tracks: AudioTrack[]): void {
		const audioEngine = getEngine();
		if (!audioEngine) {
			console.error('[PlayerStore] No audio engine available');
			return;
		}

		// Set up frequency store with first track's config if available
		const firstTrack = tracks[0];
		if (firstTrack) {
			frequencyStore.setTrackId(firstTrack.id, firstTrack.frequencyConfig ?? null);
		}

		buffersLoadedStore.set(false);
		audioEngine.loadBuffers(tracks).then(() => {
			buffersLoadedStore.set(true);
		});
	},

	/**
	 * Toggle play/pause
	 */
	togglePlayPause(): void {
		getEngine()?.togglePlayPause();
	},

	/**
	 * Stop playback and reset
	 */
	stopAndReset(): Promise<void> {
		return getEngine()?.stopAndReset() ?? Promise.resolve();
	},

	/**
	 * Seek to a specific time
	 */
	seek(time: number): void {
		getEngine()?.seek(time);
	},

	/**
	 * Go to next track
	 */
	nextTrack(): void {
		const engine = getEngine();
		if (!engine) return;

		// Calculate next track index
		let nextIndex: number;
		if (engine.isShuffleEnabled) {
			const unplayed = engine.tracks.map((_, i) => i).filter((i) => i !== engine.currentTrackIndex);
			nextIndex = unplayed.length > 0 ? unplayed[Math.floor(Math.random() * unplayed.length)]! : 0;
		} else {
			nextIndex = Math.min(engine.currentTrackIndex + 1, engine.tracks.length - 1);
		}

		// Update frequency store config when track changes
		const track = engine.tracks[nextIndex];
		if (track) {
			frequencyStore.setTrackId(track.id, track.frequencyConfig ?? null);
		}

		engine.nextTrack();
	},

	/**
	 * Go to previous track
	 */
	previousTrack(): void {
		const engine = getEngine();
		if (!engine) return;

		// Calculate previous track index
		let prevIndex: number;
		if (engine.isShuffleEnabled) {
			prevIndex = Math.max(0, engine.currentTrackIndex - 1);
		} else {
			prevIndex = Math.max(0, engine.currentTrackIndex - 1);
		}

		// Update frequency store config when track changes
		const track = engine.tracks[prevIndex];
		if (track) {
			frequencyStore.setTrackId(track.id, track.frequencyConfig ?? null);
		}

		engine.previousTrack();
	},

	/**
	 * Start playing a specific track
	 */
	startTrack(index: number): void {
		const engine = getEngine();
		if (!engine) return;

		// Update frequency store config when track changes
		const track = engine.tracks[index];
		if (track) {
			frequencyStore.setTrackId(track.id, track.frequencyConfig ?? null);
		}

		engine.startTrack(index);
	},

	/**
	 * Queue a specific track (set as current without playing)
	 */
	queueTrack(index: number): void {
		getEngine()?.queueTrack(index);
	},

	/**
	 * Toggle shuffle mode
	 */
	toggleShuffle(): void {
		getEngine()?.toggleShuffle();
	},

	/**
	 * Toggle loop mode
	 */
	toggleLoop(): void {
		getEngine()?.toggleLoop();
	},

	/**
	 * Set volume (0-1)
	 */
	setVolume(value: number): void {
		getEngine()?.setVolume(value);
	},

	/**
	 * Retry loading tracks after error
	 */
	retryLoad(): Promise<void> {
		return getEngine()?.retryLoad() ?? Promise.resolve();
	},

	/**
	 * Get the analyser node for visualization
	 */
	getAnalyser(): AnalyserNode | null {
		const analyser = getEngine()?.getAnalyser() ?? null;
		// Update frequency store with analyser reference
		frequencyStore.setAnalyser(analyser);
		return analyser;
	},

	/**
	 * Get the current track metadata
	 */
	get currentTrack(): AudioTrack | null {
		return getEngine()?.currentTrack ?? null;
	},

	/**
	 * Reactive state getters
	 */
	get isPlaying(): boolean {
		return getEngine()?.isPlaying ?? false;
	},

	get isLoading(): boolean {
		return getEngine()?.isLoading ?? false;
	},

	get isBuffering(): boolean {
		return getEngine()?.isBuffering ?? false;
	},

	get error(): string | null {
		return getEngine()?.error ?? null;
	},

	get currentTime(): number {
		return getEngine()?.currentTime ?? 0;
	},

	get duration(): number {
		return getEngine()?.duration ?? 0;
	},

	get progress(): number {
		return getEngine()?.progress ?? 0;
	},

	get volume(): number {
		return getEngine()?.volume ?? 1;
	},

	get tracks(): AudioTrack[] {
		return getEngine()?.tracks ?? [];
	},

	get currentTrackIndex(): number {
		return getEngine()?.currentTrackIndex ?? 0;
	},

	get buffersLoaded(): boolean {
		return getEngine()?.buffersLoaded ?? false;
	},

	get isShuffleEnabled(): boolean {
		return getEngine()?.isShuffleEnabled ?? false;
	},

	get isLoopEnabled(): boolean {
		return getEngine()?.isLoopEnabled ?? false;
	},

	get canGoPrevious(): boolean {
		return getEngine()?.canGoPrevious ?? false;
	},

	get canGoNext(): boolean {
		return getEngine()?.canGoNext ?? false;
	},

	/**
	 * View state - maximized or minimized
	 */
	get isMaximized(): boolean {
		return isMaximized;
	},

	set isMaximized(value: boolean) {
		isMaximized = value;
	},

	/**
	 * Toggle between maximized and minimized view
	 */
	toggleView(): void {
		isMaximized = !isMaximized;
	},

	/**
	 * Maximize the player (show full playlist)
	 */
	maximize(): void {
		isMaximized = true;
	},

	/**
	 * Minimize the player (show only transport)
	 */
	minimize(): void {
		isMaximized = false;
	}
};
