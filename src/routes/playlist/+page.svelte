<script lang="ts">
	import { onMount } from 'svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';

	onMount(() => {
		// Playlist page ensures maximized view
		playerStore.maximize();
	});
</script>

<svelte:head>
	<title>Playlist - Digital Domain</title>
	<meta name="description" content="Full playlist view" />
</svelte:head>

<!-- Playlist route - player is maximized by default -->
<div class="flex h-screen items-center justify-center">
	<p class="text-text-secondary">Loading playlist...</p>
</div>
