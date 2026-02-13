/**
 * Frequency configuration types for audio reactive animations
 *
 * These types define how frequency bins from the Web Audio API analyser
 * are grouped and tracked for reactive animations across the site.
 */

/**
 * Configuration for a single frequency band
 */
export interface FrequencyBandConfig {
	/** Display name for this band (e.g., 'bass', 'kick', 'snare') */
	name: string;
	/** Lower bound of frequency bin index (inclusive) */
	lowBin: number;
	/** Upper bound of frequency bin index (inclusive) */
	highBin: number;
	/** Threshold value (0-255 range from analyser) that triggers threshold events */
	threshold: number;
}

/**
 * Complete frequency configuration for a track
 */
export interface TrackFrequencyConfig {
	/** Track ID this config belongs to */
	trackId: string;
	/** Array of frequency bands to track */
	bands: FrequencyBandConfig[];
	/** Optional: Target FPS for analysis (default: 60) */
	fps?: number;
}

/**
 * Reactive state for a frequency band at runtime
 */
export interface FrequencyBandState extends FrequencyBandConfig {
	/** Current computed total from frequency bins */
	current: number;
	/** Whether current value is above threshold */
	isActive: boolean;
}

/**
 * Default frequency band configuration (from Vue example)
 * These 4 bands provide good coverage for bass/low-mid frequencies
 * that typically drive interesting visual animations
 */
export const DEFAULT_FREQUENCY_BANDS: FrequencyBandConfig[] = [
	{ name: 'sub-bass', lowBin: 0, highBin: 1, threshold: 350 },
	{ name: 'bass', lowBin: 2, highBin: 5, threshold: 400 },
	{ name: 'low-mid', lowBin: 6, highBin: 10, threshold: 500 },
	{ name: 'mid', lowBin: 11, highBin: 13, threshold: 180 }
];

/**
 * Default FPS for frequency analysis
 */
export const DEFAULT_ANALYSIS_FPS = 60;

/**
 * Creates a default frequency config for a track
 */
export function createDefaultFrequencyConfig(trackId: string): TrackFrequencyConfig {
	return {
		trackId,
		bands: [...DEFAULT_FREQUENCY_BANDS],
		fps: DEFAULT_ANALYSIS_FPS
	};
}

/**
 * Validates a frequency band configuration
 */
function isValidBandConfig(band: unknown): band is FrequencyBandConfig {
	if (typeof band !== 'object' || band === null) return false;
	const b = band as Record<string, unknown>;
	return (
		typeof b.name === 'string' &&
		typeof b.lowBin === 'number' &&
		typeof b.highBin === 'number' &&
		typeof b.threshold === 'number' &&
		b.lowBin >= 0 &&
		b.highBin >= b.lowBin &&
		b.threshold >= 0 &&
		b.threshold <= 255
	);
}

/**
 * Validates a complete track frequency configuration
 */
export function isValidFrequencyConfig(config: unknown): config is TrackFrequencyConfig {
	if (typeof config !== 'object' || config === null) return false;
	const c = config as Record<string, unknown>;
	if (typeof c.trackId !== 'string') return false;
	if (!Array.isArray(c.bands)) return false;
	if (!c.bands.every(isValidBandConfig)) return false;
	if (c.fps !== undefined && (typeof c.fps !== 'number' || c.fps < 1)) return false;
	return true;
}
