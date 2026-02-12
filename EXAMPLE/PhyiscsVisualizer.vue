<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';

import { gsap } from 'gsap';

import { PhysicsPropsPlugin } from 'gsap/PhysicsPropsPlugin';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';

gsap.registerPlugin(PhysicsPropsPlugin, Physics2DPlugin);

const props = defineProps<{
	analyser: AnalyserNode;
}>();

const bufferLength = props.analyser.frequencyBinCount;
const dataArray = new Uint8Array(bufferLength);

let drawVisual = -1;

const canvas = useTemplateRef('spectrumCanvas');

const canvasWidth = ref(600);

const itemRefs = useTemplateRef('items');

interface BinObject {
	low: number;
	high: number;
	threshold: number;
}

const binObjects = ref<BinObject[]>([
	{ low: 0, high: 1, threshold: 350 },
	{ low: 2, high: 5, threshold: 400 },
	{ low: 6, high: 10, threshold: 500 },
	{ low: 11, high: 13, threshold: 180 }
]);

const binTotalsDisplay = ref<number[]>([]);
binTotalsDisplay.value = new Array(binObjects.value.length).fill(0);

const handleTrigger = (thisBin: number, strength: number) => {
	if (itemRefs.value) {
		for (let index = 0; index < itemRefs.value.length; index++) {
			const thisBinRef = itemRefs.value[thisBin];
			if (thisBinRef) {
				const thisDiv = thisBinRef;

				gsap.to(thisDiv, {
					duration: 0.05,
					x: '+=' + strength / 100 + 'px'
				});
			}
		}
	}
};

watch(binTotalsDisplay, (newValue, oldValue) => {
	for (let index = 0; index < binObjects.value.length; index++) {
		const prevValue = oldValue[index] as number;
		const thisValue = newValue[index] as number;
		const thisThreshold = binObjects.value[index]?.threshold as number;

		if (thisValue > thisThreshold) {
			if (prevValue < thisThreshold) {
				handleTrigger(index, thisValue - thisThreshold);
			}
		}
	}
});

onMounted(() => {
	if (canvas.value) {
		const canvasContext = canvas.value.getContext('2d');

		if (canvasContext) {
			canvasContext.clearRect(0, 0, canvasWidth.value, 150);
		}

		function draw() {
			drawVisual = requestAnimationFrame(draw);

			props.analyser.getByteFrequencyData(dataArray);

			if (canvasContext) {
				canvasContext.fillStyle = 'rgb(0 0 0)';
				canvasContext.fillRect(0, 0, canvasWidth.value, 150);

				const barWidth = canvasWidth.value / bufferLength;
				let barHeight;
				let x = 0;

				const binTotals: number[] = new Array(binObjects.value.length).fill(0);

				for (let i = 0; i < bufferLength; i++) {
					const dataPoint = dataArray[i];

					if (dataPoint) {
						barHeight = dataPoint / 2;

						for (let j = 0; j < binObjects.value.length; j++) {
							if (binObjects.value[j]) {
								const thisBin = binObjects.value[j];
								if (thisBin) {
									if (thisBin.low != null && thisBin.high) {
										if (i >= thisBin.low && i <= thisBin.high) {
											binTotals[j] = dataPoint + (binTotals[j] as number);
										}
									}
								}
							}
						}
					} else {
						barHeight = 10;
					}

					canvasContext.fillStyle = `rgb(${barHeight + 100} 50 50)`;
					canvasContext.fillRect(x, 150 - barHeight / 2, barWidth, barHeight);

					x += barWidth;
				}

				binTotalsDisplay.value = binTotals;
			}
		}
		draw();
	}
});
onUnmounted(() => {
	cancelAnimationFrame(drawVisual);
});
</script>

<template>
	<canvas ref="spectrumCanvas" :width="canvasWidth" height="150"></canvas>
	<div class="h-full bg-white p-10">
		<div class="font-bold">Metrics</div>
		<div class="flex">
			<div>
				<div v-for="(value, index) in binObjects" :key="index">
					{{ value.low }}-{{ value.high }}
				</div>
			</div>
			<div class="ml-4 w-12">
				<div v-for="(value, index) in binObjects" :key="index">
					{{ value.threshold }}
				</div>
			</div>
			<div class="ml-4 w-12">
				<div v-for="(value, index) in binTotalsDisplay" :key="index">
					{{ value }}
				</div>
			</div>
			<div class="ml-4">
				<div v-for="(value, index) in binTotalsDisplay" :key="index" ref="items">*</div>
			</div>
		</div>
	</div>
</template>
