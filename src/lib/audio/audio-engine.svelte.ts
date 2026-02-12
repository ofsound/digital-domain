/**
 * AudioEngine - Combined playlist audio engine with iOS optimizations
 *
 * Features:
 * - Playlist/queue playback with multiple tracks
 * - Next/previous track navigation
 * - Auto-advance when track ends
 * - Shuffle mode with history tracking
 * - Loop mode
 * - Skip failed tracks automatically
 *
 * iOS Audio Strategy (critical for smooth playback):
 * - Never suspend AudioContext on pause/stop (avoids suspend→resume click)
 * - Use 20ms fade in/out ramps on all state changes
 * - Replace gain nodes when starting from stop/pause (clears automation history)
 * - Analyser smoothing reset on stop, restored 50ms after play starts
 * - Synchronization via AudioContext.currentTime, not setTimeout
 */

import { AUDIO_CONFIG, AUDIO_DERIVED, getAdaptiveConcurrencyLimit } from './audio-config';
import { PlaybackState, type AudioTrack } from './playback-state';

/**
 * Runtime validation for AudioTrack objects
 */
function isValidTrack(track: unknown): track is AudioTrack {
	if (typeof track !== 'object' || track === null) return false;
	const t = track as Record<string, unknown>;
	return (
		typeof t.id === 'string' &&
		typeof t.name === 'string' &&
		typeof t.url === 'string' &&
		t.id.length > 0 &&
		t.name.length > 0 &&
		t.url.length > 0
	);
}

export class AudioEngine {
	/**
	 * ============================================================================
	 * REACTIVE STATE (Svelte 5 Runes)
	 * ============================================================================
	 */

	/** Whether audio is currently playing */
	isPlaying = $state(false);

	/** Whether audio is currently loading/buffering */
	isLoading = $state(false);

	/** Whether we're seeking or switching tracks */
	isBuffering = $state(false);

	/** Current error message, or null if no error */
	error = $state<string | null>(null);

	/** Current playback position in seconds */
	currentTime = $state(0);

	/** Total duration of current audio in seconds */
	duration = $state(0);

	/** Volume level (0-1) */
	volume = $state(1);

	/** Low-pass filter frequency in Hz (20-20000) */
	filterFrequency: number = $state(AUDIO_CONFIG.DEFAULT_FILTER_FREQUENCY_HZ);

	/** Playback progress as percentage (0-100) */
	progress = $derived(this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0);

	/** Whether the audio engine has been initialized */
	isInitialized = $state(false);

	/** Array of track metadata */
	tracks = $state<AudioTrack[]>([]);

	/** Index of currently playing track */
	currentTrackIndex = $state(0);

	/** Whether all buffers have been loaded */
	buffersLoaded = $state(false);

	/** Whether shuffle mode is enabled */
	isShuffleEnabled = $state(false);

	/** Whether loop mode is enabled (playlist repeats indefinitely) */
	isLoopEnabled = $state(false);

	/**
	 * ============================================================================
	 * WEB AUDIO API NODES
	 * ============================================================================
	 */

	/** The Web Audio API context */
	private audioContext: AudioContext | null = null;

	/** Analyser node for frequency visualization */
	private analyser: AnalyserNode | null = null;

	/** Gain node for volume control */
	private gainNode: GainNode | null = null;

	/** Biquad filter node for low-pass filtering */
	private filterNode: BiquadFilterNode | null = null;

	/**
	 * ============================================================================
	 * PLAYBACK STATE
	 * ============================================================================
	 */

	/** Decoded audio buffers for all tracks */
	private buffers: AudioBuffer[] = [];

	/** The current audio buffer source node */
	private source: AudioBufferSourceNode | null = null;

	/** Whether the source has been started */
	private sourceHasStarted = false;

	/** AudioContext time when playback started */
	private startTime = 0;

	/** Time position when paused */
	private pausedAt = 0;

	/** Playback session ID - incremented when starting new playback */
	private playbackSessionId = 0;

	/** Whether this is the first play */
	private isFirstPlay = true;

	/** Whether a load operation is in progress */
	private loadInProgress = false;

	/** Operation ID counter for canceling superseded load operations */
	private loadOperationId = 0;

	/**
	 * ============================================================================
	 * SHUFFLE STATE
	 * ============================================================================
	 */

	/** History of played track indices for shuffle back-navigation */
	private playedIndices: number[] = [];

	/**
	 * ============================================================================
	 * TIMING & ANIMATION
	 * ============================================================================
	 */

	/** ID of the requestAnimationFrame loop */
	private animationFrameId: number | null = null;

