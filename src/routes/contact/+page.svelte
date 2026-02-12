<script lang="ts">
	let name = $state('');
	let email = $state('');
	let message = $state('');
	let submitted = $state(false);

	function handleSubmit(event: Event) {
		event.preventDefault();
		// Handle form submission - will be implemented later
		submitted = true;
		setTimeout(() => {
			submitted = false;
			name = '';
			email = '';
			message = '';
		}, 3000);
	}
</script>

<svelte:head>
	<title>Contact - Digital Domain</title>
	<meta name="description" content="Get in touch" />
</svelte:head>

<div class="pt-8 pb-32">
	<div class="mx-auto max-w-2xl px-4">
		<h1 class="text-text-primary mb-8 text-3xl font-bold">Contact</h1>

		{#if submitted}
			<div class="mb-6 rounded-lg bg-green-100 p-4 text-green-800">
				Thank you for your message! We'll get back to you soon.
			</div>
		{/if}

		<form onsubmit={handleSubmit} class="space-y-6">
			<div>
				<label for="name" class="text-text-primary mb-2 block text-sm font-medium">Name</label>
				<input
					type="text"
					id="name"
					bind:value={name}
					required
					class="border-surface-subtle bg-surface-elevated text-text-primary w-full rounded-lg border px-4 py-2 focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 focus:outline-none"
				/>
			</div>

			<div>
				<label for="email" class="text-text-primary mb-2 block text-sm font-medium">Email</label>
				<input
					type="email"
					id="email"
					bind:value={email}
					required
					class="border-surface-subtle bg-surface-elevated text-text-primary w-full rounded-lg border px-4 py-2 focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 focus:outline-none"
				/>
			</div>

			<div>
				<label for="message" class="text-text-primary mb-2 block text-sm font-medium">Message</label
				>
				<textarea
					id="message"
					bind:value={message}
					required
					rows="5"
					class="border-surface-subtle bg-surface-elevated text-text-primary w-full rounded-lg border px-4 py-2 focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 focus:outline-none"
				></textarea>
			</div>

			<button
				type="submit"
				class="w-full rounded-lg bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3 font-medium text-white transition-all hover:brightness-90 active:scale-95"
			>
				Send Message
			</button>
		</form>
	</div>
</div>
