<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	let { children } = $props();

	const navItems = [
		{ href: '/admin', label: 'Dashboard' },
		{ href: '/admin/upload', label: 'Upload' },
		{ href: '/admin/playlist', label: 'Playlist' }
	] as const;
</script>

<div class="bg-surface min-h-screen">
	<!-- Admin Navigation -->
	<nav class="border-surface-subtle bg-surface-elevated border-b">
		<div class="mx-auto max-w-6xl px-4">
			<div class="flex h-16 items-center justify-between">
				<div class="flex items-center gap-8">
					<a href={resolve('/admin')} class="text-text-primary text-xl font-bold">Admin</a>
					<div class="flex gap-4">
						{#each navItems as item (item.href)}
							<a
								href={resolve(item.href)}
								class="text-sm font-medium transition-colors {page.url.pathname === item.href
									? 'text-violet-600'
									: 'text-text-secondary hover:text-text-primary'}"
							>
								{item.label}
							</a>
						{/each}
					</div>
				</div>
				<a href={resolve('/')} class="text-text-secondary hover:text-text-primary text-sm"
					>Back to Site</a
				>
			</div>
		</div>
	</nav>

	<!-- Admin Content -->
	<main class="pt-8 pb-32">
		<div class="mx-auto max-w-6xl px-4">
			{@render children()}
		</div>
	</main>
</div>