	/** When the current fade operation will complete */
	private fadeCompleteTime: number | null = null;

	/** Callback to execute when fade completes */
	private onFadeComplete: (() => void) | null = null;

	/**
	 * ============================================================================
	 * GAIN NODE REPLACEMENT QUEUE
	 * ============================================================================
	 */

	/** Queue for gain node replacement operations */
	private gainReplaceQueue: Array<() => void> = [];

	/** Whether gain node replacement is currently being processed */
	private isProcessingGainReplace = false;

	/**
	 * ============================================================================
	 * ENVIRONMENT
	 * ============================================================================
	 */

	/** Whether we're running in a browser (for SSR safety) */
	private readonly isBrowser: boolean;

	/**
	 * ============================================================================
	 * CONSTRUCTOR
	 * ============================================================================
	 */

	constructor() {
		this.isBrowser = typeof window !== 'undefined';
	}

	/**
	 * ============================================================================
	 * INITIALIZATION
	 * ============================================================================
	 */

	/**
	 * Initialize the Web Audio API context and create all audio nodes.
	 * Must be called before any audio operations. Safe to call multiple times.
	 */
	initialize(): boolean {
		if (!this.isBrowser) {
			return false;
		}

		const needsReinit =
			!this.isInitialized || !this.audioContext || this.audioContext.state === 'closed';

		if (!needsReinit) {
			return true;
		}

		try {
			// Cancel any existing animation frame
			if (this.animationFrameId) {
				cancelAnimationFrame(this.animationFrameId);
				this.animationFrameId = null;
			}

			// Clean up any existing closed context
			if (this.audioContext?.state === 'closed') {
				this.cleanup();
			}

			// Create fresh AudioContext - suspended by default until user interaction
			this.audioContext = new window.AudioContext();
			this.audioContext.suspend();

			// Create analyser for frequency visualization
			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = AUDIO_CONFIG.ANALYSER_FFT_SIZE;

			// Create gain node for volume control
			this.gainNode = this.audioContext.createGain();
			this.gainNode.gain.value = this.volume;

			// Create low-pass filter
			this.filterNode = this.audioContext.createBiquadFilter();
			this.filterNode.type = 'lowpass';
			this.filterNode.frequency.value = this.filterFrequency;
			this.filterNode.Q.value = AUDIO_CONFIG.FILTER_Q;

			// Listen for context state changes
			this.audioContext.addEventListener('statechange', () => {
				if (this.audioContext) {
					if (this.audioContext.state === 'running' && this.source && this.sourceHasStarted) {
						this.isPlaying = true;
					} else if (this.audioContext.state !== 'running') {
						this.isPlaying = false;
					}
				}
			});

			// Start the time update loop
			this.updateTimeLoop();

			this.isInitialized = true;
			return true;
		} catch (err) {
			this.reportError('Failed to initialize audio engine', 'Initialization failed', err, true);
			this.isInitialized = false;
			return false;
		}
	}

	/**
	 * Ensure the audio engine is initialized before proceeding.
	 */
	private ensureInitialized(): boolean {
		const needsInit =
			!this.isInitialized || !this.audioContext || this.audioContext.state === 'closed';

		if (needsInit) {
			const success = this.initialize();
			return success && this.audioContext !== null;
		}
		return this.audioContext !== null;
	}

	/**
	 * ============================================================================
	 * PLAYLIST LOADING
	 * ============================================================================
	 */

