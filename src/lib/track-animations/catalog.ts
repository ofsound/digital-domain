export const TRACK_ANIMATION_OPTIONS = [
	{ key: 'animation', label: 'Frequency Animation Demo', route: '/animation' },
	{ key: 'reactive-typography', label: 'Reactive Typography', route: '/reactive-typography' },
	{ key: 'elements-shifting', label: 'Elements Shifting', route: '/elements-shifting' },
	{ key: 'particle-system', label: 'Particle System', route: '/particle-system' },
	{ key: 'micro-animations', label: 'Micro Animations', route: '/micro-animations' },
	{ key: 'typography-heartbeat', label: 'Typography Heartbeat', route: '/typography-heartbeat' },
	{ key: 'liquid-grid', label: 'Liquid Grid', route: '/liquid-grid' },
	{ key: 'color-schemes', label: 'Color Schemes', route: '/color-schemes' },
	{ key: 'reactive-physics', label: 'Reactive Physics', route: '/reactive-physics' },
	{ key: 'composer-idea-one', label: 'Composer Idea One', route: '/composer-idea-one' },
	{ key: 'composer-idea-two', label: 'Composer Idea Two', route: '/composer-idea-two' },
	{ key: 'three-js-one', label: 'Three.js One', route: '/three-js-one' },
	{ key: 'three-js-two', label: 'Three.js Two', route: '/three-js-two' },
	{ key: 'three-js-three', label: 'Three.js Three', route: '/three-js/three' },
	{ key: 'three-js-four', label: 'Three.js Four', route: '/three-js-four' },
	{ key: 'three-js-five', label: 'Three.js Five', route: '/three-js-five' },
	{ key: 'three-js-six', label: 'Three.js Six', route: '/three-js-six' }
] as const;

export type TrackAnimationOption = (typeof TRACK_ANIMATION_OPTIONS)[number];
export type TrackAnimationKey = TrackAnimationOption['key'];

const TRACK_ANIMATION_KEY_SET = new Set<string>(
	TRACK_ANIMATION_OPTIONS.map((option) => option.key)
);

export function isTrackAnimationKey(value: unknown): value is TrackAnimationKey {
	return typeof value === 'string' && TRACK_ANIMATION_KEY_SET.has(value);
}
