<script lang="ts">
	// Sample artwork data - replace with actual data source
	const artworks = [
		{ id: '1', title: 'Artwork 1', src: '/images/art1.jpg' },
		{ id: '2', title: 'Artwork 2', src: '/images/art2.jpg' },
		{ id: '3', title: 'Artwork 3', src: '/images/art3.jpg' }
	];
</script>

<svelte:head>
	<title>Artwork - Digital Domain</title>
	<meta name="description" content="Artwork gallery" />
</svelte:head>

<div class="pt-8 pb-32">
	<div class="mx-auto max-w-6xl px-4">
		<h1 class="text-text-primary mb-8 text-3xl font-bold">Artwork</h1>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each artworks as artwork (artwork.id)}
				<div class="bg-surface-elevated overflow-hidden rounded-lg shadow-md">
					<div class="bg-surface-subtle aspect-square">
						<!-- Placeholder for artwork -->
						<div class="text-text-muted flex h-full items-center justify-center">
							<span>{artwork.title}</span>
						</div>
					</div>
					<div class="p-4">
						<h3 class="text-text-primary font-medium">{artwork.title}</h3>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
