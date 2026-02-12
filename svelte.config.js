import adapter from '@sveltejs/adapter-netlify';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Using Netlify adapter for deployment on Netlify
		// See https://svelte.dev/docs/kit/adapter-netlify for configuration options
		adapter: adapter({
			// Use standard serverless functions (not edge functions)
			// Edge functions have stricter limits and compatibility issues
			edge: false
		})
	}
};

export default config;
