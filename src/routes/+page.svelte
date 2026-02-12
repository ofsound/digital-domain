<script lang="ts">
	import { onMount } from 'svelte';
	import { playerStore } from '$lib/stores/player-store.svelte';

	onMount(() => {
		// Home page shows maximized player by default
		playerStore.maximize();
	});
</script>

<svelte:head>
	<title>Digital Domain - Music Player</title>
	<meta name="description" content="Persistent playlist music player" />
</svelte:head>

<!-- Home page content is minimal since player is maximized -->
<!-- The PersistentPlayer component in layout handles the display -->
