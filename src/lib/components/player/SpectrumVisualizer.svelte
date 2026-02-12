<script lang="ts">
	interface Props {
		analyser: AnalyserNode | null;
		isPlaying?: boolean;
	}

	let { analyser, isPlaying = true }: Props = $props();

	let canvas = $state<HTMLCanvasElement | undefined>(undefined);
	let ctx: CanvasRenderingContext2D | null = null;
	let animationId: number | null = null;
	let isDrawing = false;
	let resizeObserver: ResizeObserver | null = null;

	let canvasWidth = $state(600);
	let canvasHeight = $state(100);

	function canvasAction(node: HTMLCanvasElement) {
		canvas = node;
		ctx = node.getContext('2d');
		setupCanvasSizing();
		return {
			destroy() {
				stopDrawing();
				resizeObserver?.disconnect();
				canvas = undefined;
				ctx = null;
			}
		};
	}

	function setupCanvasSizing() {
		if (!canvas) return;

		updateCanvasSize();

		resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				canvasWidth = width;
				canvasHeight = height;
				updateCanvasSize();
			}
		});

		resizeObserver.observe(canvas);
	}

	function updateCanvasSize() {
		if (!canvas) return;

		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.floor(canvasWidth * dpr);
		canvas.height = Math.floor(canvasHeight * dpr);

		if (ctx) {
			ctx.scale(dpr, dpr);
		}
	}

	function stopDrawing(clearDisplay = false) {
		isDrawing = false;
		if (animationId) {
			cancelAnimationFrame(animationId);
			animationId = null;
		}
		if (clearDisplay && ctx && canvas) {
			ctx.fillStyle = 'rgb(20, 20, 30)';
			ctx.fillRect(0, 0, canvasWidth, canvasHeight);
		}
	}

	function startDrawing(currentAnalyser: AnalyserNode) {
		if (!ctx || !canvas || isDrawing) return;

		isDrawing = true;
		const bufferLength = currentAnalyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);
		const barWidth = canvasWidth / bufferLength;

		let lastDrawTime = 0;
		const FRAME_INTERVAL = 1000 / 30;

		const draw = (timestamp: number) => {
			if (!isDrawing || !ctx || !canvas) return;

			animationId = requestAnimationFrame(draw);

			if (timestamp - lastDrawTime < FRAME_INTERVAL) return;
			lastDrawTime = timestamp;

			currentAnalyser.getByteFrequencyData(dataArray);

			// Clear with gradient background
			const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
			gradient.addColorStop(0, 'rgb(20, 20, 30)');
			gradient.addColorStop(1, 'rgb(30, 20, 40)');
			ctx.fillStyle = gradient;
			ctx.fillRect(0, 0, canvasWidth, canvasHeight);

			// Draw frequency bars
			for (let i = 0; i < bufferLength; i++) {
				const barHeight = (dataArray[i] / 255) * canvasHeight * 0.8;
				const x = i * barWidth;

				// Color gradient from violet to cyan
				const hue = 260 + (i / bufferLength) * 60;
				ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;

				// Draw bar from bottom
				ctx.fillRect(x, canvasHeight - barHeight, barWidth - 1, barHeight);
			}
		};

		draw(performance.now());
	}

	$effect(() => {
		if (analyser && ctx && canvas && isPlaying) {
			stopDrawing(false);
			startDrawing(analyser);
		} else {
			stopDrawing(true);
		}
	});
</script>

<div class="w-full">
	<canvas use:canvasAction class="bg-surface-subtle block h-[100px] w-full rounded-lg"></canvas>
</div>