	/**
	 * Load multiple audio tracks from an array of track metadata.
	 * Automatically skips tracks that fail to load.
	 */
	async loadBuffers(trackList: AudioTrack[]): Promise<void> {
		// Runtime validation
		if (!Array.isArray(trackList) || !trackList.every(isValidTrack)) {
			this.reportError('Invalid tracks data', 'Tracks array validation failed', undefined, true);
			return;
		}

		const operationId = ++this.loadOperationId;

		if (!this.isBrowser) {
			return;
		}

		if (!this.ensureInitialized()) {
			if (this.loadOperationId === operationId) {
				this.error = 'Audio engine not initialized';
			}
			return;
		}

		const ctx = this.audioContext;
		if (!ctx) {
			if (this.loadOperationId === operationId) {
				this.error = 'Audio context not available';
			}
			return;
		}

		if (this.loadOperationId === operationId) {
			this.loadInProgress = true;
			this.tracks = trackList;
			this.isLoading = true;
			this.error = null;
		}

		try {
			// Load tracks with adaptive concurrency
			const MAX_CONCURRENCY = getAdaptiveConcurrencyLimit();
			const results: (AudioBuffer | null)[] = new Array(trackList.length).fill(null);
			let currentIndex = 0;

			const loadTrack = async (trackIndex: number): Promise<void> => {
				const track = trackList[trackIndex];
				try {
					const response = await fetch(track.url);

					if (this.loadOperationId !== operationId) {
						return;
					}

					if (!response.ok) {
						throw new Error(`Failed to fetch ${track.name}: ${response.statusText}`);
					}

					const arrayBuffer = await response.arrayBuffer();

					if (this.loadOperationId !== operationId) {
						return;
					}

					if (!this.audioContext || this.audioContext.state === 'closed') {
						throw new Error('Audio context destroyed during load');
					}

					const buffer = await this.audioContext.decodeAudioData(arrayBuffer);
					results[trackIndex] = buffer;
				} catch (err) {
					console.error(`[AudioEngine] Error loading track ${track.name}:`, err);
				}
			};

			const worker = async (): Promise<void> => {
				while (currentIndex < trackList.length) {
					const trackIndex = currentIndex++;
					await loadTrack(trackIndex);
				}
			};

			const workers: Promise<void>[] = [];
			for (let i = 0; i < Math.min(MAX_CONCURRENCY, trackList.length); i++) {
				workers.push(worker());
			}
			await Promise.all(workers);

			if (this.loadOperationId !== operationId) {
				return;
			}

			this.buffers = results.filter((buffer): buffer is AudioBuffer => buffer !== null);

			if (this.buffers.length === 0) {
				this.error = 'Failed to load any audio tracks';
			} else if (this.buffers.length < trackList.length) {
				console.warn(`[AudioEngine] Loaded ${this.buffers.length} of ${trackList.length} tracks`);
			}

			this.buffersLoaded = true;

			const firstValidBuffer = this.buffers.find((b) => b !== null);
			if (firstValidBuffer) {
				this.duration = firstValidBuffer.duration;
			}

			this.armAudio(0);
		} catch (err) {
			if (this.loadOperationId === operationId) {
				this.error = err instanceof Error ? err.message : 'Failed to load audio';
				console.error('[AudioEngine] Error loading buffers:', err);
				this.buffersLoaded = false;
			}
		} finally {
			if (this.loadOperationId === operationId) {
				this.isLoading = false;
				this.loadInProgress = false;
			}
		}
	}

	/**
	 * Retry loading all tracks.
	 */
	async retryLoad(): Promise<void> {
		await this.loadBuffers(this.tracks);
	}

	/**
	 * ============================================================================
	 * PLAYBACK CONTROLS
	 * ============================================================================
	 */

	/**
	 * Toggle play/pause based on current state.
	 */
	togglePlayPause(): void {
		const needsReinit = !this.audioContext || this.audioContext.state === 'closed';

		if (needsReinit) {
			const reinitSuccess = this.initialize();
			if (!reinitSuccess || !this.audioContext) {
				console.error('[AudioEngine] Failed to reinitialize audio context');
				this.error = 'Failed to initialize audio';
				return;
			}
			if (this.tracks.length > 0) {
				this.loadBuffers(this.tracks);
				return;
			}
		}

		if (!this.audioContext || !this.buffersLoaded || this.buffers.length === 0) {
			return;
		}

		const state = this.getCurrentState();

		if (state.playback === PlaybackState.PLAYING && state.contextState === 'running') {
			this.transitionToPaused();
		} else if (state.playback === PlaybackState.PAUSED) {
			this.transitionToPlayingFromPaused();
		} else if (state.isFirstPlay) {
			this.isFirstPlay = false;
			this.transitionToPlayingFromStart();
		} else if (state.contextState === 'suspended') {
			this.transitionToPlayingFromSuspended();
		} else {
			this.transitionToPlayingFromStart();
		}
	}

	/**
	 * Stop playback and reset to beginning.
	 */
	stopAndReset(): Promise<void> {
		return new Promise((resolve) => {
			if (!this.audioContext) {
				resolve();
				return;
			}

			this.fadeOut(() => {
				if (this.audioContext && this.gainNode) {
					const t = this.audioContext.currentTime;
					this.gainNode.gain.cancelScheduledValues(t);
					this.gainNode.gain.setValueAtTime(0, t);
				}

				if (this.source) {
					try {
						this.source.disconnect();
					} catch (err) {
						console.error('[AudioEngine] Failed to disconnect source during stop:', err);
					}
					this.source = null;
					this.sourceHasStarted = false;
				}

				this.isPlaying = false;
				this.currentTime = 0;
				this.currentTrackIndex = 0;
				this.isFirstPlay = true;
				this.playedIndices = [];
				this.pausedAt = 0;

				if (this.analyser) {
					this.analyser.smoothingTimeConstant = 0;
				}

				const firstValidBuffer = this.buffers.find((b) => b !== null);
				if (firstValidBuffer) {
					this.duration = firstValidBuffer.duration;
				}

				resolve();
			});
		});
	}

