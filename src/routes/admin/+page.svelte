<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Admin Dashboard - Digital Domain</title>
</svelte:head>

<h1 class="text-text-primary mb-8 text-3xl font-bold">Dashboard</h1>

<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
	<!-- Quick Stats -->
	<div class="bg-surface-elevated rounded-lg p-6 shadow-sm">
		<h2 class="text-text-primary mb-2 text-lg font-semibold">Tracks</h2>
		<p class="text-3xl font-bold text-violet-600">0</p>
		<p class="text-text-secondary text-sm">Total tracks in playlist</p>
	</div>

	<div class="bg-surface-elevated rounded-lg p-6 shadow-sm">
		<h2 class="text-text-primary mb-2 text-lg font-semibold">Storage</h2>
		<p class="text-3xl font-bold text-cyan-500">0 MB</p>
		<p class="text-text-secondary text-sm">Used storage space</p>
	</div>

	<div class="bg-surface-elevated rounded-lg p-6 shadow-sm">
		<h2 class="text-text-primary mb-2 text-lg font-semibold">Photos</h2>
		<p class="text-3xl font-bold text-violet-600">0</p>
		<p class="text-text-secondary text-sm">Photos in gallery</p>
	</div>
</div>

<!-- Quick Actions -->
<div class="mt-8">
	<h2 class="text-text-primary mb-4 text-xl font-semibold">Quick Actions</h2>
	<div class="flex flex-wrap gap-4">
		<a
			href={resolve('/admin/upload')}
			class="inline-flex items-center rounded-lg bg-violet-600 px-4 py-2 text-white transition-colors hover:bg-violet-700"
		>
			<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
				/>
			</svg>
			Upload Track
		</a>
		<a
			href={resolve('/admin/playlist')}
			class="bg-surface-elevated text-text-primary hover:bg-surface-subtle inline-flex items-center rounded-lg px-4 py-2 transition-colors"
		>
			<svg class="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6h16M4 12h16M4 18h16"
				/>
			</svg>
			Manage Playlist
		</a>
	</div>
</div>
