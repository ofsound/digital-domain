<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	import RichTextEditor from '$lib/components/RichTextEditor.svelte';
	import { TRACK_ANIMATION_OPTIONS } from '$lib/track-animations/catalog';

	import type { ActionData } from './$types';

	interface Props {
		form: ActionData;
	}

	let { form }: Props = $props();

	let files: FileList | null = $state(null);
	let imageFiles: FileList | null = $state(null);
	let additionalAudioFiles: FileList | null = $state(null);
	let videoFiles: FileList | null = $state(null);
	let uploading = $state(false);
	let uploadProgress = $state(0);
	let description = $state('');
</script>

<svelte:head>
	<title>Upload Track - Digital Domain</title>
</svelte:head>

<h1 class="text-text-primary mb-8 text-3xl font-bold">Upload Track</h1>

{#if form?.success && form.track}
	<div class="mb-6 rounded-lg bg-green-100 p-4 text-green-800">
		<p>Track uploaded successfully!</p>
		<p class="text-sm">Name: {form.track.name}</p>
		<p class="text-sm">URL: {form.track.url}</p>
		{#if form.track.images.length > 0}
			<p class="text-sm">Images: {form.track.images.length}</p>
		{/if}
		{#if form.track.audioFiles.length > 0}
			<p class="text-sm">Additional audio files: {form.track.audioFiles.length}</p>
		{/if}
		{#if form.track.videoUrl}
			<p class="text-sm">Background video attached.</p>
		{/if}
		{#if form.track.animationKey}
			<p class="text-sm">Track animation selected: {form.track.animationKey}</p>
		{/if}
	</div>
{:else if form?.error}
	<div class="mb-6 rounded-lg bg-red-100 p-4 text-red-800">
		<p>Error: {form.error}</p>
	</div>
{/if}

<div class="bg-surface-elevated max-w-2xl rounded-lg p-6 shadow-sm">
	<form
		method="POST"
		action="?/upload"
		enctype="multipart/form-data"
		use:enhance={() => {
			uploading = true;
			uploadProgress = 0;

			const interval = setInterval(() => {
				uploadProgress += 10;
				if (uploadProgress >= 90) {
					clearInterval(interval);
				}
			}, 100);

			return async ({ update }) => {
				clearInterval(interval);
				uploadProgress = 100;
				await update();
				uploading = false;
			};
		}}
		class="space-y-6"
	>
		<!-- Main Audio File Upload -->
		<div>
			<label for="audio" class="text-text-primary mb-2 block text-sm font-medium">
				Audio File (MP3) <span class="text-red-500">*</span>
			</label>
			<input
				type="file"
				id="audio"
				name="audio"
				accept=".mp3,audio/mpeg"
				bind:files
				required
				class="text-text-secondary block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-violet-700"
			/>
		</div>

		<!-- Track Name -->
		<div>
			<label for="name" class="text-text-primary mb-2 block text-sm font-medium">
				Track Name <span class="text-red-500">*</span>
			</label>
			<input
				type="text"
				id="name"
				name="name"
				placeholder="Enter track name"
				required
				class="border-surface-subtle bg-surface text-text-primary w-full rounded-lg border px-4 py-2 focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 focus:outline-none"
			/>
		</div>

		<!-- Description (Rich Text) -->
		<div>
			<label for="description" class="text-text-primary mb-2 block text-sm font-medium">
				Description
			</label>
			<RichTextEditor
				content={description}
				placeholder="Enter track description..."
				onChange={(html) => (description = html)}
			/>
			<input type="hidden" name="description" bind:value={description} />
		</div>

		<!-- Image Uploads -->
		<div>
			<label for="images" class="text-text-primary mb-2 block text-sm font-medium"> Images </label>
			<input
				type="file"
				id="images"
				name="images"
				accept="image/*"
				multiple
				bind:files={imageFiles}
				class="text-text-secondary block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-cyan-700"
			/>
			<p class="text-text-secondary mt-1 text-xs">Upload multiple images (JPG, PNG, WebP)</p>
		</div>

		<!-- Additional Audio Files -->
		<div>
			<label for="additionalAudio" class="text-text-primary mb-2 block text-sm font-medium">
				Additional Audio Files
			</label>
			<input
				type="file"
				id="additionalAudio"
				name="additionalAudio"
				accept=".mp3,audio/mpeg"
				multiple
				bind:files={additionalAudioFiles}
				class="text-text-secondary block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-violet-700"
			/>
			<p class="text-text-secondary mt-1 text-xs">
				Upload additional MP3s (demos, alternate versions, etc.)
			</p>
		</div>

		<!-- Background Video -->
		<div>
			<label for="backgroundVideo" class="text-text-primary mb-2 block text-sm font-medium">
				Background Video (MP4)
			</label>
			<input
				type="file"
				id="backgroundVideo"
				name="backgroundVideo"
				accept=".mp4,video/mp4"
				bind:files={videoFiles}
				class="text-text-secondary block w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-cyan-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-cyan-700"
			/>
			<p class="text-text-secondary mt-1 text-xs">
				Optional looping MP4 shown behind site content when this track is active.
			</p>
		</div>

		<!-- Track Animation -->
		<div>
			<label for="animationKey" class="text-text-primary mb-2 block text-sm font-medium">
				Track Animation
			</label>
			<select
				id="animationKey"
				name="animationKey"
				class="border-surface-subtle bg-surface text-text-primary w-full rounded-lg border px-4 py-2 focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 focus:outline-none"
			>
				<option value="">None</option>
				{#each TRACK_ANIMATION_OPTIONS as option (option.key)}
					<option value={option.key}>{option.label}</option>
				{/each}
			</select>
			<p class="text-text-secondary mt-1 text-xs">
				Optional animation layer shown above the background video for this track.
			</p>
		</div>

		<!-- Upload Progress -->
		{#if uploading}
			<div class="space-y-2">
				<div class="bg-surface-subtle h-2 w-full rounded-full">
					<div
						class="h-2 rounded-full bg-violet-600 transition-all duration-200"
						style="width: {uploadProgress}%"
					></div>
				</div>
				<p class="text-text-secondary text-sm">Uploading... {uploadProgress}%</p>
			</div>
		{/if}

		<!-- Submit -->
		<div class="flex gap-4">
			<button
				type="submit"
				disabled={uploading || !files}
				class="rounded-lg bg-violet-600 px-6 py-2 text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{uploading ? 'Uploading...' : 'Upload Track'}
			</button>
			<a
				href={resolve('/admin')}
				class="bg-surface-subtle text-text-primary hover:bg-surface-muted rounded-lg px-6 py-2 transition-colors"
			>
				Cancel
			</a>
		</div>
	</form>

	<!-- Instructions -->
	<div class="border-surface-subtle mt-8 border-t pt-6">
		<h3 class="text-text-primary mb-2 text-sm font-medium">Storage Configuration</h3>
		<p class="text-text-secondary text-sm">
			Files are stored in <code class="bg-surface-subtle rounded px-2 py-1">static/audio/</code> and
			<code class="bg-surface-subtle rounded px-2 py-1">static/images/</code> and
			<code class="bg-surface-subtle rounded px-2 py-1">static/videos/</code>.
		</p>
		<p class="text-text-secondary mt-2 text-sm">
			To switch to cloud storage, update the provider in
			<code class="bg-surface-subtle rounded px-2 py-1">src/lib/storage/index.ts</code>
		</p>
	</div>
</div>
