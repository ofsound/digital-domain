<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let tracks = $derived([...data.tracks]);
	let editingTrack: string | null = $state(null);
	let editName = $state('');
	let reorderError: string | null = $state(null);
	let isSavingOrder = $state(false);

	function startEdit(track: { id: string; name: string }) {
		editingTrack = track.id;
		editName = track.name;
	}

	function saveEdit(trackId: string) {
		tracks = tracks.map((track) => (track.id === trackId ? { ...track, name: editName } : track));
		editingTrack = null;
	}

	function cancelEdit() {
		editingTrack = null;
		editName = '';
	}

	function deleteTrack(trackId: string) {
		tracks = tracks.filter((t) => t.id !== trackId);
	}

	async function saveTrackOrder(previousTracks: typeof tracks) {
		const orderedIds = tracks.map((track) => track.id);
		const formData = new FormData();
		formData.set('orderedIds', JSON.stringify(orderedIds));

		const response = await fetch('?/reorder', {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			tracks = previousTracks;
			reorderError = 'Unable to save track order. Please try again.';
		}
	}

	async function moveTrack(trackId: string, direction: 'up' | 'down') {
		if (isSavingOrder) return;

		const index = tracks.findIndex((t) => t.id === trackId);
		if (index === -1) return;

		const newIndex = direction === 'up' ? index - 1 : index + 1;
		if (newIndex < 0 || newIndex >= tracks.length) return;

		const previousTracks = [...tracks];
		const nextTracks = [...tracks];

		[nextTracks[index], nextTracks[newIndex]] = [nextTracks[newIndex], nextTracks[index]];
		tracks = nextTracks;
		reorderError = null;

		isSavingOrder = true;
		try {
			await saveTrackOrder(previousTracks);
		} finally {
			isSavingOrder = false;
		}
	}
</script>

<svelte:head>
	<title>Manage Playlist - Digital Domain</title>
</svelte:head>

<h1 class="text-text-primary mb-8 text-3xl font-bold">Manage Playlist</h1>

<div class="bg-surface-elevated rounded-lg shadow-sm">
	<!-- Header -->
	<div class="border-surface-subtle flex items-center justify-between border-b px-6 py-4">
		<h2 class="text-text-primary text-lg font-semibold">Tracks ({tracks.length})</h2>
		<a
			href={resolve('/admin/upload')}
			class="inline-flex items-center rounded-lg bg-violet-600 px-4 py-2 text-sm text-white transition-colors hover:bg-violet-700"
		>
			<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			Add Track
		</a>
	</div>
	{#if reorderError}
		<p class="px-6 py-3 text-sm text-red-600">{reorderError}</p>
	{/if}

	<!-- Track List -->
	<div class="divide-surface-subtle divide-y">
		{#each tracks as track, index (track.id)}
			<div class="flex items-center gap-4 px-6 py-4">
				<!-- Order Number -->
				<span class="text-text-secondary w-8 text-center text-sm font-medium">
					{index + 1}
				</span>

				<!-- Track Info -->
				<div class="min-w-0 flex-1">
					{#if editingTrack === track.id}
						<div class="flex items-center gap-2">
							<input
								type="text"
								bind:value={editName}
								class="border-surface-subtle bg-surface text-text-primary rounded border px-3 py-1 focus:border-violet-600 focus:outline-none"
							/>
							<button
								onclick={() => saveEdit(track.id)}
								class="rounded bg-green-600 p-1 text-white hover:bg-green-700"
								aria-label="Save changes"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									/>
								</svg>
							</button>
							<button
								onclick={cancelEdit}
								class="rounded bg-red-600 p-1 text-white hover:bg-red-700"
								aria-label="Cancel edit"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
					{:else}
						<div>
							<p class="text-text-primary truncate font-medium">{track.name}</p>
							<p class="text-text-secondary truncate text-sm">{track.url}</p>
						</div>
					{/if}
				</div>

				<!-- Actions -->
				<div class="flex items-center gap-2">
					<!-- Move Up -->
					<button
						onclick={() => moveTrack(track.id, 'up')}
						disabled={index === 0}
						class="text-text-secondary hover:bg-surface-subtle hover:text-text-primary rounded p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
						aria-label="Move up"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 15l7-7 7 7"
							/>
						</svg>
					</button>

					<!-- Move Down -->
					<button
						onclick={() => moveTrack(track.id, 'down')}
						disabled={index === tracks.length - 1}
						class="text-text-secondary hover:bg-surface-subtle hover:text-text-primary rounded p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
						aria-label="Move down"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 9l-7 7-7-7"
							/>
						</svg>
					</button>

					<!-- Edit -->
					<button
						onclick={() => startEdit(track)}
						class="text-text-secondary hover:bg-surface-subtle hover:text-text-primary rounded p-2 transition-colors"
						aria-label="Edit"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
							/>
						</svg>
					</button>

					<!-- Delete -->
					<button
						onclick={() => deleteTrack(track.id)}
						class="text-text-secondary rounded p-2 transition-colors hover:bg-red-100 hover:text-red-600"
						aria-label="Delete"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
							/>
						</svg>
					</button>
				</div>
			</div>
		{:else}
			<div class="px-6 py-8 text-center text-text-secondary">
				<p>No tracks yet.</p>
				<a
					href={resolve('/admin/upload')}
					class="mt-2 inline-block text-violet-600 hover:underline"
				>
					Upload your first track
				</a>
			</div>
		{/each}
	</div>
</div>
