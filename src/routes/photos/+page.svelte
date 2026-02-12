<script lang="ts">
	// Sample photo data - replace with actual data source
	const photos = [
		{ id: '1', title: 'Photo 1', src: '/images/photo1.jpg' },
		{ id: '2', title: 'Photo 2', src: '/images/photo2.jpg' },
		{ id: '3', title: 'Photo 3', src: '/images/photo3.jpg' }
	];
</script>

<svelte:head>
	<title>Photos - Digital Domain</title>
	<meta name="description" content="Photo gallery" />
</svelte:head>

<div class="pt-8 pb-32">
	<div class="mx-auto max-w-6xl px-4">
		<h1 class="text-text-primary mb-8 text-3xl font-bold">Photos</h1>

		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each photos as photo (photo.id)}
				<div class="bg-surface-elevated overflow-hidden rounded-lg shadow-md">
					<div class="bg-surface-subtle aspect-video">
						<!-- Placeholder for photo -->
						<div class="text-text-muted flex h-full items-center justify-center">
							<span>{photo.title}</span>
						</div>
					</div>
					<div class="p-4">
						<h3 class="text-text-primary font-medium">{photo.title}</h3>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
