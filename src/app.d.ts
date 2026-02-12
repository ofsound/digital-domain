// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	// Environment variables type declarations
	namespace NodeJS {
		interface ProcessEnv {
			DATABASE_URL?: string;
			NETLIFY_DATABASE_URL?: string;
			NETLIFY?: string;
			NETLIFY_BLOBS_CONTEXT?: string;
			NETLIFY_SITE_ID?: string;
		}
	}
}

export {};
