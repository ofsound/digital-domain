/**
 * Audio Engine Configuration
 *
 * Centralized constants for the audio engine to ensure consistency
 * across all audio components and prevent magic numbers.
 */

export const AUDIO_CONFIG = {
	/**
	 * Fade duration for iOS click prevention
	 * 20ms is sufficient to prevent audible clicks during state transitions
	 */
	FADE_DURATION_MS: 20,

	/**
	 * Delay before restoring analyser smoothing after playback starts
	 * Allows immediate frequency response at start, then smooths over time
	 */
	ANALYSER_SMOOTHING_RESTORE_DELAY_MS: 50,

	/**
	 * Analyser smoothing time constant after restoration
	 * 0.8 provides good balance between responsiveness and visual stability
	 */
	ANALYSER_SMOOTHING_TIME_CONSTANT: 0.8,

	/**
	 * Initial delay before starting playback operations
	 * Ensures AudioContext state changes have propagated
	 */
	PLAYBACK_START_DELAY_MS: 10,

	/**
	 * Threshold for detecting track end (in seconds)
	 * Accounts for small timing discrepancies in audio scheduling
	 */
	TRACK_END_THRESHOLD_S: 0.1,

	/**
	 * FFT size for frequency analysis
	 * 128 = 64 frequency bins (sufficient for visualization, more CPU efficient)
	 */
	ANALYSER_FFT_SIZE: 128,

	/**
	 * Maximum concurrent track loads
	 * Browser typically limits to 6 connections per domain
	 */
	MAX_CONCURRENT_LOADS: 4,

	/**
	 * Maximum shuffle history size
	 * Prevents unbounded memory growth during long listening sessions
	 */
	MAX_SHUFFLE_HISTORY: 100,

	/**
	 * Seek step size for keyboard navigation (in seconds)
	 */
	KEYBOARD_SEEK_STEP_S: 5,

	/**
	 * Low-pass filter Q value
	 * 0.707 = Butterworth response (maximally flat passband)
	 */
	FILTER_Q: 0.707,

	/**
	 * Default filter frequency (Hz)
	 * 20000 = no filtering (full audible spectrum)
	 */
	DEFAULT_FILTER_FREQUENCY_HZ: 20000,

	/**
	 * Minimum filter frequency (Hz)
	 * Below 20Hz is below human hearing threshold
	 */
	MIN_FILTER_FREQUENCY_HZ: 20
} as const;

/**
 * Derived values for Web Audio API (uses seconds)
 */
export const AUDIO_DERIVED = {
	/**
	 * Fade duration in seconds for Web Audio API
	 */
	get FADE_DURATION_S(): number {
		return AUDIO_CONFIG.FADE_DURATION_MS / 1000;
	}
};

/**
 * Network-aware concurrent load limit
 * Adjusts based on connection type to optimize loading performance
 */
export function getAdaptiveConcurrencyLimit(): number {
	const defaultLimit = AUDIO_CONFIG.MAX_CONCURRENT_LOADS;

	const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;

	if (!connection) {
		return defaultLimit;
	}

	switch (connection.effectiveType) {
		case 'slow-2g':
		case '2g':
			return 2;
		case '3g':
			return 3;
		case '4g':
			return 6;
		default:
			return defaultLimit;
	}
}

interface NetworkInformation {
	effectiveType: 'slow-2g' | '2g' | '3g' | '4g';
	saveData: boolean;
}