	/**
	 * Seek to a specific time position in the current track.
	 */
	seek(time: number): void {
		const ctx = this.audioContext;
		const gain = this.gainNode;
		const filter = this.filterNode;
		const analyser = this.analyser;
		const buffer = this.buffers[this.currentTrackIndex];

		if (!buffer || !ctx || !gain || !filter || !analyser) return;

		const clampedTime = Math.max(0, Math.min(time, this.duration));

		const createAndStartSource = (): void => {
			const newSource = ctx.createBufferSource();
			newSource.buffer = buffer;
			newSource.connect(filter).connect(gain).connect(analyser).connect(ctx.destination);

			newSource.onended = () => {
				if (
					this.isPlaying &&
					this.currentTime >= this.duration - AUDIO_CONFIG.TRACK_END_THRESHOLD_S
				) {
					this.onTrackEnded();
				}
			};

			newSource.start(0, clampedTime);

			this.source = newSource;
			this.sourceHasStarted = true;
			this.startTime = ctx.currentTime - clampedTime;
			this.currentTime = clampedTime;
			this.isPlaying = true;
			this.isFirstPlay = false;
			gain.gain.setValueAtTime(0, ctx.currentTime);
			this.fadeIn();
		};

		const doSeek = (): void => {
			if (ctx.state === 'suspended') {
				ctx
					.resume()
					.then(() => createAndStartSource())
					.catch((err) => {
						console.error('[AudioEngine] Failed to resume for seek:', err);
					});
			} else {
				createAndStartSource();
			}
		};

		if (this.source && this.sourceHasStarted) {
			this.fadeOut(() => {
				try {
					this.source?.stop();
				} catch (err) {
					console.error('[AudioEngine] Failed to stop source during seek:', err);
				} finally {
					this.source = null;
					this.sourceHasStarted = false;
				}
				doSeek();
			});
		} else {
			doSeek();
		}
	}

	/**
	 * ============================================================================
	 * STATE TRANSITIONS
	 * ============================================================================
	 */

	/**
	 * STATE TRANSITION: PLAYING → PAUSED
	 */
	private transitionToPaused(): void {
		this.pausedAt = this.currentTime;
		this.isPlaying = false;

		this.fadeOut(() => {
			if (this.source) {
				try {
					this.source.stop();
					this.source.disconnect();
				} catch (err) {
					this.reportError('', 'Failed to stop source during pause', err, false);
				} finally {
					this.source = null;
					this.sourceHasStarted = true;
				}
			}
		});
	}

	/**
	 * STATE TRANSITION: SUSPENDED → PLAYING
	 */
	private transitionToPlayingFromSuspended(): void {
		const ctx = this.audioContext;
		const gain = this.gainNode;
		if (!ctx || !gain) return;

		const t = ctx.currentTime;
		gain.gain.cancelScheduledValues(t);
		gain.gain.setValueAtTime(0, t);

		ctx
			.resume()
			.then(() => {
				this.isPlaying = true;
				this.replaceGainNodeWithFresh();
				setTimeout(() => this.fadeIn(), 10);
			})
			.catch((err) => {
				this.reportError(
					'Failed to start audio playback',
					'Failed to resume audio context',
					err,
					true
				);
			});
	}

	/**
	 * STATE TRANSITION: PAUSED → PLAYING
	 */
	private transitionToPlayingFromPaused(): void {
		const ctx = this.audioContext;
		const buffer = this.buffers[this.currentTrackIndex];

		if (!ctx || !buffer || !this.filterNode || !this.gainNode || !this.analyser) return;

		if (this.source) {
			try {
				this.source.disconnect();
			} catch (err) {
				this.reportError('', 'Failed to disconnect old source in resume', err, false);
			}
		}

		const newSource = ctx.createBufferSource();
		newSource.buffer = buffer;
		newSource
			.connect(this.filterNode)
			.connect(this.gainNode)
			.connect(this.analyser)
			.connect(ctx.destination);

		newSource.onended = () => {
			if (
				this.isPlaying &&
				this.currentTime >= this.duration - AUDIO_CONFIG.TRACK_END_THRESHOLD_S
			) {
				this.onTrackEnded();
			}
		};

		this.source = newSource;
		this.sourceHasStarted = true;

		newSource.start(0, this.pausedAt);

		this.startTime = ctx.currentTime - this.pausedAt;
		this.isPlaying = true;

		if (this.analyser) {
			this.analyser.smoothingTimeConstant = 0;
			setTimeout(() => {
				if (this.analyser)
					this.analyser.smoothingTimeConstant = AUDIO_CONFIG.ANALYSER_SMOOTHING_TIME_CONSTANT;
			}, AUDIO_CONFIG.ANALYSER_SMOOTHING_RESTORE_DELAY_MS);
		}

		this.replaceGainNodeWithFresh();
		this.fadeIn();
	}

