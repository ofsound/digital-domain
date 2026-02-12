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

/** Internal state representation for state machine decisions */
export interface AudioState {
	playback: PlaybackState;
	contextState: AudioContextState | null;
	hasSource: boolean;
	sourceStarted: boolean;
	isFirstPlay: boolean;
}

/** Configuration for state machine behavior */
export interface StateMachineConfig {
	/** Whether the engine has loaded content */
	hasContent: () => boolean;
	/** Engine name for logging */
	engineName: string;
}

/** Audio track metadata for multi-track loading */
export interface AudioTrack {
	id: string;
	name: string;
	url: string;
}

/** Discriminated union for type-safe loadAudio parameters */
export type LoadAudioParams =
	| { type: 'single'; url: string }
	| { type: 'multi'; tracks: AudioTrack[] };
