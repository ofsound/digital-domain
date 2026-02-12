/**
 * Playback state machine types and interfaces
 * Shared across all audio engines
 */

/** Playback states for the state machine */
export enum PlaybackState {
	IDLE = 'idle',
	LOADING = 'loading',
	READY = 'ready',
	PLAYING = 'playing',
	PAUSED = 'paused',
	STOPPED = 'stopped',
	SEEKING = 'seeking',
	TRACK_SWITCHING = 'track_switching',
	ERROR = 'error'
}

/** Audio track metadata for multi-track loading */
export interface AudioTrack {
	id: string;
	name: string;
	url: string;
}