	/**
	 * STATE TRANSITION: STOPPED/READY → PLAYING
	 */
	private transitionToPlayingFromStart(): void {
		const currentIndex = this.currentTrackIndex;
		const buffer = this.buffers[currentIndex];

		if (!buffer) {
			console.error('[AudioEngine] No buffer available for current track');
			return;
		}

		const ctx = this.audioContext;
		if (!ctx) return;

		const startPlayback = () => {
			this.replaceGainNodeWithFresh();
			this.armAudio(currentIndex, () => {
				if (!this.source) {
					console.error('[AudioEngine] Failed to create audio source');
					return;
				}

				const audioCtx = this.audioContext;
				if (!audioCtx) {
					console.error('[AudioEngine] Audio context lost during playback start');
					return;
				}

				if (this.gainNode) {
					const t = audioCtx.currentTime;
					this.gainNode.gain.cancelScheduledValues(t);
					this.gainNode.gain.setValueAtTime(0, t);
				}

				if (this.analyser) {
					this.analyser.smoothingTimeConstant = 0;
				}

				this.source.start(0);
				this.sourceHasStarted = true;
				this.startTime = audioCtx.currentTime;
				this.isPlaying = true;
				this.fadeIn();

				if (this.analyser) {
					setTimeout(() => {
						if (this.analyser)
							this.analyser.smoothingTimeConstant = AUDIO_CONFIG.ANALYSER_SMOOTHING_TIME_CONSTANT;
					}, AUDIO_CONFIG.ANALYSER_SMOOTHING_RESTORE_DELAY_MS);
				}
			});
		};

		if (ctx.state === 'suspended') {
			if (this.gainNode) {
				const t = ctx.currentTime;
				this.gainNode.gain.cancelScheduledValues(t);
				this.gainNode.gain.setValueAtTime(0, t);
			}
			ctx
				.resume()
				.then(() => {
					const audioCtx = this.audioContext;
					if (audioCtx && this.gainNode) {
						const t = audioCtx.currentTime;
						this.gainNode.gain.cancelScheduledValues(t);
						this.gainNode.gain.setValueAtTime(0, t);
					}
					setTimeout(() => startPlayback(), AUDIO_CONFIG.PLAYBACK_START_DELAY_MS);
				})
				.catch((err) => {
					console.error(`[AudioEngine] Failed to resume audio context:`, err);
				});
		} else {
			if (this.gainNode) {
				const t = ctx.currentTime;
				this.gainNode.gain.cancelScheduledValues(t);
				this.gainNode.gain.setValueAtTime(0, t);
			}
			setTimeout(() => startPlayback(), AUDIO_CONFIG.PLAYBACK_START_DELAY_MS);
		}
	}

	/**
	 * ============================================================================
	 * AUDIO PREPARATION
	 * ============================================================================
	 */

	/**
	 * Prepare audio source for a specific track.
	 */
	private armAudio(index: number, afterReady?: () => void): void {
		const ctx = this.audioContext;
		const gain = this.gainNode;
		const analyser = this.analyser;
		const filter = this.filterNode;
		const buffer = this.buffers[index];

		if (!ctx || !gain || !analyser || !filter || !buffer) return;

		const createNewSource = (): void => {
			const t = ctx.currentTime;
			gain.gain.cancelScheduledValues(t);
			gain.gain.setValueAtTime(0, t);

			if (this.source) {
				try {
					this.source.disconnect();
				} catch (err) {
					console.error('[AudioEngine] Failed to disconnect source in armAudio:', err);
				}
				this.source = null;
			}

			const newSource = ctx.createBufferSource();
			newSource.buffer = buffer;
			newSource.connect(filter).connect(gain).connect(analyser).connect(ctx.destination);

			newSource.onended = () => {
				if (
					this.isPlaying &&
					this.currentTime >= this.duration - AUDIO_CONFIG.TRACK_END_THRESHOLD_S
				) {
					this.onTrackEnded();
				}
			};

			this.source = newSource;
			this.sourceHasStarted = false;

			const now = ctx.currentTime;
			gain.gain.cancelScheduledValues(now);
			gain.gain.setValueAtTime(0, now);

			afterReady?.();
		};

		if (this.source && this.sourceHasStarted) {
			this.fadeOut(() => {
				try {
					this.source?.stop();
				} catch (err) {
					console.error('[AudioEngine] Failed to stop source during armAudio:', err);
				} finally {
					this.source = null;
					this.sourceHasStarted = false;
				}
				createNewSource();
			});
		} else {
			createNewSource();
		}
	}

