<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	import { playerStore } from '$lib/stores/player-store.svelte';

	const navItems = [
		{ href: '/', label: 'Player' },
		{ href: '/photos', label: 'Photos' },
		{ href: '/artwork', label: 'Artwork' },
		{ href: '/contact', label: 'Contact' },
		{ href: '/examples', label: 'Examples' }
	] as const;
</script>

<nav class="border-surface-subtle bg-surface/95 border-b backdrop-blur-sm">
	<div class="mx-auto max-w-6xl px-4">
		<div class="flex h-16 items-center justify-between">
			<a href={resolve('/')} class="text-text-primary hidden text-xl font-bold">Digital Domain</a>

			<div class="flex items-center gap-6">
				{#each navItems as item (item.href)}
					<a
						href={resolve(item.href)}
						onclick={() => {
							// When navigating to non-player pages, minimize the player
							if (item.href !== '/') {
								playerStore.minimize();
							}
						}}
						class="text-sm font-medium transition-colors {page.url.pathname === item.href
							? 'text-violet-600'
							: 'text-text-secondary hover:text-text-primary'}"
					>
						{item.label}
					</a>
				{/each}
			</div>
		</div>
	</div>
</nav>
