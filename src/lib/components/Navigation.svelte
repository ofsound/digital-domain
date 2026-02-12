<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { playerStore } from '$lib/stores/player-store.svelte';

	const navItems = [
		{ href: '/', label: 'Player' },
		{ href: '/photos', label: 'Photos' },
		{ href: '/artwork', label: 'Artwork' },
		{ href: '/contact', label: 'Contact' }
	];
</script>

<nav
	class="border-surface-subtle bg-surface/95 fixed top-0 right-0 left-0 z-30 border-b backdrop-blur-sm"
>
	<div class="mx-auto max-w-6xl px-4">
		<div class="flex h-16 items-center justify-between">
			<a href={resolve('/')} class="text-text-primary text-xl font-bold">Digital Domain</a>

			<div class="flex items-center gap-6">
				{#each navItems as item (item.href)}
					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<a
						href={item.href}
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
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/each}
			</div>
		</div>
	</div>
</nav>