	/**
	 * ============================================================================
	 * FADE OPERATIONS (iOS Click Prevention)
	 * ============================================================================
	 */

	/**
	 * Fade in audio over 20ms to prevent clicks on iOS.
	 */
	private fadeIn(): void {
		const ctx = this.audioContext;
		const gain = this.gainNode;
		if (!ctx || !gain) return;

		const now = ctx.currentTime;
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(this.volume, now + AUDIO_DERIVED.FADE_DURATION_S);
	}

	/**
	 * Fade out audio over 20ms to prevent clicks on iOS.
	 */
	private fadeOut(onComplete?: () => void): void {
		const ctx = this.audioContext;
		const gain = this.gainNode;

		if (!ctx || !gain) {
			onComplete?.();
			return;
		}

		const now = ctx.currentTime;
		gain.gain.setValueAtTime(gain.gain.value, now);
		gain.gain.linearRampToValueAtTime(0, now + AUDIO_DERIVED.FADE_DURATION_S);

		this.fadeCompleteTime = now + AUDIO_DERIVED.FADE_DURATION_S;
		this.onFadeComplete = onComplete ?? null;
	}

	/**
	 * Replace the gain node with a fresh one to clear automation history.
	 * Critical for iOS: prevents clicks from stale gain state.
	 */
	private replaceGainNodeWithFresh(): void {
		const ctx = this.audioContext;
		const filter = this.filterNode;
		const analyser = this.analyser;
		const oldGain = this.gainNode;

		if (!ctx || !filter || !analyser || !oldGain) return;

		this.gainReplaceQueue.push(() => {
			try {
				const newGain = ctx.createGain();
				const t = ctx.currentTime;
				newGain.gain.setValueAtTime(0, t);

				filter.disconnect();
				oldGain.disconnect();
				filter.connect(newGain);
				newGain.connect(analyser);

				this.gainNode = newGain;
			} catch (err) {
				this.reportError('', 'Failed to replace gain node', err, false);
			}
		});

		this.processGainReplaceQueue();
	}

	/**
	 * Process the gain replacement queue serially.
	 */
	private processGainReplaceQueue(): void {
		if (this.isProcessingGainReplace || this.gainReplaceQueue.length === 0) {
			return;
		}

		this.isProcessingGainReplace = true;

		while (this.gainReplaceQueue.length > 0) {
			const operation = this.gainReplaceQueue.shift();
			if (operation) {
				operation();
			}
		}

		this.isProcessingGainReplace = false;
	}

	/**
	 * ============================================================================
	 * PLAYLIST CONTROLS
	 * ============================================================================
	 */

	/**
	 * Start playing a specific track by index.
	 */
	startTrack(index: number): void {
		if (index < 0 || index >= this.buffers.length) return;

		this.fadeOut(() => {
			this.currentTrackIndex = index;
			this.currentTime = 0;

			if (this.buffers[index]) {
				this.duration = this.buffers[index].duration;
			}

			this.armAudio(index, () => {
				if (this.source && this.audioContext) {
					this.source.start(0);
					this.sourceHasStarted = true;
					this.startTime = this.audioContext.currentTime;
					this.isPlaying = true;
					this.fadeIn();
				}
			});
		});
	}

	/**
	 * Queue a specific track by index (set as current without playing).
	 * When not playing, updates immediately so the UI shows the correct track without delay.
	 */
	queueTrack(index: number): void {
		if (index < 0 || index >= this.buffers.length) return;

		const runUpdate = (): void => {
			this.currentTrackIndex = index;
			this.currentTime = 0;
			this.isPlaying = false;

			if (this.buffers[index]) {
				this.duration = this.buffers[index].duration;
			}

			this.armAudio(index, () => {
				// Track is armed and ready, but don't start playing
				this.sourceHasStarted = false;
			});
		};

		if (!this.isPlaying) {
			runUpdate();
		} else {
			this.fadeOut(runUpdate);
		}
	}

