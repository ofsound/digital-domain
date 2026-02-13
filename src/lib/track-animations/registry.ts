import type { Component } from 'svelte';

import AnimationLayerAnimation from '$lib/components/track-animations/AnimationLayerAnimation.svelte';
import ColorSchemesAnimation from '$lib/components/track-animations/ColorSchemesAnimation.svelte';
import ComposerIdeaOneAnimation from '$lib/components/track-animations/ComposerIdeaOneAnimation.svelte';
import ComposerIdeaTwoAnimation from '$lib/components/track-animations/ComposerIdeaTwoAnimation.svelte';
import ElementsShiftingAnimation from '$lib/components/track-animations/ElementsShiftingAnimation.svelte';
import LiquidGridAnimation from '$lib/components/track-animations/LiquidGridAnimation.svelte';
import MicroAnimationsAnimation from '$lib/components/track-animations/MicroAnimationsAnimation.svelte';
import ParticleSystemAnimation from '$lib/components/track-animations/ParticleSystemAnimation.svelte';
import ReactivePhysicsAnimation from '$lib/components/track-animations/ReactivePhysicsAnimation.svelte';
import ReactiveTypographyAnimation from '$lib/components/track-animations/ReactiveTypographyAnimation.svelte';
import ThreeJsFiveAnimation from '$lib/components/track-animations/ThreeJsFiveAnimation.svelte';
import ThreeJsFourAnimation from '$lib/components/track-animations/ThreeJsFourAnimation.svelte';
import ThreeJsOneAnimation from '$lib/components/track-animations/ThreeJsOneAnimation.svelte';
import ThreeJsSixAnimation from '$lib/components/track-animations/ThreeJsSixAnimation.svelte';
import ThreeJsThreeAnimation from '$lib/components/track-animations/ThreeJsThreeAnimation.svelte';
import ThreeJsTwoAnimation from '$lib/components/track-animations/ThreeJsTwoAnimation.svelte';
import TypographyHeartbeatAnimation from '$lib/components/track-animations/TypographyHeartbeatAnimation.svelte';

import type { TrackAnimationKey } from './catalog';

export const trackAnimationComponents: Record<TrackAnimationKey, Component> = {
	animation: AnimationLayerAnimation,
	'reactive-typography': ReactiveTypographyAnimation,
	'elements-shifting': ElementsShiftingAnimation,
	'particle-system': ParticleSystemAnimation,
	'micro-animations': MicroAnimationsAnimation,
	'typography-heartbeat': TypographyHeartbeatAnimation,
	'liquid-grid': LiquidGridAnimation,
	'color-schemes': ColorSchemesAnimation,
	'reactive-physics': ReactivePhysicsAnimation,
	'composer-idea-one': ComposerIdeaOneAnimation,
	'composer-idea-two': ComposerIdeaTwoAnimation,
	'three-js-one': ThreeJsOneAnimation,
	'three-js-two': ThreeJsTwoAnimation,
	'three-js-three': ThreeJsThreeAnimation,
	'three-js-four': ThreeJsFourAnimation,
	'three-js-five': ThreeJsFiveAnimation,
	'three-js-six': ThreeJsSixAnimation
};