	/**
	 * Skip to next track.
	 */
	nextTrack(): void {
		this.playedIndices.push(this.currentTrackIndex);

		if (this.playedIndices.length > AUDIO_CONFIG.MAX_SHUFFLE_HISTORY) {
			this.playedIndices = this.playedIndices.slice(-AUDIO_CONFIG.MAX_SHUFFLE_HISTORY);
		}

		const nextIndex = this.getNextTrackIndex();
		this.startTrack(nextIndex);
	}

	/**
	 * Go to previous track.
	 */
	previousTrack(): void {
		const prevIndex = this.getPreviousTrackIndex();
		this.startTrack(prevIndex);
	}

	/**
	 * Toggle shuffle mode on/off.
	 */
	toggleShuffle(): void {
		this.isShuffleEnabled = !this.isShuffleEnabled;
		if (this.isShuffleEnabled) {
			this.playedIndices = [this.currentTrackIndex];
		}
	}

	/**
	 * Toggle loop mode on/off.
	 */
	toggleLoop(): void {
		this.isLoopEnabled = !this.isLoopEnabled;
	}

	/**
	 * Calculate the next track index.
	 */
	private getNextTrackIndex(): number {
		if (this.isShuffleEnabled) {
			return this.getRandomUnplayedTrack();
		}
		return (this.currentTrackIndex + 1) % this.buffers.length;
	}

	/**
	 * Calculate the previous track index.
	 */
	private getPreviousTrackIndex(): number {
		if (this.isShuffleEnabled && this.playedIndices.length > 0) {
			this.playedIndices.pop();
			return this.playedIndices.pop() ?? 0;
		}
		return this.currentTrackIndex > 0 ? this.currentTrackIndex - 1 : this.buffers.length - 1;
	}

	/**
	 * Get a random unplayed track for shuffle mode.
	 */
	private getRandomUnplayedTrack(): number {
		const unplayed = this.buffers.map((_, i) => i).filter((i) => !this.playedIndices.includes(i));

		if (unplayed.length === 0) {
			this.playedIndices = [this.currentTrackIndex];
			return Math.floor(Math.random() * this.buffers.length);
		}

		return unplayed[Math.floor(Math.random() * unplayed.length)];
	}

	/**
	 * Handle track naturally reaching the end.
	 */
	private onTrackEnded(): void {
		this.playedIndices.push(this.currentTrackIndex);

		if (this.playedIndices.length > AUDIO_CONFIG.MAX_SHUFFLE_HISTORY) {
			this.playedIndices = this.playedIndices.slice(-AUDIO_CONFIG.MAX_SHUFFLE_HISTORY);
		}

		const nextIndex = this.getNextTrackIndex();

		this.fadeOut(() => {
			this.currentTrackIndex = nextIndex;
			this.currentTime = 0;

			if (this.buffers[nextIndex]) {
				this.duration = this.buffers[nextIndex].duration;
			}

			if (nextIndex === 0 && this.playedIndices.length >= this.buffers.length) {
				if (this.isLoopEnabled) {
					this.playedIndices = [];
				} else {
					this.isPlaying = false;
					this.isFirstPlay = true;
					this.playedIndices = [];
					if (this.analyser) {
						this.analyser.smoothingTimeConstant = 0;
					}
					return;
				}
			}

			this.armAudio(nextIndex, () => {
				if (this.source && this.audioContext) {
					this.source.start(0);
					this.sourceHasStarted = true;
					this.startTime = this.audioContext.currentTime;
					this.isPlaying = true;
					this.fadeIn();
				}
			});
		});
	}

	/**
	 * ============================================================================
	 * PUBLIC CONTROLS
	 * ============================================================================
	 */

	/**
	 * Set volume level (0-1).
	 */
	setVolume(value: number): void {
		this.volume = Math.max(0, Math.min(1, value));
		if (this.gainNode) {
			this.gainNode.gain.value = this.volume;
		}
	}

	/**
	 * Set low-pass filter frequency (20-20000 Hz).
	 */
	setFilterFrequency(value: number): void {
		this.filterFrequency = Math.max(
			AUDIO_CONFIG.MIN_FILTER_FREQUENCY_HZ,
			Math.min(AUDIO_CONFIG.DEFAULT_FILTER_FREQUENCY_HZ, value)
		);
		if (this.filterNode) {
			this.filterNode.frequency.value = this.filterFrequency;
		}
	}

	/**
	 * Get the analyser node for visualization components.
	 */
	getAnalyser(): AnalyserNode | null {
		return this.analyser;
	}

	/**
	 * Get metadata for the currently playing track.
	 */
	get currentTrack(): AudioTrack | null {
		return this.tracks[this.currentTrackIndex] ?? null;
	}

	/**
	 * Get the duration of a specific track.
	 */
	getTrackDuration(trackIndex: number): number {
		return this.buffers[trackIndex]?.duration ?? 0;
	}

	/**
	 * Get the total duration of all tracks.
	 */
	getTotalDuration(): number {
		return this.buffers.reduce((sum, buffer) => sum + (buffer?.duration ?? 0), 0);
	}

	/**
	 * ============================================================================
	 * STATE MACHINE
	 * ============================================================================
	 */

	/**
	 * Determine current playback state.
	 */
	private getCurrentState(): {
		playback: PlaybackState;
		contextState: AudioContextState | null;
		hasSource: boolean;
		sourceStarted: boolean;
		isFirstPlay: boolean;
	} {
		return {
			playback: this.determinePlaybackState(),
			contextState: this.audioContext?.state ?? null,
			hasSource: this.source !== null,
			sourceStarted: this.sourceHasStarted,
			isFirstPlay: this.isFirstPlay
		};
	}

	/**
	 * Map internal flags to a PlaybackState enum value.
	 */
	private determinePlaybackState(): PlaybackState {
		if (this.error) return PlaybackState.ERROR;
		if (this.isLoading) return PlaybackState.LOADING;
		if (!this.buffersLoaded || this.buffers.length === 0) return PlaybackState.IDLE;
		if (this.isBuffering) return PlaybackState.SEEKING;

		if (this.isPlaying && this.sourceHasStarted) {
			return PlaybackState.PLAYING;
		}

		if (!this.isPlaying && this.sourceHasStarted) {
			return PlaybackState.PAUSED;
		}

		if (!this.isPlaying && !this.source && !this.isFirstPlay) {
			return PlaybackState.STOPPED;
		}

		if (!this.isPlaying && this.isFirstPlay) {
			return PlaybackState.READY;
		}

		return PlaybackState.IDLE;
	}

	/**
	 * ============================================================================
	 * TIME TRACKING
	 * ============================================================================
	 */

	/**
	 * Animation loop for tracking playback progress and fade completion.
	 */
	private updateTimeLoop(): void {
		let lastSessionId = 0;
		const update = () => {
			if (this.isPlaying && this.sourceHasStarted && this.playbackSessionId === lastSessionId) {
				this.currentTime = (this.audioContext?.currentTime ?? 0) - this.startTime;
				if (this.currentTime > this.duration) {
					this.currentTime = this.duration;
				}
			} else if (this.playbackSessionId !== lastSessionId) {
				lastSessionId = this.playbackSessionId;
			}

			if (this.fadeCompleteTime !== null && this.audioContext) {
				if (this.audioContext.currentTime >= this.fadeCompleteTime) {
					this.fadeCompleteTime = null;
					const callback = this.onFadeComplete;
					this.onFadeComplete = null;
					callback?.();
				}
			}

			this.animationFrameId = requestAnimationFrame(update);
		};
		update();
	}

	/**
	 * ============================================================================
	 * ERROR HANDLING
	 * ============================================================================
	 */

	/**
	 * Report an error with consistent handling.
	 */
	private reportError(message: string, context: string, err?: unknown, userFacing = true): void {
		const errorMessage = err instanceof Error ? err.message : String(err);
		const fullMessage = `[AudioEngine] ${context}: ${errorMessage}`;

		if (userFacing) {
			this.error = message;
		}
		console.error(fullMessage, err);
	}

	/**
	 * Clear the current error state.
	 */
	private clearError(): void {
		this.error = null;
	}

	/**
	 * ============================================================================
	 * CLEANUP & LIFECYCLE
	 * ============================================================================
	 */

	/**
	 * Clean up audio resources.
	 */
	private cleanup(): void {
		if (this.source && this.sourceHasStarted) {
			try {
				this.source.stop();
			} catch (err) {
				this.reportError('', 'Failed to stop source during cleanup', err, false);
			}
		}

		this.source = null;
		this.sourceHasStarted = false;
		this.audioContext = null;
		this.analyser = null;
		this.gainNode = null;
		this.filterNode = null;
		this.isInitialized = false;

		this.fadeCompleteTime = null;
		this.onFadeComplete = null;
		this.gainReplaceQueue = [];
		this.isProcessingGainReplace = false;
	}

	/**
	 * Destroy the audio engine and release all resources.
	 */
	destroy(): void {
		if (this.animationFrameId) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		if (this.audioContext && this.audioContext.state !== 'closed') {
			this.audioContext.close().catch((err) => {
				this.reportError('', 'Failed to close audio context during destroy', err, false);
			});
		}

		this.cleanup();
	}
}
